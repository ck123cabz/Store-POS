# Phase 4: POS Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Connect ingredients to POS so that selling products decrements ingredient quantities, auto-syncs sellable ingredients as products, and shows low-stock alerts to cashiers.

**Architecture:**
- Add `linkedIngredientId` + `needsPricing` to Product model for direct ingredient-to-product linking
- Add `sellable`, `linkedProductId`, `syncStatus` to Ingredient model for auto-sync capability
- Enhance transaction POST to decrement linked ingredients and log history with source="sale"
- Add POS UI alerts: low-stock badges on tiles, alert bell with counts, quick-price modal

**Tech Stack:** Next.js 15 App Router, Prisma ORM, PostgreSQL, React, shadcn/ui components

---

## Task 1: Add Product-Ingredient Link Fields to Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma:59-90` (Product model)

**Step 1: Add linkedIngredientId and needsPricing fields to Product model**

In `prisma/schema.prisma`, find the Product model (around line 59) and add after the Menu Focus fields (before the Relations comment):

```prisma
  // Phase 4: POS-Ingredient Integration
  linkedIngredientId  Int?      @unique @map("linked_ingredient_id")
  needsPricing        Boolean   @default(false) @map("needs_pricing")
```

The updated section should look like:

```prisma
model Product {
  id         Int      @id @default(autoincrement())
  name       String
  price      Decimal  @db.Decimal(10, 2)
  categoryId Int      @map("category_id")
  quantity   Int      @default(0)
  trackStock Boolean  @default(false) @map("track_stock")
  image      String   @default("")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  // LEVER 1: Unit Economics - True Cost Calculation
  prepTime           Int?     @map("prep_time")
  laborCost          Decimal? @map("labor_cost") @db.Decimal(10, 2)
  overheadAllocation Decimal? @map("overhead_allocation") @db.Decimal(10, 2)
  trueCost           Decimal? @map("true_cost") @db.Decimal(10, 2)
  trueMargin         Decimal? @map("true_margin") @db.Decimal(10, 2)
  trueMarginPercent  Decimal? @map("true_margin_percent") @db.Decimal(5, 2)

  // LEVER 4: Menu Focus
  isHeroItem         Boolean  @default(false) @map("is_hero_item")
  speedRating        String?  @map("speed_rating")
  ingredientSharing  String?  @map("ingredient_sharing")
  menuDecision       String?  @map("menu_decision")
  weeklyUnitsSold    Int      @default(0) @map("weekly_units_sold")

  // Phase 4: POS-Ingredient Integration
  linkedIngredientId  Int?      @unique @map("linked_ingredient_id")
  needsPricing        Boolean   @default(false) @map("needs_pricing")

  // Relations
  category         Category     @relation(fields: [categoryId], references: [id])
  recipeItems      RecipeItem[]
  linkedIngredient Ingredient?  @relation("ProductIngredient", fields: [linkedIngredientId], references: [id])

  @@map("products")
}
```

**Step 2: Verify the edit**

Run: `grep -A 5 "linkedIngredientId" prisma/schema.prisma`
Expected: Shows the new fields you added

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add linkedIngredientId and needsPricing to Product

Phase 4 POS integration - product-to-ingredient linking fields"
```

---

## Task 2: Add Sellable Fields to Ingredient Model

**Files:**
- Modify: `prisma/schema.prisma:249-278` (Ingredient model)

**Step 1: Add sellable, linkedProductId, and sync fields to Ingredient model**

In `prisma/schema.prisma`, find the Ingredient model (around line 249) and add after the barcode field (before Relations):

```prisma
  // Phase 4: Auto-sync sellable ingredients to products
  sellable          Boolean   @default(false)
  linkedProductId   Int?      @unique @map("linked_product_id")
  syncStatus        String    @default("synced") @map("sync_status")  // synced, pending, error
  syncError         String?   @map("sync_error")
  lastSyncAt        DateTime? @map("last_sync_at")
