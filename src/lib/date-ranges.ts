/**
 * Date range calculation utilities
 * Used for transaction quick filters
 */

export type DateRangeType =
  | "Today"
  | "Yesterday"
  | "This Week"
  | "Last Week"
  | "This Month";

export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Gets the start of a day (00:00:00.000)
 */
function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Gets the end of a day (23:59:59.999)
 */
function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Gets the start of the week (Sunday)
 */
function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - day);
  return startOfDay(result);
}

/**
 * Gets the start of the month
 */
function startOfMonth(date: Date): Date {
  const result = new Date(date);
  result.setDate(1);
  return startOfDay(result);
}

/**
 * Calculates date range for quick filter buttons
 * Based on Clarifications section in spec.md for timezone handling
 *
 * @param rangeType - The type of date range to calculate
 * @param referenceDate - Optional reference date (defaults to now)
 * @returns DateRange with start and end dates
 */
export function getDateRange(
  rangeType: DateRangeType,
  referenceDate: Date = new Date()
): DateRange {
  const today = new Date(referenceDate);

  switch (rangeType) {
    case "Today":
      return {
        start: startOfDay(today),
        end: endOfDay(today),
      };

    case "Yesterday": {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        start: startOfDay(yesterday),
        end: endOfDay(yesterday),
      };
    }

    case "This Week": {
      return {
        start: startOfWeek(today),
        end: endOfDay(today),
      };
    }

    case "Last Week": {
      const lastWeekEnd = new Date(today);
      const dayOfWeek = lastWeekEnd.getDay();
      // Go to last Saturday
      lastWeekEnd.setDate(lastWeekEnd.getDate() - dayOfWeek - 1);

      const lastWeekStart = new Date(lastWeekEnd);
      lastWeekStart.setDate(lastWeekStart.getDate() - 6);

      return {
        start: startOfDay(lastWeekStart),
        end: endOfDay(lastWeekEnd),
      };
    }

    case "This Month": {
      return {
        start: startOfMonth(today),
        end: endOfDay(today),
      };
    }

    default:
      // Default to today
      return {
        start: startOfDay(today),
        end: endOfDay(today),
      };
  }
}

/**
 * Gets a descriptive label for the date range type
 *
 * @param rangeType - The type of date range
 * @returns Human-readable label
 */
export function formatDateRangeLabel(rangeType: DateRangeType): string {
  return rangeType;
}

/**
 * Checks if a date falls within a date range
 *
 * @param date - The date to check
 * @param range - The date range to check against
 * @returns Boolean indicating if date is in range
 */
export function isDateInRange(date: Date, range: DateRange): boolean {
  const timestamp = date.getTime();
  return timestamp >= range.start.getTime() && timestamp <= range.end.getTime();
}

/**
 * All available quick filter options
 */
export const DATE_RANGE_OPTIONS: DateRangeType[] = [
  "Today",
  "Yesterday",
  "This Week",
  "Last Week",
  "This Month",
];
