/**
 * Badge count formatting utilities
 * Used for sidebar badges and notification counts
 */

const BADGE_MAX_DISPLAY = 99;

/**
 * Formats a badge count for display
 * - Returns "99+" for counts >= 100
 * - Returns "0" for negative numbers
 * - Rounds down decimal values
 *
 * @param count - The count to format
 * @returns Formatted string for badge display
 */
export function formatBadgeCount(count: number): string {
  const normalizedCount = Math.floor(count);

  if (normalizedCount < 0) {
    return "0";
  }

  if (normalizedCount > BADGE_MAX_DISPLAY) {
    return "99+";
  }

  return normalizedCount.toString();
}

/**
 * Determines if a badge should be shown based on count
 * Returns false for 0 or negative counts (EC-08)
 *
 * @param count - The count to check
 * @returns Boolean indicating if badge should be visible
 */
export function shouldShowBadge(count: number): boolean {
  return count > 0;
}