```

Update the Relations section to add the Product relation:

```prisma
  // Relations
  vendor           Vendor?       @relation(fields: [vendorId], references: [id])
  recipeItems      RecipeItem[]
  wasteLogs        WasteLog[]
  history          IngredientHistory[]
  linkedProduct    Product?      @relation("ProductIngredient")
```

**Step 2: Verify the edit**

Run: `grep -A 5 "sellable" prisma/schema.prisma`
Expected: Shows the sellable field and related fields

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add sellable and sync fields to Ingredient

Phase 4 POS integration - enables auto-sync of sellable ingredients to products"
```

---

## Task 3: Create and Run Prisma Migration

**Files:**
- Create: `prisma/migrations/YYYYMMDD_phase4_pos_integration/migration.sql` (auto-generated)

**Step 1: Generate the migration**

Run: `npx prisma migrate dev --name phase4_pos_integration`

Expected output includes:
- "Applying migration"
- "Your database is now in sync"

**Step 2: Verify migration applied**

Run: `npx prisma migrate status`
Expected: All migrations applied

**Step 3: Regenerate Prisma client**

Run: `npx prisma generate`
Expected: "Generated Prisma Client"

**Step 4: Commit migration files**

```bash
git add prisma/migrations/
git commit -m "chore(db): add phase4 pos integration migration

Adds linkedIngredientId, needsPricing to products
Adds sellable, linkedProductId, syncStatus to ingredients"
```

---

## Task 4: Update Products API to Include Linked Ingredient Data

**Files:**
- Modify: `src/app/api/products/route.ts`

**Step 1: Update GET to include linkedIngredient data**

