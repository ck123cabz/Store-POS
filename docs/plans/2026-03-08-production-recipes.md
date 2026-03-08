# Production Recipes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow ingredients to be either RAW (purchased) or PREPARED (produced from other ingredients), with production recipes that define input ingredients + yield, and a "produce batch" operation that atomically deducts inputs and adds output stock.

**Architecture:** Add an `IngredientType` enum (RAW/PREPARED) to `Ingredient`, a `ProductionRecipeItem` junction table linking a PREPARED ingredient to its input ingredients (with quantities and units), and a production run API that executes the stock transfer atomically. The existing `IngredientHistory` audit trail tracks both sides of the transfer with a shared `changeId`. No changes to the existing `RecipeItem` model — PREPARED ingredients work seamlessly as recipe ingredients in menu products.

**Tech Stack:** Prisma ORM 7.x (migration + schema), Next.js 16 API routes, Zod validation, React 19 UI components, Tailwind CSS 4.x, Radix UI primitives

---

## Task 1: Database Schema — Enum + ProductionRecipeItem Model

### Files:
- Create: `prisma/migrations/20260308_production_recipes/migration.sql`
- Modify: `prisma/schema.prisma`

### Step 1: Write the migration SQL

Create `prisma/migrations/20260308_production_recipes/migration.sql`:

```sql
-- CreateEnum: IngredientType
CREATE TYPE "IngredientType" AS ENUM ('RAW', 'PREPARED');

-- Add type column to ingredients (default RAW for all existing rows)
ALTER TABLE "ingredients" ADD COLUMN "type" "IngredientType" NOT NULL DEFAULT 'RAW';

-- Add yield_qty to ingredients (how many base units one batch produces)
-- Only meaningful for PREPARED ingredients. NULL for RAW.
ALTER TABLE "ingredients" ADD COLUMN "batch_yield" DECIMAL(12,4) NULL;

-- CreateTable: production_recipe_items
CREATE TABLE "production_recipe_items" (
    "id" SERIAL NOT NULL,
    "output_ingredient_id" INTEGER NOT NULL,
    "input_ingredient_id" INTEGER NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "base_quantity" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "unit_id" INTEGER,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_recipe_items_pkey" PRIMARY KEY ("id")
);

-- Unique: one input ingredient per production recipe
CREATE UNIQUE INDEX "production_recipe_items_output_ingredient_id_input_ingredient_id_key"
    ON "production_recipe_items"("output_ingredient_id", "input_ingredient_id");

-- Foreign keys
ALTER TABLE "production_recipe_items"
    ADD CONSTRAINT "production_recipe_items_output_ingredient_id_fkey"
    FOREIGN KEY ("output_ingredient_id") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "production_recipe_items"
    ADD CONSTRAINT "production_recipe_items_input_ingredient_id_fkey"
    FOREIGN KEY ("input_ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "production_recipe_items"
    ADD CONSTRAINT "production_recipe_items_unit_id_fkey"
    FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Index for querying "what production recipes use this ingredient?"
CREATE INDEX "production_recipe_items_input_ingredient_id_idx"
    ON "production_recipe_items"("input_ingredient_id");
```

### Step 2: Update Prisma schema

Add to `prisma/schema.prisma`:

**Enum** (after existing enums):

```prisma
enum IngredientType {
  RAW
  PREPARED
}
```

**Fields on `Ingredient` model** (after `category` field):

```prisma
  type       IngredientType @default(RAW) @map("type")
  batchYield Decimal?       @map("batch_yield") @db.Decimal(12, 4) // base units produced per batch (PREPARED only)
```

**Relations on `Ingredient` model** (add to relations section):

```prisma
  // Production recipe: this ingredient is PRODUCED from these inputs
  productionInputs  ProductionRecipeItem[] @relation("ProductionOutput")
  // This ingredient is USED as input in these production recipes
  productionOutputs ProductionRecipeItem[] @relation("ProductionInput")
```

**New model** (after `RecipeItem`):

