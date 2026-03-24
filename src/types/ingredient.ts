/**
 * Ingredient Unit System Types
 * Normalized schema: Unit reference table, PurchaseVariants, unified base-unit stock
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Unit System Types
// ═══════════════════════════════════════════════════════════════════════════════

export type UnitDimension = "WEIGHT" | "VOLUME" | "COUNT"

/** A standard unit from the units reference table */
export interface Unit {
  id: number
  name: string
  abbr: string
  dimension: UnitDimension
  isDiscrete: boolean
  sortOrder: number
}

/** Conversion factor between two units */
export interface UnitConversion {
  id: number
  fromUnitId: number
  toUnitId: number
  factor: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// Purchase Variant Types
// ═══════════════════════════════════════════════════════════════════════════════

/** A buyable format of an ingredient */
export interface PurchaseVariant {
  id: number
  ingredientId: number
  label: string
  contentQty: number
  contentUnitId: number
  contentUnitName?: string
  packageQty: number
  packageUnitId: number
  packageUnitName?: string
  costPerVariant: number
  baseUnitsPerVariant: number

  // Vendor override
  vendorId: number | null

  // Identification
  barcode: string | null
  sku: string | null
  isActive: boolean
  isDefault: boolean
}

export interface PurchaseVariantInput {
  label: string
  contentQty: number
  contentUnitId: number
  packageQty?: number
  packageUnitId: number
  costPerVariant: number
  vendorId?: number | null
  barcode?: string | null
  sku?: string | null
}

// ═══════════════════════════════════════════════════════════════════════════════
// Unit Alias Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface UnitAlias {
  id: number
  ingredientId: number
  name: string
  baseUnitMultiplier: number
  description: string | null
  isDefault: boolean
  unitId: number | null
  createdAt: string
}

export interface UnitAliasInput {
  name: string
  baseUnitMultiplier: number
  description?: string
  isDefault?: boolean
  unitId?: number | null
}

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

// ═══════════════════════════════════════════════════════════════════════════════
// Stock Status Types
// ═══════════════════════════════════════════════════════════════════════════════

export type StockStatus = "ok" | "low" | "critical" | "out"

// ═══════════════════════════════════════════════════════════════════════════════
// Core Ingredient Types
// ═══════════════════════════════════════════════════════════════════════════════

/** Complete ingredient from API response */
export interface Ingredient {
  id: number
  name: string
  category: string

  // Unit system
  baseUnitId: number
  baseUnitName: string
  baseUnitAbbr: string

  // Unified stock (in base units)
  stockQty: number
  avgCostPerBaseUnit: number
  parLevel: number
  stockStatus: StockStatus
  stockRatio: number | null

  // Count preference
  countUnitId: number | null
  countUnitName: string | null

  // Overhead
  isOverhead: boolean
  overheadPerTransaction: number | null

  // Yield factor
  yieldFactor: number | null

  // Production recipe (PREPARED ingredients only)
  type: IngredientType
  batchYield: number | null  // base units produced per batch
  productionInputs: ProductionRecipeItem[]  // what goes into making this

  // Metadata
  vendorId: number | null
  vendorName: string | null
  lastUpdated: string | null
  lastRestockDate: string | null

  // Nested data
  purchaseVariants: PurchaseVariant[]
  unitAliases: UnitAlias[]
}

// ═══════════════════════════════════════════════════════════════════════════════
// Form Input Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface IngredientFormInput {
  name: string
  category: string
  baseUnitId: number
  vendorId: number | null
  parLevel: number
  countUnitId: number | null
  isOverhead: boolean
  overheadPerTransaction: number | null
  yieldFactor: number | null
  type: IngredientType
  batchYield: number | null
}

// ═══════════════════════════════════════════════════════════════════════════════
// API Request/Response Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface CreateIngredientRequest {
  name: string
  category: string
  baseUnitId: number
  vendorId?: number | null
  parLevel?: number
  countUnitId?: number | null
  isOverhead?: boolean
  overheadPerTransaction?: number | null
  yieldFactor?: number | null
  // Default variant (created alongside ingredient)
  defaultVariant: PurchaseVariantInput
  // Initial stock (optional)
  initialStockQty?: number
}

export interface RestockRequest {
  variantId: number
  quantity: number // number of this variant to add
  costPerVariant?: number // optional cost override
  userId: number
  userName: string
  note?: string
}

export interface RestockResponse {
  ingredient: Ingredient
  restockDetails: {
    variantId: number
    variantLabel: string
    previousStockQty: number
    addedBaseUnits: number
    newStockQty: number
    previousAvgCost: number
    newAvgCost: number
  }
}

export interface LowStockItem {
  id: number
  name: string
  stockQty: number
  parLevel: number
  baseUnitName: string
  priority: "critical" | "high" | "medium" | "low"
  stockRatio: number
}

export interface LowStockResponse {
  count: number
  items: LowStockItem[]
}

/** Available unit option for recipe entry */
export interface AvailableUnit {
  id: number
  name: string
  abbr: string
  multiplier: number
  description: string | null
  isBase: boolean
}
