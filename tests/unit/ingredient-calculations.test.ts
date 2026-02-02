/**
 * Unit Tests: Ingredient Unit System Calculations
 * Feature: 004-ingredient-unit-system
 *
 * Tests cost calculation, stock status, and display formatting functions.
 * Following TDD approach - these tests drive the implementation.
 */

import { describe, test, expect } from "vitest";
import {
  calculateCostPerBaseUnit,
  calculateTotalBaseUnits,
  calculateRecipeCost,
  calculateStockStatus,
  calculateStockRatio,
  getLowStockPriority,
  formatCurrency,
  formatDualUnitDisplay,
  formatPackageEquivalent,
  getEffectiveCostPerBaseUnit,
  getEffectiveUnit,
  isUsingNewUnitSystem,
  isSameUnit,
  ingredientFormSchema,
} from "@/lib/ingredient-utils";

// ═══════════════════════════════════════════════════════════════════════════════
// Cost Calculations
// ═══════════════════════════════════════════════════════════════════════════════

describe("Cost Calculations", () => {
  describe("calculateCostPerBaseUnit", () => {
    test("calculates cost per piece correctly", () => {
      // ₱420 per pack / 8 pcs per pack = ₱52.50 per piece
      const result = calculateCostPerBaseUnit(420, 8);
      expect(result).toBe(52.5);
    });

    test("handles decimal package sizes", () => {
      // ₱270 per kg / 0.5 kg portions = ₱540 per portion
      const result = calculateCostPerBaseUnit(270, 0.5);
      expect(result).toBe(540);
    });

    test("handles same-unit conversion (packageSize = 1)", () => {
      // ₱135 per liter / 1 liter = ₱135 per liter
      const result = calculateCostPerBaseUnit(135, 1);
      expect(result).toBe(135);
    });

    test("handles large package sizes", () => {
      // ₱1000 per sack / 50 kg = ₱20 per kg
      const result = calculateCostPerBaseUnit(1000, 50);
      expect(result).toBe(20);
    });

    test("maintains precision for recurring decimals", () => {
      // ₱100 / 3 = ₱33.333...
      const result = calculateCostPerBaseUnit(100, 3);
      expect(result).toBeCloseTo(33.333, 2);
    });

    test("throws error for zero package size", () => {
      expect(() => calculateCostPerBaseUnit(420, 0)).toThrow(
        "Package size must be greater than 0"
      );
    });

    test("throws error for negative package size", () => {
      expect(() => calculateCostPerBaseUnit(420, -1)).toThrow(
        "Package size must be greater than 0"
      );
    });

    test("handles zero cost (free items)", () => {
      const result = calculateCostPerBaseUnit(0, 8);
      expect(result).toBe(0);
    });
  });

  describe("calculateTotalBaseUnits", () => {
    test("calculates total base units from whole packages", () => {
      // 3 packs × 8 pcs/pack = 24 pcs
      const result = calculateTotalBaseUnits(3, 8);
      expect(result).toBe(24);
    });

    test("handles fractional packages", () => {
      // 3.5 packs × 8 pcs/pack = 28 pcs
      const result = calculateTotalBaseUnits(3.5, 8);
      expect(result).toBe(28);
    });

    test("handles zero quantity", () => {
      const result = calculateTotalBaseUnits(0, 8);
      expect(result).toBe(0);
    });

    test("handles decimal base units (weight)", () => {
      // 2.5 kg packs × 1 kg/pack = 2.5 kg
      const result = calculateTotalBaseUnits(2.5, 1);
      expect(result).toBe(2.5);
    });

    test("handles very small fractions", () => {
      // 0.125 pack × 8 pcs = 1 pc
      const result = calculateTotalBaseUnits(0.125, 8);
      expect(result).toBe(1);
    });
  });

  describe("calculateRecipeCost", () => {
    test("calculates cost for whole units", () => {
      // 2 pcs × ₱52.50 per pc = ₱105.00
      const result = calculateRecipeCost(2, 52.5);
      expect(result).toBe(105);
    });

    test("handles fractional quantities", () => {
      // 0.5 kg × ₱270 per kg = ₱135.00
      const result = calculateRecipeCost(0.5, 270);
      expect(result).toBe(135);
    });

    test("handles zero quantity", () => {
      const result = calculateRecipeCost(0, 52.5);
      expect(result).toBe(0);
    });

    test("handles very small quantities", () => {
      // 0.01 g × ₱50 per g = ₱0.50
      const result = calculateRecipeCost(0.01, 50);
      expect(result).toBeCloseTo(0.5, 2);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stock Status Calculations
// ═══════════════════════════════════════════════════════════════════════════════

describe("Stock Status Calculations", () => {
  describe("calculateStockStatus", () => {
    test('returns "out" when quantity is 0', () => {
      expect(calculateStockStatus(0, 10)).toBe("out");
    });

    test('returns "out" when quantity is negative', () => {
      expect(calculateStockStatus(-1, 10)).toBe("out");
    });

    test('returns "critical" when below 25% of PAR', () => {
      // 2 / 10 = 0.2 (20%) < 0.25 = critical
      expect(calculateStockStatus(2, 10)).toBe("critical");
    });

    test('returns "critical" at exactly 24% of PAR', () => {
      // 2.4 / 10 = 0.24 (24%) < 0.25 = critical
      expect(calculateStockStatus(2.4, 10)).toBe("critical");
    });

    test('returns "low" at exactly 25% of PAR', () => {
      // 2.5 / 10 = 0.25 (25%) >= 0.25 but < 0.5 = low
      expect(calculateStockStatus(2.5, 10)).toBe("low");
    });

    test('returns "low" when between 25-50% of PAR', () => {
      // 4 / 10 = 0.4 (40%) = low
      expect(calculateStockStatus(4, 10)).toBe("low");
    });

    test('returns "low" at 49% of PAR', () => {
      // 4.9 / 10 = 0.49 (49%) < 0.5 = low
      expect(calculateStockStatus(4.9, 10)).toBe("low");
    });

    test('returns "ok" at exactly 50% of PAR', () => {
      // 5 / 10 = 0.5 (50%) >= 0.5 = ok
      expect(calculateStockStatus(5, 10)).toBe("ok");
    });

    test('returns "ok" when above 50% of PAR', () => {
      expect(calculateStockStatus(7, 10)).toBe("ok");
      expect(calculateStockStatus(10, 10)).toBe("ok");
      expect(calculateStockStatus(15, 10)).toBe("ok");
    });

    test('returns "ok" when PAR level is 0 (no threshold)', () => {
      expect(calculateStockStatus(5, 0)).toBe("ok");
      expect(calculateStockStatus(1, 0)).toBe("ok");
    });

    test('returns "out" for 0 quantity regardless of PAR', () => {
      expect(calculateStockStatus(0, 0)).toBe("out");
    });
  });

  describe("calculateStockRatio", () => {
    test("returns percentage when PAR > 0", () => {
      expect(calculateStockRatio(5, 10)).toBe(50);
      expect(calculateStockRatio(10, 10)).toBe(100);
      expect(calculateStockRatio(15, 10)).toBe(150);
    });

    test("returns null when PAR is 0", () => {
      expect(calculateStockRatio(5, 0)).toBeNull();
    });

    test("rounds to nearest integer", () => {
      // 3.5 / 10 = 35%
      expect(calculateStockRatio(3.5, 10)).toBe(35);
      // 7.777 / 10 = 78%
      expect(calculateStockRatio(7.777, 10)).toBe(78);
    });

    test("returns 0 when quantity is 0", () => {
      expect(calculateStockRatio(0, 10)).toBe(0);
    });
  });

  describe("getLowStockPriority", () => {
    test('returns "critical" for 0 ratio', () => {
      expect(getLowStockPriority(0)).toBe("critical");
    });

    test('returns "high" for ratio < 0.25', () => {
      expect(getLowStockPriority(0.1)).toBe("high");
      expect(getLowStockPriority(0.24)).toBe("high");
    });

    test('returns "medium" for ratio 0.25-0.5', () => {
      expect(getLowStockPriority(0.25)).toBe("medium");
      expect(getLowStockPriority(0.4)).toBe("medium");
      expect(getLowStockPriority(0.49)).toBe("medium");
    });

    test('returns "low" for ratio >= 0.5', () => {
      expect(getLowStockPriority(0.5)).toBe("low");
      expect(getLowStockPriority(0.9)).toBe("low");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Display Formatting
// ═══════════════════════════════════════════════════════════════════════════════

describe("Display Formatting", () => {
  describe("formatCurrency", () => {
    test("formats currency with peso sign", () => {
      expect(formatCurrency(52.5)).toBe("₱52.50");
    });

    test("formats whole numbers with decimals", () => {
      expect(formatCurrency(100)).toBe("₱100.00");
    });

    test("handles custom decimal places", () => {
      expect(formatCurrency(52.567, 3)).toBe("₱52.567");
      expect(formatCurrency(52.567, 0)).toBe("₱53");
    });

    test("handles zero", () => {
      expect(formatCurrency(0)).toBe("₱0.00");
    });
  });

  describe("formatDualUnitDisplay", () => {
    test("shows dual units with conversion", () => {
      // 3.5 packs × 8 pcs/pack = 28 pcs
      const result = formatDualUnitDisplay(3.5, 8, "pack", "pcs");
      expect(result).toBe("3.50 packs (28 pcs)");
    });

    test("shows single unit when packageUnit equals baseUnit", () => {
      // Same unit, no conversion needed
      const result = formatDualUnitDisplay(2, 1, "kg", "kg");
      expect(result).toBe("2 kg");
    });

    test("shows single unit when packageSize is 1", () => {
      // packageSize 1 = no conversion
      const result = formatDualUnitDisplay(5, 1, "bottle", "bottle");
      expect(result).toBe("5 bottles");
    });

    test("handles whole numbers without trailing decimals", () => {
      const result = formatDualUnitDisplay(3, 8, "pack", "pcs");
      expect(result).toBe("3 packs (24 pcs)");
    });

    test("pluralizes units correctly for single quantity", () => {
      const result = formatDualUnitDisplay(1, 8, "pack", "pcs");
      expect(result).toBe("1 pack (8 pcs)");
    });

    test("handles fractional base units", () => {
      // 1.5 bottles × 500 mL/bottle = 750 mL
      const result = formatDualUnitDisplay(1.5, 500, "bottle", "mL");
      expect(result).toBe("1.50 bottles (750 mL)");
    });
  });

  describe("formatPackageEquivalent", () => {
    test("shows fraction of package", () => {
      // 2 pcs out of 8-pc pack = 0.25 pack
      const result = formatPackageEquivalent(2, 8, "pack");
      expect(result).toBe("0.25 packs");
    });

    test("handles whole packages", () => {
      // 8 pcs = 1 pack
      const result = formatPackageEquivalent(8, 8, "pack");
      expect(result).toBe("1.00 pack");
    });

    test("handles zero base units", () => {
      const result = formatPackageEquivalent(0, 8, "pack");
      expect(result).toBe("0.00 packs");
    });

    test("returns empty for invalid packageSize", () => {
      expect(formatPackageEquivalent(5, 0, "pack")).toBe("");
      expect(formatPackageEquivalent(5, -1, "pack")).toBe("");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Backward Compatibility
// ═══════════════════════════════════════════════════════════════════════════════

describe("Backward Compatibility", () => {
  describe("getEffectiveCostPerBaseUnit", () => {
    test("uses new unit system when available", () => {
      const ingredient = {
        costPerPackage: 420,
        packageSize: 8,
        costPerUnit: 100, // Legacy value ignored
      };
      expect(getEffectiveCostPerBaseUnit(ingredient)).toBe(52.5);
    });

    test("falls back to legacy costPerUnit", () => {
      const ingredient = {
        costPerUnit: 50,
        // No new unit system fields
      };
      expect(getEffectiveCostPerBaseUnit(ingredient)).toBe(50);
    });

    test("returns 0 for empty ingredient", () => {
      expect(getEffectiveCostPerBaseUnit({})).toBe(0);
    });

    test("ignores new system if packageSize is 0", () => {
      const ingredient = {
        costPerPackage: 420,
        packageSize: 0,
        costPerUnit: 50,
      };
      expect(getEffectiveCostPerBaseUnit(ingredient)).toBe(50);
    });
  });

  describe("getEffectiveUnit", () => {
    test("uses baseUnit when available", () => {
      const ingredient = { baseUnit: "pcs", unit: "pack" };
      expect(getEffectiveUnit(ingredient)).toBe("pcs");
    });

    test("falls back to legacy unit", () => {
      const ingredient = { unit: "kg" };
      expect(getEffectiveUnit(ingredient)).toBe("kg");
    });

    test("defaults to pcs", () => {
      expect(getEffectiveUnit({})).toBe("pcs");
    });
  });

  describe("isUsingNewUnitSystem", () => {
    test("returns true for complete new system data", () => {
      const ingredient = {
        packageSize: 8,
        costPerPackage: 420,
        baseUnit: "pcs",
      };
      expect(isUsingNewUnitSystem(ingredient)).toBe(true);
    });

    test("returns false for missing packageSize", () => {
      const ingredient = {
        costPerPackage: 420,
        baseUnit: "pcs",
      };
      expect(isUsingNewUnitSystem(ingredient)).toBe(false);
    });

    test("returns false for packageSize = 0", () => {
      const ingredient = {
        packageSize: 0,
        costPerPackage: 420,
        baseUnit: "pcs",
      };
      expect(isUsingNewUnitSystem(ingredient)).toBe(false);
    });

    test("returns false for legacy-only data", () => {
      const ingredient = {
        unit: "kg",
        costPerUnit: 50,
      };
      expect(isUsingNewUnitSystem(ingredient)).toBe(false);
    });
  });

  describe("isSameUnit", () => {
    test("returns true for identical units", () => {
      expect(isSameUnit("kg", "kg")).toBe(true);
      expect(isSameUnit("pcs", "pcs")).toBe(true);
    });

    test("returns false for different units", () => {
      expect(isSameUnit("pack", "pcs")).toBe(false);
      expect(isSameUnit("bottle", "mL")).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Zod Validation Schema
// ═══════════════════════════════════════════════════════════════════════════════

describe("Ingredient Form Validation", () => {
  describe("ingredientFormSchema", () => {
    test("validates correct form data", () => {
      const validData = {
        name: "Burger Patties",
        category: "Protein",
        vendorId: null,
        packageUnit: "pack",
        costPerPackage: 420,
        baseUnit: "pcs",
        packageSize: 8,
        quantity: 3.5,
        parLevel: 2,
        countByBaseUnit: false,
        sellable: false,
        sellPrice: null,
        isOverhead: false,
        overheadPerTransaction: null,
      };

      const result = ingredientFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test("requires name", () => {
      const data = {
        name: "",
        category: "Protein",
        packageUnit: "pack",
        costPerPackage: 420,
        baseUnit: "pcs",
        packageSize: 8,
      };

      const result = ingredientFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("name");
      }
    });

    test("rejects zero packageSize", () => {
      const data = {
        name: "Test",
        category: "Protein",
        vendorId: null,
        packageUnit: "pack",
        costPerPackage: 420,
        baseUnit: "pcs",
        packageSize: 0, // Invalid!
      };

      const result = ingredientFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("packageSize");
      }
    });

    test("rejects negative packageSize", () => {
      const data = {
        name: "Test",
        category: "Protein",
        vendorId: null,
        packageUnit: "pack",
        costPerPackage: 420,
        baseUnit: "pcs",
        packageSize: -1, // Invalid!
      };

      const result = ingredientFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    test("requires sellPrice when sellable is true", () => {
      const data = {
        name: "Test",
        category: "Protein",
        vendorId: null,
        packageUnit: "pack",
        costPerPackage: 420,
        baseUnit: "pcs",
        packageSize: 8,
        sellable: true,
        sellPrice: null, // Invalid! Required when sellable
      };

      const result = ingredientFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Sell price required");
      }
    });

    test("requires overheadPerTransaction when isOverhead is true", () => {
      const data = {
        name: "Test",
        category: "Protein",
        vendorId: null,
        packageUnit: "pack",
        costPerPackage: 420,
        baseUnit: "pcs",
        packageSize: 8,
        isOverhead: true,
        overheadPerTransaction: null, // Invalid! Required when isOverhead
      };

      const result = ingredientFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Usage rate required");
      }
    });

    test("accepts sellable items with sellPrice", () => {
      const data = {
        name: "Test",
        category: "Protein",
        vendorId: null,
        packageUnit: "pack",
        costPerPackage: 420,
        baseUnit: "pcs",
        packageSize: 8,
        sellable: true,
        sellPrice: 50,
      };

      const result = ingredientFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    test("accepts overhead items with usage rate", () => {
      const data = {
        name: "Gloves",
        category: "Supplies",
        vendorId: null,
        packageUnit: "box",
        costPerPackage: 500,
        baseUnit: "pcs",
        packageSize: 100,
        isOverhead: true,
        overheadPerTransaction: 2,
      };

      const result = ingredientFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});
