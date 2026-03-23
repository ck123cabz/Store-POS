/**
 * Employee status transition map and validation.
 * Single source of truth for both server-side API validation
 * and client-side UI dropdown rendering.
 */

export const VALID_TRANSITIONS: Record<string, string[]> = {
  Active: ["Inactive", "Terminated"],
  Inactive: ["Active", "Terminated"],
  Terminated: ["Active"],
}

/**
 * Check whether a status transition is allowed.
 */
export function isValidTransition(from: string, to: string): boolean {
  if (from === to) return true
  const allowed = VALID_TRANSITIONS[from]
  return allowed ? allowed.includes(to) : false
}

/**
 * Get the list of statuses an employee can transition to
 * from their current status.
 */
export function getValidNextStates(current: string): string[] {
  return VALID_TRANSITIONS[current] ?? []
}