```prisma
model ProductionRecipeItem {
  id                 Int      @id @default(autoincrement())
  outputIngredientId Int      @map("output_ingredient_id")
  inputIngredientId  Int      @map("input_ingredient_id")
  quantity           Decimal  @db.Decimal(10, 3) // amount in chosen unit
  baseQuantity       Decimal  @default(0) @map("base_quantity") @db.Decimal(10, 3) // converted to input ingredient's base units
  unitId             Int?     @map("unit_id") // FK → Unit (null = input ingredient's baseUnit)
  note               String?  // e.g., "marinate overnight"
  createdAt          DateTime @default(now()) @map("created_at")

  // Relations
  outputIngredient Ingredient @relation("ProductionOutput", fields: [outputIngredientId], references: [id], onDelete: Cascade)
  inputIngredient  Ingredient @relation("ProductionInput", fields: [inputIngredientId], references: [id], onDelete: Restrict)
  unit             Unit?      @relation(fields: [unitId], references: [id])

  @@unique([outputIngredientId, inputIngredientId])
  @@map("production_recipe_items")
}
```

**Add to `Unit` model relations:**

```prisma
  productionRecipeItems ProductionRecipeItem[]
```

### Step 3: Run the migration

```bash
npx prisma migrate dev --name production_recipes
```

Expected: Migration applies successfully, Prisma client regenerates.

### Step 4: Verify schema

```bash
npx prisma validate
```

Expected: "The schema is valid."

### Step 5: Commit

```bash
git add prisma/schema.prisma prisma/migrations/20260308_production_recipes/
git commit -m "feat(schema): add IngredientType enum and ProductionRecipeItem model

Adds RAW/PREPARED ingredient types and production recipe junction table
for modeling semi-finished products made from other ingredients."
```

---

## Task 2: TypeScript Types

### Files:
- Modify: `src/types/ingredient.ts`

### Step 1: Add production recipe types

Add after the `UnitAlias` types section in `src/types/ingredient.ts`:

```typescript
// ═══════════════════════════════════════════════════════════════════════════════
// Production Recipe Types (PREPARED ingredients)
// ═══════════════════════════════════════════════════════════════════════════════

export type IngredientType = "RAW" | "PREPARED"

/** An input ingredient in a production recipe */
export interface ProductionRecipeItem {
  id: number
  outputIngredientId: number
  inputIngredientId: number
  inputIngredientName: string
  inputBaseUnitName: string
  inputBaseUnitAbbr: string
  quantity: number          // amount in chosen unit
  baseQuantity: number      // converted to input's base units
  unitId: number | null
  unitName: string | null   // chosen unit name (null = base unit)
  note: string | null
  costPerBaseUnit: number   // input ingredient's avgCostPerBaseUnit
  lineCost: number          // baseQuantity * costPerBaseUnit
}

export interface ProductionRecipeItemInput {
  inputIngredientId: number
  quantity: number
  unitId?: number | null
  unitName?: string
  baseQuantity?: number
  note?: string
}

/** Result of a production run */
export interface ProductionRunResult {
  outputIngredient: {
    id: number
    name: string
    baseUnitName: string
    previousStockQty: number
    addedBaseUnits: number
    newStockQty: number
    previousAvgCost: number
    newAvgCost: number
  }
  inputDeductions: Array<{
    ingredientId: number
    ingredientName: string
    baseUnitName: string
    deductedBaseUnits: number
    previousStockQty: number
    newStockQty: number
  }>
  batchCount: number
  changeId: string
}
```

### Step 2: Update Ingredient interface

Add to the `Ingredient` interface (after `yieldFactor`):

```typescript
  // Production recipe (PREPARED ingredients only)
  type: IngredientType
  batchYield: number | null  // base units produced per batch
  productionInputs: ProductionRecipeItem[]  // what goes into making this
```

### Step 3: Update IngredientFormInput

Add to `IngredientFormInput`:

```typescript
  type: IngredientType
  batchYield: number | null
```

### Step 4: Commit

```bash
git add src/types/ingredient.ts
git commit -m "feat(types): add ProductionRecipeItem and IngredientType types"
```

---

## Task 3: Validation Schemas

### Files:
- Modify: `src/lib/ingredient-utils.ts`

### Step 1: Add production recipe Zod schemas

Add after the `unitAliasSchema` in `src/lib/ingredient-utils.ts`:

```typescript
/**
 * Validation schema for production recipe item input
 */
export const productionRecipeItemSchema = z.object({
  inputIngredientId: z.number().int().positive("Input ingredient is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unitId: z.number().int().positive().nullable().optional().default(null),
  unitName: z.string().optional(),
  baseQuantity: z.number().min(0).optional(),
  note: z.string().max(200).nullable().optional().default(null),
})

export type ProductionRecipeItemSchema = z.infer<typeof productionRecipeItemSchema>

/**
 * Validation schema for a production run request
 */
export const productionRunSchema = z.object({
  batchCount: z.number().positive("Must produce at least 1 batch"),
  userId: z.number().int().positive(),
  userName: z.string().min(1),
  note: z.string().max(500).optional(),
})

export type ProductionRunSchema = z.infer<typeof productionRunSchema>
```

