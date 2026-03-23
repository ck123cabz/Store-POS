import { describe, it, expect } from "vitest"
import { ROLE_PRESETS } from "@/lib/role-presets"

const ALL_PERMISSION_KEYS = [
  "permProducts",
  "permCategories",
  "permTransactions",
  "permUsers",
  "permSettings",
  "permReports",
  "permAuditLog",
  "permVoid",
] as const

describe("ROLE_PRESETS", () => {
  it("exports Cashier, Manager, and Kitchen Staff presets", () => {
    const labels = ROLE_PRESETS.map((p) => p.label)
    expect(labels).toContain("Cashier")
    expect(labels).toContain("Manager")
    expect(labels).toContain("Kitchen Staff")
    expect(ROLE_PRESETS).toHaveLength(3)
  })

  it("every preset has all 8 permission keys", () => {
    for (const preset of ROLE_PRESETS) {
      for (const key of ALL_PERMISSION_KEYS) {
        expect(preset.permissions).toHaveProperty(key)
        expect(typeof preset.permissions[key]).toBe("boolean")
      }
    }
  })

  it("Cashier has only permProducts and permTransactions enabled", () => {
    const cashier = ROLE_PRESETS.find((p) => p.label === "Cashier")!
    expect(cashier.permissions.permProducts).toBe(true)
    expect(cashier.permissions.permTransactions).toBe(true)
    expect(cashier.permissions.permCategories).toBe(false)
    expect(cashier.permissions.permUsers).toBe(false)
    expect(cashier.permissions.permSettings).toBe(false)
    expect(cashier.permissions.permReports).toBe(false)
    expect(cashier.permissions.permAuditLog).toBe(false)
    expect(cashier.permissions.permVoid).toBe(false)
  })

  it("Manager has all permissions enabled", () => {
    const manager = ROLE_PRESETS.find((p) => p.label === "Manager")!
    for (const key of ALL_PERMISSION_KEYS) {
      expect(manager.permissions[key]).toBe(true)
    }
  })

  it("Kitchen Staff has only permProducts and permCategories enabled", () => {
    const kitchen = ROLE_PRESETS.find((p) => p.label === "Kitchen Staff")!
    expect(kitchen.permissions.permProducts).toBe(true)
    expect(kitchen.permissions.permCategories).toBe(true)
    expect(kitchen.permissions.permTransactions).toBe(false)
    expect(kitchen.permissions.permUsers).toBe(false)
    expect(kitchen.permissions.permSettings).toBe(false)
    expect(kitchen.permissions.permReports).toBe(false)
    expect(kitchen.permissions.permAuditLog).toBe(false)
    expect(kitchen.permissions.permVoid).toBe(false)
  })
})
