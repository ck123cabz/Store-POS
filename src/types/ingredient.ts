/**
 * Ingredient Unit System Types
 * Feature: 004-ingredient-unit-system
 *
 * Supports dual-unit model: purchase units (packages) vs usage units (base units)
 * Example: Buy by "pack" (8 pcs @ ₱420), use in recipes by "pcs" (₱52.50 each)
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Unit Constants
// ═══════════════════════════════════════════════════════════════════════════════

export const UNIT_CATEGORIES = {
  weight: ["kg", "g"],
  volume: ["L", "mL"],
  count: ["pcs", "each"],
  package: [
    "pack",
    "box",
    "bottle",
    "bundle",
    "sack",
    "bag",
    "container",
    "can",
    "gallon",
    "tank",
  ],
} as const;

/** Units used for purchasing (typically packages or bulk) */
export const PURCHASE_UNITS = [
  ...UNIT_CATEGORIES.package,
  ...UNIT_CATEGORIES.weight,
  ...UNIT_CATEGORIES.volume,
] as const;

/** Units used for recipes and usage (typically smaller measurements) */
export const BASE_UNITS = [
  ...UNIT_CATEGORIES.count,
  ...UNIT_CATEGORIES.weight,
  ...UNIT_CATEGORIES.volume,
] as const;

export type PurchaseUnit = (typeof PURCHASE_UNITS)[number];
export type BaseUnit = (typeof BASE_UNITS)[number];

// ═══════════════════════════════════════════════════════════════════════════════
// Unit Presets for Quick-Add
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Preset unit definitions for quick-add functionality
 * Organized by base unit category
 */
export const UNIT_PRESETS = {
  /** Presets for volume-based ingredients (mL, L) */
  volume: [
    { name: "cup", baseUnitMultiplier: 240, forBaseUnit: "mL", description: "1 cup = 240 mL" },
    { name: "tbsp", baseUnitMultiplier: 15, forBaseUnit: "mL", description: "1 tbsp = 15 mL" },
    { name: "tsp", baseUnitMultiplier: 5, forBaseUnit: "mL", description: "1 tsp = 5 mL" },
  ],
  /** Presets for weight-based ingredients (g, kg) */
  weight: [
    { name: "cup", baseUnitMultiplier: 200, forBaseUnit: "g", description: "1 cup ≈ 200g (flour/sugar)" },
    { name: "serving", baseUnitMultiplier: 100, forBaseUnit: "g", description: "1 serving = 100g" },
    { name: "tbsp", baseUnitMultiplier: 15, forBaseUnit: "g", description: "1 tbsp ≈ 15g" },
  ],
  /** Presets for count-based ingredients (pcs, each) */
  count: [
    { name: "serving", baseUnitMultiplier: 1, forBaseUnit: "pcs", description: "1 serving = 1 piece" },
    { name: "dozen", baseUnitMultiplier: 12, forBaseUnit: "pcs", description: "1 dozen = 12 pieces" },
  ],
} as const;

export type UnitPresetCategory = keyof typeof UNIT_PRESETS;

// ═══════════════════════════════════════════════════════════════════════════════
// Unit Alias Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Unit alias for an ingredient
 * Allows users to enter recipes in their preferred units
 */
export interface UnitAlias {
  id: number;
  ingredientId: number;
  /** Alias name (e.g., "cup", "serving", "tbsp") */
  name: string;
  /** How many base units equal 1 of this alias (e.g., 240 mL per cup) */
  baseUnitMultiplier: number;
  /** Human-readable description (e.g., "1 cup = 240 mL") */
  description: string | null;
  /** Show this unit first in dropdowns */
  isDefault: boolean;
  createdAt: string;
}

/**
 * Input for creating a unit alias
 */
export interface UnitAliasInput {
  name: string;
  baseUnitMultiplier: number;
  description?: string;
  isDefault?: boolean;
}

/**
 * Available unit option for recipe entry
 */
