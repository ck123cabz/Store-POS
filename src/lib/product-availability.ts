/**
 * Product Availability Calculation Utility
 * Feature: 004-ingredient-unit-system
 *
 * Calculates product availability based on ingredient stock levels.
 * Replaces manual trackStock toggle with automatic availability calculation.
 */

import { calculateTotalBaseUnits } from "@/lib/ingredient-utils";

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Availability status levels for products
 * - "available": > 20 can be produced
 * - "low": 6-20 can be produced
 * - "critical": 1-5 can be produced
 * - "out": 0 can be produced
 */
export type AvailabilityStatus = "available" | "low" | "critical" | "out";

/**
 * Limiting ingredient information
 */
export interface LimitingIngredient {
  id: number;
  name: string;
}

/**
 * Product availability calculation result
 */
export interface ProductAvailability {
  /** Current availability status */
  status: AvailabilityStatus;
  /** How many units can be made with current stock (null = unlimited) */
  maxProducible: number | null;
  /** Which ingredient limits production (null if unlimited or no ingredients) */
  limitingIngredient: LimitingIngredient | null;
  /** Any warnings to display */
  warnings: string[];
}

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

/**
 * Ingredient data needed for availability calculation
 */
export interface AvailabilityIngredient {
  id: number;
  name: string;
  quantity: number; // packages in stock
  packageSize: number; // base units per package
}

/**
 * Recipe item data needed for availability calculation
 */
export interface AvailabilityRecipeItem {
  quantity: number; // base units required per product
  ingredient: AvailabilityIngredient;
}

/**
 * Product data needed for availability calculation
 */
