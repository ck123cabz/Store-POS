/**
 * Ingredient Unit System Utilities
 * Feature: 004-ingredient-unit-system
 *
 * Pure functions for cost calculations and display formatting.
 * All monetary calculations store full precision, round only for display.
 */

import { z } from "zod";
import type {
  StockStatus,
  Ingredient,
} from "@/types/ingredient";
import { PURCHASE_UNITS, BASE_UNITS } from "@/types/ingredient";

// ═══════════════════════════════════════════════════════════════════════════════
// Zod Validation Schemas
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validation schema for ingredient form input
 * Used for both create and update operations
 */
export const ingredientFormSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100),
    category: z.string().min(1, "Category is required"),
    vendorId: z.number().nullable(),

    // Purchasing
    packageUnit: z.string().min(1, "Purchase unit is required"),
    costPerPackage: z.number().min(0, "Cost must be 0 or greater"),

    // Usage
    baseUnit: z.string().min(1, "Usage unit is required"),
    packageSize: z.number().positive("Package size must be greater than 0"),

    // Stock
    quantity: z.number().min(0, "Quantity cannot be negative").default(0),
    parLevel: z.number().min(0).int().default(0),
    countByBaseUnit: z.boolean().default(false),

    // Special
    sellable: z.boolean().default(false),
    sellPrice: z.number().min(0).nullable().default(null),
    isOverhead: z.boolean().default(false),
    overheadPerTransaction: z.number().min(0).nullable().default(null),
  })
  .refine((data) => !data.sellable || data.sellPrice !== null, {
    message: "Sell price required for sellable items",
    path: ["sellPrice"],
  })
  .refine((data) => !data.isOverhead || data.overheadPerTransaction !== null, {
    message: "Usage rate required for overhead items",
    path: ["overheadPerTransaction"],
  });

export type IngredientFormSchema = z.infer<typeof ingredientFormSchema>;

/**
 * Validation schema for unit alias input
 * Used when creating/updating unit aliases for ingredients
 */
export const unitAliasSchema = z.object({
  /** Alias name (e.g., "cup", "serving") */
  name: z
    .string()
    .min(1, "Unit name is required")
    .max(20, "Unit name must be 20 characters or less")
    .regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/, "Unit name must start with a letter and contain only letters, numbers, underscores, or hyphens"),

  /** How many base units equal 1 of this alias */
  baseUnitMultiplier: z
    .number()
    .positive("Multiplier must be greater than 0"),

  /** Optional human-readable description */
  description: z
    .string()
    .max(50, "Description must be 50 characters or less")
    .optional(),

  /** Whether this is the default unit for recipe entry */
  isDefault: z
    .boolean()
    .optional()
    .default(false),
});

export type UnitAliasSchema = z.infer<typeof unitAliasSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// Cost Calculation Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate cost per base unit from package cost and size
 *
 * @param costPerPackage - Cost to buy one package (e.g., ₱420)
 * @param packageSize - How many base units per package (e.g., 8 pcs)
 * @returns Cost per base unit with full precision
 * @throws Error if packageSize is zero or negative
 *
 * @example
 * calculateCostPerBaseUnit(420, 8) // Returns 52.5 (₱52.50 per piece)
 */
export function calculateCostPerBaseUnit(
  costPerPackage: number,
  packageSize: number
): number {
  if (packageSize <= 0) {
    throw new Error("Package size must be greater than 0");
  }
  return costPerPackage / packageSize;
}

/**
 * Calculate total base units from package quantity
 *
 * @param quantity - Packages in stock (can be fractional)
 * @param packageSize - How many base units per package
 * @returns Total base units available
 *
 * @example
 * calculateTotalBaseUnits(3.5, 8) // Returns 28 (3.5 packs × 8 pcs/pack)
 */
export function calculateTotalBaseUnits(
  quantity: number,
  packageSize: number,
  baseUnit?: string
): number {
  const total = quantity * packageSize;
  // For discrete units (pcs, each), round to nearest integer to avoid
  // display artifacts from package-based storage precision (e.g., 28.0005 → 28)
  if (baseUnit && isDiscreteUnit(baseUnit)) {
    return Math.round(total);
  }
  return total;
}

/** Returns true for countable/discrete units where fractional amounts don't make sense */
export function isDiscreteUnit(unit: string): boolean {
  const discrete = ["pcs", "pc", "piece", "pieces", "each", "ea", "bottle", "bottles", "can", "cans"];
  return discrete.includes(unit.toLowerCase());
}

/**
 * Calculate recipe cost for a given quantity of ingredient
 *
 * @param quantity - Amount of base units used in recipe
 * @param costPerBaseUnit - Cost per base unit
 * @returns Total cost for the recipe ingredient
 *
 * @example
 * calculateRecipeCost(2, 52.5) // Returns 105 (2 pcs × ₱52.50)
 */
