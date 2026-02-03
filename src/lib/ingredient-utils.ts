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
  packageSize: number
): number {
  return quantity * packageSize;
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
