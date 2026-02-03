"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Volume2, VolumeX, History, Loader2 } from "lucide-react"
import { OrderColumn } from "./order-column"
import {
  useKitchenOrders,
  type KitchenOrder,
} from "@/hooks/use-kitchen-orders"
import { formatDistanceToNow } from "date-fns"

export function OrderBoard() {
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [completedModalOpen, setCompletedModalOpen] = useState(false)
  const [completedOrders, setCompletedOrders] = useState<KitchenOrder[]>([])
  const [loadingCompleted, setLoadingCompleted] = useState(false)

  const { ordersByStatus, isLoading, error, updateStatus, toggleRush } =
    useKitchenOrders({ soundEnabled })

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <p className="text-red-500 mb-2">Failed to load orders</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Order Board</h1>
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

      {/* Columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        <OrderColumn
          title="NEW"
          status="new"
          orders={ordersByStatus.new}
          onUpdateStatus={updateStatus}
          onToggleRush={toggleRush}
        />
        <OrderColumn
          title="COOKING"
          status="cooking"
          orders={ordersByStatus.cooking}
          onUpdateStatus={updateStatus}
          onToggleRush={toggleRush}
        />
        <OrderColumn
          title="READY"
          status="ready"
          orders={ordersByStatus.ready}
          onUpdateStatus={updateStatus}
          onToggleRush={toggleRush}
        />
      </div>

      {/* Completed Orders Modal */}
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
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : completedOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No completed orders today</p>
              </div>
            ) : (
              <div className="space-y-3 p-1">
                {completedOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold">#{order.orderNumber}</span>
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
                          {item.quantity}x {item.productName}
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
