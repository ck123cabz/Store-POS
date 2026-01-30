/**
 * Unit Tests: Payment Calculations
 * Tests payment validation and calculation logic for Cash, GCash, Tab, and Split payments
 */

import { describe, test, expect } from 'vitest'
import {
  calculateChange,
  validateCashPayment,
  validateGCashReference,
  validateTabPayment,
  validateTabSettlement,
  validateSplitPayment,
  isNearCreditLimit,
  parseSplitPayment,
  serializeSplitPayment,
  generateIdempotencyKey,
  GCASH_REF_MIN_LENGTH,
  CREDIT_WARNING_THRESHOLD,
  type SplitPaymentComponent,
  type TabStatus,
} from '@/lib/payment-validation'

// ============================================================================
// Cash Payment Tests
// ============================================================================

describe('Cash Payment', () => {
  describe('calculateChange', () => {
    test('calculates correct change when tendered exceeds total', () => {
      expect(calculateChange(75.50, 100)).toBe(24.50)
      expect(calculateChange(99.99, 100)).toBe(0.01)
      expect(calculateChange(50, 50)).toBe(0)
    })

    test('handles large amounts', () => {
      expect(calculateChange(999.99, 1000)).toBe(0.01)
      expect(calculateChange(1500, 2000)).toBe(500)
    })

    test('rounds to 2 decimal places', () => {
      // 100 - 33.33 = 66.67 (not 66.66999...)
      expect(calculateChange(33.33, 100)).toBe(66.67)
    })

    test('throws error when tendered is less than total', () => {
      expect(() => calculateChange(100, 50)).toThrow('Amount tendered is less than transaction total')
    })
  })

  describe('validateCashPayment', () => {
    test('returns valid with correct change when sufficient', () => {
      const result = validateCashPayment(50, 100)
      expect(result.valid).toBe(true)
      expect(result.change).toBe(50)
    })

    test('returns valid with zero change for exact amount', () => {
      const result = validateCashPayment(75.50, 75.50)
      expect(result.valid).toBe(true)
      expect(result.change).toBe(0)
    })

    test('returns invalid when tendered is less than total', () => {
      const result = validateCashPayment(100, 50)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Insufficient')
      expect(result.error).toContain('50.00')
    })

    test('returns invalid for zero total', () => {
      const result = validateCashPayment(0, 50)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('greater than 0')
    })

    test('returns invalid for zero tendered', () => {
      const result = validateCashPayment(50, 0)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('greater than 0')
    })

    test('handles small amounts correctly', () => {
      const result = validateCashPayment(0.01, 0.05)
      expect(result.valid).toBe(true)
      expect(result.change).toBe(0.04)
    })
  })
})

// ============================================================================
// GCash Payment Tests
// ============================================================================

describe('GCash Payment', () => {
  describe('validateGCashReference', () => {
    test('accepts valid reference numbers', () => {
      expect(validateGCashReference('1234567890').valid).toBe(true)
      expect(validateGCashReference('ABCDEFGHIJ').valid).toBe(true)
      expect(validateGCashReference('abc123def4').valid).toBe(true)
    })

    test('rejects empty reference', () => {
      const result = validateGCashReference('')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('required')
    })

    test('rejects whitespace-only reference', () => {
      const result = validateGCashReference('   ')
      expect(result.valid).toBe(false)
    })

    test('rejects reference shorter than minimum length', () => {
      const result = validateGCashReference('123456789') // 9 chars
      expect(result.valid).toBe(false)
      expect(result.error).toContain(`${GCASH_REF_MIN_LENGTH}`)
    })

    test('rejects reference with special characters', () => {
      const result = validateGCashReference('1234-5678-90')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('letters and numbers')
    })

    test('trims whitespace before validation', () => {
      const result = validateGCashReference('  1234567890  ')
      expect(result.valid).toBe(true)
    })

    test('accepts long reference numbers', () => {
      const result = validateGCashReference('12345678901234567890')
      expect(result.valid).toBe(true)
    })
  })
})

