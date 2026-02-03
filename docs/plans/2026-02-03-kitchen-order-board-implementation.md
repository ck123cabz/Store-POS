# Kitchen Order Board Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Kitchen Display System (KDS) where kitchen and counter staff see and manage orders through statuses (New → Cooking → Ready → Served) with real-time updates and sound alerts.

**Architecture:** Separate `KitchenOrder` model linked to `Transaction`. Orders auto-create when payment completes (Pay Now) or added to tab (Pay Later). Single shared Order Board page with kanban columns. Polling-based real-time updates with sound notifications.

**Tech Stack:** Next.js 16 App Router, Prisma ORM, React 19, Tailwind CSS, Radix UI, Web Audio API for sounds

---

## Task 1: Database Schema - KitchenOrder Models

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add KitchenOrder and KitchenOrderItem models to schema**

Add after the Transaction model (around line 220):

```prisma
// ═══════════════════════════════════════════════════════════════════════════════
// KITCHEN ORDER BOARD - Order tracking for kitchen display
// ═══════════════════════════════════════════════════════════════════════════════

model KitchenOrder {
  id            Int       @id @default(autoincrement())
  transactionId Int       @map("transaction_id")
  orderNumber   Int       @map("order_number")

  // Status: new → cooking → ready → served → cancelled
  status        String    @default("new")

  // Timestamps
  sentAt        DateTime  @default(now()) @map("sent_at")
  cookingAt     DateTime? @map("cooking_at")
  readyAt       DateTime? @map("ready_at")
  servedAt      DateTime? @map("served_at")

  // Priority
  isRush        Boolean   @default(false) @map("is_rush")
  displayOrder  Int       @default(0) @map("display_order")

  // Relations
  transaction   Transaction @relation(fields: [transactionId], references: [id])
  items         KitchenOrderItem[]

  @@index([status])
  @@index([sentAt])
  @@map("kitchen_orders")
}

model KitchenOrderItem {
  id             Int      @id @default(autoincrement())
  kitchenOrderId Int      @map("kitchen_order_id")
  productId      Int      @map("product_id")
  productName    String   @map("product_name")
  quantity       Int

  kitchenOrder   KitchenOrder @relation(fields: [kitchenOrderId], references: [id], onDelete: Cascade)

  @@map("kitchen_order_items")
}
```

**Step 2: Add requiresKitchen to Category model**

Find the Category model and add:

```prisma
model Category {
  // ... existing fields
  requiresKitchen  Boolean @default(false) @map("requires_kitchen")
  // ... rest of fields
}
```

**Step 3: Add requiresKitchen to Product model**

Find the Product model and add after existing fields:

```prisma
model Product {
  // ... existing fields
  requiresKitchen  Boolean? @map("requires_kitchen")  // null = use category default
  // ... rest of fields
}
```

**Step 4: Add kitchenOrders relation to Transaction model**

Find the Transaction model and add to relations section:

```prisma
model Transaction {
  // ... existing fields and relations
  kitchenOrders    KitchenOrder[]
  // ... rest
}
```

**Step 5: Run migration**

```bash
npx prisma migrate dev --name add-kitchen-order-board
```

Expected: Migration creates kitchen_orders and kitchen_order_items tables, adds requires_kitchen columns.

**Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add KitchenOrder models and requiresKitchen fields"
```

---

## Task 2: Kitchen Orders API - GET Endpoint

**Files:**
- Create: `src/app/api/kitchen-orders/route.ts`

**Step 1: Create the GET endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const since = searchParams.get("since")

    // Get active orders (not served or cancelled)
    const orders = await prisma.kitchenOrder.findMany({
      where: {
        status: {
          in: ["new", "cooking", "ready"],
        },
      },
      include: {
        items: true,
      },
      orderBy: [
        { isRush: "desc" },
        { displayOrder: "asc" },
        { sentAt: "asc" },
      ],
    })

    // Calculate seconds in current status for each order
    const now = new Date()
    const ordersWithTiming = orders.map((order) => {
      let statusStartTime: Date
      switch (order.status) {
        case "ready":
          statusStartTime = order.readyAt || order.sentAt
          break
        case "cooking":
          statusStartTime = order.cookingAt || order.sentAt
          break
        default:
          statusStartTime = order.sentAt
      }
      const secondsInStatus = Math.floor(
        (now.getTime() - statusStartTime.getTime()) / 1000
      )

      return {
        ...order,
        secondsInStatus,
      }
    })

    // Check if there are new orders since the provided timestamp
    let hasNewSince = false
    if (since) {
      const sinceDate = new Date(since)
      hasNewSince = orders.some((order) => order.sentAt > sinceDate)
    }

    return NextResponse.json({
      orders: ordersWithTiming,
      hasNewSince,
    })
  } catch (error) {
    console.error("Failed to fetch kitchen orders:", error)
    return NextResponse.json(
      { error: "Failed to fetch kitchen orders" },
      { status: 500 }
    )
  }
}
```

