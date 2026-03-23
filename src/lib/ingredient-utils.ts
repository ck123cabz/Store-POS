/**
 * Ingredient Unit System Utilities
 * Normalized schema: data-driven units, base-unit stock, weighted avg cost
 *
 * Pure functions for cost calculations, unit conversion, and display formatting.
 * All monetary calculations store full precision, round only for display.
 */

import { z } from "zod";
import type { StockStatus, UnitConversion } from "@/types/ingredient";

// ═══════════════════════════════════════════════════════════════════════════════
// Zod Validation Schemas
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validation schema for ingredient form input
 */
export const ingredientFormSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100),
    category: z.string().min(1, "Category is required"),
    baseUnitId: z.number().int().positive("Base unit is required"),
    vendorId: z.number().nullable(),
    parLevel: z.number().min(0, "PAR level cannot be negative").default(0),
    countUnitId: z.number().int().positive().nullable().default(null),
    isOverhead: z.boolean().default(false),
    overheadPerTransaction: z.number().min(0).nullable().default(null),
    yieldFactor: z.number().min(0).nullable().default(null),
    type: z.enum(["RAW", "PREPARED"]).default("RAW"),
    batchYield: z.number().positive("Batch yield must be positive").nullable().default(null),
  })
  .refine((data) => !data.isOverhead || data.overheadPerTransaction !== null, {
    message: "Usage rate required for overhead items",
    path: ["overheadPerTransaction"],
  })
  .refine((data) => data.type !== "PREPARED" || (data.batchYield !== null && data.batchYield > 0), {
    message: "Batch yield is required for prepared ingredients",
    path: ["batchYield"],
  });

export type IngredientFormSchema = z.infer<typeof ingredientFormSchema>;

/**
 * Validation schema for purchase variant input
 */
export const purchaseVariantSchema = z.object({
  label: z.string().min(1, "Label is required").max(100),
  contentQty: z.number().positive("Content quantity must be positive"),
  contentUnitId: z.number().int().positive("Content unit is required"),
  packageQty: z.number().int().positive().default(1),
  packageUnitId: z.number().int().positive("Package unit is required"),
  costPerVariant: z.number().min(0, "Cost must be 0 or greater"),
  vendorId: z.number().int().positive().nullable().default(null),
  barcode: z.string().nullable().default(null),
  sku: z.string().nullable().default(null),
});

export type PurchaseVariantSchema = z.infer<typeof purchaseVariantSchema>;

/**
 * Validation schema for unit alias input
 */
export const unitAliasSchema = z.object({
  name: z
    .string()
    .min(1, "Unit name is required")
    .max(20, "Unit name must be 20 characters or less")
    .regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/, "Unit name must start with a letter and contain only letters, numbers, underscores, or hyphens"),
  baseUnitMultiplier: z
    .number()
    .positive("Multiplier must be greater than 0"),
  description: z
    .string()
    .max(50, "Description must be 50 characters or less")
    .optional(),
  isDefault: z
    .boolean()
    .optional()
    .default(false),
  unitId: z
    .number()
    .int()
    .positive()
    .nullable()
    .optional()
    .default(null),
});

export type UnitAliasSchema = z.infer<typeof unitAliasSchema>;

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

// ═══════════════════════════════════════════════════════════════════════════════
// Unit Conversion Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert a quantity between two units using the conversions table.
 * Supports direct conversion and transitive conversion via a common base
 * (g for weight, mL for volume, pcs for count).
 *
 * @param qty - Amount to convert
 * @param fromUnitId - Source unit ID
 * @param toUnitId - Target unit ID
 * @param conversions - Array of UnitConversion records
 * @returns Converted quantity, or null if no conversion path exists
 */
export function convertUnits(
  qty: number,
  fromUnitId: number,
  toUnitId: number,
  conversions: UnitConversion[]
): number | null {
  if (fromUnitId === toUnitId) return qty;

  // Direct conversion
  const direct = conversions.find(
    (c) => c.fromUnitId === fromUnitId && c.toUnitId === toUnitId
  );
  if (direct) return qty * direct.factor;

  // Transitive: fromUnit → base → toUnit
  // Common bases: g(1), mL(5), pcs(12)
  const commonBases = [1, 5, 12];
  for (const baseId of commonBases) {
    const toBase = conversions.find(
      (c) => c.fromUnitId === fromUnitId && c.toUnitId === baseId
    );
    const fromBase = conversions.find(
      (c) => c.fromUnitId === baseId && c.toUnitId === toUnitId
    );
    if (toBase && fromBase) {
      return qty * toBase.factor * fromBase.factor;
    }
  }

  return null;
}

