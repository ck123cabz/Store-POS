# Phase 1: Foundation - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add stock tracking, history logging, and low-stock alerts to the existing ingredients system.

**Architecture:** Enhance existing Prisma Ingredient model with quantity/threshold fields. Add IngredientHistory model for audit trail. Update API routes to support restock and history queries. Update UI to display stock levels and alerts.

**Tech Stack:** Next.js 16, Prisma 7, PostgreSQL, TypeScript, React, Tailwind CSS, shadcn/ui

---

## Task 1: Update Prisma Schema - Ingredient Model

**Files:**
- Modify: `prisma/schema.prisma:249-267`

**Step 1: Add new fields to Ingredient model**

Add these fields after line 259 (after `vendorId`):

```prisma
model Ingredient {
  id          Int           @id @default(autoincrement())
  name        String
  category    String
  unit        String
  costPerUnit Decimal       @map("cost_per_unit") @db.Decimal(10, 2)
  parLevel    Int           @default(0) @map("par_level")
  lastUpdated DateTime?     @map("last_updated")
  vendorId    Int?          @map("vendor_id")
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")

  // NEW: Stock tracking
  quantity          Decimal   @default(0) @db.Decimal(10, 2)
  lastRestockDate   DateTime? @map("last_restock_date")

  // NEW: Soft delete
  isActive          Boolean   @default(true) @map("is_active")

  // NEW: Barcode support
  barcode           String?   @unique

  // Relations
  vendor      Vendor?       @relation(fields: [vendorId], references: [id])
  recipeItems RecipeItem[]
  wasteLogs   WasteLog[]
  history     IngredientHistory[]

  @@map("ingredients")
}
```

**Step 2: Verify schema syntax**

Run: `npx prisma validate`
Expected: "The Prisma schema is valid."

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add stock tracking fields to Ingredient model"
```

---

## Task 2: Add IngredientHistory Model

**Files:**
- Modify: `prisma/schema.prisma` (add after Ingredient model, around line 285)

**Step 1: Add IngredientHistory model**

Add this model after the Ingredient model:

```prisma
// ═══════════════════════════════════════════════════════════════════════════════
// INGREDIENT HISTORY - Audit trail for stock & cost changes
// ═══════════════════════════════════════════════════════════════════════════════

model IngredientHistory {
  id              Int        @id @default(autoincrement())
  ingredientId    Int        @map("ingredient_id")
  ingredientName  String     @map("ingredient_name")
  changeId        String     @map("change_id")

  field           String                              // quantity, costPerUnit
  oldValue        String     @map("old_value")
  newValue        String     @map("new_value")

  source          String                              // manual_edit, sale, inventory_count, restock
  reason          String?                             // waste, breakage, theft, miscount, etc.
  reasonNote      String?    @map("reason_note")

  userId          Int        @map("user_id")
  userName        String     @map("user_name")
  createdAt       DateTime   @default(now()) @map("created_at")

  ingredient      Ingredient @relation(fields: [ingredientId], references: [id])

  @@index([ingredientId])
  @@index([createdAt])
  @@index([changeId])
  @@map("ingredient_history")
}
```

**Step 2: Verify schema syntax**

Run: `npx prisma validate`
Expected: "The Prisma schema is valid."

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add IngredientHistory model for audit trail"
```

---

## Task 3: Run Prisma Migration

**Files:**
- Creates: `prisma/migrations/YYYYMMDDHHMMSS_add_ingredient_stock_tracking/migration.sql`

**Step 1: Generate and apply migration**

Run: `npx prisma migrate dev --name add_ingredient_stock_tracking`

Expected output includes:
- "Applying migration"
- "Your database is now in sync with your schema"

**Step 2: Verify migration applied**

Run: `npx prisma studio`

Open browser, check:
- Ingredient table has new columns: quantity, lastRestockDate, isActive, barcode
- IngredientHistory table exists with all columns

Close Prisma Studio (Ctrl+C).

**Step 3: Commit migration**