### Step 2: Update ingredientFormSchema

Add `type` and `batchYield` fields to `ingredientFormSchema`:

```typescript
// Add inside the z.object({...}) before the .refine():
    type: z.enum(["RAW", "PREPARED"]).default("RAW"),
    batchYield: z.number().positive("Batch yield must be positive").nullable().default(null),
```

Add a new `.refine()` after the existing overhead refine:

```typescript
  .refine((data) => data.type !== "PREPARED" || (data.batchYield !== null && data.batchYield > 0), {
    message: "Batch yield is required for prepared ingredients",
    path: ["batchYield"],
  })
```

### Step 3: Commit

```bash
git add src/lib/ingredient-utils.ts
git commit -m "feat(validation): add production recipe and production run Zod schemas"
```

---

## Task 4: Production Recipe Cost Calculation Utility

### Files:
- Modify: `src/lib/ingredient-utils.ts`

### Step 1: Write the failing test

Add to `tests/unit/ingredient-calculations.test.ts`:

```typescript
describe("calculateProductionCostPerBaseUnit", () => {
  test("calculates cost from input ingredients divided by yield", () => {
    const inputs = [
      { baseQuantity: 1000, avgCostPerBaseUnit: 0.35 },  // 1000g pork @ ₱0.35/g
      { baseQuantity: 200, avgCostPerBaseUnit: 0.05 },   // 200g sugar @ ₱0.05/g
      { baseQuantity: 100, avgCostPerBaseUnit: 0.08 },   // 100mL soy sauce @ ₱0.08/mL
    ]
    const batchYield = 20 // 20 sticks

    const result = calculateProductionCostPerBaseUnit(inputs, batchYield)

    // Total input cost: (1000*0.35) + (200*0.05) + (100*0.08) = 350 + 10 + 8 = 368
    // Cost per stick: 368 / 20 = 18.4
    expect(result).toBeCloseTo(18.4)
  })

  test("returns 0 when no inputs", () => {
    expect(calculateProductionCostPerBaseUnit([], 20)).toBe(0)
  })

  test("handles zero yield gracefully", () => {
    const inputs = [{ baseQuantity: 100, avgCostPerBaseUnit: 1 }]
    expect(calculateProductionCostPerBaseUnit(inputs, 0)).toBe(0)
  })
})
```

### Step 2: Run test to verify it fails

```bash
npm run test -- tests/unit/ingredient-calculations.test.ts -t "calculateProductionCostPerBaseUnit"
```

Expected: FAIL — `calculateProductionCostPerBaseUnit` is not defined.

### Step 3: Write the implementation

Add to `src/lib/ingredient-utils.ts`:

```typescript
/**
 * Calculate the cost per base unit of a PREPARED ingredient from its production inputs.
 *
 * @param inputs - Array of { baseQuantity, avgCostPerBaseUnit } for each input ingredient
 * @param batchYield - How many base units of output one batch produces
 * @returns Cost per base unit of the output ingredient
 */
export function calculateProductionCostPerBaseUnit(
  inputs: Array<{ baseQuantity: number; avgCostPerBaseUnit: number }>,
  batchYield: number
): number {
  if (batchYield <= 0 || inputs.length === 0) return 0

  const totalInputCost = inputs.reduce(
    (sum, input) => sum + input.baseQuantity * input.avgCostPerBaseUnit,
    0
  )

  return totalInputCost / batchYield
}
```

### Step 4: Run test to verify it passes

```bash
npm run test -- tests/unit/ingredient-calculations.test.ts -t "calculateProductionCostPerBaseUnit"
```

Expected: PASS

### Step 5: Commit

```bash
git add src/lib/ingredient-utils.ts tests/unit/ingredient-calculations.test.ts
git commit -m "feat(utils): add calculateProductionCostPerBaseUnit function with tests"
```

---

## Task 5: Production Recipe CRUD API

### Files:
- Create: `src/app/api/ingredients/[id]/production-recipe/route.ts`

### Step 1: Write the GET + PUT endpoints

