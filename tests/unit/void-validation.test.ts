import { describe, it, expect } from "vitest"
import {
  validateVoidReason,
  validateVoidWindow,
  validateNotAlreadyVoided,
  VOID_WINDOW_DAYS,
} from "@/lib/void-validation"

describe("Void Validation", () => {
  describe("validateVoidReason", () => {
    it("accepts valid predefined reasons", () => {
      expect(validateVoidReason("Wrong Items")).toEqual({ valid: true })
      expect(validateVoidReason("Test Transaction")).toEqual({ valid: true })
      expect(validateVoidReason("Customer Dispute")).toEqual({ valid: true })
      expect(validateVoidReason("Duplicate Entry")).toEqual({ valid: true })
    })

    it("accepts Other with custom reason", () => {
      expect(validateVoidReason("Other", "Manager approved exception")).toEqual({ valid: true })
    })

    it("rejects invalid reason", () => {
      const result = validateVoidReason("Invalid Reason")
      expect(result.valid).toBe(false)
      if (!result.valid) expect(result.error).toBe("Invalid void reason")
    })

    it("rejects Other without custom reason", () => {
      const result = validateVoidReason("Other")
      expect(result.valid).toBe(false)
      if (!result.valid) expect(result.error).toBe("Custom reason required when selecting 'Other'")
    })

    it("rejects Other with empty custom reason", () => {
      const result = validateVoidReason("Other", "   ")
      expect(result.valid).toBe(false)
      if (!result.valid) expect(result.error).toBe("Custom reason required when selecting 'Other'")
    })
  })

  describe("validateVoidWindow", () => {
    it("accepts transaction within 7-day window", () => {
      const recentDate = new Date()
      recentDate.setDate(recentDate.getDate() - 1) // 1 day ago
      expect(validateVoidWindow(recentDate)).toEqual({ valid: true })
    })

    it("accepts transaction exactly at 7-day boundary", () => {
      const boundaryDate = new Date()
      boundaryDate.setDate(boundaryDate.getDate() - VOID_WINDOW_DAYS)
      boundaryDate.setHours(boundaryDate.getHours() + 1) // Just within window
      expect(validateVoidWindow(boundaryDate)).toEqual({ valid: true })
    })

    it("rejects transaction older than 7 days", () => {
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 8) // 8 days ago
      const result = validateVoidWindow(oldDate)
      expect(result.valid).toBe(false)
      if (!result.valid) expect(result.error).toBe("Transaction is older than 7 days and cannot be voided")
    })

    it("accepts transaction from today", () => {
      const today = new Date()
      expect(validateVoidWindow(today)).toEqual({ valid: true })
    })
  })

  describe("validateNotAlreadyVoided", () => {
    it("accepts non-voided transaction", () => {
      expect(validateNotAlreadyVoided(false)).toEqual({ valid: true })
    })

    it("rejects already voided transaction", () => {
      const result = validateNotAlreadyVoided(true)
      expect(result.valid).toBe(false)
      if (!result.valid) expect(result.error).toBe("Transaction is already voided")
    })
  })
})