// ============================================================================
// Tab/Credit Payment Tests
// ============================================================================

describe('Tab Payment', () => {
  describe('isNearCreditLimit', () => {
    test('returns true when at or above 80% threshold', () => {
      expect(isNearCreditLimit(800, 1000)).toBe(true)
      expect(isNearCreditLimit(850, 1000)).toBe(true)
      expect(isNearCreditLimit(1000, 1000)).toBe(true)
    })

    test('returns false when below 80% threshold', () => {
      expect(isNearCreditLimit(500, 1000)).toBe(false)
      expect(isNearCreditLimit(799, 1000)).toBe(false)
    })

    test('returns false when credit limit is 0', () => {
      expect(isNearCreditLimit(100, 0)).toBe(false)
    })
  })

  describe('validateTabPayment', () => {
    const defaultTabStatus: TabStatus = 'active'

    test('allows valid tab payment within credit limit', () => {
      const result = validateTabPayment(100, 200, 1000, defaultTabStatus)
      expect(result.valid).toBe(true)
      expect(result.newBalance).toBe(300)
    })

    test('rejects payment for frozen tab', () => {
      const result = validateTabPayment(100, 200, 1000, 'frozen')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('frozen')
    })

    test('allows payment for suspended tab (warning state)', () => {
      const result = validateTabPayment(100, 200, 1000, 'suspended')
      expect(result.valid).toBe(true)
    })

    test('rejects payment exceeding credit limit without override', () => {
      const result = validateTabPayment(600, 500, 1000, defaultTabStatus, false)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Exceeds credit limit')
    })

    test('allows payment exceeding credit limit with override', () => {
      const result = validateTabPayment(600, 500, 1000, defaultTabStatus, true)
      expect(result.valid).toBe(true)
      expect(result.newBalance).toBe(1100)
    })

    test('shows warning when approaching credit limit', () => {
      const result = validateTabPayment(300, 500, 1000, defaultTabStatus)
      expect(result.valid).toBe(true)
      expect(result.warning).toBeDefined()
      expect(result.warning).toContain('80%')
    })

    test('handles zero credit limit (no limit)', () => {
      const result = validateTabPayment(1000, 500, 0, defaultTabStatus)
      expect(result.valid).toBe(true)
      expect(result.newBalance).toBe(1500)
    })

    test('rounds new balance correctly', () => {
      const result = validateTabPayment(33.33, 66.67, 200, defaultTabStatus)
      expect(result.newBalance).toBe(100)
    })
  })

  describe('validateTabSettlement', () => {
    test('allows valid settlement within balance', () => {
      const result = validateTabSettlement(100, 500)
      expect(result.valid).toBe(true)
      expect(result.newBalance).toBe(400)
    })

    test('allows full balance settlement', () => {
      const result = validateTabSettlement(500, 500)
      expect(result.valid).toBe(true)
      expect(result.newBalance).toBe(0)
    })

    test('rejects settlement exceeding balance', () => {
      const result = validateTabSettlement(600, 500)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('exceeds balance')
    })

    test('rejects zero settlement', () => {
      const result = validateTabSettlement(0, 500)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('greater than 0')
    })

    test('rejects negative settlement', () => {
      const result = validateTabSettlement(-100, 500)
      expect(result.valid).toBe(false)
    })

    test('rounds new balance correctly', () => {
      const result = validateTabSettlement(33.33, 100)
      expect(result.newBalance).toBe(66.67)
    })
  })
})

// ============================================================================
// Split Payment Tests
// ============================================================================

