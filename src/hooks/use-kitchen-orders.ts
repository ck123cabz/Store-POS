"use client"

import { useState, useEffect, useCallback, useRef } from "react"

export interface KitchenOrderItem {
  id: number
  productId: number
  productName: string
  quantity: number
}

export interface KitchenOrder {
  id: number
  transactionId: number
  orderNumber: number
  status: "new" | "cooking" | "ready" | "served" | "cancelled"
  isRush: boolean
  displayOrder: number
  sentAt: string
  cookingAt: string | null
  readyAt: string | null
  servedAt: string | null
  secondsInStatus: number
  items: KitchenOrderItem[]
}

interface UseKitchenOrdersOptions {
  /** Polling interval in milliseconds (default: 5000) */
  pollInterval?: number
  /** Enable sound notifications for new orders (default: true) */
  soundEnabled?: boolean
}

/**
 * Hook for managing kitchen orders with polling and sound notifications
 * Provides real-time updates for the kitchen display system
 */
export function useKitchenOrders(options: UseKitchenOrdersOptions = {}) {
  const { pollInterval = 5000, soundEnabled = true } = options

  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const lastFetchTime = useRef<string | null>(null)
  const audioContext = useRef<AudioContext | null>(null)

  // Play notification sound using Web Audio API
  const playSound = useCallback(() => {
    if (!soundEnabled) return

    try {
      if (!audioContext.current) {
        audioContext.current = new AudioContext()
      }

      const ctx = audioContext.current
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.frequency.value = 800
      oscillator.type = "sine"
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.3)
    } catch (err) {
      console.warn("Failed to play notification sound:", err)
    }
  }, [soundEnabled])

  // Fetch orders from API
  const fetchOrders = useCallback(async () => {
    try {
      const url = lastFetchTime.current
        ? `/api/kitchen-orders?since=${encodeURIComponent(lastFetchTime.current)}`
        : "/api/kitchen-orders"

      const response = await fetch(url)
      if (!response.ok) throw new Error("Failed to fetch orders")

      const data = await response.json()

      setOrders(data.orders)
      setError(null)

      // Play sound if there are new orders since last fetch
      if (data.hasNewSince && lastFetchTime.current) {
        playSound()
      }

      lastFetchTime.current = new Date().toISOString()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch orders")
    } finally {
      setIsLoading(false)
    }
  }, [playSound])

  // Update order status
  const updateStatus = useCallback(
    async (orderId: number, status: string) => {
      try {
        const response = await fetch(`/api/kitchen-orders/${orderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        })

        if (!response.ok) throw new Error("Failed to update status")

        // Refresh orders to get updated state
        await fetchOrders()
        return true
      } catch (err) {
        console.error("Failed to update status:", err)
        return false
      }
    },
    [fetchOrders]
  )

  // Toggle rush flag
  const toggleRush = useCallback(
    async (orderId: number, isRush: boolean) => {
      try {
        const response = await fetch(`/api/kitchen-orders/${orderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isRush }),
        })

        if (!response.ok) throw new Error("Failed to toggle rush")

        await fetchOrders()
        return true
      } catch (err) {
        console.error("Failed to toggle rush:", err)
        return false
      }
    },
    [fetchOrders]
  )

  // Reorder orders within a column
  const reorder = useCallback(
    async (ordersToReorder: { id: number; displayOrder: number }[]) => {
      try {
        const response = await fetch("/api/kitchen-orders/reorder", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orders: ordersToReorder }),
        })

        if (!response.ok) throw new Error("Failed to reorder")

        await fetchOrders()
        return true
      } catch (err) {
        console.error("Failed to reorder:", err)
        return false
      }
    },
    [fetchOrders]
  )

  // Initial fetch and polling setup
  useEffect(() => {
    fetchOrders()

    const interval = setInterval(fetchOrders, pollInterval)
    return () => clearInterval(interval)
  }, [fetchOrders, pollInterval])

  // Group orders by status for kanban columns
  const ordersByStatus = {
    new: orders.filter((o) => o.status === "new"),
    cooking: orders.filter((o) => o.status === "cooking"),
    ready: orders.filter((o) => o.status === "ready"),
  }

  return {
    /** All active orders */
    orders,
    /** Orders grouped by status for kanban display */
    ordersByStatus,
    /** Loading state for initial fetch */
    isLoading,
    /** Error message if fetch failed */
    error,
    /** Update an order's status */
    updateStatus,
    /** Toggle rush flag on an order */
    toggleRush,
    /** Bulk update display order for reordering */
    reorder,
    /** Manually trigger a refresh */
    refresh: fetchOrders,
  }
}

export type { UseKitchenOrdersOptions }