/**
 * Compute baseUnitsPerVariant from variant content and conversion table.
 *
 * @param contentQty - Content per variant (e.g., 500 for a 500mL bottle)
 * @param contentUnitId - Unit of content (e.g., mL)
 * @param baseUnitId - Ingredient's base unit (e.g., mL or L)
 * @param packageQty - Items per purchase package (e.g., 24 for a case)
 * @param conversions - Array of UnitConversion records
 * @returns Base units per variant, or contentQty * packageQty if same unit
 */
export function computeBaseUnitsPerVariant(
  contentQty: number,
  contentUnitId: number,
  baseUnitId: number,
  packageQty: number,
  conversions: UnitConversion[]
): number {
  const convertedContent = convertUnits(contentQty, contentUnitId, baseUnitId, conversions);
  const effectiveContent = convertedContent ?? contentQty;
  return effectiveContent * packageQty;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Weighted Average Cost
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate new weighted average cost after a restock.
 *
 * @param currentStockQty - Current stock in base units
 * @param currentAvgCost - Current avg cost per base unit
 * @param addedBaseUnits - Base units being added
 * @param addedCostPerBaseUnit - Cost per base unit of the new stock
 * @returns New weighted average cost per base unit
 */
export function calculateWeightedAvgCost(
  currentStockQty: number,
  currentAvgCost: number,
  addedBaseUnits: number,
  addedCostPerBaseUnit: number
): number {
  const totalQty = currentStockQty + addedBaseUnits;
  if (totalQty <= 0) return addedCostPerBaseUnit;

  return (
    (currentStockQty * currentAvgCost + addedBaseUnits * addedCostPerBaseUnit) /
    totalQty
  );
}

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

// ═══════════════════════════════════════════════════════════════════════════════
// Stock Status Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate stock status based on stockQty and parLevel (both in base units)
 *
 * Status thresholds:
 * - out: stockQty = 0
 * - critical: stockQty/parLevel < 0.25
 * - low: stockQty/parLevel < 0.5 (but >= 0.25)
 * - ok: stockQty/parLevel >= 0.5
 */
export function calculateStockStatus(
  stockQty: number,
  parLevel: number
): StockStatus {
  if (stockQty <= 0) return "out";
  if (parLevel <= 0) return "ok";

  const ratio = stockQty / parLevel;
  if (ratio < 0.25) return "critical";
  if (ratio < 0.5) return "low";
  return "ok";
}

/**
 * Calculate stock ratio for display purposes
 *
 * @returns Ratio as percentage (0-100+), or null if parLevel is 0
 */
export function calculateStockRatio(
  stockQty: number,
  parLevel: number
): number | null {
  if (parLevel <= 0) return null;
  return Math.round((stockQty / parLevel) * 100);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Display Formatting Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format currency value for display (Philippine Peso)
 */
export function formatCurrency(value: number, decimals: number = 2): string {
  const safeValue = value ?? 0;
  return `₱${safeValue.toFixed(decimals)}`;
}

/**
 * Format stock display with unit
 *
 * @example
 * formatStockDisplay(28, "pcs", true) // "28 pcs"
 * formatStockDisplay(2.5, "kg", false) // "2.50 kg"
 */
export function formatStockDisplay(
  stockQty: number,
  unitName: string,
  isDiscrete: boolean
): string {
  const formatted = isDiscrete
    ? Math.round(stockQty).toString()
    : stockQty % 1 === 0
      ? stockQty.toString()
      : stockQty.toFixed(2);
  return `${formatted} ${unitName}`;
}

/** Returns true for discrete (countable) units */
export function isDiscreteUnit(unitName: string): boolean {
  const discrete = ["pcs", "pc", "piece", "pieces", "each", "ea", "bottle", "bottles", "can", "cans", "dozen"];
  return discrete.includes(unitName.toLowerCase());
}

/**
 * Simple pluralization for common units
 */
export function pluralizeUnit(unit: string): string {
  const invariant = ["kg", "g", "L", "mL", "pcs", "each", "oz"];
  if (invariant.includes(unit)) return unit;
  if (unit.endsWith("s") || unit.endsWith("x")) return unit;
  return `${unit}s`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Legacy compatibility helpers (for gradual migration of UI components)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @deprecated Use calculateStockStatus with stockQty directly
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
 * @deprecated Use stockQty directly (already in base units)
 */
export function calculateTotalBaseUnits(
  quantity: number,
  packageSize: number,
  baseUnit?: string
): number {
  const total = quantity * packageSize;
  if (baseUnit && isDiscreteUnit(baseUnit)) {
    return Math.round(total);
  }
  return total;
}

/**
 * @deprecated Use formatStockDisplay instead
 */
export function formatDualUnitDisplay(
  quantity: number,
  packageSize: number,
  packageUnit: string,
  baseUnit: string
): string {
  const formattedQty =
    quantity % 1 === 0 ? quantity.toString() : quantity.toFixed(2);
  const pluralizedPackageUnit =
    quantity === 1 ? packageUnit : pluralizeUnit(packageUnit);

  if (packageUnit === baseUnit || packageSize === 1) {
    return `${formattedQty} ${pluralizedPackageUnit}`;
  }

  const totalBase = calculateTotalBaseUnits(quantity, packageSize);
  const formattedBase =
    totalBase % 1 === 0 ? totalBase.toString() : totalBase.toFixed(2);
  const pluralizedBaseUnit = totalBase === 1 ? baseUnit : pluralizeUnit(baseUnit);

  return `${formattedQty} ${pluralizedPackageUnit} (${formattedBase} ${pluralizedBaseUnit})`;
}

/**
 * Get available units for recipe entry.
 * Uses conversions from Unit table + ingredient-specific aliases.
 */
/** Shape of a DB-loaded unit conversion row (from UnitConversion table). */
export interface DbUnitConversion {
  fromUnitName: string;
  toUnitName: string;
  factor: number;
}

export function getAvailableUnits(
  baseUnit: string,
  unitAliases: Array<{ name: string; baseUnitMultiplier: number; description: string | null }>,
  dbConversions?: DbUnitConversion[]
): Array<{ name: string; multiplier: number; description: string | null; isBase: boolean }> {
  // Hardcoded STANDARD_CONVERSIONS kept as fallback for callers that
  // haven't been updated to pass DB conversions yet.
  const STANDARD_CONVERSIONS: Record<string, Array<{ name: string; multiplier: number; description: string }>> = {
    g: [
      { name: "kg", multiplier: 1000, description: "1 kg = 1,000 g" },
      { name: "oz", multiplier: 28.3495, description: "1 oz = 28.35 g" },
      { name: "lb", multiplier: 453.592, description: "1 lb = 453.59 g" },
    ],
    kg: [
      { name: "g", multiplier: 0.001, description: "1 g = 0.001 kg" },
      { name: "oz", multiplier: 0.02835, description: "1 oz = 0.02835 kg" },
      { name: "lb", multiplier: 0.45359, description: "1 lb = 0.4536 kg" },
    ],
    mL: [
      { name: "L", multiplier: 1000, description: "1 L = 1,000 mL" },
      { name: "cup", multiplier: 240, description: "1 cup = 240 mL" },
      { name: "tbsp", multiplier: 15, description: "1 tbsp = 15 mL" },
      { name: "tsp", multiplier: 5, description: "1 tsp = 5 mL" },
      { name: "fl oz", multiplier: 29.5735, description: "1 fl oz = 29.57 mL" },
    ],
    L: [
      { name: "mL", multiplier: 0.001, description: "1 mL = 0.001 L" },
      { name: "cup", multiplier: 0.24, description: "1 cup = 0.24 L" },
      { name: "gal", multiplier: 3.78541, description: "1 gal = 3.785 L" },
    ],
    pcs: [{ name: "dozen", multiplier: 12, description: "1 dozen = 12 pcs" }],
    each: [{ name: "dozen", multiplier: 12, description: "1 dozen = 12 each" }],
  };

  const seen = new Set<string>([baseUnit]);
  const units: Array<{ name: string; multiplier: number; description: string | null; isBase: boolean }> = [
    { name: baseUnit, multiplier: 1, description: "Base unit", isBase: true },
  ];

  // 1. Custom aliases always come first (highest priority)
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

  // 2. Use DB conversions when provided, otherwise fall back to hardcoded
  if (dbConversions) {
    // Filter conversions where the baseUnit is the "from" side,
    // giving us the multiplier to convert toUnit → baseUnit quantities.
    const relevant = dbConversions.filter((c) => c.fromUnitName === baseUnit);
    for (const conv of relevant) {
      if (!seen.has(conv.toUnitName)) {
        seen.add(conv.toUnitName);
        units.push({
          name: conv.toUnitName,
          multiplier: conv.factor,
          description: `1 ${conv.toUnitName} = ${conv.factor} ${baseUnit}`,
          isBase: false,
        });
      }
    }
  } else {
    const conversions = STANDARD_CONVERSIONS[baseUnit];
    if (conversions) {
      for (const conv of conversions) {
        if (!seen.has(conv.name)) {
          seen.add(conv.name);
          units.push({ name: conv.name, multiplier: conv.multiplier, description: conv.description, isBase: false });
        }
      }
    }
  }

  return units;
}