describe('Split Payment', () => {
  describe('validateSplitPayment', () => {
    test('accepts valid cash-only split', () => {
      const components: SplitPaymentComponent[] = [
        { method: 'Cash', amount: 100 }
      ]
      const result = validateSplitPayment(100, components)
      expect(result.valid).toBe(true)
      expect(result.totalPaid).toBe(100)
      expect(result.changeGiven).toBe(0)
    })

    test('accepts valid cash+gcash split', () => {
      const components: SplitPaymentComponent[] = [
        { method: 'Cash', amount: 50 },
        { method: 'GCash', amount: 50, reference: 'ABC1234567' }
      ]
      const result = validateSplitPayment(100, components)
      expect(result.valid).toBe(true)
      expect(result.totalPaid).toBe(100)
    })

    test('calculates change correctly', () => {
      const components: SplitPaymentComponent[] = [
        { method: 'Cash', amount: 80 },
        { method: 'GCash', amount: 50, reference: 'ABC1234567' }
      ]
      const result = validateSplitPayment(100, components)
      expect(result.valid).toBe(true)
      expect(result.changeGiven).toBe(30)
    })

    test('rejects insufficient total', () => {
      const components: SplitPaymentComponent[] = [
        { method: 'Cash', amount: 30 },
        { method: 'GCash', amount: 30, reference: 'ABC1234567' }
      ]
      const result = validateSplitPayment(100, components)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('40.00')
    })

    test('rejects empty components', () => {
      const result = validateSplitPayment(100, [])
      expect(result.valid).toBe(false)
      expect(result.error).toContain('one payment component')
    })

    test('rejects more than 2 components', () => {
      const components: SplitPaymentComponent[] = [
        { method: 'Cash', amount: 40 },
        { method: 'Cash', amount: 30 },
        { method: 'GCash', amount: 30, reference: 'ABC1234567' }
      ]
      const result = validateSplitPayment(100, components)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Maximum 2')
    })

    test('rejects GCash without reference', () => {
      const components: SplitPaymentComponent[] = [
        { method: 'Cash', amount: 50 },
        { method: 'GCash', amount: 50 }
      ]
      const result = validateSplitPayment(100, components)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('reference')
    })

    test('rejects GCash with invalid reference', () => {
      const components: SplitPaymentComponent[] = [
        { method: 'Cash', amount: 50 },
        { method: 'GCash', amount: 50, reference: '123' } // Too short
      ]
      const result = validateSplitPayment(100, components)
      expect(result.valid).toBe(false)
    })

    test('rejects zero amount component', () => {
      const components: SplitPaymentComponent[] = [
        { method: 'Cash', amount: 0 },
        { method: 'GCash', amount: 100, reference: 'ABC1234567' }
      ]
      const result = validateSplitPayment(100, components)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('greater than 0')
    })
  })

  describe('parseSplitPayment', () => {
    test('parses valid split payment JSON', () => {
      const json = JSON.stringify({
        components: [
          { method: 'Cash', amount: 50 },
          { method: 'GCash', amount: 50, reference: 'ABC1234567' }
        ],
        totalPaid: 100,
        changeGiven: 0
      })
      const result = parseSplitPayment(json)
      expect(result).not.toBeNull()
      expect(result?.components.length).toBe(2)
      expect(result?.totalPaid).toBe(100)
    })

    test('returns null for invalid JSON', () => {
      expect(parseSplitPayment('not json')).toBeNull()
      expect(parseSplitPayment('{}')).toBeNull()
      expect(parseSplitPayment('')).toBeNull()
    })
  })

  describe('serializeSplitPayment', () => {
    test('serializes split payment to JSON', () => {
      const splitPayment = {
        components: [
          { method: 'Cash' as const, amount: 50 }
        ],
        totalPaid: 50,
        changeGiven: 0
      }
      const json = serializeSplitPayment(splitPayment)
      expect(JSON.parse(json)).toEqual(splitPayment)
    })
  })
})

// ============================================================================
// Split Payment Data (Simplified Format) Tests
// ============================================================================

/**
 * SplitPaymentData is a simplified format for Cash + GCash split payments
 * Used in the UI and API for easier handling of common split scenarios
 */
interface SplitPaymentData {
  cashAmount: number
  cashTendered: number
  cashChange: number
  gcashAmount: number
  gcashReference: string
  totalPaid: number
}

