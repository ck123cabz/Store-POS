import { describe, it, expect } from "vitest"
import {
  isValidTransition,
  getValidNextStates,
  VALID_TRANSITIONS,
} from "@/lib/employee-status"

describe("isValidTransition", () => {
  it("allows Active → Inactive", () => {
    expect(isValidTransition("Active", "Inactive")).toBe(true)
  })

  it("allows Inactive → Active", () => {
    expect(isValidTransition("Inactive", "Active")).toBe(true)
  })

  it("allows Active → Terminated", () => {
    expect(isValidTransition("Active", "Terminated")).toBe(true)
  })

  it("allows Inactive → Terminated", () => {
    expect(isValidTransition("Inactive", "Terminated")).toBe(true)
  })

  it("allows Terminated → Active (rehire)", () => {
    expect(isValidTransition("Terminated", "Active")).toBe(true)
  })

  it("rejects Terminated → Inactive", () => {
    expect(isValidTransition("Terminated", "Inactive")).toBe(false)
  })

  it("allows same-status transition (no change)", () => {
    expect(isValidTransition("Active", "Active")).toBe(true)
    expect(isValidTransition("Inactive", "Inactive")).toBe(true)
    expect(isValidTransition("Terminated", "Terminated")).toBe(true)
  })

  it("rejects unknown source status", () => {
    expect(isValidTransition("Unknown", "Active")).toBe(false)
  })
})

describe("getValidNextStates", () => {
  it("returns correct next states for Active", () => {
    expect(getValidNextStates("Active")).toEqual(["Inactive", "Terminated"])
  })

  it("returns correct next states for Inactive", () => {
    expect(getValidNextStates("Inactive")).toEqual(["Active", "Terminated"])
  })

  it("returns correct next states for Terminated", () => {
    expect(getValidNextStates("Terminated")).toEqual(["Active"])
  })

  it("returns empty array for unknown status", () => {
    expect(getValidNextStates("Unknown")).toEqual([])
  })
})

describe("VALID_TRANSITIONS", () => {
  it("covers all three statuses", () => {
    expect(Object.keys(VALID_TRANSITIONS)).toHaveLength(3)
    expect(VALID_TRANSITIONS).toHaveProperty("Active")
    expect(VALID_TRANSITIONS).toHaveProperty("Inactive")
    expect(VALID_TRANSITIONS).toHaveProperty("Terminated")
  })
})