Create `src/app/api/ingredients/[id]/production-recipe/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { productionRecipeItemSchema } from "@/lib/ingredient-utils"
import { z } from "zod"

/**
 * GET /api/ingredients/:id/production-recipe
 * Returns the production recipe for a PREPARED ingredient
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ingredientId = parseInt(id)

    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
      include: {
        baseUnit: true,
        productionInputs: {
          include: {
            inputIngredient: {
              include: {
                baseUnit: true,
                unitAliases: { orderBy: { createdAt: "asc" } },
              },
            },
            unit: true,
          },
        },
      },
    })

    if (!ingredient) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 })
    }

    if (ingredient.type !== "PREPARED") {
      return NextResponse.json(
        { error: "Only PREPARED ingredients have production recipes" },
        { status: 400 }
      )
    }

    const totalInputCost = ingredient.productionInputs.reduce((sum, pi) => {
      const baseQty = Number(pi.baseQuantity) || Number(pi.quantity)
      return sum + baseQty * Number(pi.inputIngredient.avgCostPerBaseUnit)
    }, 0)

    const batchYield = Number(ingredient.batchYield) || 0
    const costPerUnit = batchYield > 0 ? totalInputCost / batchYield : 0

    return NextResponse.json({
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      baseUnitName: ingredient.baseUnit.name,
      batchYield,
      inputs: ingredient.productionInputs.map((pi) => {
        const baseQty = Number(pi.baseQuantity) || Number(pi.quantity)
        const inputBaseUnitName = pi.inputIngredient.baseUnit.name
        const chosenUnitName = pi.unit?.name || inputBaseUnitName

        return {
          id: pi.id,
          inputIngredientId: pi.inputIngredientId,
          inputIngredientName: pi.inputIngredient.name,
          inputBaseUnitName,
          inputBaseUnitAbbr: pi.inputIngredient.baseUnit.abbr,
          quantity: Number(pi.quantity),
          baseQuantity: baseQty,
          unitId: pi.unitId,
          unitName: chosenUnitName,
          note: pi.note,
          costPerBaseUnit: Number(pi.inputIngredient.avgCostPerBaseUnit),
          lineCost: baseQty * Number(pi.inputIngredient.avgCostPerBaseUnit),
          unitAliases: (pi.inputIngredient.unitAliases || []).map((ua) => ({
            name: ua.name,
            baseUnitMultiplier: Number(ua.baseUnitMultiplier),
            description: ua.description,
          })),
        }
      }),
      costs: {
        totalInputCost: Math.round(totalInputCost * 100) / 100,
        batchYield,
        costPerUnit: Math.round(costPerUnit * 100) / 100,
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch production recipe" }, { status: 500 })
  }
}

/**
 * PUT /api/ingredients/:id/production-recipe
 * Replace all production recipe items (same pattern as recipe PUT)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ingredientId = parseInt(id)
    const body = await request.json()

    // Verify ingredient exists and is PREPARED
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
    })

    if (!ingredient) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 })
    }

    if (ingredient.type !== "PREPARED") {
      return NextResponse.json(
        { error: "Only PREPARED ingredients can have production recipes" },
        { status: 400 }
      )
    }

    // Validate inputs
    const inputsSchema = z.array(productionRecipeItemSchema)
    const parsed = inputsSchema.safeParse(body.inputs)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      )
    }

    // Prevent self-reference
    const selfRef = parsed.data.find((i) => i.inputIngredientId === ingredientId)
    if (selfRef) {
      return NextResponse.json(
        { error: "An ingredient cannot be an input to its own production recipe" },
        { status: 400 }
      )
    }

    // Update batch yield if provided
    const batchYieldUpdate = body.batchYield !== undefined
      ? { batchYield: body.batchYield }
      : {}

    // Replace all: delete existing, create new
    await prisma.$transaction(async (tx) => {
      await tx.productionRecipeItem.deleteMany({
        where: { outputIngredientId: ingredientId },
      })

      if (Object.keys(batchYieldUpdate).length > 0) {
        await tx.ingredient.update({
          where: { id: ingredientId },
          data: batchYieldUpdate,
        })
      }

      if (parsed.data.length > 0) {
        // Resolve unitName → unitId where needed
        const itemsWithUnits = await Promise.all(
          parsed.data.map(async (item) => {
            let unitId = item.unitId || null
            if (!unitId && item.unitName) {
              const unit = await tx.unit.findUnique({ where: { name: item.unitName } })
              unitId = unit?.id ?? null
            }
            return {
              outputIngredientId: ingredientId,
              inputIngredientId: item.inputIngredientId,
              quantity: item.quantity,
              baseQuantity: item.baseQuantity ?? item.quantity,
              unitId,
              note: item.note || null,
            }
          })
        )

        await tx.productionRecipeItem.createMany({ data: itemsWithUnits })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to update production recipe:", error)
    return NextResponse.json({ error: "Failed to update production recipe" }, { status: 500 })
  }
}
```

