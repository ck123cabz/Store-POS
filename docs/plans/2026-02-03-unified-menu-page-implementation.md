# Unified Menu Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Consolidate Products, Recipes, Pricing, and Categories into a single tabbed Menu page with enhanced ingredient shortage observability.

**Architecture:** Hybrid table + slide-out panel layout with two tabs (Products/Categories). Products tab shows all products with pricing, recipe, and stock info in one table. Clicking a row opens a detail panel with view/edit modes. Categories tab shows categories with drag-to-reorder, expandable product lists, and aggregate stats.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma ORM, Tailwind CSS, Radix UI (Dialog, Tabs, Tooltip), shadcn/ui components, Lucide icons

---

## Phase 1: Enhance Product Availability API

### Task 1.1: Add Enhanced Ingredient Types

**Files:**
- Modify: `src/lib/product-availability.ts:26-44`

**Step 1: Add new interfaces for detailed ingredient info**

Add after line 44:

```typescript
/**
 * Detailed ingredient shortage information (per-unit)
 */
export interface IngredientShortage {
  id: number;
  name: string;
  have: number; // base units in stock
  needPerUnit: number; // base units required per product
  status: "missing" | "low";
}

/**
 * Enhanced availability with all shortage details
 */
export interface EnhancedProductAvailability extends ProductAvailability {
  /** All ingredients that are completely out of stock */
  missingIngredients: IngredientShortage[];
  /** All ingredients that are low (can't meet full demand) */
  lowIngredients: IngredientShortage[];
  /** Detailed limiting ingredient info */
  limitingIngredientDetails: IngredientShortage | null;
}
```

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS (types added, no usage yet)

**Step 3: Commit**

```bash
git add src/lib/product-availability.ts
git commit -m "feat(availability): add enhanced shortage types"
```

---

### Task 1.2: Implement Enhanced Recipe Availability Calculation

**Files:**
- Modify: `src/lib/product-availability.ts`
- Test: `tests/unit/product-availability.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/product-availability.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  calculateEnhancedRecipeAvailability,
  AvailabilityRecipeItem,
} from "@/lib/product-availability";

describe("calculateEnhancedRecipeAvailability", () => {
  it("returns all missing ingredients when multiple are out", () => {
    const recipeItems: AvailabilityRecipeItem[] = [
      {
        quantity: 2,
        ingredient: { id: 1, name: "Buns", quantity: 0, packageSize: 8 },
      },
      {
        quantity: 1,
        ingredient: { id: 2, name: "Patty", quantity: 0, packageSize: 4 },
      },
      {
        quantity: 1,
        ingredient: { id: 3, name: "Lettuce", quantity: 5, packageSize: 1 },
      },
    ];

    const result = calculateEnhancedRecipeAvailability(recipeItems);

    expect(result.status).toBe("out");
    expect(result.missingIngredients).toHaveLength(2);
    expect(result.missingIngredients[0].name).toBe("Buns");
    expect(result.missingIngredients[0].needPerUnit).toBe(2);
    expect(result.missingIngredients[1].name).toBe("Patty");
    expect(result.lowIngredients).toHaveLength(0);
  });

  it("returns low ingredients with per-unit info", () => {
    const recipeItems: AvailabilityRecipeItem[] = [
      {
        quantity: 2,
        ingredient: { id: 1, name: "Buns", quantity: 1, packageSize: 8 }, // 8 base = 4 products
      },
      {
        quantity: 1,
        ingredient: { id: 2, name: "Patty", quantity: 5, packageSize: 4 }, // 20 base = 20 products
      },
    ];

    const result = calculateEnhancedRecipeAvailability(recipeItems);

    expect(result.status).toBe("critical");
    expect(result.maxProducible).toBe(4);
    expect(result.missingIngredients).toHaveLength(0);
    expect(result.lowIngredients).toHaveLength(1);
    expect(result.lowIngredients[0]).toEqual({
      id: 1,
      name: "Buns",
      have: 8,
      needPerUnit: 2,
      status: "low",
    });
    expect(result.limitingIngredientDetails).toEqual({
      id: 1,
      name: "Buns",
      have: 8,
      needPerUnit: 2,
      status: "low",
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/product-availability.test.ts`
Expected: FAIL with "calculateEnhancedRecipeAvailability is not exported"

**Step 3: Implement the function**

Add to `src/lib/product-availability.ts`:

