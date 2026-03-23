/**
 * Unit Tests: Product Availability Calculation
 * Feature: 004-ingredient-unit-system
 *
 * Tests the product availability calculation utility that determines
 * how many products can be made based on ingredient stock levels.
 */

import { describe, test, expect } from "vitest";
import {
  calculateProductAvailability,
  calculateRecipeAvailability,
  calculatePossibleUnitsFromIngredient,
  getStatusFromCount,
  calculateBatchAvailability,
  getProductsNeedingAttention,
  type AvailabilityProduct,
  type AvailabilityRecipeItem,
  type AvailabilityIngredient,
} from "@/lib/product-availability";

// ═══════════════════════════════════════════════════════════════════════════════
// Test Fixtures
// ═══════════════════════════════════════════════════════════════════════════════

const createIngredient = (
  overrides: Partial<AvailabilityIngredient> = {}
): AvailabilityIngredient => ({
  id: 1,
  name: "Test Ingredient",
  quantity: 3, // 3 packages
  packageSize: 8, // 8 base units per package = 24 total base units
  ...overrides,
});

const createRecipeItem = (
  ingredient: AvailabilityIngredient,
  quantity: number
): AvailabilityRecipeItem => ({
  quantity,
  ingredient,
});

// ═══════════════════════════════════════════════════════════════════════════════
// Status Calculation Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe("getStatusFromCount", () => {
  test('returns "out" when count is 0', () => {
    expect(getStatusFromCount(0)).toBe("out");
  });

  test('returns "out" when count is negative', () => {
    expect(getStatusFromCount(-1)).toBe("out");
    expect(getStatusFromCount(-100)).toBe("out");
  });

  test('returns "critical" when count is 1-5', () => {
    expect(getStatusFromCount(1)).toBe("critical");
    expect(getStatusFromCount(3)).toBe("critical");
    expect(getStatusFromCount(5)).toBe("critical");
  });

  test('returns "low" when count is 6-20', () => {
    expect(getStatusFromCount(6)).toBe("low");
    expect(getStatusFromCount(10)).toBe("low");
    expect(getStatusFromCount(20)).toBe("low");
  });

  test('returns "available" when count is > 20', () => {
    expect(getStatusFromCount(21)).toBe("available");
    expect(getStatusFromCount(100)).toBe("available");
    expect(getStatusFromCount(1000)).toBe("available");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Ingredient Calculation Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe("calculatePossibleUnitsFromIngredient", () => {
  test("calculates correct possible units from stock", () => {
    const ingredient = createIngredient({
      quantity: 3, // 3 packages
      packageSize: 8, // 8 units per package = 24 total
    });

    // Recipe needs 2 units per product, so 24 / 2 = 12 possible products
    expect(calculatePossibleUnitsFromIngredient(ingredient, 2)).toBe(12);
  });

  test("floors fractional results", () => {
    const ingredient = createIngredient({
      quantity: 3, // 3 packages
      packageSize: 8, // 24 total units
    });

    // Recipe needs 5 units per product: 24 / 5 = 4.8, floored to 4
    expect(calculatePossibleUnitsFromIngredient(ingredient, 5)).toBe(4);
  });

  test("handles fractional package quantities", () => {
    const ingredient = createIngredient({
      quantity: 2.5, // 2.5 packages
      packageSize: 8, // 20 total units
    });

    // 20 / 4 = 5 possible products
    expect(calculatePossibleUnitsFromIngredient(ingredient, 4)).toBe(5);
  });

  test("returns 0 when stock is zero", () => {
    const ingredient = createIngredient({
      quantity: 0,
      packageSize: 8,
    });

    expect(calculatePossibleUnitsFromIngredient(ingredient, 2)).toBe(0);
  });

  test("returns Infinity when recipe quantity is 0", () => {
    const ingredient = createIngredient();
    expect(calculatePossibleUnitsFromIngredient(ingredient, 0)).toBe(Infinity);
  });

  test("returns Infinity when recipe quantity is negative", () => {
    const ingredient = createIngredient();
    expect(calculatePossibleUnitsFromIngredient(ingredient, -1)).toBe(Infinity);
  });

  test("handles 1:1 package to base unit ratio", () => {
    const ingredient = createIngredient({
      quantity: 5, // 5 kg
      packageSize: 1, // 1 kg per "package"
    });

    // Need 0.5 kg per product: 5 / 0.5 = 10 possible
    expect(calculatePossibleUnitsFromIngredient(ingredient, 0.5)).toBe(10);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Recipe-Based Product Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe("calculateRecipeAvailability", () => {
  test("calculates availability based on limiting ingredient", () => {
    const patties = createIngredient({
      id: 1,
      name: "Burger Patties",
      quantity: 3,
      packageSize: 8, // 24 total
    });

    const buns = createIngredient({
      id: 2,
      name: "Burger Buns",
      quantity: 2,
      packageSize: 6, // 12 total
    });

    const recipeItems = [
      createRecipeItem(patties, 1), // 1 patty per burger = 24 possible
      createRecipeItem(buns, 2), // 2 buns per burger = 6 possible (limiting!)
    ];

    const result = calculateRecipeAvailability(recipeItems);

    expect(result.status).toBe("low"); // 6 is in "low" range
    expect(result.maxProducible).toBe(6);
    expect(result.limitingIngredient).toEqual({
      id: 2,
      name: "Burger Buns",
    });
    expect(result.warnings).toEqual([]);
  });

  test("returns available status with null maxProducible for empty recipe", () => {
    const result = calculateRecipeAvailability([]);

    expect(result.status).toBe("available");
    expect(result.maxProducible).toBeNull();
    expect(result.limitingIngredient).toBeNull();
    expect(result.warnings).toEqual([]);
  });

  test("returns available status when no recipe items provided", () => {
    const result = calculateRecipeAvailability(
      undefined as unknown as AvailabilityRecipeItem[]
    );

    expect(result.status).toBe("available");
    expect(result.maxProducible).toBeNull();
  });

  test("returns out status when limiting ingredient has zero stock", () => {
    const ingredient = createIngredient({
      quantity: 0, // Out of stock
      packageSize: 8,
    });

    const result = calculateRecipeAvailability([
      createRecipeItem(ingredient, 1),
    ]);

    expect(result.status).toBe("out");
    expect(result.maxProducible).toBe(0);
  });

  test("handles single-ingredient recipes", () => {
    const ingredient = createIngredient({
      quantity: 5,
      packageSize: 10, // 50 total
    });

    const result = calculateRecipeAvailability([
      createRecipeItem(ingredient, 2), // 50 / 2 = 25 possible
    ]);

    expect(result.status).toBe("available"); // 25 > 20
    expect(result.maxProducible).toBe(25);
    expect(result.limitingIngredient).toEqual({
      id: 1,
      name: "Test Ingredient",
    });
  });

  test("adds warning for invalid package size", () => {
    const ingredient = createIngredient({
      name: "Bad Ingredient",
      packageSize: 0, // Invalid!
    });

    const result = calculateRecipeAvailability([
      createRecipeItem(ingredient, 1),
    ]);

    expect(result.warnings).toContain("Bad Ingredient: Invalid package size");
  });

  test("returns out with warning when all ingredients have errors", () => {
    const badIngredient = createIngredient({
      name: "Bad Ingredient",
      packageSize: -1, // Invalid
    });

    const result = calculateRecipeAvailability([
      createRecipeItem(badIngredient, 1),
    ]);

    expect(result.status).toBe("out");
    expect(result.maxProducible).toBe(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  test("handles complex multi-ingredient recipes", () => {
    // Sandwich with multiple ingredients
    const bread = createIngredient({
      id: 1,
      name: "Bread",
      quantity: 5,
      packageSize: 20, // 100 slices
    });
    const cheese = createIngredient({
      id: 2,
      name: "Cheese",
      quantity: 2,
      packageSize: 12, // 24 slices
    });
    const ham = createIngredient({
      id: 3,
      name: "Ham",
      quantity: 1,
      packageSize: 8, // 8 slices
    });

    const recipeItems = [
      createRecipeItem(bread, 2), // 100 / 2 = 50 possible
      createRecipeItem(cheese, 1), // 24 / 1 = 24 possible
      createRecipeItem(ham, 1), // 8 / 1 = 8 possible (limiting!)
    ];

    const result = calculateRecipeAvailability(recipeItems);

    expect(result.maxProducible).toBe(8);
    expect(result.status).toBe("low"); // 8 is in "low" range (6-20)
    expect(result.limitingIngredient?.name).toBe("Ham");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// Main Function Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe("calculateProductAvailability", () => {
  describe("Recipe-based products", () => {
    test("calculates availability from recipe items", () => {
      const product: AvailabilityProduct = {
        id: 1,
        name: "Burger",
        recipeItems: [
          createRecipeItem(
            createIngredient({
              id: 1,
              name: "Patty",
              quantity: 3,
              packageSize: 8, // 24 total
            }),
            1 // 24 possible
          ),
          createRecipeItem(
            createIngredient({
              id: 2,
              name: "Buns",
              quantity: 2,
              packageSize: 6, // 12 total
            }),
            2 // 6 possible (limiting)
          ),
        ],
      };

      const result = calculateProductAvailability(product);

      expect(result.maxProducible).toBe(6);
      expect(result.status).toBe("low");
      expect(result.limitingIngredient?.name).toBe("Buns");
    });

    test("calculates availability from single-ingredient recipe", () => {
      const product: AvailabilityProduct = {
        id: 2,
        name: "Bottled Water",
        recipeItems: [
          createRecipeItem(
            createIngredient({
              id: 5,
              name: "Water Bottles",
              quantity: 3,
              packageSize: 12, // 36 total
            }),
            1
          ),
        ],
      };

      const result = calculateProductAvailability(product);

      expect(result.maxProducible).toBe(36);
      expect(result.status).toBe("available");
      expect(result.limitingIngredient?.name).toBe("Water Bottles");
    });
  });

  describe("Products with no ingredients", () => {
    test("returns available with null maxProducible for products without ingredients", () => {
      const product: AvailabilityProduct = {
        id: 3,
        name: "Consultation Service",
        // No recipeItems
      };

      const result = calculateProductAvailability(product);

      expect(result.status).toBe("available");
      expect(result.maxProducible).toBeNull();
      expect(result.limitingIngredient).toBeNull();
      expect(result.warnings).toEqual([]);
    });

    test("returns available with null maxProducible for empty recipeItems", () => {
      const product: AvailabilityProduct = {
        id: 4,
        name: "Digital Download",
        recipeItems: [],
      };

      const result = calculateProductAvailability(product);

      expect(result.status).toBe("available");
      expect(result.maxProducible).toBeNull();
    });

    test("handles undefined recipeItems", () => {
      const product: AvailabilityProduct = {
        id: 5,
        name: "Gift Card",
        recipeItems: undefined,
      };

      const result = calculateProductAvailability(product);

      expect(result.status).toBe("available");
      expect(result.maxProducible).toBeNull();
    });
  });

  describe("Edge cases", () => {
    test("handles zero stock correctly", () => {
      const product: AvailabilityProduct = {
        id: 6,
        name: "Out of Stock Burger",
        recipeItems: [
          createRecipeItem(
            createIngredient({
              quantity: 0, // No stock
              packageSize: 8,
            }),
            1
          ),
        ],
      };

      const result = calculateProductAvailability(product);

      expect(result.status).toBe("out");
      expect(result.maxProducible).toBe(0);
    });

    test("handles very small quantities", () => {
      const product: AvailabilityProduct = {
        id: 7,
        name: "Low Stock Item",
        recipeItems: [
          createRecipeItem(
            createIngredient({
              quantity: 0.1, // 0.1 packs
              packageSize: 10, // 1 total base unit
            }),
            1
          ),
        ],
      };

      const result = calculateProductAvailability(product);

      expect(result.status).toBe("critical"); // 1 is critical
      expect(result.maxProducible).toBe(1);
    });

    test("handles missing ingredient in recipe item", () => {
      const product: AvailabilityProduct = {
        id: 8,
        name: "Broken Recipe",
        recipeItems: [
          {
            quantity: 1,
            ingredient: undefined as unknown as AvailabilityIngredient,
          },
        ],
      };

      const result = calculateProductAvailability(product);

      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test("handles large stock quantities", () => {
      const product: AvailabilityProduct = {
        id: 9,
        name: "Well Stocked Item",
        recipeItems: [
          createRecipeItem(
            createIngredient({
              quantity: 1000,
              packageSize: 100, // 100,000 total
            }),
            1
          ),
        ],
      };

      const result = calculateProductAvailability(product);

      expect(result.status).toBe("available");
      expect(result.maxProducible).toBe(100000);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Batch Operation Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe("calculateBatchAvailability", () => {
  test("calculates availability for multiple products", () => {
    const products: AvailabilityProduct[] = [
      {
        id: 1,
        name: "Product A",
        recipeItems: [
          createRecipeItem(
            createIngredient({ quantity: 5, packageSize: 10 }), // 50 total
            1
          ),
        ],
      },
      {
        id: 2,
        name: "Product B",
        recipeItems: [
          createRecipeItem(
            createIngredient({ quantity: 0.5, packageSize: 6 }), // 3 total
            1
          ),
        ],
      },
      {
        id: 3,
        name: "Product C",
        // No ingredients
      },
    ];

    const results = calculateBatchAvailability(products);

    expect(results.size).toBe(3);
    expect(results.get(1)?.maxProducible).toBe(50);
    expect(results.get(2)?.maxProducible).toBe(3);
    expect(results.get(3)?.maxProducible).toBeNull();
  });

  test("returns empty map for empty array", () => {
    const results = calculateBatchAvailability([]);
    expect(results.size).toBe(0);
  });
});

describe("getProductsNeedingAttention", () => {
  test("returns products with out or critical status", () => {
    const products: AvailabilityProduct[] = [
      {
        id: 1,
        name: "Available Product",
        recipeItems: [
          createRecipeItem(createIngredient({ quantity: 10, packageSize: 10 }), 1), // 100 total - available
        ],
      },
      {
        id: 2,
        name: "Critical Product",
        recipeItems: [
          createRecipeItem(createIngredient({ quantity: 0.5, packageSize: 8 }), 1), // 4 total - critical
        ],
      },
      {
        id: 3,
        name: "Out of Stock Product",
        recipeItems: [
          createRecipeItem(createIngredient({ quantity: 0, packageSize: 10 }), 1), // Out
        ],
      },
      {
        id: 4,
        name: "Low Product",
        recipeItems: [
          createRecipeItem(createIngredient({ quantity: 1, packageSize: 15 }), 1), // 15 total - low
        ],
      },
    ];

    const results = getProductsNeedingAttention(products);

    expect(results.length).toBe(2);
    expect(results.map((r) => r.product.id)).toContain(2);
    expect(results.map((r) => r.product.id)).toContain(3);
    expect(results.map((r) => r.product.id)).not.toContain(1);
    expect(results.map((r) => r.product.id)).not.toContain(4);
  });

  test("returns empty array when no products need attention", () => {
    const products: AvailabilityProduct[] = [
      {
        id: 1,
        name: "Available Product",
        // No ingredients = always available
      },
    ];

    const results = getProductsNeedingAttention(products);

    expect(results.length).toBe(0);
  });

  test("includes availability data with each product", () => {
    const products: AvailabilityProduct[] = [
      {
        id: 1,
        name: "Out Product",
        recipeItems: [
          createRecipeItem(
            createIngredient({ id: 10, name: "Empty Ingredient", quantity: 0, packageSize: 10 }),
            1
          ),
        ],
      },
    ];

    const results = getProductsNeedingAttention(products);

    expect(results[0].availability.status).toBe("out");
    expect(results[0].availability.maxProducible).toBe(0);
    expect(results[0].availability.limitingIngredient?.name).toBe(
      "Empty Ingredient"
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Enhanced Recipe Availability Tests
// ═══════════════════════════════════════════════════════════════════════════════

import { calculateEnhancedRecipeAvailability } from "@/lib/product-availability";

describe("calculateEnhancedRecipeAvailability", () => {
  test("returns all missing ingredients when multiple are out", () => {
    const recipeItems: AvailabilityRecipeItem[] = [
      {
        quantity: 2,
        ingredient: { id: 1, name: "Buns", quantity: 0, packageSize: 8 },
      },
      {
        quantity: 1,
        ingredient: { id: 2, name: "Patty", quantity: 0, packageSize: 4 },
      },
      {
        quantity: 1,
        ingredient: { id: 3, name: "Lettuce", quantity: 5, packageSize: 1 },
      },
    ];

    const result = calculateEnhancedRecipeAvailability(recipeItems);

    expect(result.status).toBe("out");
    expect(result.missingIngredients).toHaveLength(2);
    expect(result.missingIngredients[0].name).toBe("Buns");
    expect(result.missingIngredients[0].needPerUnit).toBe(2);
    expect(result.missingIngredients[1].name).toBe("Patty");
    expect(result.lowIngredients).toHaveLength(0);
  });

  test("returns low ingredients with per-unit info", () => {
    const recipeItems: AvailabilityRecipeItem[] = [
      {
        quantity: 2,
        ingredient: { id: 1, name: "Buns", quantity: 1, packageSize: 8 }, // 8 base = 4 products
      },
      {
        quantity: 1,
        ingredient: { id: 2, name: "Patty", quantity: 5, packageSize: 4 }, // 20 base = 20 products
      },
    ];

    const result = calculateEnhancedRecipeAvailability(recipeItems);

    expect(result.status).toBe("critical");
    expect(result.maxProducible).toBe(4);
    expect(result.missingIngredients).toHaveLength(0);
    // Both ingredients are "low" since both can make <= 20 units (4 and 20 respectively)
    expect(result.lowIngredients).toHaveLength(2);
    expect(result.lowIngredients[0]).toEqual({
      id: 1,
      name: "Buns",
      have: 8,
      needPerUnit: 2,
      status: "low",
    });
    expect(result.lowIngredients[1]).toEqual({
      id: 2,
      name: "Patty",
      have: 20,
      needPerUnit: 1,
      status: "low",
    });
    expect(result.limitingIngredientDetails).toEqual({
      id: 1,
      name: "Buns",
      have: 8,
      needPerUnit: 2,
      status: "low",
    });
  });
});
