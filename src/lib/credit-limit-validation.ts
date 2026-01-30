/**
 * Credit Limit Validation
 * US3: Tab Payment (Store Credit) at POS
 *
 * Validates tab payments against customer credit limits and tab status
 */

export type TabStatus = "active" | "suspended" | "frozen"
export type CreditWarningLevel = "ok" | "warning" | "exceeded"

export interface TabPaymentInput {
  /** Amount to charge to tab */
  amount: number
  /** Customer's current tab balance */
  currentBalance: number
  /** Customer's credit limit */
  creditLimit: number
  /** Current status of the customer's tab */
  tabStatus: TabStatus
  /** Allow override of credit limit (requires manager permission) */
  allowOverride?: boolean
}

export interface TabPaymentValidation {
  /** Whether the payment is valid */
  valid: boolean
  /** Error message if not valid */
  error?: string
  /** New balance after payment (if valid) */
  newBalance?: number
  /** Amount that would exceed the limit (if exceeding) */
  wouldExceedBy?: number
  /** Whether an override was applied */
  overrideApplied?: boolean
}

/**
 * Validate a tab payment against credit limit and tab status
 */
export function validateTabPayment(input: TabPaymentInput): TabPaymentValidation {
  const {
    amount,
    currentBalance,
    creditLimit,
    tabStatus,
    allowOverride = false,
  } = input

  // Validate amount is positive
  if (amount <= 0) {
    return {
      valid: false,
      error: "Payment amount must be positive",
    }
  }

  // Check tab status
  if (tabStatus === "suspended") {
    return {
      valid: false,
      error: "Tab is suspended. Cannot charge to this account.",
    }
  }

  if (tabStatus === "frozen") {
    return {
      valid: false,
      error: "Tab is frozen. Cannot charge to this account.",
    }
  }

  // Check if customer has any credit limit
  if (creditLimit === 0) {
    return {
      valid: false,
      error: "Customer has no credit limit set. Tab payments not allowed.",
    }
  }

  // Calculate new balance using precise decimal arithmetic
  const newBalance = roundToTwoDecimals(currentBalance + amount)

  // Check if this would exceed the credit limit
  if (newBalance > creditLimit) {
    const wouldExceedBy = roundToTwoDecimals(newBalance - creditLimit)

    // Allow override for managers
    if (allowOverride) {
      return {
        valid: true,
        newBalance,
        overrideApplied: true,
      }
    }

    return {
      valid: false,
      error: `This payment would exceed the credit limit by ${wouldExceedBy.toFixed(2)}`,
      wouldExceedBy,
    }
  }

  return {
    valid: true,
    newBalance,
  }
}

/**
 * Calculate credit usage as a percentage
 * @returns Percentage of credit limit used (0-100+)
 */
export function calculateCreditUsage(balance: number, creditLimit: number): number {
  if (creditLimit === 0) {
    return balance === 0 ? 0 : Infinity
  }

  const percentage = (balance / creditLimit) * 100
  // Round to 1 decimal place
  return Math.round(percentage * 10) / 10
}

/**
 * Check if credit limit has been exceeded
 */
export function isCreditLimitExceeded(balance: number, creditLimit: number): boolean {
  return balance > creditLimit
}

/**
 * Get the warning level for current credit usage
 * - "ok": Under 80% usage
 * - "warning": 80-99% usage
 * - "exceeded": At or over 100% usage
 */
export function getCreditWarningLevel(
  balance: number,
  creditLimit: number
): CreditWarningLevel {
  if (creditLimit === 0) {
    return balance > 0 ? "exceeded" : "ok"
  }

  const usage = calculateCreditUsage(balance, creditLimit)

  if (usage >= 100) {
    return "exceeded"
  }

  if (usage >= 80) {
    return "warning"
  }

  return "ok"
}

/**
 * Round a number to two decimal places to avoid floating point issues
 */
function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100
}