```typescript
/**
 * Calculate enhanced availability with all missing/low ingredients
 */
export function calculateEnhancedRecipeAvailability(
  recipeItems: AvailabilityRecipeItem[]
): EnhancedProductAvailability {
  const warnings: string[] = [];
  const missingIngredients: IngredientShortage[] = [];
  const lowIngredients: IngredientShortage[] = [];

  // No recipe items means unlimited availability
  if (!recipeItems || recipeItems.length === 0) {
    return {
      status: "available",
      maxProducible: null,
      limitingIngredient: null,
      limitingIngredientDetails: null,
      warnings: [],
      missingIngredients: [],
      lowIngredients: [],
    };
  }

  let minPossible = Infinity;
  let limitingIngredientDetails: IngredientShortage | null = null;

  for (const recipeItem of recipeItems) {
    const { ingredient, quantity: recipeQuantity } = recipeItem;

    if (!ingredient) {
      warnings.push(`Recipe item missing ingredient data`);
      continue;
    }

    if (ingredient.packageSize <= 0) {
      warnings.push(`${ingredient.name}: Invalid package size`);
      continue;
    }

    const totalBaseUnits = calculateTotalBaseUnits(
      ingredient.quantity,
      ingredient.packageSize
    );

    const possibleUnits =
      recipeQuantity <= 0
        ? Infinity
        : Math.floor(totalBaseUnits / recipeQuantity);

    // Track missing (0 stock) vs low (some stock but limiting)
    if (totalBaseUnits <= 0) {
      missingIngredients.push({
        id: ingredient.id,
        name: ingredient.name,
        have: 0,
        needPerUnit: recipeQuantity,
        status: "missing",
      });
    } else if (possibleUnits < minPossible) {
      // This is the new limiting ingredient
      if (limitingIngredientDetails && limitingIngredientDetails.status === "low") {
        // Previous limiter was low, it stays low
      }
    }

    // Track the limiting ingredient
    if (possibleUnits < minPossible) {
      minPossible = possibleUnits;
      limitingIngredientDetails = {
        id: ingredient.id,
        name: ingredient.name,
        have: totalBaseUnits,
        needPerUnit: recipeQuantity,
        status: totalBaseUnits <= 0 ? "missing" : "low",
      };
    }
  }

  // Build low ingredients list (ingredients that limit but have some stock)
  for (const recipeItem of recipeItems) {
    const { ingredient, quantity: recipeQuantity } = recipeItem;
    if (!ingredient || ingredient.packageSize <= 0 || recipeQuantity <= 0) continue;

    const totalBaseUnits = calculateTotalBaseUnits(
      ingredient.quantity,
      ingredient.packageSize
    );

    // Skip already missing ones
    if (totalBaseUnits <= 0) continue;

    const possibleUnits = Math.floor(totalBaseUnits / recipeQuantity);

    // Consider "low" if it's limiting or could only make <= 20 units
    if (possibleUnits <= 20) {
      lowIngredients.push({
        id: ingredient.id,
        name: ingredient.name,
        have: totalBaseUnits,
        needPerUnit: recipeQuantity,
        status: "low",
      });
    }
  }

  if (minPossible === Infinity) {
    return {
      status: "out",
      maxProducible: 0,
      limitingIngredient: null,
      limitingIngredientDetails: null,
      warnings: warnings.length > 0 ? warnings : ["No valid ingredients in recipe"],
      missingIngredients,
      lowIngredients,
    };
  }

  const maxProducible = minPossible;
  const status = getStatusFromCount(maxProducible);

  return {
    status,
    maxProducible,
    limitingIngredient: limitingIngredientDetails
      ? { id: limitingIngredientDetails.id, name: limitingIngredientDetails.name }
      : null,
    limitingIngredientDetails,
    warnings,
    missingIngredients,
    lowIngredients,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/product-availability.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/product-availability.ts tests/unit/product-availability.test.ts
git commit -m "feat(availability): add enhanced calculation with all shortages"
```

---

### Task 1.3: Update Products API to Return Enhanced Availability

**Files:**
- Modify: `src/app/api/products/route.ts:66-121`

**Step 1: Import and use enhanced calculation**

Update the import at top:

```typescript
import {
  calculateProductAvailability,
  calculateEnhancedRecipeAvailability,
  type EnhancedProductAvailability,
} from "@/lib/product-availability"
```

**Step 2: Update the availability calculation in GET**

Replace lines 66-121 with:

```typescript
      // Calculate recipe-based availability with enhanced details
      let availability: EnhancedProductAvailability;

      if (p.recipeItems && p.recipeItems.length > 0) {
        availability = calculateEnhancedRecipeAvailability(
          (p.recipeItems ?? []).map((ri) => ({
            quantity: Number(ri.quantity),
            ingredient: {
              id: ri.ingredient.id,
              name: ri.ingredient.name,
              quantity: Number(ri.ingredient.quantity),
              packageSize: Number(ri.ingredient.packageSize),
            },
          }))
        );
      } else if (p.linkedIngredient) {
        // For linked ingredients, use basic calculation
        const basic = calculateProductAvailability({
          id: p.id,
          name: p.name,
          linkedIngredient: {
            id: p.linkedIngredient.id,
            name: p.linkedIngredient.name,
            quantity: Number(p.linkedIngredient.quantity),
            packageSize: Number(p.linkedIngredient.packageSize ?? 1),
          },
        });
        availability = {
          ...basic,
          missingIngredients: basic.status === "out" ? [{
            id: p.linkedIngredient.id,
            name: p.linkedIngredient.name,
            have: 0,
            needPerUnit: 1,
            status: "missing" as const,
          }] : [],
          lowIngredients: basic.status === "low" || basic.status === "critical" ? [{
            id: p.linkedIngredient.id,
            name: p.linkedIngredient.name,
            have: Number(p.linkedIngredient.quantity) * Number(p.linkedIngredient.packageSize ?? 1),
            needPerUnit: 1,
            status: "low" as const,
          }] : [],
          limitingIngredientDetails: basic.limitingIngredient ? {
            ...basic.limitingIngredient,
            have: Number(p.linkedIngredient.quantity) * Number(p.linkedIngredient.packageSize ?? 1),
            needPerUnit: 1,
            status: basic.status === "out" ? "missing" as const : "low" as const,
          } : null,
        };
      } else {
        availability = {
          status: "available",
          maxProducible: null,
          limitingIngredient: null,
          limitingIngredientDetails: null,
          warnings: [],
          missingIngredients: [],
          lowIngredients: [],
        };
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
        linkedIngredientId: p.linkedIngredientId,
        needsPricing: p.needsPricing,
        linkedIngredient: p.linkedIngredient
          ? {
              id: p.linkedIngredient.id,
              name: p.linkedIngredient.name,
              quantity: Number(p.linkedIngredient.quantity),
              parLevel: p.linkedIngredient.parLevel,
              unit: p.linkedIngredient.unit,
              packageSize: Number(p.linkedIngredient.packageSize ?? 1),
              baseUnit: p.linkedIngredient.baseUnit ?? null,
              stockStatus: ingredientStockStatus,
              stockRatio: ingredientStockRatio,
            }
          : null,
        // Enhanced availability with all shortage details
        availability: {
          status: availability.status,
          maxProducible: availability.maxProducible,
          limitingIngredient: availability.limitingIngredient,
          limitingIngredientDetails: availability.limitingIngredientDetails,
          missingIngredients: availability.missingIngredients,
          lowIngredients: availability.lowIngredients,
          warnings: availability.warnings,
        },
        ...(includeCosting && {
          trueCost: p.trueCost ? Number(p.trueCost) : null,
          trueMargin: p.trueMargin ? Number(p.trueMargin) : null,
          trueMarginPercent: p.trueMarginPercent ? Number(p.trueMarginPercent) : null,
        }),
      }
```

**Step 3: Verify API still works**

Run: `npm run dev` and test `curl http://localhost:3000/api/products`
Expected: Products returned with `missingIngredients` and `lowIngredients` arrays

**Step 4: Commit**

```bash
git add src/app/api/products/route.ts
git commit -m "feat(api): return enhanced availability with all shortages"
```

---

## Phase 2: Create Menu Page Shell

### Task 2.1: Create Menu Page with Tabs

**Files:**
- Create: `src/app/(dashboard)/menu/page.tsx`

**Step 1: Create the page directory**

```bash
mkdir -p src/app/\(dashboard\)/menu
```

**Step 2: Create the page component**

Create `src/app/(dashboard)/menu/page.tsx`:

```typescript
"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function MenuPage() {
  const [activeTab, setActiveTab] = useState("products")

  return (
    <div className="p-4 md:p-6 space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TabsList>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {activeTab === "products" ? "Add Product" : "Add Category"}
          </Button>
        </div>

        <TabsContent value="products" className="mt-4">
          <div className="text-muted-foreground">Products tab content (coming soon)</div>
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <div className="text-muted-foreground">Categories tab content (coming soon)</div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

**Step 3: Verify page renders**

Run: `npm run dev` and visit `http://localhost:3000/menu`
Expected: Page shows with working tabs