```bash
git add prisma/migrations
git commit -m "chore(db): add migration for ingredient stock tracking"
```

---

## Task 4: Update GET /api/ingredients - Include Stock Status

**Files:**
- Modify: `src/app/api/ingredients/route.ts`

**Step 1: Update GET handler to include quantity and stock status**

Replace the entire file content:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const ingredients = await prisma.ingredient.findMany({
      where: { isActive: true },
      include: { vendor: true },
      orderBy: { name: "asc" },
    })

    const formatted = ingredients.map((i) => {
      const quantity = Number(i.quantity)
      const parLevel = i.parLevel
      const ratio = parLevel > 0 ? quantity / parLevel : 1

      let stockStatus: "ok" | "low" | "critical" | "out"
      if (quantity <= 0) stockStatus = "out"
      else if (ratio <= 0.25) stockStatus = "critical"
      else if (ratio <= 0.5) stockStatus = "low"
      else stockStatus = "ok"

      return {
        id: i.id,
        name: i.name,
        category: i.category,
        unit: i.unit,
        costPerUnit: Number(i.costPerUnit),
        parLevel: i.parLevel,
        quantity,
        stockStatus,
        stockRatio: parLevel > 0 ? Math.round(ratio * 100) : null,
        lastRestockDate: i.lastRestockDate,
        lastUpdated: i.lastUpdated,
        vendorId: i.vendorId,
        vendorName: i.vendor?.name || null,
        barcode: i.barcode,
      }
    })

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Failed to fetch ingredients:", error)
    return NextResponse.json({ error: "Failed to fetch ingredients" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

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
        lastUpdated: new Date(),
      },
      include: { vendor: true },
    })

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
    }, { status: 201 })
  } catch (error) {
    console.error("Failed to create ingredient:", error)
    return NextResponse.json({ error: "Failed to create ingredient" }, { status: 500 })
  }
}
```

**Step 2: Verify the API works**

Run: `npm run dev`

In another terminal:
```bash
curl http://localhost:3000/api/ingredients | jq '.[0]'
```

Expected: JSON with `quantity`, `stockStatus`, `stockRatio` fields.

**Step 3: Commit**

```bash
git add src/app/api/ingredients/route.ts
git commit -m "feat(api): add stock status to GET /api/ingredients"
```

---

## Task 5: Add GET /api/ingredients/low-stock Endpoint

**Files:**
- Create: `src/app/api/ingredients/low-stock/route.ts`

**Step 1: Create the low-stock endpoint**

```typescript
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const ingredients = await prisma.ingredient.findMany({
      where: {
        isActive: true,
        parLevel: { gt: 0 },
      },
      include: { vendor: true },
      orderBy: { name: "asc" },
    })

    // Filter to only low stock items and calculate priority
    const lowStockItems = ingredients
      .map((i) => {
        const quantity = Number(i.quantity)
        const parLevel = i.parLevel
        const ratio = parLevel > 0 ? quantity / parLevel : 1

        let priority: "critical" | "high" | "medium" | "low" | null
        if (quantity <= 0) priority = "critical"
        else if (ratio <= 0.25) priority = "critical"
        else if (ratio <= 0.5) priority = "high"
        else if (ratio < 1) priority = "medium"
        else priority = null

        return {
          id: i.id,
          name: i.name,
          category: i.category,
          unit: i.unit,
          costPerUnit: Number(i.costPerUnit),
          parLevel: i.parLevel,
          quantity,
          priority,
          stockRatio: Math.round(ratio * 100),
          vendorId: i.vendorId,
          vendorName: i.vendor?.name || null,
        }
      })
      .filter((i) => i.priority !== null)
      .sort((a, b) => {
        // Sort by priority: critical > high > medium > low
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
        const aPriority = priorityOrder[a.priority!]
        const bPriority = priorityOrder[b.priority!]
        if (aPriority !== bPriority) return aPriority - bPriority
        // Then by stock ratio (lowest first)
        return a.stockRatio - b.stockRatio
      })

    return NextResponse.json({
      count: lowStockItems.length,
      items: lowStockItems,
    })
  } catch (error) {
    console.error("Failed to fetch low-stock ingredients:", error)
    return NextResponse.json({ error: "Failed to fetch low-stock ingredients" }, { status: 500 })
  }
}
```

**Step 2: Verify the endpoint**

Run: `curl http://localhost:3000/api/ingredients/low-stock | jq`

