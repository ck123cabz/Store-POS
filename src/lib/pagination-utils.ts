type PageItem = number | "..."

/**
 * Generates a page number array with ellipsis for pagination display.
 *
 * Always shows first page, last page, and a window around the current page.
 * Example: [1, 2, "...", 5, 6, 7, "...", 10]
 */
export function generatePageNumbers(
  current: number,
  total: number,
  siblings: number = 1
): PageItem[] {
  if (total <= 1) return [1]

  const items: PageItem[] = []

  // Calculate the range around the current page
  const rangeStart = Math.max(2, current - siblings)
  const rangeEnd = Math.min(total - 1, current + siblings)

  // Always add page 1
  items.push(1)

  // Add ellipsis before range if needed
  if (rangeStart > 2) {
    items.push("...")
  }

  // Add range pages
  for (let i = rangeStart; i <= rangeEnd; i++) {
    items.push(i)
  }

  // Add ellipsis after range if needed
  if (rangeEnd < total - 1) {
    items.push("...")
  }

  // Always add last page
  if (total > 1) {
    items.push(total)
  }

  return items
}

export type { PageItem }
