# Data Model: Ingredient Unit System

**Feature**: 004-ingredient-unit-system
**Date**: 2026-01-30

## Entity Overview

This feature requires a **Prisma migration** to add unit system fields. The current schema only has legacy `unit`/`costPerUnit` fields. The migration will add: `baseUnit`, `packageSize`, `packageUnit`, `costPerPackage`, `sellPrice`, `countByBaseUnit`, `isOverhead`, `overheadPerTransaction`.

---

## Ingredient Entity

### Current Schema (prisma/schema.prisma)

```prisma
model Ingredient {
  id          Int           @id @default(autoincrement())
  name        String
  category    String        // Protein, Produce, Dairy, Dry Goods, Beverages, etc.

  // ─── STANDARDIZED UNIT SYSTEM (using these fields) ───
  baseUnit        String        @default("pcs") @map("base_unit")     // kg, g, L, ml, pcs
  packageSize     Decimal       @default(1) @map("package_size") @db.Decimal(10, 3)
  packageUnit     String        @default("each") @map("package_unit") // pack, box, bottle, etc.
  costPerPackage  Decimal       @default(0) @map("cost_per_package") @db.Decimal(10, 2)

  // ─── LEGACY FIELDS (maintain for backward compatibility) ───
  unit            String        @default("")                          // @deprecated
  costPerUnit     Decimal       @default(0) @map("cost_per_unit") @db.Decimal(10, 2) // @deprecated

  // ─── STOCK MANAGEMENT ───
  quantity          Decimal   @default(0) @db.Decimal(10, 2)    // in PACKAGES
  parLevel          Int       @default(0) @map("par_level")     // minimum packages
  lastRestockDate   DateTime? @map("last_restock_date")

  // ─── SELLABLE ITEMS ───
  sellable          Boolean   @default(false)
  linkedProductId   Int?      @unique @map("linked_product_id")
  syncStatus        String    @default("synced") @map("sync_status")

  // ─── NEW FIELDS NEEDED ───
  // countByBaseUnit      Boolean   @default(false)  // TODO: Add via migration
  // isOverhead           Boolean   @default(false)  // TODO: Add via migration
  // overheadPerTransaction Decimal? @db.Decimal(10,3) // TODO: Add via migration

  // ... existing relations
}
```

### New Fields Required

```prisma
// Add to Ingredient model via migration
countByBaseUnit        Boolean   @default(false) @map("count_by_base_unit")
isOverhead             Boolean   @default(false) @map("is_overhead")
overheadPerTransaction Decimal?  @map("overhead_per_transaction") @db.Decimal(10, 3)
```

**Migration**: `npx prisma migrate dev --name add-ingredient-unit-fields`

---

## Field Descriptions

### Unit System Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `baseUnit` | String | Fundamental unit for recipes | `"pcs"`, `"kg"`, `"mL"` |
| `packageSize` | Decimal(10,3) | How many baseUnits per package | `8` (8 pcs/pack) |
| `packageUnit` | String | How you purchase | `"pack"`, `"bottle"`, `"kg"` |
| `costPerPackage` | Decimal(10,2) | Cost to buy one package | `420.00` |

### Computed Values (not stored)

| Value | Formula | Example |
|-------|---------|---------|
| `costPerBaseUnit` | `costPerPackage / packageSize` | `420 / 8 = 52.50` |
| `totalBaseUnits` | `quantity * packageSize` | `3.5 * 8 = 28` |

### Stock Fields

| Field | Type | Description |
|-------|------|-------------|
| `quantity` | Decimal(10,2) | Packages in stock |
| `parLevel` | Int | Minimum packages before alert |
| `countByBaseUnit` | Boolean | Count in pieces vs packages |

### Overhead Fields

| Field | Type | Description |
|-------|------|-------------|
| `isOverhead` | Boolean | Deduct per transaction |
| `overheadPerTransaction` | Decimal(10,3) | Amount to deduct per sale |