Expected: JSON with `count` and `items` array, sorted by priority.

**Step 3: Commit**

```bash
git add src/app/api/ingredients/low-stock/route.ts
git commit -m "feat(api): add GET /api/ingredients/low-stock endpoint"
```

---

## Task 6: Add POST /api/ingredients/[id]/restock Endpoint

**Files:**
- Create: `src/app/api/ingredients/[id]/restock/route.ts`

**Step 1: Create the restock endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { nanoid } from "nanoid"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ingredientId = parseInt(id)
    const body = await request.json()

    // Validate required fields
    if (typeof body.quantity !== "number" || body.quantity <= 0) {
      return NextResponse.json(
        { error: "Quantity must be a positive number" },
        { status: 400 }
      )
    }

    // Get current ingredient
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
    })

    if (!ingredient) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 })
    }

    if (!ingredient.isActive) {
      return NextResponse.json({ error: "Ingredient is inactive" }, { status: 400 })
    }

    const oldQuantity = Number(ingredient.quantity)
    const newQuantity = oldQuantity + body.quantity
    const oldCost = Number(ingredient.costPerUnit)
    const newCost = body.costPerUnit !== undefined ? body.costPerUnit : oldCost

    // Generate a change ID to group related history entries
    const changeId = `restock_${nanoid(10)}`

    // Use transaction to update ingredient and create history
    const [updatedIngredient] = await prisma.$transaction([
      // Update ingredient
      prisma.ingredient.update({
        where: { id: ingredientId },
        data: {
          quantity: newQuantity,
          costPerUnit: newCost,
          lastRestockDate: new Date(),
          lastUpdated: new Date(),
        },
        include: { vendor: true },
      }),
      // Log quantity change
      prisma.ingredientHistory.create({
        data: {
          ingredientId,
          ingredientName: ingredient.name,
          changeId,
          field: "quantity",
          oldValue: oldQuantity.toString(),
          newValue: newQuantity.toString(),
          source: "restock",
          reason: "restock",
          reasonNote: body.note || null,
          userId: body.userId || 0,
          userName: body.userName || "System",
        },
      }),
      // Log cost change if changed
      ...(newCost !== oldCost
        ? [
            prisma.ingredientHistory.create({
              data: {
                ingredientId,
                ingredientName: ingredient.name,
                changeId,
                field: "costPerUnit",
                oldValue: oldCost.toString(),
                newValue: newCost.toString(),
                source: "restock",
                reason: "price_update",
                reasonNote: body.note || null,
                userId: body.userId || 0,
                userName: body.userName || "System",
              },
            }),
          ]
        : []),
    ])

    return NextResponse.json({
      id: updatedIngredient.id,
      name: updatedIngredient.name,
      quantity: Number(updatedIngredient.quantity),
      costPerUnit: Number(updatedIngredient.costPerUnit),
      lastRestockDate: updatedIngredient.lastRestockDate,
      message: `Added ${body.quantity} ${ingredient.unit} to ${ingredient.name}`,
    })
  } catch (error) {
    console.error("Failed to restock ingredient:", error)
    return NextResponse.json({ error: "Failed to restock ingredient" }, { status: 500 })
  }
}
```

**Step 2: Install nanoid for unique IDs**

Run: `npm install nanoid`

**Step 3: Verify the endpoint**

```bash
curl -X POST http://localhost:3000/api/ingredients/1/restock \
  -H "Content-Type: application/json" \
  -d '{"quantity": 5, "userId": 1, "userName": "Admin"}' | jq