/**
 * Validate simplified split payment data
 * @param total - Transaction total
 * @param data - Split payment data
 * @returns Validation result
 */
function validateSplitPaymentData(
  total: number,
  data: SplitPaymentData
): { valid: boolean; error?: string } {
  // Total paid must cover transaction total
  if (data.totalPaid < total) {
    const shortfall = Math.round((total - data.totalPaid) * 100) / 100
    return { valid: false, error: `Insufficient payment. Need ${shortfall.toFixed(2)} more` }
  }

  // Cash amount validation
  if (data.cashAmount < 0) {
    return { valid: false, error: 'Cash amount cannot be negative' }
  }

  // GCash amount validation
  if (data.gcashAmount < 0) {
    return { valid: false, error: 'GCash amount cannot be negative' }
  }

  // At least one payment method must have positive amount
  if (data.cashAmount <= 0 && data.gcashAmount <= 0) {
    return { valid: false, error: 'At least one payment amount must be greater than 0' }
  }

  // GCash requires reference when amount > 0
  if (data.gcashAmount > 0) {
    if (!data.gcashReference || data.gcashReference.trim().length === 0) {
      return { valid: false, error: 'GCash reference number is required when GCash amount > 0' }
    }
    if (data.gcashReference.trim().length < GCASH_REF_MIN_LENGTH) {
      return { valid: false, error: `GCash reference must be at least ${GCASH_REF_MIN_LENGTH} characters` }
    }
    if (!/^[a-zA-Z0-9]+$/.test(data.gcashReference.trim())) {
      return { valid: false, error: 'GCash reference must contain only letters and numbers' }
    }
  }

  // Cash change validation
  if (data.cashAmount > 0) {
    if (data.cashTendered < data.cashAmount) {
      return { valid: false, error: 'Cash tendered must be at least equal to cash amount' }
    }
    const expectedChange = Math.round((data.cashTendered - data.cashAmount) * 100) / 100
    if (Math.abs(data.cashChange - expectedChange) > 0.01) {
      return { valid: false, error: 'Cash change calculation is incorrect' }
    }
  }

  // Total paid should match sum of cash and gcash amounts
  const expectedTotal = Math.round((data.cashAmount + data.gcashAmount) * 100) / 100
  if (Math.abs(data.totalPaid - expectedTotal) > 0.01) {
    return { valid: false, error: 'Total paid does not match sum of cash and GCash amounts' }
  }

  return { valid: true }
}

/**
 * Calculate change for split payment cash component
 * @param cashAmount - Cash portion of split
 * @param cashTendered - Actual cash given by customer
 * @returns Change to give back
 */
function calculateSplitChange(cashAmount: number, cashTendered: number): number {
  if (cashTendered < cashAmount) {
    throw new Error('Cash tendered is less than cash amount')
  }
  return Math.round((cashTendered - cashAmount) * 100) / 100
}

/**
 * Parse split payment data from JSON string
 * @param json - JSON string
 * @returns Parsed data or null if invalid
 */
function parseSplitPaymentData(json: string): SplitPaymentData | null {
  try {
    const parsed = JSON.parse(json)
    // Validate required fields exist
    if (
      typeof parsed.cashAmount !== 'number' ||
      typeof parsed.cashTendered !== 'number' ||
      typeof parsed.cashChange !== 'number' ||
      typeof parsed.gcashAmount !== 'number' ||
      typeof parsed.gcashReference !== 'string' ||
      typeof parsed.totalPaid !== 'number'
    ) {
      return null
    }
    return parsed as SplitPaymentData
  } catch {
    return null
  }
}

