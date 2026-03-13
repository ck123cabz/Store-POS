/**
 * Void transaction defaults
 * These values are used as fallbacks when settings haven't been loaded.
 * Runtime values come from Settings (see getSettings()).
 */

/**
 * Default valid reasons for voiding a transaction.
 */
export const DEFAULT_VOID_REASONS = [
  "Wrong Items",
  "Test Transaction",
  "Customer Dispute",
  "Duplicate Entry",
  "Other",
] as const

/**
 * @deprecated Use settings.voidReasons instead. Kept for backward compatibility.
 */
export const VALID_VOID_REASONS = DEFAULT_VOID_REASONS

export type VoidReason = string

/**
 * Default number of days after transaction creation during which it can be voided.
 */
export const DEFAULT_VOID_WINDOW_DAYS = 7

/**
 * @deprecated Use settings.voidWindowDays instead. Kept for backward compatibility.
 */
export const VOID_WINDOW_DAYS = DEFAULT_VOID_WINDOW_DAYS

/**
 * @deprecated Compute from settings.voidWindowDays instead.
 */
export const VOID_WINDOW_MS = VOID_WINDOW_DAYS * 24 * 60 * 60 * 1000