export function calculateRecipeCost(
  quantity: number,
  costPerBaseUnit: number
): number {
  return quantity * costPerBaseUnit;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Unit Conversion Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert from alias unit to base units
 *
 * @param quantity - Amount in alias unit (e.g., 2 cups)
 * @param multiplier - Base units per alias unit (e.g., 240 mL per cup)
 * @returns Amount in base units (e.g., 480 mL)
 *
 * @example
 * convertToBaseUnits(2, 240) // 2 cups × 240 mL/cup = 480 mL
 */
export function convertToBaseUnits(
  quantity: number,
  multiplier: number
): number {
  return quantity * multiplier;
}

/**
 * Convert from base units to alias unit
 *
 * @param baseQuantity - Amount in base units
 * @param multiplier - Base units per alias unit
 * @returns Amount in alias unit
 *
 * @example
 * convertFromBaseUnits(480, 240) // 480 mL ÷ 240 mL/cup = 2 cups
 */
export function convertFromBaseUnits(
  baseQuantity: number,
  multiplier: number
): number {
  if (multiplier <= 0) return baseQuantity;
  return baseQuantity / multiplier;
}

/**
 * Calculate cooked yield from raw amount
 *
 * @param rawQuantity - Raw amount in base units
 * @param yieldFactor - Cooking expansion factor (e.g., 3 for rice)
 * @returns Cooked amount in base units
 *
 * @example
 * calculateCookedYield(100, 3) // 100g raw × 3 = 300g cooked
 * calculateCookedYield(100, 0.8) // 100g raw × 0.8 = 80g cooked (meat shrinks)
 */
export function calculateCookedYield(
  rawQuantity: number,
  yieldFactor: number | null
): number {
  if (!yieldFactor || yieldFactor <= 0) return rawQuantity;
  return rawQuantity * yieldFactor;
}

/**
 * Calculate cost for a recipe ingredient entry
 *
 * @param quantity - Amount in chosen unit
 * @param multiplier - Base units per chosen unit (1 if using base unit)
 * @param costPerBaseUnit - Cost per base unit
 * @returns Total cost for this ingredient entry
 *
 * @example
 * // 2 cups of ingredient, 240 mL/cup, ₱0.50/mL
 * calculateRecipeIngredientCost(2, 240, 0.5) // = ₱240
 */
export function calculateRecipeIngredientCost(
  quantity: number,
  multiplier: number,
  costPerBaseUnit: number
): number {
  const baseQuantity = convertToBaseUnits(quantity, multiplier);
  return calculateRecipeCost(baseQuantity, costPerBaseUnit);
}

/**
 * Standard unit conversions keyed by base unit.
 * These are fixed mathematical relationships that never change.
 * Multiplier = how many base units equal 1 of this unit.
 *
 * Custom per-ingredient aliases (from the database) still take priority
 * if they define the same unit name with a different multiplier.
 */
const STANDARD_CONVERSIONS: Record<
  string,
  Array<{ name: string; multiplier: number; description: string }>
> = {
  g: [
    { name: "kg",   multiplier: 1000,     description: "1 kg = 1,000 g" },
    { name: "oz",   multiplier: 28.3495,  description: "1 oz = 28.35 g" },
    { name: "lb",   multiplier: 453.592,  description: "1 lb = 453.59 g" },
  ],
  kg: [
    { name: "g",    multiplier: 0.001,    description: "1 g = 0.001 kg" },
    { name: "oz",   multiplier: 0.02835,  description: "1 oz = 0.02835 kg" },
    { name: "lb",   multiplier: 0.45359,  description: "1 lb = 0.4536 kg" },
  ],
  mL: [
    { name: "L",    multiplier: 1000,     description: "1 L = 1,000 mL" },
    { name: "cup",  multiplier: 240,      description: "1 cup = 240 mL" },
    { name: "tbsp", multiplier: 15,       description: "1 tbsp = 15 mL" },
    { name: "tsp",  multiplier: 5,        description: "1 tsp = 5 mL" },
    { name: "fl oz", multiplier: 29.5735, description: "1 fl oz = 29.57 mL" },
  ],
  L: [
    { name: "mL",   multiplier: 0.001,    description: "1 mL = 0.001 L" },
    { name: "cup",  multiplier: 0.24,     description: "1 cup = 0.24 L" },
    { name: "gal",  multiplier: 3.78541,  description: "1 gal = 3.785 L" },
  ],
  pcs: [
    { name: "dozen", multiplier: 12,      description: "1 dozen = 12 pcs" },
  ],
  each: [
    { name: "dozen", multiplier: 12,      description: "1 dozen = 12 each" },
  ],
};

/**
 * Get all available units for an ingredient.
 * Includes: base unit → custom aliases → standard conversions.
 * Custom aliases take priority over standard conversions for the same name.
 *
 * @param baseUnit - The ingredient's base unit (e.g., "g", "mL", "pcs")
 * @param unitAliases - Custom per-ingredient aliases from the database
 * @returns Array of available units for dropdown selection
 */
export function getAvailableUnits(
  baseUnit: string,
  unitAliases: Array<{ name: string; baseUnitMultiplier: number; description: string | null }>
): Array<{ name: string; multiplier: number; description: string | null; isBase: boolean }> {
  const seen = new Set<string>([baseUnit]);
  const units: Array<{ name: string; multiplier: number; description: string | null; isBase: boolean }> = [
    {
      name: baseUnit,
      multiplier: 1,
      description: "Base unit",
      isBase: true,
    },
  ];

  // Custom aliases first (take priority over standard conversions)
  for (const alias of unitAliases) {
    if (!seen.has(alias.name)) {
      seen.add(alias.name);
      units.push({
        name: alias.name,
        multiplier: alias.baseUnitMultiplier,
        description: alias.description,
        isBase: false,
      });
    }
  }

  // Standard conversions (skipped if custom alias already defined that name)
  const conversions = STANDARD_CONVERSIONS[baseUnit];
  if (conversions) {
    for (const conv of conversions) {
      if (!seen.has(conv.name)) {
        seen.add(conv.name);
        units.push({
          name: conv.name,
          multiplier: conv.multiplier,
          description: conv.description,
          isBase: false,
        });
      }
    }
  }

  return units;
}

/**
 * Get the multiplier for a given unit
 *
 * @param unit - The unit name to look up
 * @param baseUnit - The ingredient's base unit
 * @param unitAliases - Configured unit aliases
 * @returns The multiplier (1 for base unit, alias multiplier otherwise)
 */
export function getUnitMultiplier(
  unit: string,
  baseUnit: string,
  unitAliases: Array<{ name: string; baseUnitMultiplier: number }>
): number {
  if (unit === baseUnit || unit === "") return 1;
  const alias = unitAliases.find((a) => a.name === unit);
  return alias?.baseUnitMultiplier ?? 1;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Stock Status Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate stock status based on quantity and PAR level
 *
 * @param quantity - Current packages in stock
 * @param parLevel - Minimum desired packages
 * @returns Stock status: "ok" | "low" | "critical" | "out"
 *
 * Status thresholds:
 * - out: quantity = 0
 * - critical: quantity/parLevel < 0.25
 * - low: quantity/parLevel < 0.5 (but >= 0.25)
 * - ok: quantity/parLevel >= 0.5
 */
export function calculateStockStatus(
  quantity: number,
  parLevel: number
): StockStatus {
  if (quantity <= 0) return "out";
  if (parLevel <= 0) return "ok"; // No PAR level set = always OK

  const ratio = quantity / parLevel;
  if (ratio < 0.25) return "critical";
  if (ratio < 0.5) return "low";
  return "ok";
}

/**
 * Calculate stock ratio for display purposes
 *
 * @param quantity - Current packages in stock
 * @param parLevel - Minimum desired packages
 * @returns Ratio as percentage (0-100+), or null if parLevel is 0
 */
export function calculateStockRatio(
  quantity: number,
  parLevel: number
): number | null {
  if (parLevel <= 0) return null;
  return Math.round((quantity / parLevel) * 100);
}

/**
 * Get low stock priority based on stock ratio
 *
 * @param stockRatio - Ratio as decimal (quantity / parLevel)
 * @returns Priority level for alert ordering
 */
export function getLowStockPriority(
  stockRatio: number
): "critical" | "high" | "medium" | "low" {
  if (stockRatio === 0) return "critical";
  if (stockRatio < 0.25) return "high";
  if (stockRatio < 0.5) return "medium";
  return "low";
}

// ═══════════════════════════════════════════════════════════════════════════════
// Display Formatting Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format currency value for display (Philippine Peso)
 *
 * @param value - Amount in pesos
 * @param decimals - Decimal places (default 2)
 * @returns Formatted string like "₱52.50"
 */
export function formatCurrency(value: number, decimals: number = 2): string {
  return `₱${value.toFixed(decimals)}`;
}

/**
 * Format dual-unit stock display
 * Shows packages with base unit equivalent
 *
 * @param quantity - Packages in stock
 * @param packageSize - Base units per package
 * @param packageUnit - Package unit name (e.g., "pack")
 * @param baseUnit - Base unit name (e.g., "pcs")
 * @returns Formatted string like "3.5 packs (28 pcs)"
 *
 * @example
 * formatDualUnitDisplay(3.5, 8, "pack", "pcs")
 * // Returns "3.5 packs (28 pcs)"
 *
 * formatDualUnitDisplay(2, 1, "kg", "kg")
 * // Returns "2 kg" (no conversion shown when units are same)
 */
export function formatDualUnitDisplay(
  quantity: number,
  packageSize: number,
  packageUnit: string,
  baseUnit: string
): string {
  // Format quantity, removing unnecessary decimal zeros
  const formattedQty =
    quantity % 1 === 0 ? quantity.toString() : quantity.toFixed(2);

  // Pluralize unit if needed
  const pluralizedPackageUnit =
    quantity === 1 ? packageUnit : pluralizeUnit(packageUnit);

  // If units are the same or packageSize is 1, just show single unit
  if (packageUnit === baseUnit || packageSize === 1) {
    return `${formattedQty} ${pluralizedPackageUnit}`;
  }

  // Calculate total base units
  const totalBase = calculateTotalBaseUnits(quantity, packageSize);
  const formattedBase =
    totalBase % 1 === 0 ? totalBase.toString() : totalBase.toFixed(2);
  const pluralizedBaseUnit = totalBase === 1 ? baseUnit : pluralizeUnit(baseUnit);

  return `${formattedQty} ${pluralizedPackageUnit} (${formattedBase} ${pluralizedBaseUnit})`;
}

/**
 * Simple pluralization for common units
 */
function pluralizeUnit(unit: string): string {
  // Units that don't change in plural
  const invariant = ["kg", "g", "L", "mL", "pcs", "each"];
  if (invariant.includes(unit)) return unit;

  // Simple -s pluralization for package units
  if (unit.endsWith("s") || unit.endsWith("x")) return unit;
  return `${unit}s`;
}

/**
 * Format package equivalent display for recipe input
 * Shows how much of a package is being used
 *
 * @param baseUnitQuantity - Amount in base units
 * @param packageSize - Base units per package
 * @param packageUnit - Package unit name
 * @returns Formatted string like "0.25 pack"
 *
 * @example
 * formatPackageEquivalent(2, 8, "pack")
 * // Returns "0.25 pack" (2 pcs out of 8-pc pack)
 */
export function formatPackageEquivalent(
  baseUnitQuantity: number,
  packageSize: number,
  packageUnit: string
): string {
  if (packageSize <= 0) return "";

  const packages = baseUnitQuantity / packageSize;
  const formattedPkg = packages.toFixed(2);
  const pluralizedUnit = packages === 1 ? packageUnit : pluralizeUnit(packageUnit);

  return `${formattedPkg} ${pluralizedUnit}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Backward Compatibility Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get effective cost per base unit, supporting legacy data
 * Falls back to costPerUnit for ingredients without new unit system data
 *
 * @param ingredient - Ingredient with either new or legacy cost data
 * @returns Cost per base unit
 */
export function getEffectiveCostPerBaseUnit(
  ingredient: Partial<Ingredient>
): number {
  // New system takes precedence
  if (
    ingredient.costPerPackage !== undefined &&
    ingredient.packageSize !== undefined &&
    ingredient.packageSize > 0
  ) {
    return calculateCostPerBaseUnit(
      ingredient.costPerPackage,
      ingredient.packageSize
    );
  }

  // Fall back to legacy costPerUnit
  return ingredient.costPerUnit ?? 0;
}

/**
 * Get effective unit name, supporting legacy data
 *
 * @param ingredient - Ingredient with either new or legacy unit data
 * @returns Base unit name
 */
export function getEffectiveUnit(ingredient: Partial<Ingredient>): string {
  return ingredient.baseUnit || ingredient.unit || "pcs";
}

/**
 * Check if ingredient is using new unit system
 *
 * @param ingredient - Ingredient to check
 * @returns true if using new packageUnit/baseUnit system
 */
export function isUsingNewUnitSystem(ingredient: Partial<Ingredient>): boolean {
  return (
    ingredient.packageSize !== undefined &&
    ingredient.packageSize > 0 &&
    ingredient.costPerPackage !== undefined &&
    ingredient.baseUnit !== undefined
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Unit Validation Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a unit is a valid purchase unit
 */
export function isValidPurchaseUnit(unit: string): boolean {
  return PURCHASE_UNITS.includes(unit as (typeof PURCHASE_UNITS)[number]);
}

/**
 * Check if a unit is a valid base unit
 */
export function isValidBaseUnit(unit: string): boolean {
  return BASE_UNITS.includes(unit as (typeof BASE_UNITS)[number]);
}

/**
 * Check if units are the same (no conversion needed)
 */
export function isSameUnit(packageUnit: string, baseUnit: string): boolean {
  return packageUnit === baseUnit;
}
