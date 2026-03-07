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

  // Sellable
  sellable: boolean
  sellPrice: number | null
  linkedProductId: number | null
  syncStatus: string

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
  sellable?: boolean
  sellPrice?: number | null
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