export interface AvailableUnit {
  /** Unit name to display */
  name: string;
  /** Multiplier to convert to base units */
  multiplier: number;
  /** Description for tooltip */
  description: string | null;
  /** True if this is the ingredient's base unit */
  isBase: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Stock Status Types
// ═══════════════════════════════════════════════════════════════════════════════

export type StockStatus = "ok" | "low" | "critical" | "out";

export interface StockStatusThresholds {
  out: 0;
  critical: 0.25;
  low: 0.5;
  // Above 0.5 ratio = "ok"
}

// ═══════════════════════════════════════════════════════════════════════════════
// Core Ingredient Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Unit system data for an ingredient
 * Defines how the ingredient is purchased vs how it's used in recipes
 */
export interface IngredientUnitData {
  /** Usage unit for recipes (e.g., "pcs", "kg", "g", "L", "mL") */
  baseUnit: string;
  /** How many baseUnits per package (e.g., 8 pcs per pack) */
  packageSize: number;
  /** Purchase unit (e.g., "pack", "bottle", "bundle") */
  packageUnit: string;
  /** Cost to buy one package (e.g., ₱420 per pack) */
  costPerPackage: number;
}

/**
 * Computed fields derived from unit data
 * These are calculated server-side and included in API responses
 */
export interface IngredientComputedFields {
  /** costPerPackage / packageSize (e.g., ₱420 / 8 = ₱52.50) */
  costPerBaseUnit: number;
  /** quantity * packageSize (e.g., 3.5 packs * 8 = 28 pcs) */
  totalBaseUnits: number;
  /** Stock status based on quantity/parLevel ratio */
  stockStatus: StockStatus;
  /** quantity / parLevel ratio (null if parLevel is 0) */
  stockRatio: number | null;
}

/**
 * Stock management data
 */
export interface IngredientStockData {
  /** Packages in stock (e.g., 3.5 packs) */
  quantity: number;
  /** Minimum packages before low stock alert */
  parLevel: number;
  /** Prefer counting inventory by base units (pcs) instead of packages */
  countByBaseUnit: boolean;
  /** Last restock date */
  lastRestockDate: string | null;
}

/**
 * Overhead item configuration (deducted per transaction)
 * Example: Gloves, containers, napkins
 */
export interface IngredientOverheadData {
  /** Whether this item auto-deducts on each transaction */
  isOverhead: boolean;
  /** How many base units to deduct per transaction */
  overheadPerTransaction: number | null;
}

/**
 * Sellable item configuration (syncs to POS products)
 */
export interface IngredientSellableData {
  /** Whether this ingredient can be sold directly at POS */
  sellable: boolean;
  /** Selling price (required if sellable) */
  sellPrice: number | null;
  /** Linked POS product ID (created when marked sellable) */
  linkedProductId: number | null;
  /** Sync status with linked product */
  syncStatus: "synced" | "pending" | "error";
}

/**
 * Complete Ingredient type combining all data interfaces
 */
export interface Ingredient
  extends IngredientUnitData,
    IngredientComputedFields,
    IngredientStockData,
    IngredientOverheadData,
    IngredientSellableData {
  id: number;
  name: string;
  category: string;
  vendorId: number | null;
  vendorName: string | null;
  lastUpdated: string;
  barcode: string | null;

  /** Cooking yield factor (e.g., 3.0 for rice = 3x expansion when cooked) */
  yieldFactor: number | null;

  /** Custom unit aliases for recipe entry */
  unitAliases: UnitAlias[];

  // Legacy fields (deprecated, for backward compatibility)
  /** @deprecated Use baseUnit + packageUnit instead */
  unit?: string;
  /** @deprecated Use costPerPackage / packageSize instead */
  costPerUnit?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Form Input Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Form input for creating/editing ingredients
 * All fields the user can set directly (computed fields excluded)
 */
export interface IngredientFormInput {
  name: string;
  category: string;
  vendorId: number | null;

  // Purchasing section
  packageUnit: string;
  costPerPackage: number;

  // Usage section (conversion)
  baseUnit: string;
  packageSize: number;

  // Stock section
  quantity: number;
  parLevel: number;
  countByBaseUnit: boolean;

  // Special options
  sellable: boolean;
  sellPrice: number | null;
  isOverhead: boolean;
  overheadPerTransaction: number | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// API Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/ingredients request body
 */
export interface CreateIngredientRequest {
  name: string;
  category: string;

  // Purchasing (required)
  packageUnit: string;
  costPerPackage: number;

  // Usage (required)
  baseUnit: string;
  packageSize: number;

  // Stock (optional, defaults to 0)
  quantity?: number;
  parLevel?: number;
  countByBaseUnit?: boolean;

  // Special options (optional)
  vendorId?: number | null;
  sellable?: boolean;
  sellPrice?: number | null;
  isOverhead?: boolean;
  overheadPerTransaction?: number | null;
}

/**
 * POST /api/ingredients/:id/restock request body
 */
export interface RestockRequest {
  /** Packages to add (required, > 0) */
  quantity: number;
  /** Update cost per package if price changed */
  costPerPackage?: number;
  /** Update package size if pack changed */
  packageSize?: number;
  /** User performing the restock (for audit) */
  userId: number;
  userName: string;
}

/**
 * POST /api/ingredients/:id/restock response
 */
export interface RestockResponse {
  ingredient: Ingredient;
  restockDetails: {
    previousQuantity: number;
    addedQuantity: number;
    newQuantity: number;
    previousCostPerPackage: number | null;
    newCostPerPackage: number;
    costPerBaseUnit: number;
  };
}

/**
 * Low stock alert item
 */
export interface LowStockItem {
  id: number;
  name: string;
  quantity: number;
  totalBaseUnits: number;
  parLevel: number;
  baseUnit: string;
  packageUnit: string;
  priority: "critical" | "high" | "medium" | "low";
  stockRatio: number;
}

/**
 * GET /api/ingredients/low-stock response
 */
export interface LowStockResponse {
  count: number;
  items: LowStockItem[];
}