**Step 2: Test the endpoint manually**

```bash
curl -X GET http://localhost:3000/api/kitchen-orders -H "Cookie: <session-cookie>"
```

Expected: Returns `{ orders: [], hasNewSince: false }` (empty initially)

**Step 3: Commit**

```bash
git add src/app/api/kitchen-orders/route.ts
git commit -m "feat(api): add GET /api/kitchen-orders endpoint"
```

---

## Task 3: Kitchen Orders API - POST and PATCH Endpoints

**Files:**
- Modify: `src/app/api/kitchen-orders/route.ts`
- Create: `src/app/api/kitchen-orders/[id]/route.ts`
- Create: `src/app/api/kitchen-orders/reorder/route.ts`
- Create: `src/app/api/kitchen-orders/completed/route.ts`

**Step 1: Add POST to route.ts for creating kitchen orders**

Add to `src/app/api/kitchen-orders/route.ts`:

```typescript
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    if (!body.transactionId || !body.orderNumber || !body.items?.length) {
      return NextResponse.json(
        { error: "transactionId, orderNumber, and items are required" },
        { status: 400 }
      )
    }

    const kitchenOrder = await prisma.kitchenOrder.create({
      data: {
        transactionId: body.transactionId,
        orderNumber: body.orderNumber,
        status: "new",
        items: {
          create: body.items.map((item: { productId: number; productName: string; quantity: number }) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: true,
      },
    })

    return NextResponse.json(kitchenOrder)
  } catch (error) {
    console.error("Failed to create kitchen order:", error)
    return NextResponse.json(
      { error: "Failed to create kitchen order" },
      { status: 500 }
    )
  }
}
```

**Step 2: Create [id]/route.ts for PATCH (status updates)**

Create `src/app/api/kitchen-orders/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const kitchenOrder = await prisma.kitchenOrder.findUnique({
      where: { id: parseInt(id) },
      include: { items: true },
    })

    if (!kitchenOrder) {
      return NextResponse.json({ error: "Kitchen order not found" }, { status: 404 })
    }

    return NextResponse.json(kitchenOrder)
  } catch (error) {
    console.error("Failed to fetch kitchen order:", error)
    return NextResponse.json(
      { error: "Failed to fetch kitchen order" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Build update data based on what's provided
    const updateData: {
      status?: string
      isRush?: boolean
      displayOrder?: number
      cookingAt?: Date
      readyAt?: Date
      servedAt?: Date
    } = {}

    if (body.status !== undefined) {
      const validStatuses = ["new", "cooking", "ready", "served", "cancelled"]
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
          { status: 400 }
        )
      }
      updateData.status = body.status

      // Set timestamps based on status change
      const now = new Date()
      if (body.status === "cooking") {
        updateData.cookingAt = now
      } else if (body.status === "ready") {
        updateData.readyAt = now
      } else if (body.status === "served") {
        updateData.servedAt = now
      }
    }

    if (body.isRush !== undefined) {
      updateData.isRush = body.isRush
    }

    if (body.displayOrder !== undefined) {
      updateData.displayOrder = body.displayOrder
    }

    const kitchenOrder = await prisma.kitchenOrder.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: { items: true },
    })

    return NextResponse.json(kitchenOrder)
  } catch (error) {
    console.error("Failed to update kitchen order:", error)
    return NextResponse.json(
      { error: "Failed to update kitchen order" },
      { status: 500 }
    )
  }
}
```

**Step 3: Create reorder/route.ts for bulk displayOrder updates**

Create `src/app/api/kitchen-orders/reorder/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    if (!body.orders || !Array.isArray(body.orders)) {
      return NextResponse.json(
        { error: "orders array is required" },
        { status: 400 }
      )
    }

    // Validate each order item
    for (const order of body.orders) {
      if (typeof order.id !== "number" || typeof order.displayOrder !== "number") {
        return NextResponse.json(
          { error: "Each order must have numeric id and displayOrder" },
          { status: 400 }
        )
      }
    }

    // Update all orders in a transaction
    await prisma.$transaction(
      body.orders.map((order: { id: number; displayOrder: number }) =>
        prisma.kitchenOrder.update({
          where: { id: order.id },
          data: { displayOrder: order.displayOrder },
        })
      )
    )

    return NextResponse.json({ message: "Orders reordered successfully" })
  } catch (error) {
    console.error("Failed to reorder kitchen orders:", error)
    return NextResponse.json(
      { error: "Failed to reorder kitchen orders" },
      { status: 500 }
    )
  }
}
```

