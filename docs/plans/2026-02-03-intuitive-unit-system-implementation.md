# Intuitive Recipe Unit System - Implementation Plan

> Allows users to configure unit aliases on ingredients and choose their preferred unit when adding ingredients to recipes. Includes yield factor tracking and tooltips for accessibility.

## Problem Statement

Users buy ingredients in bulk (25kg sack of rice) but think in different units when creating recipes (cups, servings, grams). The current system only allows entering the base unit, requiring mental conversion.

## Solution Overview

1. **Unit aliases** on ingredients (configured on Ingredients page)
2. **Yield factor** tracking (rice expands 3x when cooked)
3. **Unit dropdown** when adding to recipe (all configured units)
4. **Live conversion display** + cost in recipe editor
5. **Tooltips** for accessibility (hover + click)

---

## Phase 1: Database Schema Changes

### Task 1.1: Add IngredientUnitAlias Model

**File:** `prisma/schema.prisma`

Add new model:
```prisma
model IngredientUnitAlias {
  id                 Int        @id @default(autoincrement())
  ingredientId       Int        @map("ingredient_id")
  name               String                                  // "cup", "tbsp", "serving"
  baseUnitMultiplier Decimal    @map("base_unit_multiplier") @db.Decimal(10, 4)
  description        String?                                 // "1 cup = 200g"
  isDefault          Boolean    @default(false) @map("is_default")
  createdAt          DateTime   @default(now()) @map("created_at")

  ingredient         Ingredient @relation(fields: [ingredientId], references: [id], onDelete: Cascade)

  @@unique([ingredientId, name])
  @@map("ingredient_unit_aliases")
}
```

### Task 1.2: Add yieldFactor to Ingredient

**File:** `prisma/schema.prisma`

Add to Ingredient model:
```prisma
yieldFactor         Decimal?  @map("yield_factor") @db.Decimal(5, 2)
unitAliases         IngredientUnitAlias[]
```

### Task 1.3: Add Unit Fields to RecipeItem

**File:** `prisma/schema.prisma`

Update RecipeItem model:
```prisma
quantity     Decimal    @db.Decimal(10, 3)                    // amount in CHOSEN unit
baseQuantity Decimal    @map("base_quantity") @db.Decimal(10, 3)  // converted to base units
unit         String     @default("")                          // chosen unit name
```

### Task 1.4: Run Migration

```bash
npx prisma migrate dev --name add_recipe_unit_system
```

---

## Phase 2: Type Definitions and Utilities

### Task 2.1: Add Unit Alias Types

**File:** `src/types/ingredient.ts`

```typescript
export const UNIT_PRESETS = {
  volume: [
    { name: "cup", baseUnitMultiplier: 240, description: "1 cup = 240 mL" },
    { name: "tbsp", baseUnitMultiplier: 15, description: "1 tbsp = 15 mL" },
    { name: "tsp", baseUnitMultiplier: 5, description: "1 tsp = 5 mL" },
  ],
  weight: [
    { name: "cup", baseUnitMultiplier: 200, description: "1 cup = ~200g" },
    { name: "serving", baseUnitMultiplier: 100, description: "1 serving = 100g" },
  ],
  count: [
    { name: "serving", baseUnitMultiplier: 1, description: "1 serving = 1 piece" },
  ],
} as const;

export interface UnitAlias {
  id: number;
  ingredientId: number;
  name: string;
  baseUnitMultiplier: number;
  description: string | null;
  isDefault: boolean;
  createdAt: string;
}
```

### Task 2.2: Add Conversion Utilities

**File:** `src/lib/ingredient-utils.ts`

```typescript
export function convertToBaseUnits(quantity: number, multiplier: number): number {
  return quantity * multiplier;
}

export function convertFromBaseUnits(baseQuantity: number, multiplier: number): number {
  if (multiplier <= 0) return baseQuantity;
  return baseQuantity / multiplier;
}

export function calculateCookedYield(rawQuantity: number, yieldFactor: number | null): number {
  if (!yieldFactor || yieldFactor <= 0) return rawQuantity;
  return rawQuantity * yieldFactor;
}

export function getAvailableUnits(baseUnit: string, unitAliases: UnitAlias[]): AvailableUnit[] {
  return [
    { name: baseUnit, multiplier: 1, description: "Base unit", isBase: true },
    ...unitAliases.map(a => ({
      name: a.name,
      multiplier: a.baseUnitMultiplier,
      description: a.description,
      isBase: false,
    })),
  ];
}
```

### Task 2.3: Add Zod Schema

**File:** `src/lib/ingredient-utils.ts`

```typescript
export const unitAliasSchema = z.object({
  name: z.string().min(1).max(20),
  baseUnitMultiplier: z.number().positive(),
  description: z.string().max(50).optional(),
  isDefault: z.boolean().optional().default(false),
});
```

---

## Phase 3: API Endpoints

### Task 3.1: Update GET /api/ingredients

Include `unitAliases` and `yieldFactor` in response.

### Task 3.2: Update PUT /api/ingredients/:id

