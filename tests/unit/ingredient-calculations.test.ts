/**
 * Unit Tests: Ingredient Unit System Calculations
 * Normalized schema: data-driven units, base-unit stock, weighted avg cost
 */

import { describe, test, expect } from "vitest";
import {
  calculateStockStatus,
  calculateStockRatio,
  calculateWeightedAvgCost,
  convertUnits,
  computeBaseUnitsPerVariant,
  formatCurrency,
  formatStockDisplay,
  ingredientFormSchema,
  purchaseVariantSchema,
  getAvailableUnits,
  // Legacy compat
  calculateCostPerBaseUnit,
  calculateTotalBaseUnits,
  formatDualUnitDisplay,
} from "@/lib/ingredient-utils";
import type { UnitConversion } from "@/types/ingredient";

// ═══════════════════════════════════════════════════════════════════════════════
// Unit Conversions
// ═══════════════════════════════════════════════════════════════════════════════

// Test conversions matching the seed data
const testConversions: UnitConversion[] = [
  // kg(2) ↔ g(1)
  { id: 1, fromUnitId: 2, toUnitId: 1, factor: 1000 },
  { id: 2, fromUnitId: 1, toUnitId: 2, factor: 0.001 },
  // L(6) ↔ mL(5)
  { id: 3, fromUnitId: 6, toUnitId: 5, factor: 1000 },
  { id: 4, fromUnitId: 5, toUnitId: 6, factor: 0.001 },
  // lb(4) ↔ g(1)
  { id: 5, fromUnitId: 4, toUnitId: 1, factor: 453.592 },
  { id: 6, fromUnitId: 1, toUnitId: 4, factor: 0.002205 },
  // oz(3) ↔ g(1)
  { id: 7, fromUnitId: 3, toUnitId: 1, factor: 28.3495 },
  { id: 8, fromUnitId: 1, toUnitId: 3, factor: 0.035274 },
  // cup(8) ↔ mL(5)
  { id: 9, fromUnitId: 8, toUnitId: 5, factor: 240 },
  { id: 10, fromUnitId: 5, toUnitId: 8, factor: 0.004167 },
  // dozen(14) ↔ pcs(12)
  { id: 11, fromUnitId: 14, toUnitId: 12, factor: 12 },
  { id: 12, fromUnitId: 12, toUnitId: 14, factor: 0.083333 },
];

