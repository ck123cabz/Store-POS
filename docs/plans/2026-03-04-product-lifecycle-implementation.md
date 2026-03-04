# Product Lifecycle Management — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a four-stage product lifecycle (Draft → Active → Unavailable → Discontinued) with status transitions, conditional hard delete, POS display filtering, and admin filter UI.

**Architecture:** Add a `ProductStatus` enum to Prisma schema, a dedicated PATCH status endpoint with transition validation, update existing GET/DELETE endpoints, and modify the three UI layers (POS grid, products tab, product panel) to respect status.

**Tech Stack:** Prisma ORM (PostgreSQL enum + migration), Next.js API routes, React components (shadcn Badge, ToggleGroup for filters)

**Note on audit logging:** The existing "audit log" is `IngredientHistory` — ingredient-specific, not general-purpose. Since we chose "no new table," product status changes will NOT be logged to a persistent audit trail yet. We add `statusChangedAt` and `statusChangedBy` fields to `Product` for last-change visibility. A general audit log can be added later.

---

### Task 1: Prisma Schema — Add ProductStatus enum and fields

**Files:**
- Modify: `prisma/schema.prisma` (Product model, ~lines 73-112)

**Step 1: Add enum and fields to schema**

Add before the `Product` model (after the `Category` model block):

```prisma
enum ProductStatus {
  DRAFT
  ACTIVE
  UNAVAILABLE
  DISCONTINUED
}
```

Add to the `Product` model, after the `updatedAt` field (line 82):

```prisma
  // Product Lifecycle
  status          ProductStatus @default(ACTIVE) @map("status")
  statusChangedAt DateTime?     @map("status_changed_at")
  statusChangedBy String?       @map("status_changed_by") // username who changed status
```

**Step 2: Generate and run migration**

Run: `npx prisma migrate dev --name add-product-status`

This will:
- Create the `ProductStatus` enum in PostgreSQL
- Add `status` column defaulting to `ACTIVE` (backfills existing rows)
- Add `status_changed_at` and `status_changed_by` nullable columns

**Step 3: Verify migration**

Run: `npx prisma studio` (open briefly to verify the `status` column exists and all products show `ACTIVE`)

**Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(schema): add ProductStatus enum with lifecycle fields"
```

---

### Task 2: API — PATCH status transition endpoint

**Files:**
- Create: `src/app/api/products/[id]/status/route.ts`

**Step 1: Create the status endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { ProductStatus } from "@prisma/client"

// Valid transitions: from → [allowed to values]
const VALID_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  DRAFT: [ProductStatus.ACTIVE, ProductStatus.DISCONTINUED],
  ACTIVE: [ProductStatus.UNAVAILABLE, ProductStatus.DISCONTINUED],
  UNAVAILABLE: [ProductStatus.ACTIVE, ProductStatus.DISCONTINUED],
  DISCONTINUED: [ProductStatus.ACTIVE],
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
    if (!session.user.permProducts) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 })
    }

    const { id } = await params
    const productId = parseInt(id)
    const body = await request.json()
    const newStatus = body.status as ProductStatus

    // Validate the target status is a valid enum value
    if (!Object.values(ProductStatus).includes(newStatus)) {
      return NextResponse.json(
        { error: `Invalid status: ${newStatus}` },
        { status: 400 }
      )
    }

    // Fetch current product
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, status: true },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Validate transition
    const allowed = VALID_TRANSITIONS[product.status]
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Cannot transition from ${product.status} to ${newStatus}`,
          currentStatus: product.status,
          allowedTransitions: allowed,
        },
        { status: 400 }
      )
    }

    // Update status
    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        status: newStatus,
        statusChangedAt: new Date(),
        statusChangedBy: session.user.fullname ?? session.user.username,
      },
      select: {
        id: true,
        name: true,
        status: true,
        statusChangedAt: true,
        statusChangedBy: true,
      },
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json(
      { error: "Failed to update product status" },
      { status: 500 }
    )
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/products/\[id\]/status/route.ts
git commit -m "feat(api): add PATCH /api/products/[id]/status with transition validation"
```

---

### Task 3: API — Update DELETE endpoint with transaction history check

**Files:**
- Modify: `src/app/api/products/[id]/route.ts` (lines 91-110, DELETE handler)

**Step 1: Update DELETE to check transaction history**

Replace the existing DELETE function with:

```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!session.user.permProducts) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 })
    }

    const { id } = await params
    const productId = parseInt(id)

    // Check if product has any transaction history
    const transactionCount = await prisma.transactionItem.count({
      where: { productId },
    })

    if (transactionCount > 0) {
      return NextResponse.json(
        {
          error: "Product has transaction history and cannot be deleted. Use status change to discontinue instead.",
          transactionCount,
        },
        { status: 409 }
      )
    }

    // Also check kitchen order items
    const kitchenOrderCount = await prisma.kitchenOrderItem.count({
      where: { productId },
    })

    if (kitchenOrderCount > 0) {
      return NextResponse.json(
        {
          error: "Product has kitchen order history and cannot be deleted. Use status change to discontinue instead.",
        },
        { status: 409 }
      )
    }

    // Safe to hard delete — no transaction/kitchen history
    await prisma.product.delete({ where: { id: productId } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 })
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/products/\[id\]/route.ts
git commit -m "fix(api): guard product DELETE with transaction history check (409 Conflict)"
```

---

### Task 4: API — Add status filter to GET /api/products

**Files:**
- Modify: `src/app/api/products/route.ts` (lines 10-50, GET handler)

**Step 1: Add status query parameter support**

In the GET handler, after `const includeCosting = ...` (line 18), add:

```typescript
const statusParam = searchParams.get("status") // comma-separated: "ACTIVE,UNAVAILABLE"
```

Update the `prisma.product.findMany` call to include a where clause:

```typescript
const products = await prisma.product.findMany({
  where: statusParam
    ? { status: { in: statusParam.split(",") as ProductStatus[] } }
    : undefined,
  include: {
    // ... existing includes unchanged
  },
  orderBy: { name: "asc" },
})
```

Add the `ProductStatus` import at the top:

```typescript
import { ProductStatus } from "@prisma/client"
```

Include `status` in the formatted response object (inside `formatted.map`), after `needsPricing`:

```typescript
status: p.status,
```

**Step 2: Also add status to POST response**

In the POST handler response, add `status: product.status` to the returned object.

**Step 3: Commit**

```bash
git add src/app/api/products/route.ts
git commit -m "feat(api): add status filter to GET /api/products and include status in responses"
```

---

### Task 5: POS Grid — Filter by status and style UNAVAILABLE products

**Files:**
- Modify: `src/components/pos/product-grid.tsx` (Product interface + filtering)
- Modify: `src/components/pos/product-card.tsx` (UNAVAILABLE visual treatment)

**Step 1: Update Product interface in product-grid.tsx**

Add `status` to the Product interface (after `needsPricing`):

```typescript
status?: string // "ACTIVE" | "UNAVAILABLE" | etc
```

**Step 2: Update filteredProducts in product-grid.tsx**

The POS page should already be fetching with `?status=ACTIVE,UNAVAILABLE` (that's handled in Task 6 below, POS page fetch). In the grid component, UNAVAILABLE products should show greyed out.

No filtering change needed in the grid itself — the POS page fetches the right set. But we do need to pass status down to the card.

**Step 3: Update product-card.tsx for UNAVAILABLE status**

Add `status` to the ProductCardProps product interface:

```typescript
status?: string
```

Update the `isDisabled` logic:

```typescript
const isUnavailable = product.status === "UNAVAILABLE"
const isOutOfStock = availability.status === "out"
const isDisabled = isOutOfStock || isUnavailable
```

Add an "Unavailable" overlay (similar to the out-of-stock overlay but with amber styling):

```tsx
{/* Unavailable overlay */}
{isUnavailable && !isOutOfStock && (
  <div className="absolute inset-0 flex items-center justify-center bg-background/70">
    <span className="text-xs font-semibold uppercase tracking-wider text-status-warning">
      Unavailable
    </span>
  </div>
)}
```

Update the aria-label to include unavailable state.

**Step 4: Update POS page to fetch with status filter**

Find where the POS page fetches products (likely in `src/app/(dashboard)/pos/page.tsx` or similar). Update the fetch URL to:

```typescript
fetch("/api/products?status=ACTIVE,UNAVAILABLE")
```

**Step 5: Commit**

```bash
git add src/components/pos/product-grid.tsx src/components/pos/product-card.tsx
git commit -m "feat(pos): show UNAVAILABLE products greyed out, hide DRAFT/DISCONTINUED"
```

---

### Task 6: Menu Management — Status badges in products tab

**Files:**
- Modify: `src/app/(dashboard)/menu/components/products-tab.tsx`

**Step 1: Add status to Product interface**

Add to the Product interface (after `availability`):

```typescript
status?: string // "ACTIVE" | "DRAFT" | "UNAVAILABLE" | "DISCONTINUED"
```

**Step 2: Add status badge column to the DataTable**

Add a new column after the "stock" column:

```typescript
{
  id: "status",
  header: "Status",
  cell: (product) => {
    if (!product.status || product.status === "ACTIVE") return null
    const badgeConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      DRAFT: { label: "Draft", variant: "secondary" },
      UNAVAILABLE: { label: "Unavailable", variant: "outline" },
      DISCONTINUED: { label: "Discontinued", variant: "destructive" },
    }
    const config = badgeConfig[product.status]
    if (!config) return null
    return <Badge variant={config.variant}>{config.label}</Badge>
  },
  priority: 1,
},
```

**Step 3: Add product status filter dropdown**

Add a new `Select` dropdown after the existing stock status filter:

```tsx
<Select value={productStatusFilter} onValueChange={setProductStatusFilter}>
  <SelectTrigger className="w-40" aria-label="Filter by product status">
    <SelectValue placeholder="Product Status" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Status</SelectItem>
    <SelectItem value="ACTIVE">Active</SelectItem>
    <SelectItem value="DRAFT">Draft</SelectItem>
    <SelectItem value="UNAVAILABLE">Unavailable</SelectItem>
    <SelectItem value="DISCONTINUED">Discontinued</SelectItem>
  </SelectContent>
