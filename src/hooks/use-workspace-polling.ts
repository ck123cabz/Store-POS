"use client"

import { useState, useEffect, useCallback, useRef } from "react"

const POLL_INTERVAL_MS = 30000
const MAX_CONSECUTIVE_FAILURES = 3

interface UseWorkspacePollingOptions {
  url: string
  enabled?: boolean
}

interface UseWorkspacePollingResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useWorkspacePolling<T>({
  url,
  enabled = true,
}: UseWorkspacePollingOptions): UseWorkspacePollingResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const consecutiveFailuresRef = useRef(0)
  const isPollingPausedRef = useRef(false)
  const initialFetchDone = useRef(false)

  const fetchData = useCallback(async () => {
    if (consecutiveFailuresRef.current >= MAX_CONSECUTIVE_FAILURES) return
    if (!enabled) return

    if (abortControllerRef.current) {
      abortControllerRef.current.abort("stale request")
    }
    abortControllerRef.current = new AbortController()

    try {
      const res = await fetch(url, {
        signal: abortControllerRef.current.signal,
      })
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setError(null)
        consecutiveFailuresRef.current = 0
      } else {
        consecutiveFailuresRef.current++
        setError(`HTTP ${res.status}`)
      }
    } catch (err) {
      if (
        (err instanceof DOMException && err.name === "AbortError") ||
        abortControllerRef.current?.signal.aborted ||
        err === "cleanup" ||
        err === "stale request"
      ) {
        return
      }
      console.error(`Polling error for ${url}:`, err)
      consecutiveFailuresRef.current++
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      if (initialFetchDone.current === false) {
        initialFetchDone.current = true
        setLoading(false)
      }
    }
  }, [url, enabled])

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }

    initialFetchDone.current = false
    setLoading(true)
    consecutiveFailuresRef.current = 0
    fetchData().catch(() => {})

    const interval = setInterval(() => {
      if (!isPollingPausedRef.current) {
        fetchData().catch(() => {})
      }
    }, POLL_INTERVAL_MS)

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isPollingPausedRef.current = true
      } else {
        isPollingPausedRef.current = false
        fetchData().catch(() => {})
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort("cleanup")
      }
    }
  }, [fetchData, enabled])

  return { data, loading, error, refresh: fetchData }
}
