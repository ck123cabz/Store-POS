"use client"

import { useState, useEffect, useCallback } from "react"

interface Settings {
  currencySymbol: string
  storeName: string
  taxPercentage: number
  chargeTax: boolean
}

interface UseSettingsReturn {
  settings: Settings | null
  currencySymbol: string
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const DEFAULT_CURRENCY_SYMBOL = "$"

/**
 * Hook to fetch and cache store settings.
 * Provides currencySymbol with fallback to "$" while loading or on error.
 */
export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/settings")
      if (!response.ok) {
        throw new Error("Failed to fetch settings")
      }

      const data = await response.json()
      setSettings({
        currencySymbol: data.currencySymbol || DEFAULT_CURRENCY_SYMBOL,
        storeName: data.storeName || "",
        taxPercentage: parseFloat(data.taxPercentage) || 0,
        chargeTax: data.chargeTax ?? false,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
      // Keep existing settings on error, or use defaults
      if (!settings) {
        setSettings({
          currencySymbol: DEFAULT_CURRENCY_SYMBOL,
          storeName: "",
          taxPercentage: 0,
          chargeTax: false,
        })
      }
    } finally {
      setLoading(false)
    }
  }, [settings])

  useEffect(() => {
    fetchSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    settings,
    currencySymbol: settings?.currencySymbol || DEFAULT_CURRENCY_SYMBOL,
    loading,
    error,
    refetch: fetchSettings,
  }
}
