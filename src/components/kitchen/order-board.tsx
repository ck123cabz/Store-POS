"use client"

import { useState, useEffect, useMemo } from "react"
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
import { Skeleton } from "@/components/ui/skeleton"
import { SummaryCard, SummaryCardGrid } from "@/components/ui/summary-card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { StatusDot } from "@/components/ui/status-dot"
import {
  Volume2,
  VolumeX,
  History,
  ChefHat,
  LayoutDashboard,
  Columns3,
  Table as TableIcon,
  CircleCheckBig,
} from "lucide-react"
import { toast } from "sonner"
import { OrderColumn } from "./order-column"
import { OrderTable } from "./order-table"
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
  const [kitchenWarningMinutes, setKitchenWarningMinutes] = useState(5)
  const [kitchenDangerMinutes, setKitchenDangerMinutes] = useState(10)
  const [viewMode, setViewMode] = useState<"board" | "table">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("kitchen-view") as "board" | "table") || "board"
    }
    return "board"
  })

  const { orders, ordersByStatus, isLoading, error, updateStatus, toggleRush } =
    useKitchenOrders({ soundEnabled })

  // Persist view mode
  useEffect(() => {
    localStorage.setItem("kitchen-view", viewMode)
  }, [viewMode])

  const handleCancelOrder = async (orderId: number) => {
    const success = await updateStatus(orderId, "cancelled")
    if (success) {
      toast.success("Order cancelled")
    } else {
      toast.error("Failed to cancel order")
    }
  }

  // Offline/online detection with toast notifications
  useEffect(() => {
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

  // Fetch completed on mount so count is available for metrics + header badge
  useEffect(() => {
    fetchCompletedOrders()
  }, [])

  // Load kitchen alert thresholds from settings
  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.kitchenWarningMinutes) setKitchenWarningMinutes(data.kitchenWarningMinutes)
        if (data.kitchenDangerMinutes) setKitchenDangerMinutes(data.kitchenDangerMinutes)
      })
      .catch(() => { /* use defaults */ })
  }, [])

  const handleOpenCompleted = () => {
    setCompletedModalOpen(true)
    fetchCompletedOrders()
  }

  // Derived metrics
  const totalActive = orders.length
  const avgPrepTime = useMemo(() => {
    const cooking = ordersByStatus.cooking
    if (cooking.length === 0) return "—"
    const avg = cooking.reduce((s, o) => s + o.secondsInStatus, 0) / cooking.length
    const mins = Math.floor(avg / 60)
    const secs = Math.floor(avg % 60)
    return `${mins}:${String(secs).padStart(2, "0")}`
  }, [ordersByStatus.cooking])
  const rushCount = orders.filter((o) => o.isRush).length

  const allEmpty = totalActive === 0

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Header skeleton */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Skeleton className="h-8 w-56" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-14 rounded-full" />
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
        {/* Metrics skeleton */}
        <SummaryCardGrid>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border p-4 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </SummaryCardGrid>
        {/* Section header skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
        {/* Board columns skeleton */}
        <div className="hidden md:grid md:grid-cols-3 md:gap-4">
          {["New", "Cooking", "Ready"].map((label) => (
            <div key={label} className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-6 rounded-full" />
              </div>
              {[1, 2].map((i) => (
                <div key={i} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          ))}
        </div>
        {/* Mobile: single column skeleton */}
        <div className="md:hidden space-y-3">
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="flex-1 h-10 rounded-md" />
            ))}
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-4 w-12" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <LayoutDashboard className="h-6 w-6 text-muted-foreground shrink-0" />
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Order Command Center</h1>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot variant="ok" pulse label="LIVE" className="text-status-ok text-xs font-semibold uppercase tracking-wider" />
          <Button variant="outline" size="sm" className="min-h-[44px] md:min-h-0" onClick={handleOpenCompleted}>
            <CircleCheckBig className="h-4 w-4 mr-2" />
            Completed
            {completedOrders.length > 0 && (
              <Badge variant="secondary" className="ml-1.5">
                {completedOrders.length}
              </Badge>
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
            onClick={() => setSoundEnabled(!soundEnabled)}
            aria-label={soundEnabled ? "Mute sound notifications" : "Enable sound notifications"}
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

      {/* Metrics Row */}
      <SummaryCardGrid>
        <SummaryCard label="Total Active" value={String(totalActive)} />
        <SummaryCard
          label="Avg Prep Time"
          value=""
          valueNode={<span className="text-status-info">{avgPrepTime}</span>}
        />
        <SummaryCard
          label="Completed Today"
          value=""
          valueNode={<span className="text-status-ok">{completedOrders.length}</span>}
        />
        <SummaryCard
          label="Rush Orders"
          value=""
          valueNode={
            <span className={cn(rushCount > 0 && "text-status-warning")}>
              {rushCount}
            </span>
          }
        />
      </SummaryCardGrid>

      {/* Section header with view toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Active Orders
        </h2>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={viewMode}
          onValueChange={(v) => { if (v) setViewMode(v as "board" | "table") }}
          aria-label="View mode"
        >
          <ToggleGroupItem value="board" aria-label="Board view">
            <Columns3 className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="table" aria-label="Table view">
            <TableIcon className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Board/Table content */}
      {allEmpty ? (
        <EmptyState
          icon={<ChefHat className="h-12 w-12" />}
          title="Kitchen is clear"
          description="No pending orders right now. New orders will appear here automatically."
        />
      ) : viewMode === "board" ? (
        <>
          {/* Mobile: column selector pills */}
          <div className="flex gap-2 md:hidden">
            {columnTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveColumn(tab.key)}
                className={cn(
                  "flex-1 rounded-md px-3 py-2 min-h-[44px] text-sm font-medium transition-colors",
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
              onCancelOrder={handleCancelOrder}
              onToggleRush={toggleRush}
              warningMinutes={kitchenWarningMinutes}
              dangerMinutes={kitchenDangerMinutes}
            />
          </div>

          {/* Tablet+: 3-column grid */}
          <div className="hidden md:grid md:grid-cols-3 md:gap-4">
            <OrderColumn
              status="new"
              orders={ordersByStatus.new}
              onUpdateStatus={updateStatus}
              onCancelOrder={handleCancelOrder}
              onToggleRush={toggleRush}
              warningMinutes={kitchenWarningMinutes}
              dangerMinutes={kitchenDangerMinutes}
            />
            <OrderColumn
              status="cooking"
              orders={ordersByStatus.cooking}
              onUpdateStatus={updateStatus}
              onCancelOrder={handleCancelOrder}
              onToggleRush={toggleRush}
              warningMinutes={kitchenWarningMinutes}
              dangerMinutes={kitchenDangerMinutes}
            />
            <OrderColumn
              status="ready"
              orders={ordersByStatus.ready}
              onUpdateStatus={updateStatus}
              onCancelOrder={handleCancelOrder}
              onToggleRush={toggleRush}
              warningMinutes={kitchenWarningMinutes}
              dangerMinutes={kitchenDangerMinutes}
            />
          </div>
        </>
      ) : (
        <OrderTable
          orders={orders}
          onUpdateStatus={updateStatus}
          onCancelOrder={handleCancelOrder}
          onToggleRush={toggleRush}
        />
      )}

      {/* Completed Orders Dialog */}
      <Dialog open={completedModalOpen} onOpenChange={setCompletedModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Today&apos;s Completed Orders
              <Badge variant="secondary">{completedOrders.length}</Badge>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {loadingCompleted ? (
              <div className="space-y-3 p-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 rounded-lg border space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                    <div className="flex gap-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                ))}
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