</Select>
```

Add the state: `const [productStatusFilter, setProductStatusFilter] = useState<string>("ACTIVE")`

Default to `ACTIVE` so the operator sees their active menu by default.

Update the `filteredProducts` memo to include status filtering:

```typescript
// Product status filter
if (productStatusFilter !== "all" && p.status && p.status !== productStatusFilter) {
  return false
}
// Also show products without status field (backwards compat) when filtering ACTIVE
if (productStatusFilter === "ACTIVE" && !p.status) {
  // Allow through — legacy products are implicitly active
}
```

Update `hasFilters` and `clearFilters` to include `productStatusFilter`.

**Step 4: Commit**

```bash
git add src/app/(dashboard)/menu/components/products-tab.tsx
git commit -m "feat(menu): add status badges and status filter to products tab"
```

---

### Task 7: Product Panel — Contextual action buttons

**Files:**
- Modify: `src/app/(dashboard)/menu/components/product-panel.tsx` (view mode, ~lines 854-1085)
- Modify: `src/app/(dashboard)/menu/page.tsx` (add status change handler)

**Step 1: Add status to Product interface in product-panel.tsx**

Add to the Product interface (after `availability`):

```typescript
status?: string
```

**Step 2: Add status action buttons in view mode**

After the `DetailPanelContent` closing tag (line 1080) and before the closing `</>`, replace the comment `{/* No footer in view mode ... */}` with a footer containing contextual actions:

```tsx
{/* Status Actions Footer */}
<DetailPanelFooter>
  <StatusActions
    status={product.status ?? "ACTIVE"}
    productName={product.name}
    onStatusChange={onStatusChange}
    onDelete={onDelete}
    deleting={false}
  />
