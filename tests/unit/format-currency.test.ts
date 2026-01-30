import { describe, it, expect } from "vitest"
import { formatCurrency } from "@/lib/format-currency"

describe("formatCurrency", () => {
  describe("with default symbol ($)", () => {
    it("formats positive numbers with $ symbol", () => {
      expect(formatCurrency(123.45)).toBe("$123.45")
    })

    it("formats zero", () => {
      expect(formatCurrency(0)).toBe("$0.00")
    })

    it("formats negative numbers", () => {
      // toLocaleString places negative sign after symbol
      expect(formatCurrency(-50)).toBe("$-50.00")
    })

    it("handles string numbers", () => {
      expect(formatCurrency("99.99")).toBe("$99.99")
    })

    it("handles null values", () => {
      expect(formatCurrency(null)).toBe("$0.00")
    })

    it("handles undefined values", () => {
      expect(formatCurrency(undefined)).toBe("$0.00")
    })

    it("handles NaN input from invalid strings", () => {
      expect(formatCurrency("not a number")).toBe("$0.00")
    })
  })

  describe("with PHP peso symbol (₱)", () => {
    it("formats with peso symbol", () => {
      expect(formatCurrency(123.45, "₱")).toBe("₱123.45")
    })

    it("formats large numbers with thousands separator", () => {
      expect(formatCurrency(1234567.89, "₱")).toBe("₱1,234,567.89")
    })

    it("formats zero with peso symbol", () => {
      expect(formatCurrency(0, "₱")).toBe("₱0.00")
    })
  })

  describe("with other currency symbols", () => {
    it("formats with euro symbol", () => {
      expect(formatCurrency(50, "€")).toBe("€50.00")
    })

    it("formats with pound symbol", () => {
      expect(formatCurrency(75.5, "£")).toBe("£75.50")
    })

    it("formats with yen symbol", () => {
      expect(formatCurrency(1000, "¥")).toBe("¥1,000.00")
    })
  })

  describe("decimal precision", () => {
    it("rounds to 2 decimal places", () => {
      expect(formatCurrency(99.999)).toBe("$100.00")
    })

    it("pads single decimal to 2 places", () => {
      expect(formatCurrency(10.5)).toBe("$10.50")
    })

    it("handles whole numbers", () => {
      expect(formatCurrency(100)).toBe("$100.00")
    })
  })

  describe("with Decimal-like objects (Prisma)", () => {
    it("handles objects with toString method", () => {
      const decimalLike = { toString: () => "123.45" }
      expect(formatCurrency(decimalLike)).toBe("$123.45")
    })
  })
})