Replace the entire file content:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        linkedIngredient: {
          select: {
            id: true,
            name: true,
            quantity: true,
            parLevel: true,
            unit: true,
          },
        },
      },
      orderBy: { name: "asc" },
    })

    const formatted = products.map((p) => {
      // Calculate ingredient stock status if linked
      let ingredientStockStatus: "ok" | "low" | "critical" | "out" | null = null
      let ingredientStockRatio: number | null = null

      if (p.linkedIngredient) {
        const qty = Number(p.linkedIngredient.quantity)
        const par = p.linkedIngredient.parLevel
        const ratio = par > 0 ? qty / par : 1

        if (qty <= 0) ingredientStockStatus = "out"
        else if (ratio <= 0.25) ingredientStockStatus = "critical"
        else if (ratio <= 0.5) ingredientStockStatus = "low"
        else ingredientStockStatus = "ok"

        ingredientStockRatio = par > 0 ? Math.round(ratio * 100) : null
      }

      return {
        id: p.id,
        name: p.name,
        price: Number(p.price),
        categoryId: p.categoryId,
        categoryName: p.category.name,
        quantity: p.quantity,
        trackStock: p.trackStock,
        image: p.image,
        // Phase 4: Ingredient link data
        linkedIngredientId: p.linkedIngredientId,
        needsPricing: p.needsPricing,
        linkedIngredient: p.linkedIngredient
          ? {
              id: p.linkedIngredient.id,
              name: p.linkedIngredient.name,
              quantity: Number(p.linkedIngredient.quantity),
              parLevel: p.linkedIngredient.parLevel,
              unit: p.linkedIngredient.unit,
              stockStatus: ingredientStockStatus,
              stockRatio: ingredientStockRatio,
            }
          : null,
      }
    })

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Failed to fetch products:", error)
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const product = await prisma.product.create({
      data: {
        name: body.name,
        price: body.price,
        categoryId: body.categoryId,
        quantity: body.quantity || 0,
        trackStock: body.trackStock || false,
        image: body.image || "",
        linkedIngredientId: body.linkedIngredientId || null,
        needsPricing: body.needsPricing || false,
      },
      include: { linkedIngredient: true },
    })

    return NextResponse.json(
      {
        id: product.id,
        name: product.name,
        price: Number(product.price),
        categoryId: product.categoryId,
        quantity: product.quantity,
        trackStock: product.trackStock,
        image: product.image,
        linkedIngredientId: product.linkedIngredientId,
        needsPricing: product.needsPricing,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Failed to create product:", error)
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
}
```

**Step 2: Verify the changes compile**

Run: `npx tsc --noEmit`
Expected: No errors (or existing unrelated errors only)

**Step 3: Commit**

```bash
git add src/app/api/products/route.ts
git commit -m "feat(api): include linked ingredient data in products endpoint

GET returns ingredient stock status for POS low-stock display
POST accepts linkedIngredientId and needsPricing"
```

---

## Task 5: Update Transaction POST to Decrement Linked Ingredient Quantities

**Files:**
- Modify: `src/app/api/transactions/route.ts`

**Step 1: Add ingredient decrement logic after product stock decrement**

Find the section after `// Decrement stock if paid` (around line 188) and after the product update loop closes (around line 204), add ingredient decrement logic.

Find this existing code block:

```typescript
    // Decrement stock if paid
    if (body.status === 1 && body.paidAmount >= body.total) {
      for (const item of body.items) {
        const product = await prisma.product.findUnique({
          where: { id: item.id },
        })
        if (product?.trackStock) {
          await prisma.product.update({
            where: { id: item.id },
            data: {
              quantity: { decrement: item.quantity },
              // Also increment weekly units sold
              weeklyUnitsSold: { increment: item.quantity },
            },
          })
        }
      }
```

Replace the entire "Decrement stock if paid" section with:

```typescript
    // Decrement stock if paid
    if (body.status === 1 && body.paidAmount >= body.total) {
      const { nanoid } = await import("nanoid")
      const saleChangeId = nanoid(10)

      for (const item of body.items) {
        const product = await prisma.product.findUnique({
          where: { id: item.id },
          include: {
            linkedIngredient: true,
            recipeItems: {
              include: { ingredient: true },
            },
          },
        })

        if (!product) continue

        // Decrement product stock if tracked
        if (product.trackStock) {
          await prisma.product.update({
            where: { id: item.id },
            data: {
              quantity: { decrement: item.quantity },
              weeklyUnitsSold: { increment: item.quantity },
            },
          })
        }

        // Phase 4: Decrement linked ingredient (for directly-linked products like "Bottled Water")
        if (product.linkedIngredientId && product.linkedIngredient) {
          const ingredient = product.linkedIngredient
          const oldQty = Number(ingredient.quantity)
          const newQty = Math.max(0, oldQty - item.quantity)

          await prisma.ingredient.update({
            where: { id: ingredient.id },
            data: {
              quantity: newQty,
              lastUpdated: new Date(),
            },
          })

          // Log to ingredient history
          await prisma.ingredientHistory.create({
            data: {
              ingredientId: ingredient.id,
              ingredientName: ingredient.name,
              changeId: saleChangeId,
              field: "quantity",
              oldValue: oldQty.toString(),
              newValue: newQty.toString(),
              source: "sale",
              reason: "sale",
              reasonNote: `Sold ${item.quantity}x ${product.name} (Order #${orderNumber})`,
              userId: parseInt(session.user.id),
              userName: session.user.name || "Unknown",
            },
          })
        }

        // Phase 4: Decrement recipe ingredients (for products with recipes)
        if (product.recipeItems.length > 0) {
          for (const recipeItem of product.recipeItems) {
            const ingredient = recipeItem.ingredient
            const usagePerUnit = Number(recipeItem.quantity)
            const totalUsage = usagePerUnit * item.quantity
            const oldQty = Number(ingredient.quantity)
            const newQty = Math.max(0, oldQty - totalUsage)

            await prisma.ingredient.update({
              where: { id: ingredient.id },
              data: {
                quantity: newQty,
                lastUpdated: new Date(),
              },
            })

            // Log to ingredient history
            await prisma.ingredientHistory.create({
              data: {
                ingredientId: ingredient.id,
                ingredientName: ingredient.name,
                changeId: saleChangeId,
                field: "quantity",
                oldValue: oldQty.toString(),
                newValue: newQty.toString(),
                source: "sale",
                reason: "sale",
                reasonNote: `Recipe: ${item.quantity}x ${product.name} used ${totalUsage} ${ingredient.unit} (Order #${orderNumber})`,
                userId: parseInt(session.user.id),
                userName: session.user.name || "Unknown",
              },
            })
          }
        }
      }
