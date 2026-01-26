/**
 * Unit Tests: Price and Inventory Calculations
 * Tests pure business logic without external dependencies
 */

import { describe, test, expect } from 'vitest'

// ============================================================================
// Price Calculation Functions (to be implemented in src/lib/calculations.ts)
// ============================================================================

/**
 * Calculate discount amount
 */
function calculateDiscount(
  subtotal: number,
  discountValue: number,
  discountType: 'percentage' | 'fixed' = 'percentage'
): number {
  if (discountType === 'percentage') {
    return subtotal * (discountValue / 100)
  }
  return Math.min(discountValue, subtotal)
}

/**
 * Calculate tax amount
 */
function calculateTax(subtotal: number, taxPercentage: number): number {
  return subtotal * (taxPercentage / 100)
}

/**
 * Calculate cart total
 */
function calculateTotal(
  items: { price: number; quantity: number }[],
  discount: number = 0,
  taxPercentage: number = 0
): { subtotal: number; tax: number; discount: number; total: number } {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const discountAmount = discount
  const taxableAmount = subtotal - discountAmount
  const tax = calculateTax(taxableAmount, taxPercentage)
  const total = taxableAmount + tax

  return {
    subtotal,
    tax,
    discount: discountAmount,
    total: Math.max(0, total),
  }
}

/**
 * Calculate true cost (food + labor + overhead)
 */
function calculateTrueCost(
  foodCost: number,
  prepTimeMinutes: number,
  hourlyRate: number,
  overheadAllocation: number = 0
): number {
  const laborCost = (prepTimeMinutes / 60) * hourlyRate
  return foodCost + laborCost + overheadAllocation
}

/**
 * Calculate true margin
 */
function calculateTrueMargin(
  sellingPrice: number,
  trueCost: number
): { margin: number; marginPercent: number } {
  const margin = sellingPrice - trueCost
  const marginPercent = sellingPrice > 0 ? (margin / sellingPrice) * 100 : 0
  return { margin, marginPercent }
}

/**
 * Determine stock status
 */
function getStockStatus(
  quantity: number,
  parLevel: number
): 'ok' | 'low' | 'critical' | 'out' {
  if (quantity <= 0) return 'out'
  if (quantity <= parLevel * 0.25) return 'critical'
  if (quantity <= parLevel * 0.5) return 'low'
  return 'ok'
}

// ============================================================================
// Tests
// ============================================================================

describe('Price Calculations', () => {
  describe('calculateDiscount', () => {
    test('applies percentage discount correctly', () => {
      expect(calculateDiscount(100, 20, 'percentage')).toBe(20)
      expect(calculateDiscount(250, 10, 'percentage')).toBe(25)
    })

    test('applies fixed discount correctly', () => {
      expect(calculateDiscount(100, 15, 'fixed')).toBe(15)
      expect(calculateDiscount(50, 75, 'fixed')).toBe(50) // Capped at subtotal
    })

    test('handles zero discount', () => {
      expect(calculateDiscount(100, 0, 'percentage')).toBe(0)
      expect(calculateDiscount(100, 0, 'fixed')).toBe(0)
    })

    test('handles zero subtotal', () => {
      expect(calculateDiscount(0, 20, 'percentage')).toBe(0)
    })
  })

  describe('calculateTax', () => {
    test('calculates tax correctly', () => {
      expect(calculateTax(100, 12)).toBe(12)
      expect(calculateTax(100, 8.5)).toBe(8.5)
    })

    test('handles zero tax', () => {
      expect(calculateTax(100, 0)).toBe(0)
    })

    test('handles zero subtotal', () => {
      expect(calculateTax(0, 12)).toBe(0)
    })
  })

  describe('calculateTotal', () => {
    test('calculates total for single item', () => {
      const result = calculateTotal([{ price: 100, quantity: 1 }])
      expect(result.subtotal).toBe(100)
      expect(result.total).toBe(100)
    })

    test('calculates total for multiple items', () => {
      const result = calculateTotal([
        { price: 50, quantity: 2 },
        { price: 30, quantity: 1 },
      ])
      expect(result.subtotal).toBe(130)
      expect(result.total).toBe(130)
    })

    test('applies discount and tax', () => {
      const result = calculateTotal(
        [{ price: 100, quantity: 1 }],
        10, // discount
        12 // tax percentage
      )
      expect(result.subtotal).toBe(100)
      expect(result.discount).toBe(10)
      expect(result.tax).toBeCloseTo(10.8, 2) // 12% of 90
      expect(result.total).toBeCloseTo(100.8, 2) // 90 + 10.8
    })

    test('handles empty cart', () => {
      const result = calculateTotal([])
      expect(result.subtotal).toBe(0)
      expect(result.total).toBe(0)
    })

    test('does not go negative', () => {
      const result = calculateTotal([{ price: 10, quantity: 1 }], 50)
      expect(result.total).toBeGreaterThanOrEqual(0)
    })
  })
})

describe('True Cost Calculations (10-Lever Unit Economics)', () => {
  describe('calculateTrueCost', () => {
    test('calculates true cost with labor', () => {
      // Food cost: $10, Prep time: 15 min, Hourly rate: $20
      // Labor: (15/60) * 20 = $5
      // True cost: 10 + 5 = $15
      const result = calculateTrueCost(10, 15, 20)
      expect(result).toBe(15)
    })

    test('includes overhead allocation', () => {
      // Food: $10, Labor: $5, Overhead: $2
      const result = calculateTrueCost(10, 15, 20, 2)
      expect(result).toBe(17)
    })

    test('handles zero prep time', () => {
      const result = calculateTrueCost(10, 0, 20)
      expect(result).toBe(10)
    })
  })

  describe('calculateTrueMargin', () => {
    test('calculates margin correctly', () => {
      const result = calculateTrueMargin(50, 15)
      expect(result.margin).toBe(35)
      expect(result.marginPercent).toBe(70)
    })

    test('handles negative margin', () => {
      const result = calculateTrueMargin(10, 15)
      expect(result.margin).toBe(-5)
      expect(result.marginPercent).toBe(-50)
    })

    test('handles zero price', () => {
      const result = calculateTrueMargin(0, 10)
      expect(result.marginPercent).toBe(0)
    })
  })
})

describe('Inventory Calculations', () => {
  describe('getStockStatus', () => {
    test('returns "out" when quantity is 0', () => {
      expect(getStockStatus(0, 100)).toBe('out')
    })

    test('returns "critical" when below 25% of par', () => {
      expect(getStockStatus(20, 100)).toBe('critical')
      expect(getStockStatus(25, 100)).toBe('critical')
    })

    test('returns "low" when between 25-50% of par', () => {
      expect(getStockStatus(30, 100)).toBe('low')
      expect(getStockStatus(50, 100)).toBe('low')
    })

    test('returns "ok" when above 50% of par', () => {
      expect(getStockStatus(51, 100)).toBe('ok')
      expect(getStockStatus(100, 100)).toBe('ok')
      expect(getStockStatus(150, 100)).toBe('ok')
    })

    test('handles negative quantity', () => {
      expect(getStockStatus(-5, 100)).toBe('out')
    })
  })
})
