/**
 * Unit Tests: Credit Limit Validation
 * US3: Tab Payment (Store Credit) at POS
 * Tests credit limit enforcement and validation logic
 */

import { describe, it, expect } from "vitest"
import {
  validateTabPayment,
  calculateCreditUsage,
  isCreditLimitExceeded,
  getCreditWarningLevel,
  type TabPaymentValidation,
  type CreditWarningLevel,
} from "@/lib/credit-limit-validation"

describe("Credit Limit Validation", () => {
  describe("validateTabPayment", () => {
    it("allows payment when within credit limit", () => {
      const result = validateTabPayment({
        amount: 100,
        currentBalance: 200,
        creditLimit: 500,
        tabStatus: "active",
      })

      expect(result.valid).toBe(true)
      expect(result.newBalance).toBe(300)
      expect(result.error).toBeUndefined()
    })

    it("rejects payment when it would exceed credit limit", () => {
      const result = validateTabPayment({
        amount: 400,
        currentBalance: 200,
        creditLimit: 500,
        tabStatus: "active",
      })

      expect(result.valid).toBe(false)
      expect(result.error).toContain("exceed")
      expect(result.wouldExceedBy).toBe(100)
    })

    it("allows payment exactly at credit limit", () => {
      const result = validateTabPayment({
        amount: 300,
        currentBalance: 200,
        creditLimit: 500,
        tabStatus: "active",
      })

      expect(result.valid).toBe(true)
      expect(result.newBalance).toBe(500)
    })

    it("rejects payment when tab is suspended", () => {
      const result = validateTabPayment({
        amount: 100,
        currentBalance: 0,
        creditLimit: 500,
        tabStatus: "suspended",
      })

      expect(result.valid).toBe(false)
      expect(result.error).toContain("suspended")
    })

    it("rejects payment when tab is frozen", () => {
      const result = validateTabPayment({
        amount: 100,
        currentBalance: 0,
        creditLimit: 500,
        tabStatus: "frozen",
      })

      expect(result.valid).toBe(false)
      expect(result.error).toContain("frozen")
    })

    it("allows override when specified (for managers)", () => {
      const result = validateTabPayment({
        amount: 400,
        currentBalance: 200,
        creditLimit: 500,
        tabStatus: "active",
        allowOverride: true,
      })

      expect(result.valid).toBe(true)
      expect(result.newBalance).toBe(600)
      expect(result.overrideApplied).toBe(true)
    })

    it("handles zero credit limit (no credit allowed)", () => {
      const result = validateTabPayment({
        amount: 100,
        currentBalance: 0,
        creditLimit: 0,
        tabStatus: "active",
      })

      expect(result.valid).toBe(false)
      expect(result.error).toContain("no credit")
    })

    it("handles negative amounts", () => {
      const result = validateTabPayment({
        amount: -50,
        currentBalance: 200,
        creditLimit: 500,
        tabStatus: "active",
      })

      expect(result.valid).toBe(false)
      expect(result.error).toContain("positive")
    })
  })

  describe("calculateCreditUsage", () => {
    it("calculates usage percentage correctly", () => {
      expect(calculateCreditUsage(250, 500)).toBe(50)
      expect(calculateCreditUsage(400, 500)).toBe(80)
      expect(calculateCreditUsage(500, 500)).toBe(100)
    })

    it("handles zero credit limit", () => {
      expect(calculateCreditUsage(0, 0)).toBe(0)
      expect(calculateCreditUsage(100, 0)).toBe(Infinity)
    })

    it("rounds to 2 decimal places", () => {
      expect(calculateCreditUsage(333, 1000)).toBe(33.3)
    })
  })

  describe("isCreditLimitExceeded", () => {
    it("returns true when balance exceeds limit", () => {
      expect(isCreditLimitExceeded(600, 500)).toBe(true)
    })

    it("returns false when balance equals limit", () => {
      expect(isCreditLimitExceeded(500, 500)).toBe(false)
    })

    it("returns false when balance is under limit", () => {
      expect(isCreditLimitExceeded(400, 500)).toBe(false)
    })
  })

  describe("getCreditWarningLevel", () => {
    it("returns 'ok' when under 80% usage", () => {
      expect(getCreditWarningLevel(300, 500)).toBe("ok")
      expect(getCreditWarningLevel(390, 500)).toBe("ok")
    })

    it("returns 'warning' when at or over 80% but under 100%", () => {
      expect(getCreditWarningLevel(400, 500)).toBe("warning")
      expect(getCreditWarningLevel(450, 500)).toBe("warning")
      expect(getCreditWarningLevel(499, 500)).toBe("warning")
    })

    it("returns 'exceeded' when at or over 100%", () => {
      expect(getCreditWarningLevel(500, 500)).toBe("exceeded")
      expect(getCreditWarningLevel(600, 500)).toBe("exceeded")
    })

    it("handles zero credit limit", () => {
      expect(getCreditWarningLevel(0, 0)).toBe("ok")
      expect(getCreditWarningLevel(100, 0)).toBe("exceeded")
    })
  })
})

describe("Tab Payment Edge Cases", () => {
  it("handles very large amounts", () => {
    const result = validateTabPayment({
      amount: 999999.99,
      currentBalance: 0,
      creditLimit: 1000000,
      tabStatus: "active",
    })

    expect(result.valid).toBe(true)
    expect(result.newBalance).toBe(999999.99)
  })

  it("handles decimal precision", () => {
    const result = validateTabPayment({
      amount: 10.01,
      currentBalance: 489.99,
      creditLimit: 500,
      tabStatus: "active",
    })

    expect(result.valid).toBe(true)
    expect(result.newBalance).toBe(500)
  })

  it("handles floating point edge cases", () => {
    // 0.1 + 0.2 should equal 0.3, not 0.30000000000000004
    const result = validateTabPayment({
      amount: 0.1,
      currentBalance: 0.2,
      creditLimit: 0.3,
      tabStatus: "active",
    })

    expect(result.valid).toBe(true)
    expect(result.newBalance).toBeCloseTo(0.3, 2)
  })
})
