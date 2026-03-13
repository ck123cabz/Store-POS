import { DEFAULT_VOID_WINDOW_DAYS, DEFAULT_VOID_REASONS, VOID_WINDOW_DAYS } from "./void-constants"

export { VOID_WINDOW_DAYS }

type ValidationResult = { valid: true } | { valid: false; error: string }

/**
 * Validates the void reason against a list of valid reasons.
 * - Must be one of the provided reasons (or defaults)
 * - If "Other", customReason must be provided
 */
export function validateVoidReason(
  reason: string,
  customReason?: string,
  validReasons: readonly string[] = DEFAULT_VOID_REASONS
): ValidationResult {
  if (!validReasons.includes(reason)) {
    return { valid: false, error: "Invalid void reason" }
  }

  if (reason === "Other" && !customReason?.trim()) {
    return { valid: false, error: "Custom reason required when selecting 'Other'" }
  }

  return { valid: true }
}

/**
 * Validates the transaction is within the void window.
 * @param createdAt - Transaction creation date
 * @param windowDays - Number of days in the void window (default from settings)
 */
export function validateVoidWindow(
  createdAt: Date,
  windowDays: number = DEFAULT_VOID_WINDOW_DAYS
): ValidationResult {
  const windowMs = windowDays * 24 * 60 * 60 * 1000
  const transactionAge = Date.now() - new Date(createdAt).getTime()

  if (transactionAge > windowMs) {
    return {
      valid: false,
      error: `Transaction is older than ${windowDays} days and cannot be voided`,
    }
  }

  return { valid: true }
}

/**
 * Validates the transaction is not already voided.
 */
export function validateNotAlreadyVoided(isVoided: boolean): ValidationResult {
  if (isVoided) {
    return { valid: false, error: "Transaction is already voided" }
  }

  return { valid: true }
}

/**
 * Formats the void reason for storage.
 * If "Other", includes the custom reason.
 */
export function formatVoidReason(reason: string, customReason?: string): string {
  if (reason === "Other" && customReason) {
    return `Other: ${customReason.trim()}`
  }
  return reason
}