### Step 2: Commit

```bash
git add src/app/api/ingredients/[id]/production-recipe/route.ts
git commit -m "feat(api): add production recipe CRUD endpoints (GET/PUT)"
```

---

## Task 6: Production Run API (Produce Batch)

### Files:
- Create: `src/app/api/ingredients/[id]/produce/route.ts`

### Step 1: Write the produce endpoint

This is the core operation — atomically deduct input ingredient stock and add output stock.

Create `src/app/api/ingredients/[id]/produce/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { nanoid } from "nanoid"
import {
  productionRunSchema,
  calculateWeightedAvgCost,
  calculateProductionCostPerBaseUnit,
  calculateStockStatus,
  calculateStockRatio,
} from "@/lib/ingredient-utils"

/**
 * POST /api/ingredients/:id/produce
 * Execute a production run: deduct input ingredients, add output stock.
 *
 * Body: { batchCount: number, userId: number, userName: string, note?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ingredientId = parseInt(id)
    const body = await request.json()

    // Validate request
    const parsed = productionRunSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      )
    }

    const { batchCount, userId, userName, note } = parsed.data

    // Fetch output ingredient with production recipe
    const outputIngredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
      include: {
        baseUnit: true,
        productionInputs: {
          include: {
            inputIngredient: {
              include: { baseUnit: true },
            },
            unit: true,
          },
        },
      },
    })

    if (!outputIngredient) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 })
    }

    if (outputIngredient.type !== "PREPARED") {
      return NextResponse.json(
        { error: "Only PREPARED ingredients can be produced" },
        { status: 400 }
      )
    }

    if (outputIngredient.productionInputs.length === 0) {
      return NextResponse.json(
        { error: "No production recipe defined. Add inputs first." },
        { status: 400 }
      )
    }

    const batchYield = Number(outputIngredient.batchYield)
    if (batchYield <= 0) {
      return NextResponse.json(
        { error: "Batch yield must be set before producing" },
        { status: 400 }
      )
    }

    // Check sufficient stock for all inputs
    const insufficientInputs: string[] = []
    for (const pi of outputIngredient.productionInputs) {
      const requiredBaseUnits = (Number(pi.baseQuantity) || Number(pi.quantity)) * batchCount
      const availableStock = Number(pi.inputIngredient.stockQty)
      if (availableStock < requiredBaseUnits) {
        const unitName = pi.inputIngredient.baseUnit.name
        insufficientInputs.push(
          `${pi.inputIngredient.name}: need ${requiredBaseUnits} ${unitName}, have ${availableStock} ${unitName}`
        )
      }
    }

    if (insufficientInputs.length > 0) {
      return NextResponse.json(
        {
          error: "Insufficient stock for production",
          details: insufficientInputs,
        },
        { status: 400 }
      )
    }

    // Execute production run atomically
    const changeId = `production_${nanoid(10)}`
    const addedBaseUnits = batchYield * batchCount

    const result = await prisma.$transaction(async (tx) => {
      const inputDeductions: Array<{
        ingredientId: number
        ingredientName: string
        baseUnitName: string
        deductedBaseUnits: number
        previousStockQty: number
        newStockQty: number
      }> = []

      // 1. Deduct all input ingredients
      for (const pi of outputIngredient.productionInputs) {
        const ingredient = pi.inputIngredient
        const deductedBaseUnits = (Number(pi.baseQuantity) || Number(pi.quantity)) * batchCount
        const oldStockQty = Number(ingredient.stockQty)
        const newStockQty = Math.max(0, oldStockQty - deductedBaseUnits)

        await tx.ingredient.update({
          where: { id: ingredient.id },
          data: {
            stockQty: newStockQty,
            lastUpdated: new Date(),
          },
        })

        await tx.ingredientHistory.create({
          data: {
            ingredientId: ingredient.id,
            ingredientName: ingredient.name,
            changeId,
            field: "stockQty",
            oldValue: oldStockQty.toString(),
            newValue: newStockQty.toString(),
            source: "production",
            reason: "production_input",
            reasonNote: note || `Used in ${batchCount}x batch of ${outputIngredient.name}`,
            userId,
            userName,
          },
        })

        inputDeductions.push({
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          baseUnitName: ingredient.baseUnit.name,
          deductedBaseUnits,
          previousStockQty: oldStockQty,
          newStockQty,
        })
      }

      // 2. Calculate cost per base unit of output from inputs
      const inputCostData = outputIngredient.productionInputs.map((pi) => ({
        baseQuantity: Number(pi.baseQuantity) || Number(pi.quantity),
        avgCostPerBaseUnit: Number(pi.inputIngredient.avgCostPerBaseUnit),
      }))
      const costPerOutputUnit = calculateProductionCostPerBaseUnit(inputCostData, batchYield)

      // 3. Add output stock with weighted average cost
      const oldOutputStockQty = Number(outputIngredient.stockQty)
      const oldOutputAvgCost = Number(outputIngredient.avgCostPerBaseUnit)
      const newOutputStockQty = oldOutputStockQty + addedBaseUnits
      const newOutputAvgCost = calculateWeightedAvgCost(
        oldOutputStockQty,
        oldOutputAvgCost,
        addedBaseUnits,
        costPerOutputUnit
      )

      await tx.ingredient.update({
        where: { id: ingredientId },
        data: {
          stockQty: newOutputStockQty,
          avgCostPerBaseUnit: newOutputAvgCost,
          lastUpdated: new Date(),
          lastRestockDate: new Date(),
        },
      })

      // History: stock change
      await tx.ingredientHistory.create({
        data: {
          ingredientId,
          ingredientName: outputIngredient.name,
          changeId,
          field: "stockQty",
          oldValue: oldOutputStockQty.toString(),
          newValue: newOutputStockQty.toString(),
          source: "production",
          reason: "production_output",
          reasonNote: note || `Produced ${batchCount}x batch (${addedBaseUnits} ${outputIngredient.baseUnit.name})`,
          userId,
          userName,
        },
      })

      // History: cost change (if changed)
      if (newOutputAvgCost !== oldOutputAvgCost) {
        await tx.ingredientHistory.create({
          data: {
            ingredientId,
            ingredientName: outputIngredient.name,
            changeId,
            field: "avgCostPerBaseUnit",
            oldValue: oldOutputAvgCost.toString(),
            newValue: newOutputAvgCost.toString(),
            source: "production",
            reason: "cost_update",
            reasonNote: note || `Cost updated from production`,
            userId,
            userName,
          },
        })
      }

      return {
        newOutputStockQty,
        newOutputAvgCost,
        oldOutputStockQty,
        oldOutputAvgCost,
        inputDeductions,
      }
    }, { timeout: 15000 })

    const parLevel = Number(outputIngredient.parLevel)

    return NextResponse.json({
      outputIngredient: {
        id: outputIngredient.id,
        name: outputIngredient.name,
        baseUnitName: outputIngredient.baseUnit.name,
        previousStockQty: result.oldOutputStockQty,
        addedBaseUnits,
        newStockQty: result.newOutputStockQty,
        previousAvgCost: result.oldOutputAvgCost,
        newAvgCost: result.newOutputAvgCost,
        stockStatus: calculateStockStatus(result.newOutputStockQty, parLevel),
        stockRatio: calculateStockRatio(result.newOutputStockQty, parLevel),
      },
      inputDeductions: result.inputDeductions,
      batchCount,
      changeId,
      message: `Produced ${batchCount} batch(es) of ${outputIngredient.name} (+${addedBaseUnits} ${outputIngredient.baseUnit.name})`,
    })
  } catch (error) {
    console.error("Failed to execute production run:", error)
    return NextResponse.json({ error: "Failed to execute production run" }, { status: 500 })
  }
}
```