```

**Step 2: Verify the changes compile**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/app/api/transactions/route.ts
git commit -m "feat(api): decrement ingredient quantities on sale

- Decrements directly-linked ingredients (linkedIngredientId)
- Decrements recipe ingredients proportionally
- Logs all changes to IngredientHistory with source='sale'"
```

---

## Task 6: Create POS Alerts API Endpoint

**Files:**
- Create: `src/app/api/pos/alerts/route.ts`

**Step 1: Create the alerts endpoint**

```typescript
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // Get low-stock ingredients
    const ingredients = await prisma.ingredient.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        quantity: true,
        parLevel: true,
        unit: true,
      },
    })

    const lowStockItems = ingredients
      .map((i) => {
        const qty = Number(i.quantity)
        const ratio = i.parLevel > 0 ? qty / i.parLevel : 1

        let priority: "critical" | "high" | "medium" | null = null
        if (qty <= 0 || ratio <= 0.25) priority = "critical"
        else if (ratio <= 0.5) priority = "high"
        else if (ratio < 1) priority = "medium"

        if (!priority) return null

        return {
          id: i.id,
          name: i.name,
          quantity: qty,
          parLevel: i.parLevel,
          unit: i.unit,
          priority,
          stockRatio: i.parLevel > 0 ? Math.round(ratio * 100) : null,
        }
      })
      .filter(Boolean)
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2 }
        return priorityOrder[a!.priority] - priorityOrder[b!.priority]
      })

    // Get products needing pricing
    const needsPricingProducts = await prisma.product.findMany({
      where: { needsPricing: true },
      select: {
        id: true,
        name: true,
        price: true,
        linkedIngredient: {
          select: {
            costPerUnit: true,
            unit: true,
          },
        },
      },
    })

    const needsPricing = needsPricingProducts.map((p) => ({
      id: p.id,
      name: p.name,
      currentPrice: Number(p.price),
      suggestedPrice: p.linkedIngredient
        ? Math.ceil(Number(p.linkedIngredient.costPerUnit) * 1.5 * 100) / 100 // 50% markup suggestion
        : null,
      ingredientCost: p.linkedIngredient ? Number(p.linkedIngredient.costPerUnit) : null,
    }))

    return NextResponse.json({
      lowStock: {
        count: lowStockItems.length,
        criticalCount: lowStockItems.filter((i) => i?.priority === "critical").length,
        items: lowStockItems,
      },
      needsPricing: {
        count: needsPricing.length,
        items: needsPricing,
      },
      totalAlerts: lowStockItems.length + needsPricing.length,
    })
  } catch (error) {
    console.error("Failed to fetch POS alerts:", error)
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 })
  }
}
```

**Step 2: Verify the file exists and compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/api/pos/alerts/route.ts
git commit -m "feat(api): add POS alerts endpoint

Returns low-stock counts and needs-pricing items for alert bell"
```

---

## Task 7: Create POSAlertBell Component

**Files:**
- Create: `src/components/pos/pos-alert-bell.tsx`

**Step 1: Create the alert bell component**

```typescript
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
```

**Step 2: Verify the component compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/pos/pos-alert-bell.tsx
git commit -m "feat(ui): add POSAlertBell component

Shows low-stock and needs-pricing alerts in tabbed popover
Includes quick-set price button for needs-pricing items"
```

---

## Task 8: Update ProductCard with Low-Stock Badge

**Files:**
- Modify: `src/components/pos/product-card.tsx`

**Step 1: Update ProductCard interface and add low-stock indicator**

Replace the entire file content:

