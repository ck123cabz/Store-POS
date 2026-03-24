"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Bell, AlertTriangle, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface LowStockItem {
  id: number
  name: string
  quantity: number
  parLevel: number
  unit: string
  priority: "critical" | "high" | "medium"
  stockRatio: number | null
}

interface AlertsData {
  lowStock: {
    count: number
    criticalCount: number
    items: LowStockItem[]
  }
  totalAlerts: number
}

interface POSAlertBellProps {
  currencySymbol: string
}

export function POSAlertBell({ currencySymbol: _currencySymbol }: POSAlertBellProps) {
  const [data, setData] = useState<AlertsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [open, setOpen] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchAlerts = useCallback(async () => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort("stale request")
    }
    abortControllerRef.current = new AbortController()

    try {
      const res = await fetch("/api/pos/alerts", {
        signal: abortControllerRef.current.signal,
      })
      if (res.ok) {
        const newData = await res.json()
        setData(newData)
        setError(false)
      } else {
        // Keep last known data on error, but flag error state
        setError(true)
      }
    } catch (err) {
      // Ignore abort errors (cleanup / stale request cancellation)
      if (
        err instanceof DOMException && err.name === "AbortError" ||
        abortControllerRef.current?.signal.aborted ||
        err === "cleanup" || err === "stale request"
      ) {
        return
      }
      console.error("Failed to fetch alerts:", err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAlerts().catch(() => {})
    const interval = setInterval(() => { fetchAlerts().catch(() => {}) }, 60 * 1000)
    return () => {
      clearInterval(interval)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort("cleanup")
      }
    }
  }, [fetchAlerts])

  // Show nothing only while initially loading with no data
  if (loading && !data) {
    return null
  }

  // Show error indicator if we have an error and no data
  if (error && !data) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="relative">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Unable to load alerts</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Hide if no alerts (but data loaded successfully)
  if (!data || data.totalAlerts === 0) {
    return null
  }

  const hasCritical = data.lowStock.criticalCount > 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative" aria-label={`${data.totalAlerts} inventory alerts`}>
          <Bell className={`h-5 w-5 ${hasCritical ? "text-status-critical" : "text-status-warning"}`} />
          <Badge
            variant={hasCritical ? "destructive" : "secondary"}
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            {data.totalAlerts}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-status-warning" />
          <h4 className="font-medium text-sm">Low Stock ({data.lowStock.count})</h4>
        </div>
        <div className="max-h-64 overflow-y-auto space-y-2">
          {data.lowStock.items.slice(0, 10).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between text-sm py-1 border-b last:border-0"
            >
              <div>
                <span className="font-medium">{item.name}</span>
                <div className="text-muted-foreground text-xs">
                  {item.quantity} / {item.parLevel} {item.unit}
                </div>
              </div>
              <Badge
                variant={item.priority === "critical" ? "destructive" : "secondary"}
                className={
                  item.priority === "high"
                    ? "bg-status-warning/15 text-status-warning"
                    : item.priority === "medium"
                    ? "bg-status-warning/10 text-status-warning"
                    : ""
                }
              >
                {item.priority}
              </Badge>
            </div>
          ))}
          {data.lowStock.count === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              All ingredients stocked!
            </p>
          )}
          {data.lowStock.count > 10 && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              +{data.lowStock.count - 10} more items
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