### Step 2: Commit

```bash
git add src/app/api/ingredients/[id]/produce/route.ts
git commit -m "feat(api): add production run endpoint (POST /api/ingredients/:id/produce)

Atomically deducts input ingredient stock and adds output stock
with weighted average cost calculation and full audit trail."
```

---

## Task 7: Update Ingredient API — Include Type + Production Recipe

### Files:
- Modify: `src/app/api/ingredients/route.ts` (list/create)
- Modify: `src/app/api/ingredients/[id]/route.ts` (get/update)

### Step 1: Update GET /api/ingredients to include type and batchYield

In the `formatIngredient()` helper (or wherever ingredients are serialized), add:

```typescript
type: ingredient.type,  // "RAW" or "PREPARED"
batchYield: ingredient.batchYield ? Number(ingredient.batchYield) : null,
```

Also include `productionInputs` count in the list view so the UI knows if a recipe is defined:

```typescript
productionInputCount: ingredient._count?.productionInputs ?? 0,
```

Update the Prisma query to include `_count: { select: { productionInputs: true } }`.

### Step 2: Update POST /api/ingredients to accept type and batchYield

Add `type` and `batchYield` to the create data:

```typescript
type: validated.type || "RAW",
batchYield: validated.batchYield || null,
```

### Step 3: Update PUT /api/ingredients/:id to accept type and batchYield

