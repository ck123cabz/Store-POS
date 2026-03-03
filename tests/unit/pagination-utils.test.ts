import { describe, it, expect } from "vitest"
import { generatePageNumbers } from "@/lib/pagination-utils"

describe("generatePageNumbers", () => {
  it("returns [1] for a single page", () => {
    expect(generatePageNumbers(1, 1)).toEqual([1])
  })

  it("returns all pages when total is small", () => {
    expect(generatePageNumbers(1, 3)).toEqual([1, 2, 3])
    expect(generatePageNumbers(2, 4)).toEqual([1, 2, 3, 4])
    expect(generatePageNumbers(3, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it("shows ellipsis at end when current is near start", () => {
    expect(generatePageNumbers(1, 10)).toEqual([1, 2, "...", 10])
    expect(generatePageNumbers(2, 10)).toEqual([1, 2, 3, "...", 10])
  })

  it("shows ellipsis at start when current is near end", () => {
    expect(generatePageNumbers(10, 10)).toEqual([1, "...", 9, 10])
    expect(generatePageNumbers(9, 10)).toEqual([1, "...", 8, 9, 10])
  })

  it("shows ellipsis on both sides when current is in middle", () => {
    expect(generatePageNumbers(5, 10)).toEqual([1, "...", 4, 5, 6, "...", 10])
    expect(generatePageNumbers(6, 12)).toEqual([1, "...", 5, 6, 7, "...", 12])
  })

  it("respects custom siblings count", () => {
    expect(generatePageNumbers(5, 10, 2)).toEqual([1, "...", 3, 4, 5, 6, 7, "...", 10])
  })

  it("handles two pages", () => {
    expect(generatePageNumbers(1, 2)).toEqual([1, 2])
    expect(generatePageNumbers(2, 2)).toEqual([1, 2])
  })

  it("does not produce duplicate entries", () => {
    const result = generatePageNumbers(3, 5)
    const numbers = result.filter((x) => typeof x === "number") as number[]
    const uniqueNumbers = new Set(numbers)
    expect(numbers.length).toBe(uniqueNumbers.size)
  })

  it("always starts with 1 and ends with total", () => {
    for (let total = 1; total <= 15; total++) {
      for (let current = 1; current <= total; current++) {
        const result = generatePageNumbers(current, total)
        expect(result[0]).toBe(1)
        expect(result[result.length - 1]).toBe(total)
      }
    }
  })
})
