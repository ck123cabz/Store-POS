"use client"

import { useEffect, useState } from "react"
import { Bell, AlertTriangle, DollarSign } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface LowStockItem {
  id: number
  name: string
  quantity: number
  parLevel: number
  unit: string
  priority: "critical" | "high" | "medium"
  stockRatio: number | null
}

interface NeedsPricingItem {
  id: number
  name: string
  currentPrice: number
  suggestedPrice: number | null
  ingredientCost: number | null
}

interface AlertsData {
  lowStock: {
    count: number
    criticalCount: number
    items: LowStockItem[]
  }
  needsPricing: {
    count: number
    items: NeedsPricingItem[]
  }
  totalAlerts: number
}

interface POSAlertBellProps {
  currencySymbol: string
  onSetPrice?: (productId: number, price: number) => void
}

export function POSAlertBell({ currencySymbol, onSetPrice }: POSAlertBellProps) {
  const [data, setData] = useState<AlertsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const res = await fetch("/api/pos/alerts")
        if (res.ok) {
          setData(await res.json())
        }
      } catch (error) {
        console.error("Failed to fetch alerts:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()
    const interval = setInterval(fetchAlerts, 60 * 1000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  if (loading || !data || data.totalAlerts === 0) {
    return null
  }

  const hasCritical = data.lowStock.criticalCount > 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className={`h-5 w-5 ${hasCritical ? "text-red-500" : "text-orange-500"}`} />
          <Badge
            variant={hasCritical ? "destructive" : "secondary"}
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            {data.totalAlerts}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <Tabs defaultValue="lowStock">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="lowStock" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Low Stock ({data.lowStock.count})
            </TabsTrigger>
            <TabsTrigger value="pricing" className="text-xs">
              <DollarSign className="h-3 w-3 mr-1" />
              Needs Price ({data.needsPricing.count})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lowStock" className="mt-2">
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
          </TabsContent>

          <TabsContent value="pricing" className="mt-2">
            <div className="max-h-64 overflow-y-auto space-y-2">
              {data.needsPricing.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-sm py-2 border-b last:border-0"
                >
                  <div>
                    <span className="font-medium">{item.name}</span>
                    <div className="text-muted-foreground text-xs">
                      Cost: {currencySymbol}
                      {item.ingredientCost?.toFixed(2) || "N/A"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">
                      Current: {currencySymbol}{item.currentPrice.toFixed(2)}
                    </div>
                    {item.suggestedPrice && onSetPrice && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs mt-1"
                        onClick={() => {
                          onSetPrice(item.id, item.suggestedPrice!)
                          setOpen(false)
                        }}
                      >
                        Set {currencySymbol}{item.suggestedPrice.toFixed(2)}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {data.needsPricing.count === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  All products priced!
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}
