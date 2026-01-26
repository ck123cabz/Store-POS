import { describe, it, expect } from "vitest";
import {
  getStockStatus,
  getIngredientStockPercentage,
  getStockPercentageColor,
  type StockStatus,
  type ProductStockInfo,
} from "@/lib/stock-status";

describe("getStockStatus", () => {
  describe("trackStock = false scenarios", () => {
    // EC-03: Product has trackStock=false but quantity=0 (no out-of-stock indicator)
    it("returns ok status when trackStock is false regardless of quantity", () => {
      const product: ProductStockInfo = {
        quantity: 0,
        trackStock: false,
        parLevel: 10,
      };
      const result = getStockStatus(product);
      expect(result.status).toBe("ok");
      expect(result.isOutOfStock).toBe(false);
      expect(result.isLowStock).toBe(false);
    });

    it("ignores quantity when trackStock is disabled", () => {
      const product: ProductStockInfo = {
        quantity: -10,
        trackStock: false,
        parLevel: 5,
      };
      const result = getStockStatus(product);
      expect(result.status).toBe("ok");
    });
  });

  describe("out of stock scenarios", () => {
    it("returns out-of-stock when quantity is 0 and trackStock is true", () => {
      const product: ProductStockInfo = {
        quantity: 0,
        trackStock: true,
        parLevel: 10,
      };
      const result = getStockStatus(product);
      expect(result.status).toBe("out-of-stock");
      expect(result.isOutOfStock).toBe(true);
      expect(result.isLowStock).toBe(false);
    });

    it("returns out-of-stock when quantity is negative", () => {
      const product: ProductStockInfo = {
        quantity: -5,
        trackStock: true,
        parLevel: 10,
      };
      const result = getStockStatus(product);
      expect(result.status).toBe("out-of-stock");
      expect(result.isOutOfStock).toBe(true);
    });
  });

  describe("low stock scenarios", () => {
    it("returns low-stock when quantity is at or below parLevel", () => {
      const product: ProductStockInfo = {
        quantity: 5,
        trackStock: true,
        parLevel: 10,
      };
      const result = getStockStatus(product);
      expect(result.status).toBe("low-stock");
      expect(result.isLowStock).toBe(true);
      expect(result.isOutOfStock).toBe(false);
      expect(result.quantityLeft).toBe(5);
    });

    it("returns low-stock when quantity equals parLevel", () => {
      const product: ProductStockInfo = {
        quantity: 10,
        trackStock: true,
        parLevel: 10,
      };
      const result = getStockStatus(product);
      expect(result.status).toBe("low-stock");
      expect(result.isLowStock).toBe(true);
    });
  });

  describe("ok status scenarios", () => {
    it("returns ok when quantity is above parLevel", () => {
      const product: ProductStockInfo = {
        quantity: 50,
        trackStock: true,
        parLevel: 10,
      };
      const result = getStockStatus(product);
      expect(result.status).toBe("ok");
      expect(result.isOutOfStock).toBe(false);
      expect(result.isLowStock).toBe(false);
    });

    it("returns ok when parLevel is 0 (threshold disabled)", () => {
      const product: ProductStockInfo = {
        quantity: 5,
        trackStock: true,
        parLevel: 0,
      };
      const result = getStockStatus(product);
      expect(result.status).toBe("ok");
      expect(result.isLowStock).toBe(false);
    });

    it("returns ok when parLevel is undefined", () => {
      const product: ProductStockInfo = {
        quantity: 5,
        trackStock: true,
      };
      const result = getStockStatus(product);
      expect(result.status).toBe("ok");
      expect(result.isLowStock).toBe(false);
    });
  });
});

describe("getIngredientStockPercentage", () => {
  it("calculates percentage correctly", () => {
    expect(getIngredientStockPercentage(50, 100)).toBe(50);
    expect(getIngredientStockPercentage(25, 100)).toBe(25);
    expect(getIngredientStockPercentage(100, 100)).toBe(100);
  });

  it("returns 0 when current stock is 0", () => {
    expect(getIngredientStockPercentage(0, 100)).toBe(0);
  });

  it("returns 100 for percentage over 100", () => {
    expect(getIngredientStockPercentage(150, 100)).toBe(100);
  });

  it("handles parLevel of 0 gracefully", () => {
    expect(getIngredientStockPercentage(50, 0)).toBe(100);
  });
});

describe("getStockPercentageColor", () => {
  it("returns red classes for 0-25%", () => {
    expect(getStockPercentageColor(0)).toContain("red");
    expect(getStockPercentageColor(25)).toContain("red");
  });

  it("returns orange classes for 26-50%", () => {
    expect(getStockPercentageColor(26)).toContain("orange");
    expect(getStockPercentageColor(50)).toContain("orange");
  });

  it("returns yellow classes for 51-75%", () => {
    expect(getStockPercentageColor(51)).toContain("yellow");
    expect(getStockPercentageColor(75)).toContain("yellow");
  });

  it("returns green classes for 76-100%", () => {
    expect(getStockPercentageColor(76)).toContain("green");
    expect(getStockPercentageColor(100)).toContain("green");
  });
});