</DetailPanelFooter>
```

**Step 3: Create StatusActions component (inline in product-panel.tsx)**

Add this component above the `ProductPanel` export:

```tsx
function StatusActions({
  status,
  productName,
  onStatusChange,
  onDelete,
  deleting,
}: {
  status: string
  productName: string
  onStatusChange?: (newStatus: string) => void
  onDelete?: () => void
  deleting?: boolean
}) {
  const [confirmAction, setConfirmAction] = useState<string | null>(null)

  const actions: { label: string; status?: string; variant?: "default" | "outline" | "destructive"; isDelete?: boolean }[] = []

  switch (status) {
    case "DRAFT":
      actions.push({ label: "Go Live", status: "ACTIVE", variant: "default" })
      actions.push({ label: "Delete", isDelete: true, variant: "destructive" })
      break
    case "ACTIVE":
      actions.push({ label: "Mark Unavailable", status: "UNAVAILABLE", variant: "outline" })
      actions.push({ label: "Discontinue", status: "DISCONTINUED", variant: "destructive" })
      break
    case "UNAVAILABLE":
      actions.push({ label: "Reactivate", status: "ACTIVE", variant: "default" })
      actions.push({ label: "Discontinue", status: "DISCONTINUED", variant: "destructive" })
      break
    case "DISCONTINUED":
      actions.push({ label: "Reactivate", status: "ACTIVE", variant: "default" })
      break
  }

  if (actions.length === 0) return null

  const handleAction = (action: typeof actions[0]) => {
    if (action.isDelete) {
      if (confirmAction === "delete") {
        onDelete?.()
        setConfirmAction(null)
      } else {
        setConfirmAction("delete")
      }
    } else if (action.status === "DISCONTINUED") {
      if (confirmAction === action.status) {
        onStatusChange?.(action.status)
        setConfirmAction(null)
      } else {
        setConfirmAction(action.status)
      }
    } else {
      onStatusChange?.(action.status!)
    }
  }

  return (
    <div className="space-y-2">
      {confirmAction && (
        <p className="text-sm text-muted-foreground text-center">
          {confirmAction === "delete"
            ? `Permanently delete "${productName}"? This cannot be undone.`
            : `Remove "${productName}" from the POS? You can reactivate it later.`}
        </p>
      )}
      <div className="flex items-center gap-2 justify-end">
        {confirmAction && (
          <Button variant="ghost" size="sm" onClick={() => setConfirmAction(null)}>
            Cancel
          </Button>
        )}
        {actions.map((action) => (
          <Button
            key={action.label}
            variant={
              confirmAction === (action.isDelete ? "delete" : action.status)
                ? "destructive"
                : action.variant ?? "outline"
            }
            size="sm"
            onClick={() => handleAction(action)}
            disabled={deleting}
          >
            {confirmAction === (action.isDelete ? "delete" : action.status)
              ? "Confirm"
              : action.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
```

**Step 4: Add props to ProductPanel**

Add to `ProductPanelProps`:

```typescript
onStatusChange?: (newStatus: string) => void
onDelete?: () => void
```

Wire them through to `StatusActions`.

**Step 5: Wire up in menu page.tsx**

In `src/app/(dashboard)/menu/page.tsx`, add handlers:

```typescript
const handleStatusChange = async (newStatus: string) => {
  if (!selectedProduct) return
  try {
    const res = await fetch(`/api/products/${selectedProduct.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error || "Failed to update status")
      return
    }
    toast.success(`${selectedProduct.name} is now ${newStatus.toLowerCase()}`)
    setSelectedProduct(null)
    void fetchData()
  } catch {
    toast.error("Failed to update product status")
  }
}

const handleDeleteProduct = async () => {
  if (!selectedProduct) return
  try {
    const res = await fetch(`/api/products/${selectedProduct.id}`, {
      method: "DELETE",
    })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error || "Failed to delete product")
      return
    }
    toast.success(`${selectedProduct.name} deleted`)
    setSelectedProduct(null)
    void fetchData()
  } catch {
    toast.error("Failed to delete product")
  }
}
```

Pass them to `ProductPanel`:

```tsx
<ProductPanel
  ...existing props
  onStatusChange={handleStatusChange}
  onDelete={handleDeleteProduct}
/>
```

Add `import { toast } from "sonner"` to menu page.tsx.

**Step 6: Commit**

```bash
git add src/app/(dashboard)/menu/components/product-panel.tsx src/app/(dashboard)/menu/page.tsx
git commit -m "feat(menu): add contextual status action buttons to product panel"
```

---

### Task 8: POS page fetch — Pass status filter

**Files:**
- Modify: POS page file (find with `grep -r "api/products" src/app/(dashboard)/pos/`)

**Step 1: Locate and update the POS product fetch**

Find where the POS page fetches products and update the URL to:

```typescript
"/api/products?status=ACTIVE,UNAVAILABLE"
```

This ensures DRAFT and DISCONTINUED products are never sent to the POS grid.

**Step 2: Commit**

```bash
git add <pos-page-file>
git commit -m "feat(pos): filter product fetch to ACTIVE and UNAVAILABLE only"
```

---

### Task 9: Build verification and type check

**Step 1: Run type check**

Run: `npx tsc --noEmit`

Fix any type errors (likely around the `status` field in interfaces not yet updated).

**Step 2: Run build**

Run: `npm run build`

Ensure clean build with no errors.

**Step 3: Run existing tests**

Run: `npm run test`

Ensure no regressions.

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve type errors and ensure clean build for product lifecycle"
```

---

## Summary of All Files Changed

| # | File | Action |
|---|------|--------|
| 1 | `prisma/schema.prisma` | Add `ProductStatus` enum + 3 fields to Product |
| 2 | `src/app/api/products/[id]/status/route.ts` | **Create** — PATCH status transition endpoint |
| 3 | `src/app/api/products/[id]/route.ts` | Modify DELETE — transaction history guard |
| 4 | `src/app/api/products/route.ts` | Modify GET — status filter, include status in response |
| 5 | `src/components/pos/product-grid.tsx` | Add status to interface |
| 6 | `src/components/pos/product-card.tsx` | UNAVAILABLE overlay + disable logic |
| 7 | `src/app/(dashboard)/menu/components/products-tab.tsx` | Status badges + filter dropdown |
| 8 | `src/app/(dashboard)/menu/components/product-panel.tsx` | StatusActions component + footer |
| 9 | `src/app/(dashboard)/menu/page.tsx` | Status change + delete handlers |
| 10 | POS page (to be located) | Status filter on fetch URL |