```typescript
"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { AlertTriangle } from "lucide-react"

interface LinkedIngredient {
  id: number
  name: string
  quantity: number
  parLevel: number
  unit: string
  stockStatus: "ok" | "low" | "critical" | "out" | null
  stockRatio: number | null
}

interface ProductCardProps {
  product: {
    id: number
    name: string
    price: number
    quantity: number
    trackStock: boolean
    image: string
    linkedIngredientId?: number | null
    needsPricing?: boolean
    linkedIngredient?: LinkedIngredient | null
  }
  currencySymbol: string
  onAddToCart: () => void
}

export function ProductCard({ product, currencySymbol, onAddToCart }: ProductCardProps) {
  const isOutOfStock = product.trackStock && product.quantity <= 0
  const ingredientLow =
    product.linkedIngredient?.stockStatus === "low" ||
    product.linkedIngredient?.stockStatus === "critical"
  const ingredientOut = product.linkedIngredient?.stockStatus === "out"

  // Determine if product should be disabled
  const isDisabled = isOutOfStock || ingredientOut

  // Determine warning badge
  const showWarning = ingredientLow && !ingredientOut

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md relative ${
        isDisabled ? "opacity-50" : ""
      } ${showWarning ? "ring-2 ring-orange-300" : ""}`}
      onClick={() => !isDisabled && onAddToCart()}
    >
      {/* Low stock warning indicator */}
      {showWarning && (
        <div className="absolute top-1 right-1 z-10">
          <div className="bg-orange-500 text-white rounded-full p-1">
            <AlertTriangle className="h-3 w-3" />
          </div>
        </div>
      )}

      {/* Needs pricing indicator */}
      {product.needsPricing && (
        <div className="absolute top-1 left-1 z-10">
          <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
            $?
          </Badge>
        </div>
      )}

      <CardContent className="p-3">
        <div className="aspect-square relative bg-gray-100 rounded-md mb-2">
          {product.image ? (
            <Image
              src={`/uploads/${product.image}`}
              alt={product.name}
              fill
              className="object-cover rounded-md"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No Image
            </div>
          )}
        </div>
        <div className="text-center">
          <p className="font-medium text-sm truncate">{product.name}</p>
          <p className="text-green-600 font-bold">
            {currencySymbol}{product.price.toFixed(2)}
          </p>
          <div className="mt-1 flex flex-col gap-1 items-center">
            {/* Product stock badge */}
            {product.trackStock ? (
              <Badge variant={product.quantity > 0 ? "secondary" : "destructive"}>
                Stock: {product.quantity}
              </Badge>
            ) : (
              <Badge variant="outline">N/A</Badge>
            )}

            {/* Linked ingredient stock badge */}
            {product.linkedIngredient && (
              <Badge
                variant={
                  product.linkedIngredient.stockStatus === "out"
                    ? "destructive"
                    : product.linkedIngredient.stockStatus === "critical"
                    ? "destructive"
                    : product.linkedIngredient.stockStatus === "low"
                    ? "secondary"
                    : "outline"
                }
                className={
                  product.linkedIngredient.stockStatus === "low"
                    ? "bg-orange-100 text-orange-800 text-xs"
                    : product.linkedIngredient.stockStatus === "critical"
                    ? "text-xs"
                    : "text-xs"
                }
              >
                {product.linkedIngredient.stockStatus === "out"
                  ? "Out"
                  : product.linkedIngredient.stockRatio !== null
                  ? `${product.linkedIngredient.stockRatio}%`
                  : "—"}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

**Step 2: Verify the component compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/pos/product-card.tsx
git commit -m "feat(ui): add low-stock badges to ProductCard

- Shows orange ring and warning icon for low-stock ingredients
- Shows percentage badge for linked ingredient stock level
- Disables card when ingredient is out of stock
- Shows needs-pricing indicator badge"
```

---

## Task 9: Update Product Interface in POS Page

**Files:**
- Modify: `src/app/(dashboard)/pos/page.tsx`

**Step 1: Update Product interface to include new fields**

Find the Product interface (around line 18) and update it:

```typescript
interface Product {
  id: number
  name: string
  price: number
  quantity: number
  trackStock: boolean
  image: string
  categoryId: number
  // Phase 4: Ingredient link data
  linkedIngredientId?: number | null
  needsPricing?: boolean
  linkedIngredient?: {
    id: number
    name: string
    quantity: number
    parLevel: number
    unit: string
    stockStatus: "ok" | "low" | "critical" | "out" | null
    stockRatio: number | null
  } | null
}
```

**Step 2: Verify the changes compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/(dashboard)/pos/page.tsx
git commit -m "feat(ui): update POS Product interface for ingredient data

Adds linkedIngredientId, needsPricing, and linkedIngredient fields"
```

---

## Task 10: Add POSAlertBell to POS Page

**Files:**
- Modify: `src/app/(dashboard)/pos/page.tsx`

**Step 1: Import POSAlertBell component**

Add to the imports at the top of the file:

```typescript
import { POSAlertBell } from "@/components/pos/pos-alert-bell"
```

**Step 2: Add quick price handler**

After the `handleLoadOrder` function (around line 266), add:

```typescript
  const handleQuickSetPrice = async (productId: number, price: number) => {
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price, needsPricing: false }),
      })

      if (!response.ok) throw new Error("Failed to update price")

      toast.success("Price updated!")
      fetchData()
    } catch {
      toast.error("Failed to update price")
    }
  }
```

**Step 3: Add POSAlertBell to the UI**

Find the comment `{/* Hold/Customer Orders Buttons */}` (around line 279) and add the alert bell above it:

```typescript
        {/* POS Alert Bell */}
        <div className="flex justify-end mb-2">
          <POSAlertBell
            currencySymbol={settings.currencySymbol}
            onSetPrice={handleQuickSetPrice}
          />
        </div>

        {/* Hold/Customer Orders Buttons */}
```

**Step 4: Verify the changes compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/app/(dashboard)/pos/page.tsx
git commit -m "feat(ui): add POSAlertBell to POS page

Shows low-stock and needs-pricing alerts with quick price set action"
```

---

## Task 11: Update ProductGrid Interface

**Files:**
- Modify: `src/components/pos/product-grid.tsx`

**Step 1: Update Product interface to include new fields**

Find the Product interface (around line 9) and update it:

```typescript
interface Product {
  id: number
  name: string
  price: number
  quantity: number
  trackStock: boolean
  image: string
  categoryId: number
  // Phase 4 fields
  linkedIngredientId?: number | null
  needsPricing?: boolean
  linkedIngredient?: {
    id: number
    name: string
    quantity: number
    parLevel: number
    unit: string
    stockStatus: "ok" | "low" | "critical" | "out" | null
    stockRatio: number | null
  } | null
}
```

**Step 2: Verify the changes compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/pos/product-grid.tsx
git commit -m "feat(ui): update ProductGrid interface for ingredient data

Ensures Product type flows correctly to ProductCard"
```

---

## Task 12: Create Ingredient Sync Service

**Files:**
- Create: `src/lib/ingredient-sync.ts`

**Step 1: Create the sync utility**

```typescript
import { prisma } from "./prisma"

interface SyncResult {
  success: boolean
  productId?: number
  error?: string
}

/**
 * Syncs a sellable ingredient to a product
 * Creates a new product if one doesn't exist, or updates the existing linked product
 */
export async function syncIngredientToProduct(
  ingredientId: number,
  categoryId: number
): Promise<SyncResult> {
  try {
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
      include: { linkedProduct: true },
    })

    if (!ingredient) {
      return { success: false, error: "Ingredient not found" }
    }

    if (!ingredient.sellable) {
      return { success: false, error: "Ingredient is not sellable" }
    }

    // If already has a linked product, update it
    if (ingredient.linkedProductId && ingredient.linkedProduct) {
      await prisma.product.update({
        where: { id: ingredient.linkedProductId },
        data: {
          name: ingredient.name,
          // Keep existing price, or mark as needs pricing if zero
          needsPricing: Number(ingredient.linkedProduct.price) === 0,
        },
      })

      await prisma.ingredient.update({
        where: { id: ingredientId },
        data: {
          syncStatus: "synced",
          syncError: null,
          lastSyncAt: new Date(),
        },
      })

      return { success: true, productId: ingredient.linkedProductId }
    }

    // Create new product
    const product = await prisma.product.create({
      data: {
        name: ingredient.name,
        price: 0, // Will be set by user
        categoryId,
        quantity: Math.floor(Number(ingredient.quantity)),
        trackStock: false, // Stock tracked via ingredient
        image: "",
        linkedIngredientId: ingredientId,
        needsPricing: true,
      },
    })

    // Link back to ingredient
    await prisma.ingredient.update({
      where: { id: ingredientId },
      data: {
        linkedProductId: product.id,
        syncStatus: "synced",
        syncError: null,
        lastSyncAt: new Date(),
      },
    })

    return { success: true, productId: product.id }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    await prisma.ingredient.update({
      where: { id: ingredientId },
      data: {
        syncStatus: "error",
        syncError: errorMessage,
      },
    })

    return { success: false, error: errorMessage }
  }
}

/**
 * Unlinks an ingredient from its product when sellable is set to false
 */
export async function unlinkIngredientFromProduct(ingredientId: number): Promise<SyncResult> {
  try {
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
    })

    if (!ingredient?.linkedProductId) {
      return { success: true }
    }

    // Remove the link from the product
    await prisma.product.update({
      where: { id: ingredient.linkedProductId },
      data: {
        linkedIngredientId: null,
      },
    })

    // Clear the link from the ingredient
    await prisma.ingredient.update({
      where: { id: ingredientId },
      data: {
        linkedProductId: null,
        syncStatus: "synced",
        syncError: null,
        lastSyncAt: new Date(),
      },
    })

    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return { success: false, error: errorMessage }
  }
}
```

**Step 2: Verify the module compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/ingredient-sync.ts
git commit -m "feat(lib): add ingredient-to-product sync utilities

syncIngredientToProduct: creates/updates product from sellable ingredient
unlinkIngredientFromProduct: removes product link when sellable=false"
```

---

## Task 13: Update Ingredients API for Sellable Auto-Sync

**Files:**
- Modify: `src/app/api/ingredients/route.ts`

**Step 1: Update GET to include sellable fields**

Update the formatted map to include the new fields (add after `barcode`):

```typescript
        // Phase 4: Sellable fields
        sellable: i.sellable,
        linkedProductId: i.linkedProductId,
        syncStatus: i.syncStatus,
```

**Step 2: Update POST to handle sellable ingredients**

Replace the POST function:

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.category || !body.unit || body.costPerUnit === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: name, category, unit, costPerUnit" },
        { status: 400 }
      )
    }

    const ingredient = await prisma.ingredient.create({
      data: {
        name: body.name,
        category: body.category,
        unit: body.unit,
        costPerUnit: body.costPerUnit,
        parLevel: body.parLevel || 0,
        quantity: body.quantity || 0,
        vendorId: body.vendorId || null,
        barcode: body.barcode || null,
        sellable: body.sellable || false,
        lastUpdated: new Date(),
      },
      include: { vendor: true },
    })

    // Phase 4: Auto-sync if sellable
    if (ingredient.sellable && body.categoryId) {
      const { syncIngredientToProduct } = await import("@/lib/ingredient-sync")
      await syncIngredientToProduct(ingredient.id, body.categoryId)
    }

    return NextResponse.json({
      id: ingredient.id,
      name: ingredient.name,
      category: ingredient.category,
      unit: ingredient.unit,
      costPerUnit: Number(ingredient.costPerUnit),
      parLevel: ingredient.parLevel,
      quantity: Number(ingredient.quantity),
      vendorId: ingredient.vendorId,
      vendorName: ingredient.vendor?.name || null,
      barcode: ingredient.barcode,
      sellable: ingredient.sellable,
      linkedProductId: ingredient.linkedProductId,
      syncStatus: ingredient.syncStatus,
    }, { status: 201 })
  } catch (error) {
    console.error("Failed to create ingredient:", error)
    return NextResponse.json({ error: "Failed to create ingredient" }, { status: 500 })
  }
}
```

**Step 3: Verify the changes compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/app/api/ingredients/route.ts
git commit -m "feat(api): add sellable auto-sync to ingredients POST

Creates linked product when ingredient is created with sellable=true"
```

---

## Task 14: Update Ingredients PUT for Sellable Toggle

**Files:**
- Modify: `src/app/api/ingredients/[id]/route.ts`

**Step 1: Read the current file to understand its structure**

The PUT handler needs to handle sellable toggle changes. Add sync logic after updating the ingredient.

Add after the ingredient update (after the history logging):

```typescript
    // Phase 4: Handle sellable toggle
    if (body.sellable !== undefined && body.sellable !== ingredient.sellable) {
      if (body.sellable && body.categoryId) {
        // Turning on sellable - sync to product
        const { syncIngredientToProduct } = await import("@/lib/ingredient-sync")
        await syncIngredientToProduct(ingredient.id, body.categoryId)
      } else if (!body.sellable && ingredient.linkedProductId) {
        // Turning off sellable - unlink from product
        const { unlinkIngredientFromProduct } = await import("@/lib/ingredient-sync")
        await unlinkIngredientFromProduct(ingredient.id)
      }
    }
```

Also update the data object to include sellable:

```typescript
        sellable: body.sellable ?? ingredient.sellable,
```

**Step 2: Read the file first**

(This step requires reading the file to see its current implementation)

**Step 3: Verify the changes compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/app/api/ingredients/[id]/route.ts
git commit -m "feat(api): handle sellable toggle in ingredients PUT

Syncs to product when sellable=true, unlinks when sellable=false"
```

---

## Task 15: Create Quick Price Set API Endpoint

**Files:**
- Modify: `src/app/api/products/[id]/route.ts`

**Step 1: Ensure PUT handler accepts price and needsPricing**

The existing PUT should already handle price updates. Verify it also handles needsPricing flag.

Add `needsPricing` to the update data:

```typescript
        needsPricing: body.needsPricing ?? undefined,
```

**Step 2: Verify the changes compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/api/products/[id]/route.ts
git commit -m "feat(api): support needsPricing flag in products PUT

Allows quick price set from POS alert bell to clear the flag"
```

---

## Task 16: Final Verification and Testing

**Files:**
- All modified files

**Step 1: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 2: Run Prisma validation**

Run: `npx prisma validate`
Expected: "Your schema is valid"

**Step 3: Start development server**

Run: `npm run dev`
Expected: Server starts without errors

**Step 4: Manual test checklist**

1. Create a sellable ingredient with categoryId
2. Verify product is auto-created with needsPricing=true
3. Use POS alert bell to set price
4. Add product to cart and complete sale
5. Verify ingredient quantity decreased
6. Check ingredient history shows source="sale"
7. Verify low-stock badge appears on product card

**Step 5: Final commit**

```bash
git add .
git commit -m "feat: complete Phase 4 POS Integration

- Product-ingredient linking with linkedIngredientId
- Auto-sync sellable ingredients to products
- Ingredient decrement on sales with history logging
- POS alert bell with low-stock and needs-pricing tabs
- Low-stock badges on product cards
- Quick price set from alert bell"
```

---

## Summary

This plan implements Phase 4 (POS Integration) with:

1. **Schema Updates**: Added `linkedIngredientId`, `needsPricing` to Product; `sellable`, `linkedProductId`, `syncStatus` to Ingredient
2. **Transaction Integration**: Sales now decrement both directly-linked ingredients and recipe ingredients
3. **History Logging**: All sales decrements logged with source="sale"
4. **Auto-Sync**: Sellable ingredients automatically create linked products
5. **POS UI**: Alert bell showing low-stock/needs-pricing counts, low-stock badges on product tiles
6. **Quick Actions**: Set price directly from alert bell popup

Total: 16 tasks with TDD-style bite-sized steps
