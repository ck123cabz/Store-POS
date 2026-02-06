"use client"

import { useState, useEffect, useCallback, useRef } from "react"

export interface SidebarBadges {
  lowStockIngredients: number
  needsPricingProducts: number
  taskProgress: {
    completed: number
    total: number
  }
}

// T044: Badge configuration per nav item
export type BadgeKey = "ingredients" | "employee"

// T049: Max consecutive failures before stopping polling (NFR-E02)
const MAX_CONSECUTIVE_FAILURES = 3
const POLL_INTERVAL_MS = 30000

export function useSidebarBadges() {
  const [badges, setBadges] = useState<SidebarBadges | null>(null)

  // T048: AbortController ref for canceling in-flight requests (NFR-P06, EC-11)
  const abortControllerRef = useRef<AbortController | null>(null)
  // T049: Track consecutive failures (NFR-E02)
  const consecutiveFailuresRef = useRef(0)
  // T047: Track if polling is paused due to visibility (NFR-P02, NFR-P03)
  const isPollingPausedRef = useRef(false)

  // T045, T046: Fetch badge counts with abort support
  const fetchBadges = useCallback(async () => {
    // T049: Stop polling after max consecutive failures
    if (consecutiveFailuresRef.current >= MAX_CONSECUTIVE_FAILURES) {
      return
    }

    // T048: Cancel any existing in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    try {
      const res = await fetch("/api/sidebar-badges", {
        signal: abortControllerRef.current.signal,
      })
      if (res.ok) {
        setBadges(await res.json())
        consecutiveFailuresRef.current = 0
      } else {
        // T051: Keep last known count on failure (EC-10)
        consecutiveFailuresRef.current++
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return
      }
      // T050, T051: Log error but keep last known badges (EC-09, EC-10)
      console.error("Failed to fetch sidebar badges:", error)
      consecutiveFailuresRef.current++
    }
  }, [])

  useEffect(() => {
    // Initial fetch (T045: non-blocking, NFR-P05)
    fetchBadges()

    // T046: Poll every 30 seconds for updates (FR-017)
    const interval = setInterval(() => {
      if (!isPollingPausedRef.current) {
        fetchBadges()
      }
    }, POLL_INTERVAL_MS)

    // T047: Visibility-based polling pause/resume (NFR-P02, NFR-P03)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isPollingPausedRef.current = true
      } else {
        isPollingPausedRef.current = false
        fetchBadges()
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchBadges])

  // T049: Get badge count for a nav item
  const getBadgeCount = useCallback(
    (badgeKey: BadgeKey | undefined): number => {
      if (!badges || !badgeKey) return 0

      switch (badgeKey) {
        case "ingredients":
          return badges.lowStockIngredients
        case "employee":
          return badges.taskProgress.total - badges.taskProgress.completed
        default:
          return 0
      }
    },
    [badges]
  )

  return { badges, getBadgeCount }
}
