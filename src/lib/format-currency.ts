/**
 * Format a number or Decimal as currency with the specified symbol.
 *
 * @param amount - The amount to format (number, string, or Decimal)
 * @param symbol - Currency symbol (default: "$")
 * @returns Formatted currency string (e.g., "₱123.45")
 */
export function formatCurrency(
  amount: number | string | { toString(): string } | null | undefined,
  symbol: string = "$"
): string {
  if (amount === null || amount === undefined) {
    return `${symbol}0.00`
  }

  const numericAmount =
    typeof amount === "number" ? amount : parseFloat(amount.toString())

  if (isNaN(numericAmount)) {
    return `${symbol}0.00`
  }

  // Format with 2 decimal places and thousands separators
  const formatted = numericAmount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return `${symbol}${formatted}`
}