export interface AvailabilityProduct {
  id: number;
  name: string;
  recipeItems?: AvailabilityRecipeItem[];
  linkedIngredient?: AvailabilityIngredient | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Status Calculation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Determine availability status from max producible count
 *
 * @param maxProducible - Number of products that can be made
 * @returns AvailabilityStatus based on thresholds
 *
 * Thresholds:
 * - 0 = "out"
 * - 1-5 = "critical"
 * - 6-20 = "low"
 * - 21+ = "available"
 */
export function getStatusFromCount(maxProducible: number): AvailabilityStatus {
  if (maxProducible <= 0) return "out";
  if (maxProducible <= 5) return "critical";
  if (maxProducible <= 20) return "low";
  return "available";
}

// ═══════════════════════════════════════════════════════════════════════════════
// Core Calculation Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate how many products can be made from a single ingredient
 *
 * @param ingredient - The ingredient with stock data
 * @param recipeQuantity - Base units required per product
 * @returns Number of products that can be made (floored to whole number)
 */
export function calculatePossibleUnitsFromIngredient(
  ingredient: AvailabilityIngredient,
  recipeQuantity: number
): number {
  if (recipeQuantity <= 0) {
    // If recipe requires 0 of this ingredient, it's not limiting
    return Infinity;
  }

  const totalBaseUnits = calculateTotalBaseUnits(
    ingredient.quantity,
    ingredient.packageSize
  );

  return Math.floor(totalBaseUnits / recipeQuantity);
}

/**
 * Calculate product availability for a recipe-based product
 * (product with recipeItems)
 *
 * @param recipeItems - Array of recipe items with ingredients
 * @returns ProductAvailability result
 */
export function calculateRecipeAvailability(
  recipeItems: AvailabilityRecipeItem[]
): ProductAvailability {
  const warnings: string[] = [];

  // No recipe items means unlimited availability (not tied to ingredients)
  if (!recipeItems || recipeItems.length === 0) {
    return {
      status: "available",
      maxProducible: null,
      limitingIngredient: null,
      warnings: [],
    };
  }

  let minPossible = Infinity;
  let limitingIngredient: LimitingIngredient | null = null;

  for (const recipeItem of recipeItems) {
    const { ingredient, quantity: recipeQuantity } = recipeItem;

    // Skip if ingredient data is missing
    if (!ingredient) {
      warnings.push(`Recipe item missing ingredient data`);
      continue;
    }

    // Validate ingredient data
    if (ingredient.packageSize <= 0) {
      warnings.push(`${ingredient.name}: Invalid package size`);
      continue;
    }

    const possibleUnits = calculatePossibleUnitsFromIngredient(
      ingredient,
      recipeQuantity
    );

    // Track the limiting ingredient (lowest possible count)
    if (possibleUnits < minPossible) {
      minPossible = possibleUnits;
      limitingIngredient = {
        id: ingredient.id,
        name: ingredient.name,
      };
    }
  }

  // If all ingredients had errors, return out of stock with warnings
  if (minPossible === Infinity) {
    return {
      status: "out",
      maxProducible: 0,
      limitingIngredient: null,
      warnings:
        warnings.length > 0 ? warnings : ["No valid ingredients in recipe"],
    };
  }

  const maxProducible = minPossible;
  const status = getStatusFromCount(maxProducible);

  return {
    status,
    maxProducible,
    limitingIngredient,
    warnings,
  };
}

/**
 * Calculate product availability for a linked ingredient product
 * (1:1 mapping - product is sold directly from ingredient stock)
 *
 * @param linkedIngredient - The linked ingredient
 * @returns ProductAvailability result
 */
export function calculateLinkedIngredientAvailability(
  linkedIngredient: AvailabilityIngredient
): ProductAvailability {
  const warnings: string[] = [];

  // Validate ingredient data
  if (linkedIngredient.packageSize <= 0) {
    warnings.push(`${linkedIngredient.name}: Invalid package size`);
    return {
      status: "out",
      maxProducible: 0,
      limitingIngredient: {
        id: linkedIngredient.id,
        name: linkedIngredient.name,
      },
      warnings,
    };
  }

  // For 1:1 linked products, maxProducible is total base units
  const totalBaseUnits = calculateTotalBaseUnits(
    linkedIngredient.quantity,
    linkedIngredient.packageSize
  );
  const maxProducible = Math.floor(totalBaseUnits);
  const status = getStatusFromCount(maxProducible);

  return {
    status,
    maxProducible,
    limitingIngredient: {
      id: linkedIngredient.id,
      name: linkedIngredient.name,
    },
    warnings,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Entry Point
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate product availability based on ingredients
 *
 * Supports three scenarios:
 * 1. Products with recipeItems (recipes) - limited by lowest ingredient
 * 2. Products with linkedIngredient (1:1) - limited by ingredient stock
 * 3. Products with neither - always available (unlimited)
 *
 * @param product - Product with optional recipeItems and/or linkedIngredient
 * @returns ProductAvailability with status, max producible, and limiting info
 *
 * @example
 * // Recipe-based product
 * const burger = {
 *   id: 1,
 *   name: "Burger",
 *   recipeItems: [
 *     { quantity: 1, ingredient: { id: 1, name: "Patty", quantity: 3, packageSize: 8 } },
 *     { quantity: 2, ingredient: { id: 2, name: "Buns", quantity: 2, packageSize: 6 } },
 *   ]
 * };
 * calculateProductAvailability(burger);
 * // => { status: "available", maxProducible: 6, limitingIngredient: { id: 2, name: "Buns" }, warnings: [] }
 *
 * @example
 * // Linked ingredient product (sellable ingredient)
 * const bottledWater = {
 *   id: 2,
 *   name: "Bottled Water",
 *   linkedIngredient: { id: 3, name: "Water Bottles", quantity: 2, packageSize: 12 }
 * };
 * calculateProductAvailability(bottledWater);
 * // => { status: "available", maxProducible: 24, limitingIngredient: { id: 3, name: "Water Bottles" }, warnings: [] }
 *
 * @example
 * // Product with no ingredients (always available)
 * const service = { id: 3, name: "Consultation" };
 * calculateProductAvailability(service);
 * // => { status: "available", maxProducible: null, limitingIngredient: null, warnings: [] }
 */
export function calculateProductAvailability(
  product: AvailabilityProduct
): ProductAvailability {
  // Priority 1: Check recipe items (multi-ingredient products)
  if (product.recipeItems && product.recipeItems.length > 0) {
    return calculateRecipeAvailability(product.recipeItems);
  }

  // Priority 2: Check linked ingredient (1:1 sellable ingredients)
  if (product.linkedIngredient) {
    return calculateLinkedIngredientAvailability(product.linkedIngredient);
  }

  // Priority 3: No ingredient tracking - always available
  return {
    status: "available",
    maxProducible: null,
    limitingIngredient: null,
    warnings: [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Enhanced Recipe Availability
// ═══════════════════════════════════════════════════════════════════════════════

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

    // Track missing (0 stock)
    if (totalBaseUnits <= 0) {
      missingIngredients.push({
        id: ingredient.id,
        name: ingredient.name,
        have: 0,
        needPerUnit: recipeQuantity,
        status: "missing",
      });
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

  // Build low ingredients list only if we're not completely out
  // (if missing ingredients exist, low ingredients don't matter)
  if (missingIngredients.length === 0) {
    for (const recipeItem of recipeItems) {
      const { ingredient, quantity: recipeQuantity } = recipeItem;
      if (!ingredient || ingredient.packageSize <= 0 || recipeQuantity <= 0) continue;

      const totalBaseUnits = calculateTotalBaseUnits(
        ingredient.quantity,
        ingredient.packageSize
      );

      // Skip if no stock
      if (totalBaseUnits <= 0) continue;

      const possibleUnits = Math.floor(totalBaseUnits / recipeQuantity);

      // Consider "low" if this ingredient can only make 20 or fewer units
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
  }

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

// ═══════════════════════════════════════════════════════════════════════════════
// Batch Operations
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate availability for multiple products at once
 *
 * @param products - Array of products to calculate availability for
 * @returns Map of product ID to availability
 */
export function calculateBatchAvailability(
  products: AvailabilityProduct[]
): Map<number, ProductAvailability> {
  const results = new Map<number, ProductAvailability>();

  for (const product of products) {
    results.set(product.id, calculateProductAvailability(product));
  }

  return results;
}

/**
 * Get products that are out of stock or critically low
 *
 * @param products - Array of products to check
 * @returns Products that need attention (out or critical status)
 */
export function getProductsNeedingAttention(
  products: AvailabilityProduct[]
): Array<{ product: AvailabilityProduct; availability: ProductAvailability }> {
  return products
    .map((product) => ({
      product,
      availability: calculateProductAvailability(product),
    }))
    .filter(
      ({ availability }) =>
        availability.status === "out" || availability.status === "critical"
    );
}