```

Expected: JSON with updated quantity and success message.

**Step 4: Commit**

```bash
git add src/app/api/ingredients/[id]/restock/route.ts package.json package-lock.json
git commit -m "feat(api): add POST /api/ingredients/[id]/restock endpoint"
```

---

## Task 7: Add GET /api/ingredients/[id]/history Endpoint

**Files:**
- Create: `src/app/api/ingredients/[id]/history/route.ts`

**Step 1: Create the history endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ingredientId = parseInt(id)

    // Get pagination params
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit

    // Verify ingredient exists
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
      select: { id: true, name: true },
    })

    if (!ingredient) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 })
    }

    // Get history with pagination
    const [history, total] = await Promise.all([
      prisma.ingredientHistory.findMany({
        where: { ingredientId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.ingredientHistory.count({
        where: { ingredientId },
      }),
    ])

    return NextResponse.json({
      ingredientId,
      ingredientName: ingredient.name,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      history: history.map((h) => ({
        id: h.id,
        changeId: h.changeId,
        field: h.field,
        oldValue: h.oldValue,
        newValue: h.newValue,
        source: h.source,
        reason: h.reason,
        reasonNote: h.reasonNote,
        userId: h.userId,
        userName: h.userName,
        createdAt: h.createdAt,
      })),
    })
  } catch (error) {
    console.error("Failed to fetch ingredient history:", error)
    return NextResponse.json({ error: "Failed to fetch ingredient history" }, { status: 500 })
  }
}
```

**Step 2: Verify the endpoint**

```bash
curl "http://localhost:3000/api/ingredients/1/history?page=1&limit=10" | jq
```

Expected: JSON with paginated history entries.

**Step 3: Commit**

```bash
git add src/app/api/ingredients/[id]/history/route.ts
git commit -m "feat(api): add GET /api/ingredients/[id]/history endpoint"
```

---

## Task 8: Update Ingredients Page - Add Quantity Column

**Files:**
- Modify: `src/app/(dashboard)/ingredients/page.tsx`

**Step 1: Update interface to include new fields**

Find the `Ingredient` interface (around line 42) and update it:

```typescript
interface Ingredient {
  id: number
  name: string
  category: string
  unit: string
  costPerUnit: number
  parLevel: number
  quantity: number
  stockStatus: "ok" | "low" | "critical" | "out"
  stockRatio: number | null
  vendorId: number | null
  vendorName: string | null
  lastRestockDate: string | null
  lastUpdated: string
  barcode: string | null
}
```

**Step 2: Update table header to add Quantity column**

Find the `<TableHeader>` section and update it:

```tsx
<TableHeader>
  <TableRow>
    <TableHead>Name</TableHead>
    <TableHead>Category</TableHead>
    <TableHead className="text-right">Quantity</TableHead>
    <TableHead className="text-right">PAR Level</TableHead>
    <TableHead className="text-right">Cost/Unit</TableHead>
    <TableHead>Unit</TableHead>
    <TableHead>Vendor</TableHead>
    <TableHead className="w-24">Actions</TableHead>
  </TableRow>
</TableHeader>
```

**Step 3: Update table body to show quantity with stock status**

Update the table row rendering:

```tsx
<TableBody>
  {ingredients.map((ingredient) => (
    <TableRow key={ingredient.id}>
      <TableCell className="font-medium">{ingredient.name}</TableCell>
      <TableCell>
        <Badge variant="outline">{ingredient.category}</Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <span>{ingredient.quantity} {ingredient.unit}</span>
          {ingredient.stockStatus === "critical" && (
            <Badge variant="destructive">Critical</Badge>
          )}
          {ingredient.stockStatus === "low" && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">Low</Badge>
          )}
          {ingredient.stockStatus === "out" && (
            <Badge variant="destructive">Out</Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">{ingredient.parLevel}</TableCell>
      <TableCell className="text-right">
        ₱{ingredient.costPerUnit.toFixed(2)}
      </TableCell>
      <TableCell>{ingredient.unit}</TableCell>
      <TableCell className="text-muted-foreground">
        {ingredient.vendorName || "—"}
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={() => openForm(ingredient)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setDeleteId(ingredient.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  ))}
</TableBody>
```

