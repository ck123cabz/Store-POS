import { VALID_VOID_REASONS, VOID_WINDOW_MS, VOID_WINDOW_DAYS } from "./void-constants"

export { VOID_WINDOW_DAYS }

type ValidationResult = { valid: true } | { valid: false; error: string }

/**
 * Validates the void reason.
 * - Must be one of VALID_VOID_REASONS
 * - If "Other", customReason must be provided
 */
export function validateVoidReason(
  reason: string,
  customReason?: string
): ValidationResult {
  if (!VALID_VOID_REASONS.includes(reason as typeof VALID_VOID_REASONS[number])) {
    return { valid: false, error: "Invalid void reason" }
  }

  if (reason === "Other" && !customReason?.trim()) {
    return { valid: false, error: "Custom reason required when selecting 'Other'" }
  }

  return { valid: true }
}

/**
 * Validates the transaction is within the void window (7 days).
 */
export function validateVoidWindow(createdAt: Date): ValidationResult {
  const transactionAge = Date.now() - new Date(createdAt).getTime()

  if (transactionAge > VOID_WINDOW_MS) {
    return {
      valid: false,
      error: "Transaction is older than 7 days and cannot be voided",
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
