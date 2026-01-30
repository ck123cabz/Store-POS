/**
 * Void transaction constants
 * Part of feature 003-transaction-fixes
 */

/**
 * Valid reasons for voiding a transaction.
 * "Other" requires a custom reason to be provided.
 */
export const VALID_VOID_REASONS = [
  "Wrong Items",
  "Test Transaction",
  "Customer Dispute",
  "Duplicate Entry",
  "Other",
] as const

export type VoidReason = (typeof VALID_VOID_REASONS)[number]

/**
 * Number of days after transaction creation during which it can be voided.
 */
export const VOID_WINDOW_DAYS = 7

/**
 * Milliseconds in the void window (7 days).
 */
export const VOID_WINDOW_MS = VOID_WINDOW_DAYS * 24 * 60 * 60 * 1000