describe('Split Payment Data (Simplified Format)', () => {
  describe('validateSplitPaymentData', () => {
    test('valid split - cash + gcash equals total', () => {
      const data: SplitPaymentData = {
        cashAmount: 50,
        cashTendered: 50,
        cashChange: 0,
        gcashAmount: 50,
        gcashReference: 'GCASH12345',
        totalPaid: 100
      }
      const result = validateSplitPaymentData(100, data)
      expect(result.valid).toBe(true)
    })

    test('valid split - exceeds total (overpayment ok)', () => {
      const data: SplitPaymentData = {
        cashAmount: 60,
        cashTendered: 100,
        cashChange: 40,
        gcashAmount: 50,
        gcashReference: 'GCASH12345',
        totalPaid: 110
      }
      const result = validateSplitPaymentData(100, data)
      expect(result.valid).toBe(true)
    })

    test('invalid split - less than total', () => {
      const data: SplitPaymentData = {
        cashAmount: 30,
        cashTendered: 30,
        cashChange: 0,
        gcashAmount: 30,
        gcashReference: 'GCASH12345',
        totalPaid: 60
      }
      const result = validateSplitPaymentData(100, data)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('40.00')
    })

    test('valid split - cash only (gcash = 0)', () => {
      const data: SplitPaymentData = {
        cashAmount: 100,
        cashTendered: 100,
        cashChange: 0,
        gcashAmount: 0,
        gcashReference: '',
        totalPaid: 100
      }
      const result = validateSplitPaymentData(100, data)
      expect(result.valid).toBe(true)
    })

    test('valid split - gcash only (cash = 0)', () => {
      const data: SplitPaymentData = {
        cashAmount: 0,
        cashTendered: 0,
        cashChange: 0,
        gcashAmount: 100,
        gcashReference: 'GCASH12345',
        totalPaid: 100
      }
      const result = validateSplitPaymentData(100, data)
      expect(result.valid).toBe(true)
    })

    test('invalid - gcash requires reference when amount > 0', () => {
      const data: SplitPaymentData = {
        cashAmount: 50,
        cashTendered: 50,
        cashChange: 0,
        gcashAmount: 50,
        gcashReference: '', // Missing reference
        totalPaid: 100
      }
      const result = validateSplitPaymentData(100, data)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('reference')
    })

    test('invalid - gcash reference too short', () => {
      const data: SplitPaymentData = {
        cashAmount: 50,
        cashTendered: 50,
        cashChange: 0,
        gcashAmount: 50,
        gcashReference: '123456789', // 9 chars, need 10
        totalPaid: 100
      }
      const result = validateSplitPaymentData(100, data)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('10')
    })

    test('invalid - gcash reference with special characters', () => {
      const data: SplitPaymentData = {
        cashAmount: 50,
        cashTendered: 50,
        cashChange: 0,
        gcashAmount: 50,
        gcashReference: 'GCASH-1234', // Has hyphen
        totalPaid: 100
      }
      const result = validateSplitPaymentData(100, data)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('letters and numbers')
    })

    test('invalid - both amounts zero', () => {
      const data: SplitPaymentData = {
        cashAmount: 0,
        cashTendered: 0,
        cashChange: 0,
        gcashAmount: 0,
        gcashReference: '',
        totalPaid: 0
      }
      const result = validateSplitPaymentData(100, data)
      expect(result.valid).toBe(false)
      // First validation is insufficient payment, then both amounts zero
      expect(result.error).toContain('Insufficient')
    })

    test('invalid - negative cash amount', () => {
      const data: SplitPaymentData = {
        cashAmount: -10,
        cashTendered: 0,
        cashChange: 0,
        gcashAmount: 110,
        gcashReference: 'GCASH12345',
        totalPaid: 100
      }
      const result = validateSplitPaymentData(100, data)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('negative')
    })

    test('invalid - cash change calculation incorrect', () => {
      const data: SplitPaymentData = {
        cashAmount: 50,
        cashTendered: 100,
        cashChange: 30, // Should be 50
        gcashAmount: 50,
        gcashReference: 'GCASH12345',
        totalPaid: 100
      }
      const result = validateSplitPaymentData(100, data)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('change calculation')
    })

    test('invalid - total paid does not match sum', () => {
      const data: SplitPaymentData = {
        cashAmount: 50,
        cashTendered: 50,
        cashChange: 0,
        gcashAmount: 50,
        gcashReference: 'GCASH12345',
        totalPaid: 90 // Should be 100, and is also less than transaction total
      }
      const result = validateSplitPaymentData(100, data)
      expect(result.valid).toBe(false)
      // First validation is insufficient payment since totalPaid (90) < total (100)
      expect(result.error).toContain('Insufficient')
    })

    test('invalid - total paid mismatches component sum (sufficient but wrong)', () => {
      const data: SplitPaymentData = {
        cashAmount: 60,
        cashTendered: 60,
        cashChange: 0,
        gcashAmount: 60,
        gcashReference: 'GCASH12345',
        totalPaid: 100 // Should be 120 (60+60), but says 100
      }
      const result = validateSplitPaymentData(100, data)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('does not match')
    })
  })

  describe('calculateSplitChange', () => {
    test('calculates correct change when tendered exceeds amount', () => {
      expect(calculateSplitChange(50, 100)).toBe(50)
      expect(calculateSplitChange(75.50, 80)).toBe(4.50)
    })

    test('returns zero when exact amount tendered', () => {
      expect(calculateSplitChange(50, 50)).toBe(0)
      expect(calculateSplitChange(99.99, 99.99)).toBe(0)
    })

    test('rounds to 2 decimal places', () => {
      expect(calculateSplitChange(33.33, 100)).toBe(66.67)
    })

    test('throws error when tendered is less than amount', () => {
      expect(() => calculateSplitChange(100, 50)).toThrow('Cash tendered is less than cash amount')
    })
  })

  describe('parseSplitPaymentData', () => {
    test('parses valid JSON correctly', () => {
      const json = JSON.stringify({
        cashAmount: 50,
        cashTendered: 60,
        cashChange: 10,
        gcashAmount: 50,
        gcashReference: 'GCASH12345',
        totalPaid: 100
      })
      const result = parseSplitPaymentData(json)
      expect(result).not.toBeNull()
      expect(result?.cashAmount).toBe(50)
      expect(result?.gcashAmount).toBe(50)
      expect(result?.gcashReference).toBe('GCASH12345')
      expect(result?.totalPaid).toBe(100)
    })

    test('returns null for invalid JSON', () => {
      expect(parseSplitPaymentData('not json')).toBeNull()
    })

    test('returns null for empty string', () => {
      expect(parseSplitPaymentData('')).toBeNull()
    })

    test('returns null for empty object', () => {
      expect(parseSplitPaymentData('{}')).toBeNull()
    })

    test('returns null for missing required fields', () => {
      const json = JSON.stringify({
        cashAmount: 50,
        gcashAmount: 50
        // Missing other fields
      })
      expect(parseSplitPaymentData(json)).toBeNull()
    })

    test('returns null for wrong field types', () => {
      const json = JSON.stringify({
        cashAmount: '50', // Should be number
        cashTendered: 50,
        cashChange: 0,
        gcashAmount: 50,
        gcashReference: 'GCASH12345',
        totalPaid: 100
      })
      expect(parseSplitPaymentData(json)).toBeNull()
    })
  })
})

// ============================================================================
// Idempotency Key Tests
// ============================================================================

describe('Idempotency Key', () => {
  describe('generateIdempotencyKey', () => {
    test('generates unique keys for same payload', () => {
      const payload = { items: [], total: 100 }
      const key1 = generateIdempotencyKey('device1', payload)
      const key2 = generateIdempotencyKey('device1', payload)
      expect(key1).not.toBe(key2)
    })

    test('includes device ID in key', () => {
      const payload = { items: [], total: 100 }
      const key = generateIdempotencyKey('my-device-id', payload)
      expect(key).toContain('my-device-id')
    })

    test('generates valid format', () => {
      const payload = { items: [], total: 100 }
      const key = generateIdempotencyKey('device', payload)
      const parts = key.split(':')
      expect(parts.length).toBe(4) // uuid:deviceId:timestamp:hash
    })
  })
})