**Step 4: Create completed/route.ts for today's completed orders**

Create `src/app/api/kitchen-orders/completed/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get today's start
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const orders = await prisma.kitchenOrder.findMany({
      where: {
        status: "served",
        servedAt: {
          gte: today,
        },
      },
      include: {
        items: true,
      },
      orderBy: {
        servedAt: "desc",
      },
    })

    return NextResponse.json({ orders })
  } catch (error) {
    console.error("Failed to fetch completed orders:", error)
    return NextResponse.json(
      { error: "Failed to fetch completed orders" },
      { status: 500 }
    )
  }
}
```

**Step 5: Commit**

```bash
git add src/app/api/kitchen-orders/
git commit -m "feat(api): add kitchen orders CRUD endpoints"
```

---

## Task 4: Integrate Kitchen Order Creation into Transaction API

**Files:**
- Modify: `src/app/api/transactions/route.ts`

**Step 1: Add helper function to check if product requires kitchen**

Add near the top of the file, after imports:

```typescript
// Check if a product requires kitchen preparation
async function productRequiresKitchen(productId: number): Promise<boolean> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { category: true },
  })

  if (!product) return false

  // Product-level override takes precedence
  if (product.requiresKitchen !== null) {
    return product.requiresKitchen
  }

  // Fall back to category default
  return product.category?.requiresKitchen ?? false
}
```

**Step 2: Add kitchen order creation inside the transaction**

Find the section after `const transaction = await prisma.$transaction(async (tx) => {` and after the transaction is created but before the stock decrement logic. Add kitchen order creation there.

Inside the `prisma.$transaction` block, after `const newTransaction = await tx.transaction.create(...)`, add:

```typescript
      // ═══════════════════════════════════════════════════════════════════════════
      // KITCHEN ORDER BOARD - Auto-create kitchen order for food items
      // ═══════════════════════════════════════════════════════════════════════════

      // Check which items require kitchen preparation
      const kitchenItems: { productId: number; productName: string; quantity: number }[] = []

      for (const item of body.items) {
        const requiresKitchen = await productRequiresKitchen(item.id)
        if (requiresKitchen) {
          kitchenItems.push({
            productId: item.id,
            productName: item.productName,
            quantity: item.quantity,
          })
        }
      }

      // Create kitchen order if there are kitchen items and order is being paid/tabbed
      let kitchenOrderId: number | null = null
      if (kitchenItems.length > 0 && body.status === 1) {
        const kitchenOrder = await tx.kitchenOrder.create({
          data: {
            transactionId: newTransaction.id,
            orderNumber: newTransaction.orderNumber,
            status: "new",
            items: {
              create: kitchenItems,
            },
          },
        })
        kitchenOrderId = kitchenOrder.id
      }
```

**Step 3: Include kitchen order info in response**

Modify the return inside the transaction to include kitchenOrderId:

```typescript
      return { ...newTransaction, kitchenOrderId }
```

And update the final response to include kitchen status:

```typescript
    return NextResponse.json({
      ...transaction,
      kitchenStatus: transaction.kitchenOrderId ? "new" : null,
    })
```

**Step 4: Test by creating a transaction**

Create a transaction with a food item (after marking a category/product as requiresKitchen in the database):

```sql
UPDATE categories SET requires_kitchen = true WHERE name = 'Food';
```

Then create a transaction and verify kitchen order is created.

**Step 5: Commit**

```bash
git add src/app/api/transactions/route.ts
git commit -m "feat(api): auto-create kitchen order on transaction completion"
```

---

## Task 5: Kitchen Order Hook - useKitchenOrders

**Files:**
- Create: `src/hooks/use-kitchen-orders.ts`

**Step 1: Create the hook**