Accept `yieldFactor` in request body.

### Task 3.3: Create POST /api/ingredients/:id/unit-aliases

**File:** `src/app/api/ingredients/[id]/unit-aliases/route.ts`

- Validate input with Zod
- Check for duplicate names
- Handle isDefault flag

### Task 3.4: Create DELETE /api/ingredients/:id/unit-aliases/:aliasId

**File:** `src/app/api/ingredients/[id]/unit-aliases/[aliasId]/route.ts`

### Task 3.5: Update PUT /api/recipes/:productId

Accept `unit` and `baseQuantity` per recipe item.

---

## Phase 4: Ingredients Page UI

### Task 4.1: Add Yield Factor Section

**File:** `src/app/(dashboard)/ingredients/page.tsx`

```
┌─────────────────────────────────────────────────────────────────┐
│ COOKING YIELD (Optional)  ⓘ                                     │
│ ───────────────────────────────────────────                     │
│ Yield Multiplier: [3.0  ]x                                      │
│ "1 kg raw rice becomes 3 kg cooked rice"                        │
└─────────────────────────────────────────────────────────────────┘
```

### Task 4.2: Add Recipe Units Management

**File:** `src/app/(dashboard)/ingredients/page.tsx`

```
┌─────────────────────────────────────────────────────────────────┐
│ RECIPE UNITS  ⓘ                                       [+ Add]   │
│ ───────────────────────────────────────────                     │
│                                                                 │
│  Unit Name       Base Amount    Actions                         │
│  ──────────────────────────────────────────────────────────     │
│  cup             0.185 kg       [×]                             │
│  serving         0.150 kg       [×]                             │
│                                                                 │
│ Presets: [+ cup] [+ tbsp] [+ tsp] [+ serving]                   │
│                                                                 │
│ Custom: [______] = [____] kg  [Add]                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 5: Recipe Editor UI

### Task 5.1: Add Unit Dropdown to Recipe Ingredients

**File:** `src/app/(dashboard)/menu/components/product-panel.tsx`

```
┌─────────────────────────────────────────────────────────────────┐
│ Rice                                              [×] remove    │
│                                                                 │
│  Amount: [1      ] [serving ▼]  ⓘ                               │
│                     ├─────────────────────────────┤             │
│                     │ ● serving (150g)            │             │
│                     │ ○ cup (185g)                │             │
│                     │ ○ grams                     │             │
│                     │ ○ kg                        │             │
│                     └─────────────────────────────┘             │
│                                                                 │
│  = 150g raw rice                                                │
│  ≈ 450g cooked (3x yield)                                       │
│  Cost: ₱7.20                                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Task 5.2: Update Save Handler

Store both `quantity` (user's input) and `baseQuantity` (converted) in RecipeItem.

---

## Phase 6: Tests

### Task 6.1: Unit Conversion Tests

**File:** `tests/unit/ingredient-calculations.test.ts`

- `convertToBaseUnits` - cups to mL, fractional quantities
- `convertFromBaseUnits` - mL to cups
- `calculateCookedYield` - with/without yield factor
- `getAvailableUnits` - includes base + aliases

### Task 6.2: API Integration Tests

**File:** `tests/integration/unit-aliases-api.test.ts`

- POST creates alias
- POST rejects duplicates
- DELETE removes alias

---

## Phase 7: Polish and Accessibility

### Task 7.1: Mobile-Friendly Tooltips

Click-to-toggle tooltips that also work on hover for desktop.

### Task 7.2: TooltipProvider Wrapper

Ensure all tooltip components are wrapped properly.

---

## Files Summary

### New Files
- `src/app/api/ingredients/[id]/unit-aliases/route.ts`
- `src/app/api/ingredients/[id]/unit-aliases/[aliasId]/route.ts`
- `tests/integration/unit-aliases-api.test.ts`

### Modified Files
- `prisma/schema.prisma` - New model + fields
- `src/types/ingredient.ts` - UnitAlias types
- `src/lib/ingredient-utils.ts` - Conversion utilities
- `src/app/api/ingredients/route.ts` - Include aliases
- `src/app/api/ingredients/[id]/route.ts` - Handle yieldFactor
- `src/app/api/recipes/[productId]/route.ts` - Handle unit + baseQuantity
- `src/app/(dashboard)/ingredients/page.tsx` - Config UI
- `src/app/(dashboard)/menu/components/product-panel.tsx` - Unit dropdown
- `tests/unit/ingredient-calculations.test.ts` - Conversion tests

---

## Data Flow

```
User enters: "1 serving" of Rice

↓ Recipe Editor looks up alias
  serving → 150g (baseUnitMultiplier = 0.150 kg = 150g)

↓ Saves to RecipeItem
  quantity: 1, unit: "serving", baseQuantity: 0.150

↓ Cost calculation uses baseQuantity
  0.150 kg × ₱48/kg = ₱7.20

↓ Display shows conversion
  "= 150g raw (₱7.20)"
  "≈ 450g cooked (3x yield)"
```
