"use client"

import { useState, useEffect, useCallback } from "react"

interface Settings {
  appMode: string
  currencySymbol: string
  storeName: string
  taxPercentage: number
  chargeTax: boolean
  logo: string
  // Business Rules
  voidWindowDays: number
  voidReasons: string[]
  wasteReasons: string[]
  daypartMorningStart: number
  daypartMiddayStart: number
  daypartAfternoonStart: number
  daypartEveningStart: number
  kitchenWarningMinutes: number
  kitchenDangerMinutes: number
  lowStockCriticalRatio: number
  lowStockWarningRatio: number
  stockCriticalMax: number
  stockLowMax: number
  creditWarningThreshold: number
  suggestedPriceMarkup: number
}

interface UseSettingsReturn {
  settings: Settings | null
  currencySymbol: string
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const DEFAULT_CURRENCY_SYMBOL = "$"

const DEFAULT_SETTINGS: Settings = {
  appMode: "Point of Sale",
  currencySymbol: DEFAULT_CURRENCY_SYMBOL,
  storeName: "",
  taxPercentage: 0,
  chargeTax: false,
  logo: "",
  voidWindowDays: 7,
  voidReasons: ["Wrong Items", "Test Transaction", "Customer Dispute", "Duplicate Entry", "Other"],
  wasteReasons: ["Expired", "Spoiled", "Overproduction", "Prep Waste", "Dropped/Spilled", "Quality Issue", "Customer Return", "Other"],
  daypartMorningStart: 6,
  daypartMiddayStart: 10,
  daypartAfternoonStart: 14,
  daypartEveningStart: 18,
  kitchenWarningMinutes: 5,
  kitchenDangerMinutes: 10,
  lowStockCriticalRatio: 0.25,
  lowStockWarningRatio: 0.50,
  stockCriticalMax: 5,
  stockLowMax: 20,
  creditWarningThreshold: 0.80,
  suggestedPriceMarkup: 1.50,
}

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
        appMode: data.appMode || "Point of Sale",
        currencySymbol: data.currencySymbol || DEFAULT_CURRENCY_SYMBOL,
        storeName: data.storeName || "",
        taxPercentage: parseFloat(data.taxPercentage) || 0,
        chargeTax: data.chargeTax ?? false,
        logo: data.logo || "",
        voidWindowDays: data.voidWindowDays ?? 7,
        voidReasons: Array.isArray(data.voidReasons) ? data.voidReasons : DEFAULT_SETTINGS.voidReasons,
        wasteReasons: Array.isArray(data.wasteReasons) ? data.wasteReasons : DEFAULT_SETTINGS.wasteReasons,
        daypartMorningStart: data.daypartMorningStart ?? 6,
        daypartMiddayStart: data.daypartMiddayStart ?? 10,
        daypartAfternoonStart: data.daypartAfternoonStart ?? 14,
        daypartEveningStart: data.daypartEveningStart ?? 18,
        kitchenWarningMinutes: data.kitchenWarningMinutes ?? 5,
        kitchenDangerMinutes: data.kitchenDangerMinutes ?? 10,
        lowStockCriticalRatio: data.lowStockCriticalRatio ?? 0.25,
        lowStockWarningRatio: data.lowStockWarningRatio ?? 0.50,
        stockCriticalMax: data.stockCriticalMax ?? 5,
        stockLowMax: data.stockLowMax ?? 20,
        creditWarningThreshold: data.creditWarningThreshold ?? 0.80,
        suggestedPriceMarkup: data.suggestedPriceMarkup ?? 1.50,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
      if (!settings) {
        setSettings(DEFAULT_SETTINGS)
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
