"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { EmptyState } from "@/components/ui/empty-state"
import { Volume2, VolumeX, History, Loader2, ChefHat } from "lucide-react"
import { toast } from "sonner"
import { OrderColumn } from "./order-column"
import {
  useKitchenOrders,
  type KitchenOrder,
} from "@/hooks/use-kitchen-orders"
import { formatDistanceToNow } from "date-fns"

type ColumnKey = "new" | "cooking" | "ready"

const columnTabs: { key: ColumnKey; label: string }[] = [
  { key: "new", label: "New" },
  { key: "cooking", label: "Cooking" },
  { key: "ready", label: "Ready" },
]

export function OrderBoard() {
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [completedModalOpen, setCompletedModalOpen] = useState(false)
  const [completedOrders, setCompletedOrders] = useState<KitchenOrder[]>([])
  const [loadingCompleted, setLoadingCompleted] = useState(false)
  const [activeColumn, setActiveColumn] = useState<ColumnKey>("new")

  const { ordersByStatus, isLoading, error, updateStatus, toggleRush } =
    useKitchenOrders({ soundEnabled })

  // Offline/online detection with toast notifications
  useEffect(() => {
    // Check initial state on mount
    if (!navigator.onLine) {
      toast.warning("You're offline", {
        description: "Kitchen orders will sync when connection is restored.",
        duration: Infinity,
        id: "offline-toast",
      })
    }

    const handleOffline = () => {
      toast.warning("You're offline", {
        description: "Kitchen orders will sync when connection is restored.",
        duration: Infinity,
        id: "offline-toast",
      })
    }

    const handleOnline = () => {
      toast.success("Back online", {
        description: "Kitchen orders are syncing.",
        id: "offline-toast",
        duration: 3000,
      })
    }

    window.addEventListener("offline", handleOffline)
    window.addEventListener("online", handleOnline)

    return () => {
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("online", handleOnline)
    }
  }, [])

  const fetchCompletedOrders = async () => {
    setLoadingCompleted(true)
    try {
      const response = await fetch("/api/kitchen-orders/completed")
      if (response.ok) {
        const data = await response.json()
        setCompletedOrders(data.orders)
      }
    } catch (err) {
      console.error("Failed to fetch completed orders:", err)
    } finally {
      setLoadingCompleted(false)
    }
  }

  const handleOpenCompleted = () => {
    setCompletedModalOpen(true)
    fetchCompletedOrders()
  }

  const totalOrders =
    ordersByStatus.new.length +
    ordersByStatus.cooking.length +
    ordersByStatus.ready.length

  const allEmpty = totalOrders === 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground mb-1">
            Failed to load orders
          </p>
          <p className="text-sm text-muted-foreground/70">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Kitchen Orders</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleOpenCompleted}>
            <History className="h-4 w-4 mr-2" />
            Today&apos;s Completed
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Mute notifications" : "Enable notifications"}
          >
            {soundEnabled ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <VolumeX className="h-5 w-5 text-muted-foreground" />
            )}
          </Button>
        </div>
      </div>

      {/* Board content */}
      {allEmpty ? (
        <EmptyState
          icon={<ChefHat className="h-12 w-12" />}
          title="Kitchen is clear"
          description="No pending orders. New orders will appear here automatically."
        />
      ) : (
        <>
          {/* Mobile: column selector pills */}
          <div className="flex gap-2 md:hidden">
            {columnTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveColumn(tab.key)}
                className={cn(
                  "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  activeColumn === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                {ordersByStatus[tab.key].length > 0 && (
                  <span className="ml-1.5 font-mono tabular-nums">
                    ({ordersByStatus[tab.key].length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Mobile: single active column */}
          <div className="md:hidden">
            <OrderColumn
              status={activeColumn}
              orders={ordersByStatus[activeColumn]}
              onUpdateStatus={updateStatus}
              onToggleRush={toggleRush}
            />
          </div>

          {/* Tablet+: 3-column grid */}
          <div className="hidden md:grid md:grid-cols-3 md:gap-4">
            <OrderColumn
              status="new"
              orders={ordersByStatus.new}
              onUpdateStatus={updateStatus}
              onToggleRush={toggleRush}
            />
            <OrderColumn
              status="cooking"
              orders={ordersByStatus.cooking}
              onUpdateStatus={updateStatus}
              onToggleRush={toggleRush}
            />
            <OrderColumn
              status="ready"
              orders={ordersByStatus.ready}
              onUpdateStatus={updateStatus}
              onToggleRush={toggleRush}
            />
          </div>
        </>
      )}

      {/* Completed Orders Dialog */}
      <Dialog open={completedModalOpen} onOpenChange={setCompletedModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Today&apos;s Completed Orders
              <Badge variant="secondary">{completedOrders.length}</Badge>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {loadingCompleted ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : completedOrders.length === 0 ? (
              <EmptyState
                icon={<History className="h-10 w-10" />}
                title="No completed orders today"
              />
            ) : (
              <div className="space-y-3 p-1">
                {completedOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold font-mono tabular-nums">
                        #{order.orderNumber}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Served{" "}
                        {order.servedAt &&
                          formatDistanceToNow(new Date(order.servedAt), {
                            addSuffix: true,
                          })}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {order.items.map((item) => (
                        <span key={item.id} className="mr-3">
                          <span className="font-mono tabular-nums">
                            {item.quantity}x
                          </span>{" "}
                          {item.productName}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
