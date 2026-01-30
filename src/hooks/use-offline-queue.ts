"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  queueTransaction,
  getPendingTransactions,
  getPendingCount,
  markSyncing,
  markSynced,
  markFailed,
  retryFailedTransactions,
  cleanupSyncedTransactions,
  getQueueStats,
  getDeviceId,
  isIndexedDBAvailable,
  type TransactionPayload,
  type QueuedTransaction,
} from "@/lib/offline-storage"
import { generateIdempotencyKey } from "@/lib/payment-validation"
import { useNetworkStatus } from "./use-network-status"

interface QueueStats {
  pending: number
  syncing: number
  synced: number
  failed: number
  total: number
}

interface SyncProgress {
  current: number
  total: number
  synced: number
  failed: number
}

interface UseOfflineQueueOptions {
  /** Auto-sync when coming back online (default: true) */
  autoSync?: boolean
  /** Batch sync interval in ms when online (default: 5000) */
  syncInterval?: number
  /** Delay between individual transaction syncs in ms (default: 200) */
  syncDelay?: number
  /** Initial retry delay in ms for exponential backoff (default: 1000) */
  initialRetryDelay?: number
  /** Max retry delay in ms (default: 30000) */
  maxRetryDelay?: number
  /** Auto-cleanup synced transactions older than this age in ms (default: 1 hour) */
  cleanupAge?: number
  /** Callback when sync completes */
  onSyncComplete?: (synced: number, failed: number) => void
  /** Callback when sync fails */
  onSyncError?: (error: Error) => void
  /** Callback for sync progress updates */
  onSyncProgress?: (progress: SyncProgress) => void
}

/** Utility to delay execution */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Calculate exponential backoff delay */
const calculateBackoff = (
  retryCount: number,
  initialDelay: number,
  maxDelay: number
): number => {
  const exponentialDelay = initialDelay * Math.pow(2, retryCount)
  // Add jitter (10% randomness) to prevent thundering herd
  const jitter = exponentialDelay * 0.1 * Math.random()
  return Math.min(exponentialDelay + jitter, maxDelay)
}

/**
 * Hook for managing offline transaction queue
 * Handles queueing, syncing, and status tracking with performance optimizations
 */