**Step 4: Commit**

```bash
git add src/app/\(dashboard\)/menu/page.tsx
git commit -m "feat(menu): create menu page shell with tabs"
```

---

### Task 2.2: Update Sidebar Navigation

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

**Step 1: Find the Inventory nav group and update**

Replace the Products, Recipes, and Pricing nav items with a single Menu item.

In the `navGroups` array, find the "Inventory" group and update:

```typescript
{
  label: "Inventory",
  items: [
    { href: "/menu", label: "Menu", icon: LayoutGrid, permission: "permProducts" },
    { href: "/ingredients", label: "Ingredients", icon: Package, permission: "permProducts", badgeKey: "ingredients" },
  ],
},
```

Also add the import at top:

```typescript
import { LayoutGrid } from "lucide-react"
```

Remove these items:
- Products (was `/products`)
- Recipes (was `/recipes`)
- Pricing (was `/pricing`)
- Categories (was `/categories`)

**Step 2: Verify sidebar updates**

Run: `npm run dev` and check sidebar
Expected: "Menu" link appears, old links removed

**Step 3: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat(nav): consolidate menu navigation"
```

---

## Phase 3: Products Tab Implementation

### Task 3.1: Create Stock Badge Component

**Files:**
- Create: `src/app/(dashboard)/menu/components/stock-badge.tsx`

**Step 1: Create the components directory**

```bash
mkdir -p src/app/\(dashboard\)/menu/components
```

**Step 2: Create the stock badge component**

Create `src/app/(dashboard)/menu/components/stock-badge.tsx`:

```typescript
"use client"

import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface IngredientShortage {
  id: number
  name: string
  have: number
  needPerUnit: number
  status: "missing" | "low"
}

interface StockBadgeProps {
  status: "available" | "low" | "critical" | "out"
  maxProducible: number | null
  missingIngredients: IngredientShortage[]
  lowIngredients: IngredientShortage[]
  onViewAll?: () => void
}

