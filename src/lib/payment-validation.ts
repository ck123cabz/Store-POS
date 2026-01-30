/**
 * Payment validation utilities for POS Mobile Payments feature
 * Handles validation and calculation for Cash, GCash, Tab, and Split payments
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const PAYMENT_TYPES = ['Cash', 'GCash', 'Tab', 'Split'] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export const PAYMENT_STATUS = ['pending', 'confirmed', 'cancelled'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[number];

export const TAB_STATUS = ['active', 'suspended', 'frozen'] as const;
export type TabStatus = (typeof TAB_STATUS)[number];

export const GCASH_REF_MIN_LENGTH = 10;
export const CREDIT_WARNING_THRESHOLD = 0.8; // 80% of credit limit

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const paymentTypeSchema = z.enum(PAYMENT_TYPES);
export const paymentStatusSchema = z.enum(PAYMENT_STATUS);
export const tabStatusSchema = z.enum(TAB_STATUS);

export const splitPaymentComponentSchema = z.object({
  method: z.enum(['Cash', 'GCash']),
  amount: z.number().positive(),
  reference: z.string().min(GCASH_REF_MIN_LENGTH).optional(),
});

export const splitPaymentSchema = z.object({
  components: z.array(splitPaymentComponentSchema).min(1).max(2),
  totalPaid: z.number().positive(),
  changeGiven: z.number().min(0),
});

export type SplitPaymentComponent = z.infer<typeof splitPaymentComponentSchema>;
export type SplitPayment = z.infer<typeof splitPaymentSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// CASH PAYMENT CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate change for cash payment
 * @param total - Transaction total
 * @param amountTendered - Amount given by customer
 * @returns Change to return to customer
 * @throws Error if amountTendered < total
 */
export function calculateChange(total: number, amountTendered: number): number {
  if (amountTendered < total) {
    throw new Error('Amount tendered is less than transaction total');
  }
  // Round to 2 decimal places to avoid floating point issues
  return Math.round((amountTendered - total) * 100) / 100;
}

/**
 * Validate cash payment
 * @param total - Transaction total
 * @param amountTendered - Amount given by customer
 * @returns Validation result with change calculation
 */
