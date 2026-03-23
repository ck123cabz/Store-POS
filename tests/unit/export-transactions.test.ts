import { describe, it, expect } from "vitest"
import { exportTransactionsToCSV } from "@/lib/export-transactions"

// Minimal transaction factory
function makeTx(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    orderNumber: 1042,
    total: "250.00",
    subtotal: "230.00",
    discount: "0",
    taxAmount: "20.00",
    status: 1,
    paymentType: "Cash",
    paidAmount: "300.00",
    changeAmount: "50.00",
    paymentStatus: null,
    paymentInfo: null,
    gcashPhotoPath: null,
    createdAt: "2026-03-23T10:30:00.000Z",
    tillNumber: 1,
    refNumber: "",
    customer: null,
    user: { id: 1, fullname: "Admin" },
    items: [{ id: 1, productName: "Latte", price: "120.00", quantity: 2 }],
    isVoided: false,
    voidedAt: null,
    voidedByName: null,
    voidReason: null,
    ...overrides,
  }
}

describe("exportTransactionsToCSV", () => {
  it("generates correct header row", () => {
    const csv = exportTransactionsToCSV([], "₱")
    const headers = csv.split("\n")[0]
    expect(headers).toBe("Order #,Date,Time,Customer,Items,Payment,Total,Status")
  })

  it("formats a standard Cash transaction", () => {
    const csv = exportTransactionsToCSV([makeTx() as never], "₱")
    const lines = csv.split("\n")
    expect(lines).toHaveLength(2) // header + 1 row
    expect(lines[1]).toContain("1042")
    expect(lines[1]).toContain("Cash")
    expect(lines[1]).toContain("₱250.00")
    expect(lines[1]).toContain("Completed")
  })

  it("marks voided transactions with VOIDED status", () => {
    const csv = exportTransactionsToCSV(
      [makeTx({ isVoided: true, status: 1 }) as never],
      "₱"
    )
    const lines = csv.split("\n")
    expect(lines[1]).toContain("VOIDED")
  })

  it("shows Walk-in for null customer", () => {
    const csv = exportTransactionsToCSV([makeTx() as never], "₱")
    expect(csv).toContain("Walk-in")
  })

  it("shows customer name when present", () => {
    const csv = exportTransactionsToCSV(
      [makeTx({ customer: { id: 1, name: "Juan Cruz" } }) as never],
      "₱"
    )
    expect(csv).toContain("Juan Cruz")
  })

  it("handles empty data", () => {
    const csv = exportTransactionsToCSV([], "₱")
    const lines = csv.split("\n")
    expect(lines).toHaveLength(1) // header only
  })

  it("escapes commas in values", () => {
    const csv = exportTransactionsToCSV(
      [makeTx({ customer: { id: 1, name: "Cruz, Juan" } }) as never],
      "₱"
    )
    // Value with comma should be wrapped in quotes
    expect(csv).toContain('"Cruz, Juan"')
  })

  it("includes item count", () => {
    const csv = exportTransactionsToCSV([makeTx() as never], "₱")
    expect(csv).toContain(",1,") // 1 item
  })

  it("uses correct currency symbol", () => {
    const csv = exportTransactionsToCSV([makeTx() as never], "$")
    expect(csv).toContain("$250.00")
  })
})