export function useOfflineQueue(options: UseOfflineQueueOptions = {}) {
  const {
    autoSync = true,
    syncInterval = 5000,
    syncDelay = 200,
    initialRetryDelay = 1000,
    maxRetryDelay = 30000,
    cleanupAge = 60 * 60 * 1000, // 1 hour
    onSyncComplete,
    onSyncError,
    onSyncProgress,
  } = options

  const { isOnline } = useNetworkStatus()

  const [stats, setStats] = useState<QueueStats>({
    pending: 0,
    syncing: 0,
    synced: 0,
    failed: 0,
    total: 0,
  })
  const [isSyncing, setIsSyncing] = useState(false)
  const [isAvailable, setIsAvailable] = useState(false)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)
  const isSyncingRef = useRef(false) // Ref to avoid stale closure in interval
  const lastSyncAttemptRef = useRef<number>(0)
  const consecutiveFailuresRef = useRef<number>(0)

  // Initialize IndexedDB and device ID
  useEffect(() => {
    isMountedRef.current = true

    const init = async () => {
      if (isIndexedDBAvailable()) {
        setIsAvailable(true)
        try {
          const id = await getDeviceId()
          if (isMountedRef.current) {
            setDeviceId(id)
          }
          const currentStats = await getQueueStats()
          if (isMountedRef.current) {
            setStats(currentStats)
          }
        } catch (err) {
          console.error("Failed to initialize offline queue:", err)
        }
      }
    }
    init()

    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Refresh stats
  const refreshStats = useCallback(async () => {
    if (!isAvailable) return
    try {
      const currentStats = await getQueueStats()
      if (isMountedRef.current) {
        setStats(currentStats)
      }
    } catch (err) {
      console.error("Failed to refresh queue stats:", err)
    }
  }, [isAvailable])

  // Queue a transaction
  const queue = useCallback(
    async (payload: Omit<TransactionPayload, "idempotencyKey">): Promise<QueuedTransaction | null> => {
      if (!isAvailable || !deviceId) {
        console.error("Offline queue not available")
        return null
      }

      try {
        const idempotencyKey = generateIdempotencyKey(deviceId, payload)
        const fullPayload: TransactionPayload = {
          ...payload,
          idempotencyKey,
        }

        const queued = await queueTransaction(fullPayload, idempotencyKey)
        await refreshStats()
        return queued
      } catch (err) {
        console.error("Failed to queue transaction:", err)
        return null
      }
    },
    [isAvailable, deviceId, refreshStats]
  )

  // Sync a single transaction with exponential backoff on failure
  const syncTransaction = useCallback(
    async (transaction: QueuedTransaction): Promise<boolean> => {
      try {
        await markSyncing(transaction.id)

        const response = await fetch("/api/transactions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Idempotency-Key": transaction.idempotencyKey,
          },
          body: JSON.stringify(transaction.payload),
        })

        // 201 = created, 409 = duplicate (already synced) - both are success
        if (response.ok || response.status === 409) {
          await markSynced(transaction.id)
          consecutiveFailuresRef.current = 0 // Reset on success
          return true
        }

        const error = await response.json().catch(() => ({ message: "Unknown error" }))
        await markFailed(transaction.id, error.message || "Sync failed")
        consecutiveFailuresRef.current++
        return false
      } catch (err) {
        await markFailed(transaction.id, err instanceof Error ? err.message : "Network error")
        consecutiveFailuresRef.current++
        return false
      }
    },
    []
  )

  // Sync all pending transactions one at a time with delays
  const syncAll = useCallback(async (): Promise<{ synced: number; failed: number }> => {
    // Use ref to check syncing status to avoid stale closure issues
    if (!isAvailable || isSyncingRef.current || !isOnline) {
      return { synced: 0, failed: 0 }
    }

    // Debounce: Don't sync if we just attempted
    const now = Date.now()
    if (now - lastSyncAttemptRef.current < 1000) {
      return { synced: 0, failed: 0 }
    }
    lastSyncAttemptRef.current = now

    setIsSyncing(true)
    isSyncingRef.current = true
    let synced = 0
    let failed = 0

    try {
      // Get pending transactions
      const pending = await getPendingTransactions()

      // Also get retriable failed transactions
      const retriable = await retryFailedTransactions()
      const allToSync = [...pending, ...retriable]

      if (allToSync.length === 0) {
        return { synced: 0, failed: 0 }
      }

      const total = allToSync.length

      // Update initial progress
      if (isMountedRef.current) {
        setSyncProgress({ current: 0, total, synced: 0, failed: 0 })
      }
      onSyncProgress?.({ current: 0, total, synced: 0, failed: 0 })

      // Process transactions ONE AT A TIME to avoid flooding the server
      for (let i = 0; i < allToSync.length; i++) {
        // Check if still mounted and online
        if (!isMountedRef.current || !navigator.onLine) {
          break
        }

        const transaction = allToSync[i]
        const success = await syncTransaction(transaction)

        if (success) {
          synced++
        } else {
          failed++

          // Apply exponential backoff after failures
          if (consecutiveFailuresRef.current > 0) {
            const backoffDelay = calculateBackoff(
              consecutiveFailuresRef.current,
              initialRetryDelay,
              maxRetryDelay
            )
            await delay(backoffDelay)
          }
        }

        // Update progress
        const progress = { current: i + 1, total, synced, failed }
        if (isMountedRef.current) {
          setSyncProgress(progress)
        }
        onSyncProgress?.(progress)

        // Add delay between successful syncs to not flood the server
        if (i < allToSync.length - 1 && success) {
          await delay(syncDelay)
        }
      }

      await refreshStats()
      onSyncComplete?.(synced, failed)

      return { synced, failed }
    } catch (err) {
      console.error("Sync failed:", err)
      onSyncError?.(err instanceof Error ? err : new Error("Sync failed"))
      return { synced, failed }
    } finally {
      if (isMountedRef.current) {
        setIsSyncing(false)
        setSyncProgress(null)
      }
      isSyncingRef.current = false
    }
  }, [isAvailable, isOnline, syncDelay, initialRetryDelay, maxRetryDelay, syncTransaction, refreshStats, onSyncComplete, onSyncError, onSyncProgress])

  // Auto-sync when coming back online (with debounce)
  const prevIsOnlineRef = useRef(isOnline)
  useEffect(() => {
    const wasOffline = !prevIsOnlineRef.current
    prevIsOnlineRef.current = isOnline

    // Only trigger on transition from offline to online
    if (autoSync && wasOffline && isOnline && !isSyncingRef.current) {
      // Small delay to allow network to stabilize
      const timeoutId = setTimeout(() => {
        if (isMountedRef.current && !isSyncingRef.current) {
          syncAll()
        }
      }, 500)
      return () => clearTimeout(timeoutId)
    }
  }, [autoSync, isOnline, syncAll])

  // Periodic sync when online (uses ref to avoid stale closures)
  useEffect(() => {
    if (autoSync && isOnline && isAvailable) {
      syncIntervalRef.current = setInterval(async () => {
        // Use ref for syncing check to avoid dependency issues
        if (isSyncingRef.current) return

        try {
          const count = await getPendingCount()
          if (count > 0 && !isSyncingRef.current && isMountedRef.current) {
            syncAll()
          }
        } catch {
          // Silently ignore - will retry on next interval
        }
      }, syncInterval)

      return () => {
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current)
          syncIntervalRef.current = null
        }
      }
    }
  }, [autoSync, isOnline, isAvailable, syncInterval, syncAll])

  // Periodic cleanup of old synced transactions
  useEffect(() => {
    if (isAvailable && cleanupAge > 0) {
      // Run cleanup on mount
      cleanupSyncedTransactions(cleanupAge).catch(() => {
        // Silently ignore cleanup errors
      })

      // Run cleanup every hour
      cleanupIntervalRef.current = setInterval(async () => {
        try {
          const cleaned = await cleanupSyncedTransactions(cleanupAge)
          if (cleaned > 0 && isMountedRef.current) {
            await refreshStats()
          }
        } catch {
          // Silently ignore cleanup errors
        }
      }, 60 * 60 * 1000) // 1 hour

      return () => {
        if (cleanupIntervalRef.current) {
          clearInterval(cleanupIntervalRef.current)
          cleanupIntervalRef.current = null
        }
      }
    }
  }, [isAvailable, cleanupAge, refreshStats])

  return {
    /** Whether IndexedDB is available */
    isAvailable,
    /** Whether currently syncing */
    isSyncing,
    /** Device ID for idempotency keys */
    deviceId,
    /** Queue statistics */
    stats,
    /** Number of pending transactions */
    pendingCount: stats.pending,
    /** Whether there are pending transactions */
    hasPending: stats.pending > 0,
    /** Current sync progress (null when not syncing) */
    syncProgress,
    /** Queue a transaction for later sync */
    queue,
    /** Manually trigger sync of all pending */
    syncAll,
    /** Refresh queue statistics */
    refreshStats,
  }
}

export type { QueueStats, SyncProgress, UseOfflineQueueOptions }