Add `type` and `batchYield` to the update data. If type changes from PREPARED to RAW, delete any existing production recipe items.

### Step 4: Commit

```bash
git add src/app/api/ingredients/route.ts src/app/api/ingredients/[id]/route.ts
git commit -m "feat(api): include ingredient type and batchYield in CRUD endpoints"
```

---

## Task 8: Update Ingredient Edit Panel UI — Type Selection + Production Recipe Section

### Files:
- Modify: `src/components/ingredients/ingredient-edit-panel.tsx`

### Step 1: Add type toggle to the Identity section

Add a `ToggleGroup` (or `Select`) for choosing RAW vs PREPARED in the Identity section of the edit panel, after the category field.

When PREPARED is selected:
- Show a `batchYield` number input (required)
- Show a "Production Recipe" collapsible section (similar to the existing Recipe Units section)

### Step 2: Add Production Recipe section

Create a new `FormSection` collapsible titled "Production Recipe" that appears only when `type === "PREPARED"`. This section should:

1. List current input ingredients with quantity, unit, and calculated cost
2. Have an "Add Input" button that opens a combobox to search/select ingredients (filtering out the current ingredient and any already-added inputs)
3. For each input row: quantity input, unit selector (base unit + aliases of the input ingredient), optional note, remove button
4. Show batch cost summary: total input cost, ÷ yield = cost per unit

Follow the same UI patterns as the existing unit-alias and purchase-variant sections in the edit panel.

### Step 3: Add "Produce" action button

Add a "Produce Batch" button to the ingredient detail view (when viewing a PREPARED ingredient). This opens a dialog with:
- Batch count input (default 1)
- Summary table showing what will be deducted from each input
- Confirmation button
- Success toast with production result

### Step 4: Commit

```bash
git add src/components/ingredients/ingredient-edit-panel.tsx
git commit -m "feat(ui): add ingredient type toggle and production recipe editor

PREPARED ingredients can now define input ingredients with quantities.
Produce Batch action deducts inputs and adds output stock."
```

---

## Task 9: Production Dialog Component

### Files:
- Create: `src/components/ingredients/produce-dialog.tsx`

### Step 1: Build the produce dialog

Create `src/components/ingredients/produce-dialog.tsx`:

A dialog component that:
1. Receives the PREPARED ingredient data (with production recipe)
2. Shows a `batchCount` number input
3. Dynamically calculates and displays:
   - Required inputs (quantity × batchCount for each input)
   - Available stock for each input (with warning if insufficient)
   - Expected output (batchYield × batchCount)
   - Estimated cost per unit
4. Submit calls `POST /api/ingredients/:id/produce`
5. On success, shows a toast and calls an `onSuccess` callback to refresh data

Use the same dialog/sheet patterns as `RestockDialog` and `VariantFormDialog`.

### Step 2: Commit

```bash
git add src/components/ingredients/produce-dialog.tsx
git commit -m "feat(ui): add ProduceDialog component for production runs"
```

---

## Task 10: Update Ingredient List — Visual Indicators

### Files:
- Modify: `src/components/ingredients/ingredient-list.tsx`
- Modify: `src/components/ingredients/ingredient-detail.tsx`

### Step 1: Add type badge to ingredient list

In the ingredient list, add a small badge or icon next to PREPARED ingredients to visually distinguish them from RAW ingredients. Use a `FlaskConical` or `ChefHat` Lucide icon.

### Step 2: Update ingredient detail view

In the detail panel, when viewing a PREPARED ingredient:
- Show the production recipe summary (inputs with costs)
- Show a "Produce" button
- Show production history (filter `IngredientHistory` by `source: "production"`)

### Step 3: Commit

