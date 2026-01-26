/**
 * Base E2E Test Fixtures
 * Extends Playwright's test with custom fixtures
 */

import { test as base, expect } from '@playwright/test'

// Custom fixture types
interface TestFixtures {
  /**
   * Navigate to POS page and wait for products to load
   */
  posPage: void

  /**
   * Navigate to products page
   */
  productsPage: void

  /**
   * Navigate to inventory count page
   */
  inventoryCountPage: void
}

export const test = base.extend<TestFixtures>({
  posPage: async ({ page }, use) => {
    await page.goto('/pos')

    // Ensure onboarding is marked complete (backup in case auth setup didn't persist it)
    await page.evaluate(() => {
      localStorage.setItem('store-pos-onboarding-complete', 'true')
    })

    // If tour modal is visible, dismiss it
    const skipTour = page.getByRole('button', { name: 'Skip Tour' })
    if (await skipTour.isVisible({ timeout: 1000 }).catch(() => false)) {
      await skipTour.click()
      // Wait for the overlay to be hidden or unmounted
      await page.waitForFunction(() => {
        return !document.querySelector('[class*="fixed"][class*="inset-0"][class*="bg-black"]')
      }, { timeout: 5000 }).catch(() => {})
    }

    // Wait for products to load (either products or "All" category button)
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible()
    await use()
  },

  productsPage: async ({ page }, use) => {
    await page.goto('/products')
    await expect(page.getByRole('heading', { name: /products/i })).toBeVisible()
    await use()
  },

  inventoryCountPage: async ({ page }, use) => {
    await page.goto('/ingredients/count')
    await expect(page.getByRole('heading', { name: /inventory count/i })).toBeVisible()
    await use()
  },
})

export { expect }
