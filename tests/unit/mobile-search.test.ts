/**
 * Unit tests for product search filter logic used by MobileSearchBar
 * Tests case-insensitive substring matching on product names
 */

import { describe, it, expect } from "vitest"

interface Product {
  id: number
  name: string
  categoryId: number
}

/**
 * Filters products by name substring (case-insensitive) or exact ID match.
 * This mirrors the filter logic in ProductGrid.
 */
function filterProducts(products: Product[], query: string): Product[] {
  const trimmed = query.trim()
  if (!trimmed) return products

  const lower = trimmed.toLowerCase()

  return products.filter(
    (p) => p.name.toLowerCase().includes(lower) || p.id.toString() === trimmed
  )
}

const mockProducts: Product[] = [
  { id: 1, name: "Burger Steak", categoryId: 1 },
  { id: 2, name: "Iced Coffee", categoryId: 2 },
  { id: 3, name: "Tocilog", categoryId: 1 },
  { id: 4, name: "Gatorade", categoryId: 2 },
  { id: 5, name: "Double Burger", categoryId: 1 },
  { id: 6, name: "Iced Tea", categoryId: 2 },
]

describe("Product Search Filter", () => {
  it("returns all products when query is empty", () => {
    expect(filterProducts(mockProducts, "")).toEqual(mockProducts)
    expect(filterProducts(mockProducts, "  ")).toEqual(mockProducts)
  })

  it("filters by name substring (case-insensitive)", () => {
    const result = filterProducts(mockProducts, "burger")
    expect(result).toHaveLength(2)
    expect(result.map((p) => p.name)).toEqual(["Burger Steak", "Double Burger"])
  })

  it("is case-insensitive", () => {
    const lower = filterProducts(mockProducts, "iced")
    const upper = filterProducts(mockProducts, "ICED")
    const mixed = filterProducts(mockProducts, "iCeD")

    expect(lower).toHaveLength(2)
    expect(upper).toEqual(lower)
    expect(mixed).toEqual(lower)
  })

  it("matches partial names", () => {
    const result = filterProducts(mockProducts, "toc")
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("Tocilog")
  })

  it("returns empty array when no match", () => {
    expect(filterProducts(mockProducts, "pizza")).toEqual([])
  })

  it("matches by exact product ID", () => {
    const result = filterProducts(mockProducts, "3")
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("Tocilog")
  })

  it("trims whitespace from query", () => {
    const result = filterProducts(mockProducts, "  burger  ")
    expect(result).toHaveLength(2)
  })

  it("matches single character queries", () => {
    // 'g' matches Gatorade and possibly others
    const result = filterProducts(mockProducts, "g")
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((p) => p.name.toLowerCase().includes("g"))).toBe(true)
  })
})
