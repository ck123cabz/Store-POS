"use client"

import { useState, useEffect, useCallback } from "react"

interface NetworkStatus {
  isOnline: boolean
  lastChecked: number
  lastOnlineTime: number | null
}

interface UseNetworkStatusOptions {
  /** Interval in ms for periodic connectivity checks (default: 30000) */
  checkInterval?: number
  /** URL to ping for connectivity check (default: /api/health) */
  healthEndpoint?: string
}

/**
 * Hook for detecting online/offline network status
 * Combines navigator.onLine with actual endpoint pings for reliability
 */
export function useNetworkStatus(options: UseNetworkStatusOptions = {}) {
  const {
    checkInterval = 30000, // 30 seconds
    healthEndpoint = "/api/health",
  } = options

  const [status, setStatus] = useState<NetworkStatus>(() => {
    // Use lazy initialization to avoid calling Date.now() during render
    const now = Date.now()
    const browserOnline = typeof navigator !== "undefined" ? navigator.onLine : true
    return {
      isOnline: browserOnline,
      lastChecked: now,
      lastOnlineTime: browserOnline ? now : null,
    }
  })

  // Actual connectivity check via fetch
  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(healthEndpoint, {
        method: "HEAD",
        cache: "no-store",
      })
      return response.ok
    } catch {
      return false
    }
  }, [healthEndpoint])

  // Update online status
  const updateStatus = useCallback((online: boolean) => {
    setStatus((prev) => ({
      isOnline: online,
      lastChecked: Date.now(),
      lastOnlineTime: online ? Date.now() : prev.lastOnlineTime,
    }))
  }, [])

  // Manual refresh check
  const refresh = useCallback(async () => {
    const isOnline = await checkConnectivity()
    updateStatus(isOnline)
    return isOnline
  }, [checkConnectivity, updateStatus])

  useEffect(() => {
    // Browser online/offline events
    const handleOnline = async () => {
      // Verify with actual fetch before trusting navigator.onLine
      const actuallyOnline = await checkConnectivity()
      updateStatus(actuallyOnline)
    }

    const handleOffline = () => {
      updateStatus(false)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Periodic connectivity check
    const intervalId = setInterval(async () => {
      const isOnline = await checkConnectivity()
      updateStatus(isOnline)
    }, checkInterval)

    // Initial check
    checkConnectivity().then(updateStatus)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      clearInterval(intervalId)
    }
  }, [checkConnectivity, checkInterval, updateStatus])

  return {
    isOnline: status.isOnline,
    isOffline: !status.isOnline,
    lastChecked: status.lastChecked,
    lastOnlineTime: status.lastOnlineTime,
    /** Manually trigger a connectivity check */
    refresh,
  }
}

export type { NetworkStatus, UseNetworkStatusOptions }