export function StockBadge({
  status,
  maxProducible,
  missingIngredients,
  lowIngredients,
  onViewAll,
}: StockBadgeProps) {
  const hasIssues = missingIngredients.length > 0 || lowIngredients.length > 0

  // Build display text
  let displayText = ""
  let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "default"

  if (status === "available") {
    displayText = "Available"
    badgeVariant = "default"
  } else if (status === "out") {
    const missingCount = missingIngredients.length
    displayText = `OUT · ${missingCount} missing`
    badgeVariant = "destructive"
  } else {
    // low or critical
    const lowCount = lowIngredients.length
    displayText = `${maxProducible} left · ${lowCount} low`
    badgeVariant = "secondary"
  }

  if (!hasIssues) {
    return (
      <Badge variant={badgeVariant} className={cn(
        status === "available" && "bg-green-100 text-green-800 hover:bg-green-100",
      )}>
        {displayText}
      </Badge>
    )
  }

  // Combine for tooltip
  const allIssues = [...missingIngredients, ...lowIngredients]
  const showMax = 5
  const hasMore = allIssues.length > showMax

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={badgeVariant}
            className={cn(
              "cursor-help",
              status === "out" && "bg-red-100 text-red-800 hover:bg-red-100",
              (status === "low" || status === "critical") && "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
            )}
          >
            {displayText}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-medium">
              {status === "out" ? "Missing" : "Low"} Ingredients ({allIssues.length})
            </p>
            <ul className="text-sm space-y-1">
              {allIssues.slice(0, showMax).map((ing) => (
                <li key={ing.id} className="flex justify-between gap-4">
                  <span>{ing.name}</span>
                  <span className="text-muted-foreground">
                    need {ing.needPerUnit}/unit
                  </span>
                </li>
              ))}
            </ul>
            {hasMore && (
              <p className="text-sm text-muted-foreground">
                + {allIssues.length - showMax} more...
              </p>
            )}
            {onViewAll && (
              <button
                onClick={onViewAll}
                className="text-sm text-primary hover:underline"
              >
                View all in panel →
              </button>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
```

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/menu/components/stock-badge.tsx
git commit -m "feat(menu): add stock badge with tooltip"
```

---

### Task 3.2: Create Products Table Component

**Files:**
- Create: `src/app/(dashboard)/menu/components/products-table.tsx`

**Step 1: Create the products table**

Create `src/app/(dashboard)/menu/components/products-table.tsx`:

```typescript
"use client"

import Image from "next/image"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { StockBadge } from "./stock-badge"
import { formatCurrency } from "@/lib/ingredient-utils"
import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface IngredientShortage {
  id: number
  name: string
  have: number
  needPerUnit: number
  status: "missing" | "low"
}

interface Product {
  id: number
  name: string
  price: number
  categoryId: number
  categoryName: string
  image: string
  trueCost?: number | null
  trueMarginPercent?: number | null
  recipeItemCount?: number
  availability: {
    status: "available" | "low" | "critical" | "out"
    maxProducible: number | null
    missingIngredients: IngredientShortage[]
    lowIngredients: IngredientShortage[]
  }
}

interface ProductsTableProps {
  products: Product[]
  selectedId: number | null
  onSelect: (product: Product) => void
  targetMargin?: number
  currency?: string
}

export function ProductsTable({
  products,
  selectedId,
  onSelect,
  targetMargin = 65,
  currency = "₱",
}: ProductsTableProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No products found. Add your first product to get started.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12 hidden sm:table-cell">Image</TableHead>
          <TableHead>Product</TableHead>
          <TableHead className="w-20 hidden md:table-cell">Price</TableHead>
          <TableHead className="w-20 hidden lg:table-cell">Cost</TableHead>
          <TableHead className="w-20 hidden lg:table-cell">Margin</TableHead>
          <TableHead className="w-20 hidden md:table-cell">Recipe</TableHead>
          <TableHead className="w-40">Stock</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => {
          const marginBelowTarget =
            product.trueMarginPercent != null &&
            product.trueMarginPercent < targetMargin

          return (
            <TableRow
              key={product.id}
              className={cn(
                "cursor-pointer hover:bg-muted/50",
                selectedId === product.id && "bg-muted"
              )}
              onClick={() => onSelect(product)}
            >
              <TableCell className="hidden sm:table-cell">
                {product.image ? (
                  <Image
                    src={product.image}
                    alt={product.name}
                    width={40}
                    height={40}
                    className="rounded object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-muted-foreground text-xs">
                    No img
                  </div>
                )}
              </TableCell>

              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{product.name}</span>
                  <Badge variant="outline" className="w-fit text-xs mt-1">
                    {product.categoryName}
                  </Badge>
                </div>
              </TableCell>

              <TableCell className="hidden md:table-cell">
                {formatCurrency(product.price, currency)}
              </TableCell>

              <TableCell className="hidden lg:table-cell">
                {product.trueCost != null
                  ? formatCurrency(product.trueCost, currency)
                  : "-"}
              </TableCell>

              <TableCell className="hidden lg:table-cell">
                {product.trueMarginPercent != null ? (
                  <span
                    className={cn(
                      "flex items-center gap-1",
                      marginBelowTarget && "text-orange-600"
                    )}
                  >
                    {marginBelowTarget && (
                      <AlertTriangle className="h-3 w-3" />
                    )}
                    {product.trueMarginPercent.toFixed(0)}%
                  </span>
                ) : (
                  "-"
                )}
              </TableCell>

              <TableCell className="hidden md:table-cell">
                {product.recipeItemCount != null && product.recipeItemCount > 0 ? (
                  <Badge variant="secondary">{product.recipeItemCount} items</Badge>
                ) : (
                  <span className="text-muted-foreground">None</span>
                )}
              </TableCell>

              <TableCell>
                <StockBadge
                  status={product.availability.status}
                  maxProducible={product.availability.maxProducible}
                  missingIngredients={product.availability.missingIngredients}
                  lowIngredients={product.availability.lowIngredients}
                  onViewAll={() => onSelect(product)}
                />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/\(dashboard\)/menu/components/products-table.tsx
git commit -m "feat(menu): add products table component"
```

---

### Task 3.3: Create Products Tab Component

**Files:**
- Create: `src/app/(dashboard)/menu/components/products-tab.tsx`

**Step 1: Create the products tab with filters**

Create `src/app/(dashboard)/menu/components/products-tab.tsx`:

```typescript
"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ProductsTable } from "./products-table"
import { Search } from "lucide-react"

interface IngredientShortage {
  id: number
  name: string
  have: number
  needPerUnit: number
  status: "missing" | "low"
}

interface Product {
  id: number
  name: string
  price: number
  categoryId: number
  categoryName: string
  image: string
  trueCost?: number | null
  trueMarginPercent?: number | null
  recipeItemCount?: number
  availability: {
    status: "available" | "low" | "critical" | "out"
    maxProducible: number | null
    missingIngredients: IngredientShortage[]
    lowIngredients: IngredientShortage[]
  }
}

interface Category {
  id: number
  name: string
}

interface ProductsTabProps {
  products: Product[]
  categories: Category[]
  selectedProductId: number | null
  onSelectProduct: (product: Product) => void
  targetMargin?: number
  currency?: string
}

export function ProductsTab({
  products,
  categories,
  selectedProductId,
  onSelectProduct,
  targetMargin = 65,
  currency = "₱",
}: ProductsTabProps) {
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search filter
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) {
        return false
      }

      // Category filter
      if (categoryFilter !== "all" && p.categoryId !== Number(categoryFilter)) {
        return false
      }

      // Status filter
      if (statusFilter !== "all" && p.availability.status !== statusFilter) {
        return false
      }

      return true
    })
  }, [products, search, categoryFilter, statusFilter])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={String(cat.id)}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="low">Low Stock</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="out">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <ProductsTable
        products={filteredProducts}
        selectedId={selectedProductId}
        onSelect={onSelectProduct}
        targetMargin={targetMargin}
        currency={currency}
      />
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/\(dashboard\)/menu/components/products-tab.tsx
git commit -m "feat(menu): add products tab with filters"
```

---

### Task 3.4: Wire Up Products Tab to Menu Page

**Files:**
- Modify: `src/app/(dashboard)/menu/page.tsx`

**Step 1: Update the menu page to fetch and display products**

Replace `src/app/(dashboard)/menu/page.tsx`:

```typescript
"use client"

import { useState, useEffect, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { ProductsTab } from "./components/products-tab"

interface IngredientShortage {
  id: number
  name: string
  have: number
  needPerUnit: number
  status: "missing" | "low"
}

interface Product {
  id: number
  name: string
  price: number
  categoryId: number
  categoryName: string
  image: string
  trueCost?: number | null
  trueMarginPercent?: number | null
  recipeItemCount?: number
  availability: {
    status: "available" | "low" | "critical" | "out"
    maxProducible: number | null
    missingIngredients: IngredientShortage[]
    lowIngredients: IngredientShortage[]
  }
}

interface Category {
  id: number
  name: string
}

interface Settings {
  targetTrueMarginPercent: number
  currency: string
}

export default function MenuPage() {
  const [activeTab, setActiveTab] = useState("products")
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [settings, setSettings] = useState<Settings>({ targetTrueMarginPercent: 65, currency: "₱" })
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [productsRes, categoriesRes, settingsRes] = await Promise.all([
        fetch("/api/products?includeCosting=true"),
        fetch("/api/categories"),
        fetch("/api/settings"),
      ])

      const productsData = await productsRes.json()
      const categoriesData = await categoriesRes.json()
      const settingsData = await settingsRes.json()

      // Add recipe item count from API
      const productsWithCounts = productsData.map((p: Product & { recipeItems?: unknown[] }) => ({
        ...p,
        recipeItemCount: Array.isArray(p.recipeItems) ? p.recipeItems.length : 0,
      }))

      setProducts(productsWithCounts)
      setCategories(categoriesData)
      setSettings({
        targetTrueMarginPercent: settingsData.targetTrueMarginPercent ?? 65,
        currency: settingsData.currency ?? "₱",
      })
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product)
    // Panel will be implemented in Phase 4
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TabsList>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {activeTab === "products" ? "Add Product" : "Add Category"}
          </Button>
        </div>

        <TabsContent value="products" className="mt-4">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : (
            <ProductsTab
              products={products}
              categories={categories}
              selectedProductId={selectedProduct?.id ?? null}
              onSelectProduct={handleSelectProduct}
              targetMargin={settings.targetTrueMarginPercent}
              currency={settings.currency}
            />
          )}
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <div className="text-muted-foreground">Categories tab content (coming soon)</div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

**Step 2: Verify products table renders**

Run: `npm run dev` and visit `http://localhost:3000/menu`
Expected: Products table shows with stock badges and filters work

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/menu/page.tsx
git commit -m "feat(menu): wire up products tab with data"
```

---

## Phase 4: Slide-Out Panel

### Task 4.1: Create Product Panel View Mode Component

**Files:**
- Create: `src/app/(dashboard)/menu/components/product-panel.tsx`

**Step 1: Create the panel component**

Create `src/app/(dashboard)/menu/components/product-panel.tsx`:

```typescript
"use client"

import { useState } from "react"
import { X, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/ingredient-utils"
import { cn } from "@/lib/utils"
import Image from "next/image"

interface IngredientShortage {
  id: number
  name: string
  have: number
  needPerUnit: number
  status: "missing" | "low"
}

interface RecipeItem {
  id: number
  quantity: number
  ingredient: {
    id: number
    name: string
    baseUnit: string
    costPerBaseUnit: number
  }
}

interface Product {
  id: number
  name: string
  price: number
  categoryId: number
  categoryName: string
  image: string
  trueCost?: number | null
  trueMargin?: number | null
  trueMarginPercent?: number | null
  prepTime?: number | null
  overheadCost?: number | null
  recipeItems?: RecipeItem[]
  availability: {
    status: "available" | "low" | "critical" | "out"
    maxProducible: number | null
    limitingIngredientDetails?: IngredientShortage | null
    missingIngredients: IngredientShortage[]
    lowIngredients: IngredientShortage[]
  }
}

interface ProductPanelProps {
  product: Product
  onClose: () => void
  onEdit: () => void
  targetMargin?: number
  currency?: string
  hourlyLaborRate?: number
}

export function ProductPanel({
  product,
  onClose,
  onEdit,
  targetMargin = 65,
  currency = "₱",
  hourlyLaborRate = 100,
}: ProductPanelProps) {
  const marginBelowTarget =
    product.trueMarginPercent != null && product.trueMarginPercent < targetMargin

  // Calculate labor cost
  const laborCost = product.prepTime
    ? (product.prepTime / 60) * hourlyLaborRate
    : 0

  // Combine all ingredient issues
  const allIssues = [
    ...product.availability.missingIngredients,
    ...product.availability.lowIngredients,
  ]

  return (
    <div className="h-full flex flex-col border-l bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Product Header */}
        <div className="flex items-start gap-4">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              width={64}
              height={64}
              className="rounded object-cover"
            />
          ) : (
            <div className="w-16 h-16 bg-muted rounded flex items-center justify-center text-muted-foreground text-xs">
              No image
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold">{product.name}</h2>
            <Badge variant="outline">{product.categoryName}</Badge>
          </div>
        </div>

        {/* Pricing Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pricing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">
                  {formatCurrency(product.price, currency)}
                </p>
                <p className="text-xs text-muted-foreground">Price</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {product.trueCost != null
                    ? formatCurrency(product.trueCost, currency)
                    : "-"}
                </p>
                <p className="text-xs text-muted-foreground">Cost</p>
              </div>
              <div>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    marginBelowTarget && "text-orange-600"
                  )}
                >
                  {product.trueMarginPercent != null
                    ? `${product.trueMarginPercent.toFixed(0)}%`
                    : "-"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Margin {targetMargin && `(target: ${targetMargin}%)`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recipe Card */}
        {product.recipeItems && product.recipeItems.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium">
                  Recipe · {product.recipeItems.length} ingredients
                </CardTitle>
                {product.trueCost != null && (
                  <span className="text-sm text-muted-foreground">
                    Food Cost: {formatCurrency(product.trueCost - laborCost - (product.overheadCost ?? 0), currency)}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {product.recipeItems.map((item) => {
                  const issue = allIssues.find(
                    (i) => i.id === item.ingredient.id
                  )
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span>{item.ingredient.name}</span>
                        <span className="text-muted-foreground">
                          {item.quantity} {item.ingredient.baseUnit}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {formatCurrency(
                            item.quantity * item.ingredient.costPerBaseUnit,
                            currency
                          )}
                        </span>
                        {issue ? (
                          <Badge
                            variant={
                              issue.status === "missing"
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {issue.status === "missing"
                              ? `Missing ${issue.needPerUnit}/unit`
                              : `${issue.have} left`}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-xs bg-green-50 text-green-700"
                          >
                            OK
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stock Summary Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Stock Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Can make:</span>
              <span className="font-medium">
                {product.availability.maxProducible != null
                  ? `${product.availability.maxProducible} units`
                  : "Unlimited"}
              </span>
            </div>

            {product.availability.limitingIngredientDetails && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Limited by:</span>
                <span>
                  {product.availability.limitingIngredientDetails.name} (
                  {product.availability.limitingIngredientDetails.have} left,
                  need {product.availability.limitingIngredientDetails.needPerUnit}
                  /unit)
                </span>
              </div>
            )}

            {allIssues.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-sm font-medium mb-2">
                  Issues ({allIssues.length}):
                </p>
                <ul className="space-y-1">
                  {allIssues.map((issue) => (
                    <li
                      key={issue.id}
                      className="text-sm flex justify-between"
                    >
                      <span
                        className={cn(
                          issue.status === "missing"
                            ? "text-red-600"
                            : "text-yellow-600"
                        )}
                      >
                        {issue.name}
                      </span>
                      <span className="text-muted-foreground">
                        {issue.status === "missing"
                          ? `need ${issue.needPerUnit}/unit`
                          : `${issue.have} left`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Labor & Overhead Card */}
        {(product.prepTime || product.overheadCost) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Labor & Overhead
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {product.prepTime && (
                  <div>
                    <p className="text-lg font-medium">{product.prepTime} min</p>
                    <p className="text-xs text-muted-foreground">
                      Prep time ({formatCurrency(laborCost, currency)})
                    </p>
                  </div>
                )}
                {product.overheadCost && (
                  <div>
                    <p className="text-lg font-medium">
                      {formatCurrency(product.overheadCost, currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">Overhead</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t">
        <Button variant="destructive" size="sm" className="w-full">
          Delete Product
        </Button>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/\(dashboard\)/menu/components/product-panel.tsx
git commit -m "feat(menu): add product panel view mode"
```

---

### Task 4.2: Integrate Panel into Menu Page

**Files:**
- Modify: `src/app/(dashboard)/menu/page.tsx`

**Step 1: Import and add panel to layout**

Update `src/app/(dashboard)/menu/page.tsx` to include the panel:

Add import:
```typescript
import { ProductPanel } from "./components/product-panel"
```

Update return statement to have a flex layout with panel:

```typescript
  // ... existing state ...
  const [editMode, setEditMode] = useState(false)

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Main Content */}
      <div className={cn(
        "flex-1 overflow-auto p-4 md:p-6",
        selectedProduct && "hidden md:block md:pr-0"
      )}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* ... existing tabs content ... */}
        </Tabs>
      </div>

      {/* Slide-out Panel */}
      {selectedProduct && (
        <div className="w-full md:w-96 lg:w-[450px] shrink-0">
          <ProductPanel
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onEdit={() => setEditMode(true)}
            targetMargin={settings.targetTrueMarginPercent}
            currency={settings.currency}
          />
        </div>
      )}
    </div>
  )
```

Add import for cn:
```typescript
import { cn } from "@/lib/utils"
```

**Step 2: Verify panel opens on row click**

Run: `npm run dev` and click a product row
Expected: Panel slides in from right showing product details

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/menu/page.tsx
git commit -m "feat(menu): integrate product panel into layout"
```

---

## Phase 5: Categories Tab (Summary)

Due to length constraints, here are the remaining tasks in summary:

### Task 5.1: Add displayOrder to Category Model
- Add Prisma migration for `displayOrder` field
- Update API to include displayOrder

### Task 5.2: Create Categories API Enhancements
- Add `/api/categories/reorder` endpoint
- Add revenue, avgMargin, stockHealth calculations to GET

### Task 5.3: Create Categories Table Component
- Drag-to-reorder with `@hello-pangea/dnd`
- Expandable rows
- Stock health badges

### Task 5.4: Wire Up Categories Tab
- Integrate with Menu page
- "View in Products" switches tabs with filter

---

## Phase 6: Cleanup & Migration

### Task 6.1: Delete Old Pages
- Delete `src/app/(dashboard)/products`
- Delete `src/app/(dashboard)/recipes`
- Delete `src/app/(dashboard)/pricing`
- Delete `src/app/(dashboard)/categories`

### Task 6.2: Update Internal Links
- Search for links to old routes
- Update to `/menu`

### Task 6.3: Final Testing
- Run all tests
- Manual testing of all features
- Verify mobile responsiveness

---

## Summary

**Total Tasks:** ~20 bite-sized tasks across 6 phases

**Key Files Created:**
- `src/app/(dashboard)/menu/page.tsx`
- `src/app/(dashboard)/menu/components/stock-badge.tsx`
- `src/app/(dashboard)/menu/components/products-table.tsx`
- `src/app/(dashboard)/menu/components/products-tab.tsx`
- `src/app/(dashboard)/menu/components/product-panel.tsx`
- `src/app/(dashboard)/menu/components/categories-tab.tsx`
- `tests/unit/product-availability.test.ts`

**Key Files Modified:**
- `src/lib/product-availability.ts`
- `src/app/api/products/route.ts`
- `src/components/layout/sidebar.tsx`
- `prisma/schema.prisma` (displayOrder field)