**Step 4: Add quantity field to form**

In the form dialog, add quantity input after costPerUnit:

```tsx
<div className="grid grid-cols-2 gap-4">
  <div className="space-y-2">
    <Label htmlFor="costPerUnit">Cost per Unit (₱) *</Label>
    <Input
      id="costPerUnit"
      type="number"
      step="0.01"
      min="0"
      value={costPerUnit}
      onChange={(e) => setCostPerUnit(e.target.value)}
      placeholder="0.00"
      required
    />
  </div>

  <div className="space-y-2">
    <Label htmlFor="quantity">Current Quantity</Label>
    <Input
      id="quantity"
      type="number"
      step="0.01"
      min="0"
      value={quantity}
      onChange={(e) => setQuantity(e.target.value)}
      placeholder="0"
    />
  </div>
</div>
```

**Step 5: Add quantity state variable**

Add to the form state section:

```typescript
const [quantity, setQuantity] = useState("")
```

Update `openForm` function:

```typescript
function openForm(ingredient?: Ingredient) {
  setEditIngredient(ingredient || null)
  setName(ingredient?.name || "")
  setCategory(ingredient?.category || "")
  setUnit(ingredient?.unit || "")
  setCostPerUnit(ingredient?.costPerUnit?.toString() || "")
  setParLevel(ingredient?.parLevel?.toString() || "0")
  setQuantity(ingredient?.quantity?.toString() || "0")
  setVendorId(ingredient?.vendorId?.toString() || "")
  setFormOpen(true)
}

function closeForm() {
  setFormOpen(false)
  setEditIngredient(null)
  setName("")
  setCategory("")
  setUnit("")
  setCostPerUnit("")
  setParLevel("0")
  setQuantity("0")
  setVendorId("")
}
```

Update `handleSubmit` to include quantity:

```typescript
body: JSON.stringify({
  name,
  category,
  unit,
  costPerUnit: parseFloat(costPerUnit),
  parLevel: parseInt(parLevel) || 0,
  quantity: parseFloat(quantity) || 0,
  vendorId: vendorId ? parseInt(vendorId) : null,
}),
```

**Step 6: Verify the page works**

Run: `npm run dev`
Open: http://localhost:3000/ingredients

Expected: Table shows quantity column with stock status badges.

**Step 7: Commit**

```bash
git add src/app/\(dashboard\)/ingredients/page.tsx
git commit -m "feat(ui): add quantity and stock status to ingredients page"
```

---

## Task 9: Add Restock Dialog to Ingredients Page

**Files:**
- Modify: `src/app/(dashboard)/ingredients/page.tsx`

**Step 1: Add restock state and dialog**

Add imports:

```typescript
import { Package } from "lucide-react"
```

Add state:

```typescript
const [restockIngredient, setRestockIngredient] = useState<Ingredient | null>(null)
const [restockQuantity, setRestockQuantity] = useState("")
const [restockCost, setRestockCost] = useState("")
const [restocking, setRestocking] = useState(false)
```

Add restock handler:

```typescript
async function handleRestock() {
  if (!restockIngredient || !restockQuantity) return
  setRestocking(true)
  try {
    const res = await fetch(`/api/ingredients/${restockIngredient.id}/restock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quantity: parseFloat(restockQuantity),
        costPerUnit: restockCost ? parseFloat(restockCost) : undefined,
        userId: 1, // TODO: Get from session
        userName: "Admin", // TODO: Get from session
      }),
    })
    if (!res.ok) throw new Error("Failed")
    toast.success(`Restocked ${restockQuantity} ${restockIngredient.unit} of ${restockIngredient.name}`)
    setRestockIngredient(null)
    setRestockQuantity("")
    setRestockCost("")
    fetchData()
  } catch {
    toast.error("Failed to restock ingredient")
  } finally {
    setRestocking(false)
  }
}
```

**Step 2: Add restock button to actions**

In the actions column, add restock button:

```tsx
<TableCell>
  <div className="flex gap-1">
    <Button
      size="icon"
      variant="ghost"
      onClick={() => {
        setRestockIngredient(ingredient)
        setRestockCost(ingredient.costPerUnit.toString())
      }}
      title="Restock"
    >
      <Package className="h-4 w-4" />
    </Button>
    <Button size="icon" variant="ghost" onClick={() => openForm(ingredient)}>
      <Pencil className="h-4 w-4" />
    </Button>
    <Button size="icon" variant="ghost" onClick={() => setDeleteId(ingredient.id)}>
      <Trash2 className="h-4 w-4" />
    </Button>
  </div>
