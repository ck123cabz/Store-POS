"use client"

import { useEffect, useState } from "react"
import { AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"

interface LowStockItem {
  id: number
  name: string
  quantity: number
  parLevel: number
  unit: string
  priority: "critical" | "high" | "medium" | "low"
  stockRatio: number
}

interface LowStockData {
  count: number
  items: LowStockItem[]
}

export function LowStockAlert() {
  const [data, setData] = useState<LowStockData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLowStock() {
      try {
        const res = await fetch("/api/ingredients/low-stock")
        if (res.ok) {
          setData(await res.json())
        }
      } catch (error) {
        console.error("Failed to fetch low stock:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchLowStock()
    // Refresh every 5 minutes
    const interval = setInterval(fetchLowStock, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading || !data || data.count === 0) {
    return null
  }

  const criticalCount = data.items.filter((i) => i.priority === "critical").length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <AlertTriangle className={`h-5 w-5 ${criticalCount > 0 ? "text-red-500" : "text-orange-500"}`} />
          <Badge
            variant={criticalCount > 0 ? "destructive" : "secondary"}
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            {data.count}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-2">
          <h4 className="font-medium">Low Stock Alert</h4>
          <div className="text-sm text-muted-foreground">
            {data.count} item{data.count !== 1 ? "s" : ""} below threshold
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {data.items.slice(0, 10).map((item) => (
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
                      ? "bg-orange-100 text-orange-800"
                      : item.priority === "medium"
                      ? "bg-yellow-100 text-yellow-800"
                      : ""
                  }
                >
                  {item.priority}
                </Badge>
              </div>
            ))}
          </div>
          {data.count > 10 && (
            <div className="text-xs text-muted-foreground text-center pt-2">
              +{data.count - 10} more items
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