describe("Unit Conversion", () => {
  describe("convertUnits", () => {
    test("same unit returns identity", () => {
      expect(convertUnits(5, 2, 2, testConversions)).toBe(5);
    });

    test("direct conversion: kg → g", () => {
      expect(convertUnits(2, 2, 1, testConversions)).toBe(2000);
    });

    test("direct conversion: g → kg", () => {
      expect(convertUnits(500, 1, 2, testConversions)).toBe(0.5);
    });

    test("direct conversion: L → mL", () => {
      expect(convertUnits(1.5, 6, 5, testConversions)).toBe(1500);
    });

    test("direct conversion: dozen → pcs", () => {
      expect(convertUnits(2, 14, 12, testConversions)).toBe(24);
    });

    test("transitive conversion: oz → kg (via g)", () => {
      // oz(3) → g(1) → kg(2)
      const result = convertUnits(16, 3, 2, testConversions);
      expect(result).not.toBeNull();
      expect(result!).toBeCloseTo(0.4536, 2);
    });

    test("transitive conversion: lb → kg (via g)", () => {
      const result = convertUnits(1, 4, 2, testConversions);
      expect(result).not.toBeNull();
      expect(result!).toBeCloseTo(0.4536, 2);
    });

    test("returns null for incompatible dimensions", () => {
      // kg(2) → mL(5) — no conversion path
      expect(convertUnits(1, 2, 5, testConversions)).toBeNull();
    });
  });

  describe("computeBaseUnitsPerVariant", () => {
    test("same units: 1 kg variant for kg-based ingredient", () => {
      // 1 kg content, 1 package, base unit = kg
      expect(computeBaseUnitsPerVariant(1, 2, 2, 1, testConversions)).toBe(1);
    });

    test("conversion needed: 500mL bottle for L-based ingredient", () => {
      // 500 mL content → 0.5 L, base unit = L(6)
      expect(computeBaseUnitsPerVariant(500, 5, 6, 1, testConversions)).toBeCloseTo(0.5, 2);
    });

    test("case of 24: 500mL × 24", () => {
      // 500mL content, 24 per case, base = L
      const result = computeBaseUnitsPerVariant(500, 5, 6, 24, testConversions);
      expect(result).toBeCloseTo(12, 1); // 12 L
    });

    test("simple count: 1 bottle per variant, base = each", () => {
      // 1 each content, base = each(13)
      expect(computeBaseUnitsPerVariant(1, 13, 13, 1, testConversions)).toBe(1);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Weighted Average Cost
// ═══════════════════════════════════════════════════════════════════════════════

describe("Weighted Average Cost", () => {
  describe("calculateWeightedAvgCost", () => {
    test("first restock sets cost directly", () => {
      // Empty stock + 10 units @ ₱280/unit
      expect(calculateWeightedAvgCost(0, 0, 10, 280)).toBe(280);
    });

    test("equal quantities blend evenly", () => {
      // 10 @ ₱100 + 10 @ ₱200 = 20 @ ₱150
      expect(calculateWeightedAvgCost(10, 100, 10, 200)).toBe(150);
    });

    test("weighted toward larger stock", () => {
      // 90 @ ₱100 + 10 @ ₱200 = 100 @ ₱110
      expect(calculateWeightedAvgCost(90, 100, 10, 200)).toBe(110);
    });

    test("handles small addition to large stock", () => {
      // 1000 @ ₱50 + 1 @ ₱100 = 1001 @ ≈₱50.05
      const result = calculateWeightedAvgCost(1000, 50, 1, 100);
      expect(result).toBeCloseTo(50.05, 1);
    });

    test("handles zero current stock gracefully", () => {
      const result = calculateWeightedAvgCost(0, 0, 5, 300);
      expect(result).toBe(300);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stock Status Calculations
// ═══════════════════════════════════════════════════════════════════════════════

describe("Stock Status Calculations", () => {
  describe("calculateStockStatus", () => {
    test('returns "out" when stockQty is 0', () => {
      expect(calculateStockStatus(0, 10)).toBe("out");
    });

    test('returns "out" when stockQty is negative', () => {
      expect(calculateStockStatus(-1, 10)).toBe("out");
    });

    test('returns "critical" when below 25% of PAR', () => {
      expect(calculateStockStatus(2, 10)).toBe("critical");
    });

    test('returns "low" at exactly 25% of PAR', () => {
      expect(calculateStockStatus(2.5, 10)).toBe("low");
    });

    test('returns "low" when between 25-50% of PAR', () => {
      expect(calculateStockStatus(4, 10)).toBe("low");
    });

    test('returns "ok" at exactly 50% of PAR', () => {
      expect(calculateStockStatus(5, 10)).toBe("ok");
    });

    test('returns "ok" when above 50% of PAR', () => {
      expect(calculateStockStatus(7, 10)).toBe("ok");
      expect(calculateStockStatus(10, 10)).toBe("ok");
      expect(calculateStockStatus(15, 10)).toBe("ok");
    });

    test('returns "ok" when PAR level is 0 (no threshold)', () => {
      expect(calculateStockStatus(5, 0)).toBe("ok");
    });

    test('returns "out" for 0 stockQty regardless of PAR', () => {
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
      expect(calculateStockRatio(3.5, 10)).toBe(35);
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

  describe("formatStockDisplay", () => {
    test("discrete units round to integer", () => {
      expect(formatStockDisplay(28, "pcs", true)).toBe("28 pcs");
      expect(formatStockDisplay(28.7, "pcs", true)).toBe("29 pcs");
    });

    test("continuous units show decimals when fractional", () => {
      expect(formatStockDisplay(2.5, "kg", false)).toBe("2.50 kg");
    });

    test("whole numbers without trailing decimals", () => {
      expect(formatStockDisplay(10, "kg", false)).toBe("10 kg");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Zod Validation Schemas
// ═══════════════════════════════════════════════════════════════════════════════

describe("Ingredient Form Validation", () => {
  describe("ingredientFormSchema", () => {
    test("validates correct form data", () => {
      const validData = {
        name: "Ground Beef",
        category: "Protein",
        baseUnitId: 2,
        vendorId: null,
        parLevel: 10,
        countUnitId: null,
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
        baseUnitId: 2,
      };

      const result = ingredientFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    test("requires positive baseUnitId", () => {
      const data = {
        name: "Test",
        category: "Protein",
        baseUnitId: 0,
      };

      const result = ingredientFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    test("requires overheadPerTransaction when isOverhead is true", () => {
      const data = {
        name: "Gloves",
        category: "Supplies",
        baseUnitId: 12,
        vendorId: null,
        isOverhead: true,
        overheadPerTransaction: null,
      };

      const result = ingredientFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Usage rate required");
      }
    });
  });

  describe("purchaseVariantSchema", () => {
    test("validates correct variant data", () => {
      const validData = {
        label: "25kg sack",
        contentQty: 25,
        contentUnitId: 2,
        packageQty: 1,
        packageUnitId: 19,
        costPerVariant: 500,
      };

      const result = purchaseVariantSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test("requires label", () => {
      const data = {
        label: "",
        contentQty: 25,
        contentUnitId: 2,
        packageUnitId: 19,
        costPerVariant: 500,
      };

      const result = purchaseVariantSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    test("requires positive contentQty", () => {
      const data = {
        label: "sack",
        contentQty: 0,
        contentUnitId: 2,
        packageUnitId: 19,
        costPerVariant: 500,
      };

      const result = purchaseVariantSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Unit Availability (legacy compat)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Unit Availability", () => {
  describe("getAvailableUnits", () => {
    test("includes base unit first, then custom aliases, then standard conversions", () => {
      const aliases = [
        { name: "cup", baseUnitMultiplier: 240, description: "1 cup = 240 mL" },
      ];
      const result = getAvailableUnits("mL", aliases);

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result[0].name).toBe("mL");
      expect(result[0].isBase).toBe(true);
      expect(result[1].name).toBe("cup");
      expect(result[1].multiplier).toBe(240);
    });

    test("custom aliases take priority over standard conversions", () => {
      const aliases = [
        { name: "cup", baseUnitMultiplier: 240, description: null },
        { name: "tbsp", baseUnitMultiplier: 15, description: null },
      ];
      const result = getAvailableUnits("mL", aliases);
      const unitNames = result.map((u) => u.name);
      expect(unitNames).toContain("L");
      expect(unitNames).toContain("tsp");
    });

    test("includes standard conversions when no aliases exist", () => {
      const result = getAvailableUnits("pcs", []);
      expect(result[0].name).toBe("pcs");
      expect(result[0].isBase).toBe(true);
      const unitNames = result.map((u) => u.name);
      expect(unitNames).toContain("dozen");
    });

    test("uses DB conversions when provided instead of hardcoded", () => {
      const dbConversions = [
        { fromUnitName: "g", toUnitName: "kg", factor: 1000 },
        { fromUnitName: "g", toUnitName: "mg", factor: 0.001 },
        { fromUnitName: "mL", toUnitName: "L", factor: 1000 },
      ];
      const result = getAvailableUnits("g", [], dbConversions);
      const unitNames = result.map((u) => u.name);

      // Should include DB-provided conversions for "g"
      expect(unitNames).toContain("kg");
      expect(unitNames).toContain("mg");
      // Should NOT include hardcoded "oz" or "lb" since DB conversions were provided
      expect(unitNames).not.toContain("oz");
      expect(unitNames).not.toContain("lb");
    });

    test("DB conversions only include conversions from the base unit", () => {
      const dbConversions = [
        { fromUnitName: "g", toUnitName: "kg", factor: 1000 },
        { fromUnitName: "mL", toUnitName: "L", factor: 1000 },
      ];
      const result = getAvailableUnits("g", [], dbConversions);
      const unitNames = result.map((u) => u.name);

      expect(unitNames).toContain("kg");
      // mL→L conversion should not appear when base unit is "g"
      expect(unitNames).not.toContain("L");
    });

    test("custom aliases take priority over DB conversions", () => {
      const aliases = [
        { name: "kg", baseUnitMultiplier: 999, description: "custom kg" },
      ];
      const dbConversions = [
        { fromUnitName: "g", toUnitName: "kg", factor: 1000 },
        { fromUnitName: "g", toUnitName: "oz", factor: 28.3495 },
      ];
      const result = getAvailableUnits("g", aliases, dbConversions);

      // "kg" should use the alias multiplier, not the DB conversion
      const kgUnit = result.find((u) => u.name === "kg");
      expect(kgUnit?.multiplier).toBe(999);
      expect(kgUnit?.description).toBe("custom kg");

      // "oz" from DB should still be included
      const ozUnit = result.find((u) => u.name === "oz");
      expect(ozUnit?.multiplier).toBe(28.3495);
    });

    test("falls back to hardcoded conversions when dbConversions is undefined", () => {
      // Explicitly pass undefined to confirm fallback behavior
      const result = getAvailableUnits("mL", [], undefined);
      const unitNames = result.map((u) => u.name);
      expect(unitNames).toContain("L");
      expect(unitNames).toContain("tsp");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Legacy Compatibility Functions
// ═══════════════════════════════════════════════════════════════════════════════

describe("Legacy Compatibility", () => {
  describe("calculateCostPerBaseUnit", () => {
    test("calculates correctly", () => {
      expect(calculateCostPerBaseUnit(420, 8)).toBe(52.5);
    });

    test("throws for zero package size", () => {
      expect(() => calculateCostPerBaseUnit(420, 0)).toThrow();
    });
  });

  describe("calculateTotalBaseUnits", () => {
    test("calculates correctly", () => {
      expect(calculateTotalBaseUnits(3, 8)).toBe(24);
    });

    test("handles fractional packages", () => {
      expect(calculateTotalBaseUnits(3.5, 8)).toBe(28);
    });
  });

  describe("formatDualUnitDisplay", () => {
    test("shows dual units with conversion", () => {
      expect(formatDualUnitDisplay(3.5, 8, "pack", "pcs")).toBe("3.50 packs (28 pcs)");
    });

    test("shows single unit when same", () => {
      expect(formatDualUnitDisplay(2, 1, "kg", "kg")).toBe("2 kg");
    });
  });
});