</TableCell>
```

**Step 3: Add restock dialog**

After the delete AlertDialog, add:

```tsx
{/* Restock Dialog */}
<Dialog open={!!restockIngredient} onOpenChange={() => setRestockIngredient(null)}>
  <DialogContent className="max-w-sm">
    <DialogHeader>
      <DialogTitle>Restock {restockIngredient?.name}</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Current: {restockIngredient?.quantity} {restockIngredient?.unit}
      </div>
      <div className="space-y-2">
        <Label htmlFor="restockQty">Quantity to Add *</Label>
        <Input
          id="restockQty"
          type="number"
          step="0.01"
          min="0.01"
          value={restockQuantity}
          onChange={(e) => setRestockQuantity(e.target.value)}
          placeholder={`Enter ${restockIngredient?.unit}`}
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="restockCost">New Cost per Unit (₱)</Label>
        <Input
          id="restockCost"
          type="number"
          step="0.01"
          min="0"
          value={restockCost}
          onChange={(e) => setRestockCost(e.target.value)}
          placeholder="Leave blank to keep current"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setRestockIngredient(null)}>
          Cancel
        </Button>
        <Button onClick={handleRestock} disabled={restocking || !restockQuantity}>
          {restocking ? "Restocking..." : "Restock"}
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>
```

**Step 4: Verify restock works**

Open ingredients page, click restock icon on an ingredient, enter quantity, submit.

Expected: Quantity updates, success toast shown.

**Step 5: Commit**

```bash
git add src/app/\(dashboard\)/ingredients/page.tsx
git commit -m "feat(ui): add restock dialog to ingredients page"
```

---

## Task 10: Update PUT /api/ingredients/[id] - Log History

**Files:**
- Modify: `src/app/api/ingredients/[id]/route.ts`

**Step 1: Update PUT handler to log quantity and cost changes**

Replace the PUT function:

```typescript
import { nanoid } from "nanoid"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ingredientId = parseInt(id)
    const body = await request.json()

    // Get current ingredient for history comparison
    const current = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
    })

    if (!current) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 })
    }

    const changeId = `edit_${nanoid(10)}`
    const historyEntries: Parameters<typeof prisma.ingredientHistory.create>[0]["data"][] = []

    // Check for quantity change
    if (body.quantity !== undefined && Number(body.quantity) !== Number(current.quantity)) {
      historyEntries.push({
        ingredientId,
        ingredientName: current.name,
        changeId,
        field: "quantity",
        oldValue: current.quantity.toString(),
        newValue: body.quantity.toString(),
        source: "manual_edit",
        reason: body.reason || null,
        reasonNote: body.reasonNote || null,
        userId: body.userId || 0,
        userName: body.userName || "System",
      })
    }

    // Check for cost change
    if (body.costPerUnit !== undefined && Number(body.costPerUnit) !== Number(current.costPerUnit)) {
      historyEntries.push({
        ingredientId,
        ingredientName: current.name,
        changeId,
        field: "costPerUnit",
        oldValue: current.costPerUnit.toString(),
        newValue: body.costPerUnit.toString(),
        source: "manual_edit",
        reason: body.reason || "price_update",
        reasonNote: body.reasonNote || null,
        userId: body.userId || 0,
        userName: body.userName || "System",
      })
    }

    // Update ingredient and create history entries in transaction
    const [ingredient] = await prisma.$transaction([
      prisma.ingredient.update({
        where: { id: ingredientId },
        data: {
          name: body.name,
          category: body.category,
          unit: body.unit,
          costPerUnit: body.costPerUnit,
          parLevel: body.parLevel,
          quantity: body.quantity,
          vendorId: body.vendorId || null,
          barcode: body.barcode || null,
          lastUpdated: new Date(),
        },
        include: { vendor: true },
      }),
      ...historyEntries.map((entry) =>
        prisma.ingredientHistory.create({ data: entry })
      ),
    ])

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
    })
  } catch (error) {
    console.error("Failed to update ingredient:", error)
    return NextResponse.json({ error: "Failed to update ingredient" }, { status: 500 })
  }
}
```

**Step 2: Verify history is logged on update**

Update an ingredient's quantity, then check history:

```bash
curl "http://localhost:3000/api/ingredients/1/history" | jq
```

Expected: History entry with source="manual_edit".

**Step 3: Commit**

```bash
git add src/app/api/ingredients/[id]/route.ts
git commit -m "feat(api): log history on ingredient updates"
```

---

## Task 11: Update DELETE to Soft Delete

**Files:**
- Modify: `src/app/api/ingredients/[id]/route.ts`

**Step 1: Update DELETE handler to soft delete**

Replace the DELETE function:

```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ingredientId = parseInt(id)

    // Soft delete - set isActive to false
    const ingredient = await prisma.ingredient.update({
      where: { id: ingredientId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    })

    if (!ingredient) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: `${ingredient.name} has been deactivated` })
  } catch (error) {
    console.error("Failed to delete ingredient:", error)
    return NextResponse.json({ error: "Failed to delete ingredient" }, { status: 500 })
  }
}
```

**Step 2: Verify soft delete**

Delete an ingredient, then check database - should have `isActive: false`.

**Step 3: Commit**

```bash
git add src/app/api/ingredients/[id]/route.ts
git commit -m "feat(api): implement soft delete for ingredients"
```

---

## Task 12: Add Low Stock Alert Summary Component

**Files:**
- Create: `src/components/ingredients/low-stock-alert.tsx`

**Step 1: Create the component**

```typescript
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
```

**Step 2: Check if Popover component exists**

Run: `ls src/components/ui/popover.tsx`

If not found, add it:

```bash
npx shadcn@latest add popover
```

**Step 3: Commit**

```bash
git add src/components/ingredients/low-stock-alert.tsx
git commit -m "feat(ui): add LowStockAlert component"
```

---

## Task 13: Final Verification

**Step 1: Run full test**

1. Start dev server: `npm run dev`
2. Open http://localhost:3000/ingredients
3. Verify:
   - [ ] Ingredients list shows quantity column with stock status badges
   - [ ] Create ingredient with quantity works
   - [ ] Edit ingredient updates quantity and logs history
   - [ ] Restock dialog adds quantity and logs history
   - [ ] Delete ingredient soft-deletes (still in DB with isActive=false)
   - [ ] GET /api/ingredients/low-stock returns prioritized list

**Step 2: Check all API endpoints**

```bash
# List all (should include quantity, stockStatus)
curl http://localhost:3000/api/ingredients | jq '.[0]'

# Low stock
curl http://localhost:3000/api/ingredients/low-stock | jq

# History
curl http://localhost:3000/api/ingredients/1/history | jq

# Restock
curl -X POST http://localhost:3000/api/ingredients/1/restock \
  -H "Content-Type: application/json" \
  -d '{"quantity": 10}' | jq
```

**Step 3: Tag Phase 1 complete**

```bash
git tag phase1-foundation-complete -m "Phase 1: Foundation complete - stock tracking, history, alerts"
```

---

## Summary

Phase 1 adds:
- **Prisma schema**: quantity, isActive, barcode fields on Ingredient; IngredientHistory model
- **API endpoints**: Enhanced GET /ingredients, GET /low-stock, POST /restock, GET /history
- **UI**: Quantity column with status badges, restock dialog, LowStockAlert component
- **Audit trail**: All quantity and cost changes logged to IngredientHistory