```typescript
"use client"

import { useState, useEffect, useCallback, useRef } from "react"

export interface KitchenOrderItem {
  id: number
  productId: number
  productName: string
  quantity: number
}

export interface KitchenOrder {
  id: number
  transactionId: number
  orderNumber: number
  status: "new" | "cooking" | "ready" | "served" | "cancelled"
  isRush: boolean
  displayOrder: number
  sentAt: string
  cookingAt: string | null
  readyAt: string | null
  servedAt: string | null
  secondsInStatus: number
  items: KitchenOrderItem[]
}

interface UseKitchenOrdersOptions {
  pollInterval?: number
  soundEnabled?: boolean
}

export function useKitchenOrders(options: UseKitchenOrdersOptions = {}) {
  const { pollInterval = 5000, soundEnabled = true } = options

  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const lastFetchTime = useRef<string | null>(null)
  const audioContext = useRef<AudioContext | null>(null)

  // Play notification sound
  const playSound = useCallback(() => {
    if (!soundEnabled) return

    try {
      if (!audioContext.current) {
        audioContext.current = new AudioContext()
      }

      const ctx = audioContext.current
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.frequency.value = 800
      oscillator.type = "sine"
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.3)
    } catch (err) {
      console.warn("Failed to play notification sound:", err)
    }
  }, [soundEnabled])

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      const url = lastFetchTime.current
        ? `/api/kitchen-orders?since=${encodeURIComponent(lastFetchTime.current)}`
        : "/api/kitchen-orders"

      const response = await fetch(url)
      if (!response.ok) throw new Error("Failed to fetch orders")

      const data = await response.json()

      setOrders(data.orders)
      setError(null)

      // Play sound if there are new orders
      if (data.hasNewSince && lastFetchTime.current) {
        playSound()
      }

      lastFetchTime.current = new Date().toISOString()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch orders")
    } finally {
      setIsLoading(false)
    }
  }, [playSound])

  // Update order status
  const updateStatus = useCallback(async (orderId: number, status: string) => {
    try {
      const response = await fetch(`/api/kitchen-orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) throw new Error("Failed to update status")

      // Refresh orders
      await fetchOrders()
      return true
    } catch (err) {
      console.error("Failed to update status:", err)
      return false
    }
  }, [fetchOrders])

  // Toggle rush flag
  const toggleRush = useCallback(async (orderId: number, isRush: boolean) => {
    try {
      const response = await fetch(`/api/kitchen-orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRush }),
      })

      if (!response.ok) throw new Error("Failed to toggle rush")

      await fetchOrders()
      return true
    } catch (err) {
      console.error("Failed to toggle rush:", err)
      return false
    }
  }, [fetchOrders])

  // Reorder orders within a column
  const reorder = useCallback(async (ordersToReorder: { id: number; displayOrder: number }[]) => {
    try {
      const response = await fetch("/api/kitchen-orders/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders: ordersToReorder }),
      })

      if (!response.ok) throw new Error("Failed to reorder")

      await fetchOrders()
      return true
    } catch (err) {
      console.error("Failed to reorder:", err)
      return false
    }
  }, [fetchOrders])

  // Initial fetch and polling
  useEffect(() => {
    fetchOrders()

    const interval = setInterval(fetchOrders, pollInterval)
    return () => clearInterval(interval)
  }, [fetchOrders, pollInterval])

  // Group orders by status
  const ordersByStatus = {
    new: orders.filter((o) => o.status === "new"),
    cooking: orders.filter((o) => o.status === "cooking"),
    ready: orders.filter((o) => o.status === "ready"),
  }

  return {
    orders,
    ordersByStatus,
    isLoading,
    error,
    updateStatus,
    toggleRush,
    reorder,
    refresh: fetchOrders,
  }
}
```

**Step 2: Commit**

```bash
git add src/hooks/use-kitchen-orders.ts
git commit -m "feat(hooks): add useKitchenOrders hook with polling and sound"
```

---

## Task 6: Order Board UI Components

**Files:**
- Create: `src/components/kitchen/order-card.tsx`
- Create: `src/components/kitchen/order-column.tsx`
- Create: `src/components/kitchen/order-board.tsx`

**Step 1: Create order-card.tsx**

```typescript
"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Zap } from "lucide-react"
import type { KitchenOrder } from "@/hooks/use-kitchen-orders"

interface OrderCardProps {
  order: KitchenOrder
  onAction: () => void
  onToggleRush: () => void
  actionLabel: string
}

function formatTime(seconds: number): string {
  if (seconds < 60) return "Just now"
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m`
}

function getTimeAlertLevel(seconds: number): "normal" | "warning" | "danger" {
  const minutes = seconds / 60
  if (minutes >= 10) return "danger"
  if (minutes >= 5) return "warning"
  return "normal"
}

export function OrderCard({ order, onAction, onToggleRush, actionLabel }: OrderCardProps) {
  const alertLevel = getTimeAlertLevel(order.secondsInStatus)

  return (
    <Card
      className={cn(
        "p-4 transition-all",
        order.isRush && "ring-2 ring-yellow-500 bg-yellow-50 dark:bg-yellow-950/20",
        alertLevel === "warning" && !order.isRush && "border-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/10",
        alertLevel === "danger" && !order.isRush && "border-red-500 bg-red-50/50 dark:bg-red-950/10"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">#{order.orderNumber}</span>
          {order.isRush && (
            <Badge variant="secondary" className="bg-yellow-500 text-yellow-950">
              <Zap className="h-3 w-3 mr-1" />
              RUSH
            </Badge>
          )}
        </div>
        <button
          onClick={onToggleRush}
          className={cn(
            "p-1.5 rounded-md transition-colors",
            order.isRush
              ? "bg-yellow-500 text-yellow-950 hover:bg-yellow-600"
              : "bg-muted hover:bg-muted/80 text-muted-foreground"
          )}
          title={order.isRush ? "Remove rush" : "Mark as rush"}
        >
          <Zap className="h-4 w-4" />
        </button>
      </div>

      {/* Items */}
      <div className="space-y-1 mb-3">
        {order.items.map((item) => (
          <div key={item.id} className="text-sm">
            <span className="font-medium">{item.quantity}×</span>{" "}
            <span>{item.productName}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t">
        <span
          className={cn(
            "text-sm",
            alertLevel === "warning" && "text-yellow-600 font-medium",
            alertLevel === "danger" && "text-red-600 font-medium"
          )}
        >
          {formatTime(order.secondsInStatus)}
        </span>
        <Button size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      </div>
    </Card>
  )
}
```

**Step 2: Create order-column.tsx**

```typescript
"use client"

import { cn } from "@/lib/utils"
import { OrderCard } from "./order-card"
import type { KitchenOrder } from "@/hooks/use-kitchen-orders"

interface OrderColumnProps {
  title: string
  status: "new" | "cooking" | "ready"
  orders: KitchenOrder[]
  onUpdateStatus: (orderId: number, status: string) => void
  onToggleRush: (orderId: number, isRush: boolean) => void
}

const statusConfig = {
  new: { nextStatus: "cooking", actionLabel: "Start" },
  cooking: { nextStatus: "ready", actionLabel: "Ready" },
  ready: { nextStatus: "served", actionLabel: "Served" },
}

export function OrderColumn({
  title,
  status,
  orders,
  onUpdateStatus,
  onToggleRush,
}: OrderColumnProps) {
  const config = statusConfig[status]

  return (
    <div className="flex-1 min-w-[280px] max-w-[380px]">
      {/* Column Header */}
      <div
        className={cn(
          "px-4 py-2 rounded-t-lg font-semibold flex items-center justify-between",
          status === "new" && "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
          status === "cooking" && "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
          status === "ready" && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
        )}
      >
        <span>{title}</span>
        <span className="text-sm font-normal opacity-70">{orders.length}</span>
      </div>

      {/* Column Body */}
      <div className="bg-muted/30 rounded-b-lg p-3 min-h-[400px] space-y-3">
        {orders.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            No orders
          </div>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onAction={() => onUpdateStatus(order.id, config.nextStatus)}
              onToggleRush={() => onToggleRush(order.id, !order.isRush)}
              actionLabel={config.actionLabel}
            />
          ))
        )}
      </div>
    </div>
  )
}
```

**Step 3: Create order-board.tsx**

```typescript
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
import { useKitchenOrders } from "@/hooks/use-kitchen-orders"
import { formatDistanceToNow } from "date-fns"

export function OrderBoard() {
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [completedModalOpen, setCompletedModalOpen] = useState(false)
  const [completedOrders, setCompletedOrders] = useState<typeof orders>([])
  const [loadingCompleted, setLoadingCompleted] = useState(false)

  const {
    orders,
    ordersByStatus,
    isLoading,
    error,
    updateStatus,
    toggleRush,
  } = useKitchenOrders({ soundEnabled })

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
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenCompleted}
          >
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
                          {item.quantity}× {item.productName}
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
```

**Step 4: Commit**

```bash
git add src/components/kitchen/
git commit -m "feat(ui): add kitchen order board components"
```

---

## Task 7: Order Board Page

**Files:**
- Create: `src/app/(dashboard)/orders/page.tsx`

**Step 1: Create the page**

```typescript
import { OrderBoard } from "@/components/kitchen/order-board"

export default function OrdersPage() {
  return (
    <div className="p-4 md:p-6">
      <OrderBoard />
    </div>
  )
}
```

**Step 2: Add to sidebar navigation**

Modify `src/components/layout/sidebar.tsx` to add the Orders link.

Find the navigation items array and add:

```typescript
{
  href: "/orders",
  icon: ChefHat, // import from lucide-react
  label: "Orders",
},
```

**Step 3: Test the page**

1. Navigate to http://localhost:3000/orders
2. Verify empty state shows correctly
3. Create a transaction with a kitchen item
4. Verify order appears on the board

**Step 4: Commit**

```bash
git add src/app/\(dashboard\)/orders/ src/components/layout/sidebar.tsx
git commit -m "feat(ui): add orders page and sidebar navigation"
```

---

## Task 8: Categories API - Add requiresKitchen Support

**Files:**
- Modify: `src/app/api/categories/route.ts`
- Modify: `src/app/api/categories/[id]/route.ts`

**Step 1: Update GET to include requiresKitchen**

The field should already be included if using `findMany` without `select`. Verify.

**Step 2: Update POST to accept requiresKitchen**

In `src/app/api/categories/route.ts`, find the POST handler and add requiresKitchen to the create data:

```typescript
const category = await prisma.category.create({
  data: {
    name: body.name,
    requiresKitchen: body.requiresKitchen ?? false,
  },
})
```

**Step 3: Update PATCH in [id]/route.ts**

Find the PATCH handler and add requiresKitchen to updateable fields:

```typescript
if (body.requiresKitchen !== undefined) {
  updateData.requiresKitchen = body.requiresKitchen
}
```

**Step 4: Commit**

```bash
git add src/app/api/categories/
git commit -m "feat(api): add requiresKitchen support to categories"
```

---

## Task 9: Products API - Add requiresKitchen Support

**Files:**
- Modify: `src/app/api/products/route.ts`
- Modify: `src/app/api/products/[id]/route.ts`

**Step 1: Update POST to accept requiresKitchen**

In `src/app/api/products/route.ts`, add to the create data:

```typescript
requiresKitchen: body.requiresKitchen ?? null, // null means use category default
```

**Step 2: Update PUT in [id]/route.ts**

Add to updateable fields:

```typescript
if (body.requiresKitchen !== undefined) {
  updateData.requiresKitchen = body.requiresKitchen
}
```

**Step 3: Commit**

```bash
git add src/app/api/products/
git commit -m "feat(api): add requiresKitchen support to products"
```

---

## Task 10: Handle Transaction Void - Cancel Kitchen Order

**Files:**
- Modify: `src/app/api/transactions/[id]/void/route.ts`

**Step 1: Update void endpoint to cancel kitchen orders**

Add after the transaction void logic:

```typescript
// Cancel any associated kitchen orders
await prisma.kitchenOrder.updateMany({
  where: {
    transactionId: parseInt(id),
    status: { not: "served" }, // Don't change already served orders
  },
  data: {
    status: "cancelled",
  },
})
```

**Step 2: Commit**

```bash
git add src/app/api/transactions/\[id\]/void/route.ts
git commit -m "feat(api): cancel kitchen orders when transaction is voided"
```

---

## Task 11: Final Integration Test

**Files:**
- None (manual testing)

**Step 1: Full workflow test**

1. Mark a category as `requiresKitchen = true`
2. Create a product in that category
3. Go to POS, add the product to cart
4. Complete payment (Pay Now)
5. Verify kitchen order appears on `/orders` page
6. Progress the order: New → Cooking → Ready → Served
7. Verify it appears in "Today's Completed"
8. Create another order and verify sound plays on refresh

**Step 2: Edge case tests**

1. Create order with no kitchen items - verify no kitchen order created
2. Void a transaction - verify kitchen order is cancelled
3. Toggle rush flag - verify visual update

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete kitchen order board implementation"
```

---

## Summary

After completing all tasks, you will have:

1. **Database:** KitchenOrder and KitchenOrderItem models with requiresKitchen on Category and Product
2. **API:** Full CRUD for kitchen orders with status transitions, reordering, and completed orders
3. **Transaction Integration:** Auto-creates kitchen orders when transactions with kitchen items are completed
4. **UI:** Order Board page with kanban columns, sound notifications, rush flags, and completed orders modal
5. **Void Handling:** Kitchen orders are cancelled when transactions are voided

Total: 11 tasks, approximately 60-90 minutes of implementation time.