---

## TypeScript Types

```typescript
// src/types/ingredient.ts

export interface IngredientUnitData {
  // Unit system
  baseUnit: string;           // "pcs", "kg", "g", "L", "mL"
  packageSize: number;        // e.g., 8
  packageUnit: string;        // "pack", "bottle", "bundle", etc.
  costPerPackage: number;     // e.g., 420.00

  // Computed (not stored)
  costPerBaseUnit: number;    // costPerPackage / packageSize
}

export interface IngredientStockData {
  quantity: number;           // packages in stock
  parLevel: number;           // minimum packages
  countByBaseUnit: boolean;   // inventory count mode

  // Computed (not stored)
  totalBaseUnits: number;     // quantity * packageSize
  stockStatus: 'ok' | 'low' | 'critical' | 'out';
}

export interface IngredientOverheadData {
  isOverhead: boolean;
  overheadPerTransaction: number | null;
}

export interface IngredientSellableData {
  sellable: boolean;
  sellPrice: number | null;   // Note: needs to be added to schema
  linkedProductId: number | null;
  syncStatus: 'synced' | 'pending' | 'error';
}

export interface Ingredient extends
  IngredientUnitData,
  IngredientStockData,
  IngredientOverheadData,
  IngredientSellableData {
  id: number;
  name: string;
  category: string;
  vendorId: number | null;
  vendorName: string | null;

  // Legacy (for backward compatibility)
  unit?: string;
  costPerUnit?: number;
}

// Form input types
export interface IngredientFormInput {
  name: string;
  category: string;
  vendorId: number | null;

  // Purchasing
  packageUnit: string;
  costPerPackage: number;

  // Usage (conversion)
  baseUnit: string;
  packageSize: number;

  // Stock
  quantity: number;
  parLevel: number;
  countByBaseUnit: boolean;

  // Special options
  sellable: boolean;
  sellPrice: number | null;
  isOverhead: boolean;
  overheadPerTransaction: number | null;
}
```

---

## Validation Rules

```typescript
// Zod schema for ingredient form
import { z } from 'zod';

export const ingredientFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  category: z.string().min(1, "Category is required"),
  vendorId: z.number().nullable(),

  // Purchasing
  packageUnit: z.string().min(1, "Purchase unit is required"),
  costPerPackage: z.number().min(0, "Cost must be positive"),

  // Usage
  baseUnit: z.string().min(1, "Usage unit is required"),
  packageSize: z.number().positive("Package size must be greater than 0"),

  // Stock
  quantity: z.number().min(0),
  parLevel: z.number().min(0).int(),
  countByBaseUnit: z.boolean().default(false),

  // Special
  sellable: z.boolean().default(false),
  sellPrice: z.number().min(0).nullable(),
  isOverhead: z.boolean().default(false),
  overheadPerTransaction: z.number().min(0).nullable(),
}).refine(
  (data) => !data.sellable || data.sellPrice !== null,
  { message: "Sell price required for sellable items", path: ["sellPrice"] }
).refine(
  (data) => !data.isOverhead || data.overheadPerTransaction !== null,
  { message: "Usage rate required for overhead items", path: ["overheadPerTransaction"] }
);
```

---

## State Transitions

### Stock Status
```
quantity / parLevel ratio → status
─────────────────────────────────
= 0                      → "out"
< 0.25                   → "critical"
< 1.0                    → "low"
≥ 1.0                    → "ok"
```

### Sync Status (Sellable Items)
```
synced ──[price/name change]──→ pending
pending ──[sync success]──→ synced
pending ──[sync failure]──→ error
error ──[retry success]──→ synced
```

---

## Relationships

```
Ingredient ──1:N──→ RecipeItem (ingredientId)
Ingredient ──1:N──→ IngredientHistory (ingredientId)
Ingredient ──N:1──→ Vendor (vendorId)
Ingredient ──1:1──→ Product (linkedProductId, when sellable)
```