```bash
git add src/components/ingredients/ingredient-list.tsx src/components/ingredients/ingredient-detail.tsx
git commit -m "feat(ui): add PREPARED badge and production details to ingredient views"
```

---

## Task 11: Integration Test — Production Run

### Files:
- Create: `tests/unit/production-recipe.test.ts`

### Step 1: Write production cost calculation tests

```typescript
import { describe, test, expect } from "vitest"
import { calculateProductionCostPerBaseUnit, calculateWeightedAvgCost } from "@/lib/ingredient-utils"

describe("Production Recipe Calculations", () => {
  describe("full production cycle cost flow", () => {
    test("tocino example: pork + sugar + soy → sticks with correct cost", () => {
      // Setup: define input costs
      const porkCostPerG = 0.35      // ₱0.35/g = ₱350/kg
      const sugarCostPerG = 0.05     // ₱0.05/g = ₱50/kg
      const soyCostPerMl = 0.08      // ₱0.08/mL

      const inputs = [
        { baseQuantity: 1000, avgCostPerBaseUnit: porkCostPerG },   // 1kg pork
        { baseQuantity: 200, avgCostPerBaseUnit: sugarCostPerG },   // 200g sugar
        { baseQuantity: 100, avgCostPerBaseUnit: soyCostPerMl },    // 100mL soy
      ]
      const batchYield = 20  // 20 sticks per batch

      // Act
      const costPerStick = calculateProductionCostPerBaseUnit(inputs, batchYield)

      // Assert: (350 + 10 + 8) / 20 = 18.4
      expect(costPerStick).toBeCloseTo(18.4)

      // Simulate adding 20 sticks to existing stock of 5 sticks @ ₱15/stick
      const newAvgCost = calculateWeightedAvgCost(5, 15, 20, costPerStick)
      // (5*15 + 20*18.4) / 25 = (75 + 368) / 25 = 17.72
      expect(newAvgCost).toBeCloseTo(17.72)
    })

    test("multiple batches multiply input requirements", () => {
      const inputs = [
        { baseQuantity: 500, avgCostPerBaseUnit: 0.30 },  // 500g per batch
      ]
      const batchYield = 10
      const batchCount = 3

      // Per batch cost: (500 * 0.30) / 10 = 15 per unit
      const costPerUnit = calculateProductionCostPerBaseUnit(inputs, batchYield)
      expect(costPerUnit).toBeCloseTo(15)

      // Total produced: 10 * 3 = 30 units
      // Total input used: 500 * 3 = 1500g
      const totalProduced = batchYield * batchCount
      expect(totalProduced).toBe(30)
    })
  })
})
```

### Step 2: Run tests

```bash
npm run test -- tests/unit/production-recipe.test.ts
```

Expected: PASS

### Step 3: Commit

```bash
git add tests/unit/production-recipe.test.ts
git commit -m "test: add production recipe cost calculation integration tests"
```

---

## Task 12: Seed Data (Optional)

### Files:
- Modify: `prisma/seed.ts`

### Step 1: Add example PREPARED ingredient

Add a "Tocino Sticks" ingredient of type PREPARED with a production recipe referencing Pork (if it exists in seed data). This serves as a working example for development.

### Step 2: Commit

```bash
git add prisma/seed.ts
git commit -m "chore(seed): add example PREPARED ingredient (Tocino Sticks)"
```

---

## Summary

| Task | What | Key Files |
|------|------|-----------|
| 1 | Schema + Migration | `schema.prisma`, migration SQL |
| 2 | TypeScript types | `src/types/ingredient.ts` |
| 3 | Zod schemas | `src/lib/ingredient-utils.ts` |
| 4 | Cost calculation util + tests | `src/lib/ingredient-utils.ts`, test file |
| 5 | Production recipe CRUD API | `api/ingredients/[id]/production-recipe/route.ts` |
| 6 | Production run API | `api/ingredients/[id]/produce/route.ts` |
| 7 | Update ingredient CRUD API | `api/ingredients/route.ts`, `[id]/route.ts` |
| 8 | Edit panel UI (type + recipe editor) | `ingredient-edit-panel.tsx` |
| 9 | Produce dialog UI | `produce-dialog.tsx` |
| 10 | List/detail visual indicators | `ingredient-list.tsx`, `ingredient-detail.tsx` |
| 11 | Integration tests | `tests/unit/production-recipe.test.ts` |
| 12 | Seed data (optional) | `prisma/seed.ts` |
