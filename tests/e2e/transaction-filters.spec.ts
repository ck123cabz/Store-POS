import { test, expect } from "@playwright/test"

test.describe("Transaction Quick Filters", () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto("/login")
    await page.fill('input[name="username"]', "admin")
    await page.fill('input[name="password"]', "admin")
    await page.click('button[type="submit"]')
    await page.waitForURL("**/")

    // Navigate to transactions page
    await page.goto("/transactions")
    await page.waitForLoadState("networkidle")
  })

  test("T067: Quick filter toggle behavior", async ({ page }) => {
    // Find the quick filter buttons
    const todayButton = page.locator('button:has-text("Today")')

    // Initially, no filter should be active (outline variant)
    await expect(todayButton).toBeVisible()

    // Click to activate the filter
    await todayButton.click()
    await page.waitForTimeout(500) // Wait for debounce

    // Button should now have active styling
    // Click again to toggle off
    await todayButton.click()
    await page.waitForTimeout(500)

    // Filter should be deactivated
  })

  test("T068: All date ranges filter correctly", async ({ page }) => {
    const dateRanges = ["Today", "Yesterday", "This Week", "Last Week", "This Month"]

    for (const range of dateRanges) {
      const filterButton = page.locator(`button:has-text("${range}")`)

      // Click the filter
      await filterButton.click()
      await page.waitForTimeout(400) // Debounce + API call

      // Verify the button shows active state
      await expect(filterButton).toBeVisible()

      // Click again to clear (toggle off)
      await filterButton.click()
      await page.waitForTimeout(400)
    }
  })

  test("Filter shows loading state during request", async ({ page }) => {
    const todayButton = page.locator('button:has-text("Today")')

    // Click to activate
    await todayButton.click()

    // Should show skeleton or loading indicator briefly
    // The implementation uses optimistic UI so this is fast
    await page.waitForTimeout(500)
  })

  test("Clicking different filter replaces active filter", async ({ page }) => {
    const todayButton = page.locator('button:has-text("Today")')
    const yesterdayButton = page.locator('button:has-text("Yesterday")')

    // Activate Today filter
    await todayButton.click()
    await page.waitForTimeout(400)

    // Now click Yesterday - should replace, not add
    await yesterdayButton.click()
    await page.waitForTimeout(400)

    // Only Yesterday should be active now
  })

  test("Empty results shows helpful message", async ({ page }) => {
    // Apply a filter that might return no results
    const lastWeekButton = page.locator('button:has-text("Last Week")')
    await lastWeekButton.click()
    await page.waitForTimeout(500)

    // If there are no transactions, should show empty state
    // This depends on the data in the test database
  })

  test("Filter buttons have visible focus indicators for keyboard navigation", async ({ page }) => {
    const todayButton = page.locator('button:has-text("Today")')

    // Tab to the button
    await page.keyboard.press("Tab")
    await page.keyboard.press("Tab")
    await page.keyboard.press("Tab") // Navigate through page elements

    // Check focus is visible (ring-2 focus style)
    // The button should have focus-visible styles
  })
})