export function validateCashPayment(
  total: number,
  amountTendered: number
): { valid: boolean; change?: number; error?: string } {
  if (total <= 0) {
    return { valid: false, error: 'Transaction total must be greater than 0' };
  }
  if (amountTendered <= 0) {
    return { valid: false, error: 'Amount tendered must be greater than 0' };
  }
  if (amountTendered < total) {
    return {
      valid: false,
      error: `Insufficient amount. Need ${(total - amountTendered).toFixed(2)} more`,
    };
  }
  return { valid: true, change: calculateChange(total, amountTendered) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GCASH PAYMENT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate GCash reference number
 * @param reference - GCash reference number
 * @returns Validation result
 */
export function validateGCashReference(reference: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = reference.trim();
  if (!trimmed) {
    return { valid: false, error: 'GCash reference number is required' };
  }
  if (trimmed.length < GCASH_REF_MIN_LENGTH) {
    return {
      valid: false,
      error: `GCash reference must be at least ${GCASH_REF_MIN_LENGTH} characters`,
    };
  }
  // Basic alphanumeric check (GCash refs are typically alphanumeric)
  if (!/^[a-zA-Z0-9]+$/.test(trimmed)) {
    return {
      valid: false,
      error: 'GCash reference must contain only letters and numbers',
    };
  }
  return { valid: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB/CREDIT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if customer is approaching credit limit (80% threshold)
 * @param currentBalance - Current tab balance
 * @param creditLimit - Customer's credit limit
 * @returns True if at or above warning threshold
 */
export function isNearCreditLimit(
  currentBalance: number,
  creditLimit: number
): boolean {
  if (creditLimit <= 0) return false;
  return currentBalance / creditLimit >= CREDIT_WARNING_THRESHOLD;
}

/**
 * Validate tab payment
 * @param transactionTotal - Amount to charge to tab
 * @param currentBalance - Customer's current tab balance
 * @param creditLimit - Customer's credit limit
 * @param tabStatus - Customer's tab status
 * @param allowOverride - Manager override for credit limit
 * @returns Validation result with new balance calculation
 */
export function validateTabPayment(
  transactionTotal: number,
  currentBalance: number,
  creditLimit: number,
  tabStatus: TabStatus,
  allowOverride: boolean = false
): {
  valid: boolean;
  newBalance?: number;
  warning?: string;
  error?: string;
} {
  // Check tab status
  if (tabStatus === 'frozen') {
    return { valid: false, error: 'Customer tab is frozen. Only balance payments accepted.' };
  }

  // Calculate new balance
  const newBalance = Math.round((currentBalance + transactionTotal) * 100) / 100;

  // Check credit limit
  if (creditLimit > 0 && newBalance > creditLimit && !allowOverride) {
    const available = Math.max(0, creditLimit - currentBalance);
    return {
      valid: false,
      error: `Exceeds credit limit. Available: ${available.toFixed(2)}`,
    };
  }

  // Check for warning threshold
  const warning = isNearCreditLimit(newBalance, creditLimit)
    ? `Customer is at ${Math.round((newBalance / creditLimit) * 100)}% of credit limit`
    : undefined;

  return { valid: true, newBalance, warning };
}

/**
 * Validate tab settlement (paying down balance)
 * @param amount - Amount to settle
 * @param currentBalance - Customer's current tab balance
 * @returns Validation result with new balance
 */
export function validateTabSettlement(
  amount: number,
  currentBalance: number
): { valid: boolean; newBalance?: number; error?: string } {
  if (amount <= 0) {
    return { valid: false, error: 'Settlement amount must be greater than 0' };
  }
  if (amount > currentBalance) {
    return {
      valid: false,
      error: `Settlement amount exceeds balance. Current balance: ${currentBalance.toFixed(2)}`,
    };
  }
  const newBalance = Math.round((currentBalance - amount) * 100) / 100;
  return { valid: true, newBalance };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPLIT PAYMENT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate split payment components
 * @param total - Transaction total
 * @param components - Array of payment components (Cash/GCash)
 * @returns Validation result with totals
 */
export function validateSplitPayment(
  total: number,
  components: SplitPaymentComponent[]
): {
  valid: boolean;
  totalPaid?: number;
  changeGiven?: number;
  error?: string;
} {
  if (components.length === 0) {
    return { valid: false, error: 'At least one payment component required' };
  }
  if (components.length > 2) {
    return { valid: false, error: 'Maximum 2 payment components allowed' };
  }

  // Validate each component
  for (const component of components) {
    if (component.amount <= 0) {
      return { valid: false, error: `${component.method} amount must be greater than 0` };
    }
    // GCash components require reference
    if (component.method === 'GCash') {
      if (!component.reference) {
        return { valid: false, error: 'GCash reference number is required' };
      }
      const refValidation = validateGCashReference(component.reference);
      if (!refValidation.valid) {
        return { valid: false, error: refValidation.error };
      }
    }
  }

  // Calculate total paid
  const totalPaid = components.reduce((sum, c) => sum + c.amount, 0);
  const roundedTotal = Math.round(totalPaid * 100) / 100;

  if (roundedTotal < total) {
    const shortfall = Math.round((total - roundedTotal) * 100) / 100;
    return {
      valid: false,
      error: `Insufficient payment. Need ${shortfall.toFixed(2)} more`,
    };
  }

  // Calculate change from the excess payment amount
  // Change is given when total paid exceeds the transaction total
  const changeGiven = Math.round((roundedTotal - total) * 100) / 100;

  return { valid: true, totalPaid: roundedTotal, changeGiven };
}

/**
 * Parse split payment JSON from paymentInfo field
 * @param paymentInfo - JSON string from transaction
 * @returns Parsed split payment or null if invalid
 */
export function parseSplitPayment(paymentInfo: string): SplitPayment | null {
  try {
    const parsed = JSON.parse(paymentInfo);
    const result = splitPaymentSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/**
 * Serialize split payment to JSON string
 * @param splitPayment - Split payment object
 * @returns JSON string for paymentInfo field
 */
export function serializeSplitPayment(splitPayment: SplitPayment): string {
  return JSON.stringify(splitPayment);
}

// ═══════════════════════════════════════════════════════════════════════════════
// IDEMPOTENCY KEY GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate idempotency key for offline transactions
 * Format: {uuid}:{deviceId}:{timestamp}:{hash}
 * @param deviceId - Device identifier
 * @param payload - Transaction payload for hashing
 * @returns Unique idempotency key
 */
export function generateIdempotencyKey(
  deviceId: string,
  payload: Record<string, unknown>
): string {
  const uuid = crypto.randomUUID();
  const timestamp = Date.now();
  const payloadStr = JSON.stringify(payload);
  // Simple hash for deduplication (not cryptographic)
  const hash = simpleHash(payloadStr).toString(16).slice(0, 8);
  return `${uuid}:${deviceId}:${timestamp}:${hash}`;
}

/**
 * Simple non-cryptographic hash function
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
