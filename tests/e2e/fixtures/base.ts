/**
 * Base E2E Test Fixtures
 * Extends Playwright's test with custom fixtures
 */

/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, expect, type Page, type Locator } from '@playwright/test'

// 1x1 transparent PNG for GCash photo upload tests
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAB' +
  'Nl7BcQAAAABJRU5ErkJggg==',
  'base64'
)

/**
 * POS Page Object - centralizes selectors for POS UI elements
 */
export class POSPage {
  constructor(private page: Page) {}

  /**
   * Get the cart item count badge locator
   * UI shows: "N item" (singular) or "N items" (plural/zero)
   */
  cartItemCount(count: number): Locator {
    if (count === 1) {
      return this.page.getByText(/1 item(?!s)/)
    }
    return this.page.getByText(new RegExp(`${count} items`))
  }

  /**
   * Get the Pay Now button - used for immediate payment
   */
  payNowButton(): Locator {
    return this.page.getByRole('button', { name: /Pay Now/ })
  }

  /**
   * Get the Pay Later button - used for kitchen orders/deferred payment
   */
  payLaterButton(): Locator {
    return this.page.getByRole('button', { name: /Pay Later/ })
  }

  /**
   * Get the Clear button (clears the cart)
   */
  clearButton(): Locator {
    return this.page.getByRole('button', { name: 'Clear' })
  }

  /**
   * Assert cart shows specific item count
   */
  async expectCartItemCount(count: number): Promise<void> {
    await expect(this.cartItemCount(count)).toBeVisible()
  }

  /**
   * Open payment modal by clicking Pay Now
   */
  async openPaymentModal(): Promise<void> {
    await this.payNowButton().click()
    await expect(this.page.getByRole('dialog')).toBeVisible()
  }

  /**
   * Add a product to cart by clicking its name
   */
  async addProductByName(name: string): Promise<void> {
    await this.page.getByText(name, { exact: true }).click()
  }

  /**
   * Add first available product to cart
   */
  async addFirstProduct(): Promise<void> {
    await this.page.locator('[data-testid="product-card"][aria-disabled="false"]').first().click()
  }

  /**
   * Upload a GCash photo via the hidden file input in GCash camera component.
   * This simulates the "Upload Photo" flow since camera is unavailable in headless.
   */
  async uploadGCashPhoto(): Promise<void> {
    const fileInput = this.page.locator('input[type="file"][accept="image/*"]')
    await fileInput.setInputFiles({
      name: 'gcash-receipt.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    })
    // Wait for preview mode, then click "Use Photo"
    await this.page.getByRole('button', { name: /Use Photo/i }).click()
    // Verify the confirmation text appears
    await expect(this.page.getByText(/Payment screenshot captured/i)).toBeVisible()
  }
}

// Custom fixture types
interface TestFixtures {
  /**
   * Navigate to POS page and wait for products to load
   */
  posPage: void

  /**
   * POS page object with helper methods
   */
  pos: POSPage

  /**
   * Navigate to products page
   */
  productsPage: void

  /**
   * Navigate to inventory count page
   */
  inventoryCountPage: void

  /**
   * Navigate to customers page
   */
  customersPage: void

  /**
   * Navigate to menu page and wait for content to load
   */
  menuPage: void
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

  pos: async ({ page }, use) => {
    await use(new POSPage(page))
  },

  productsPage: async ({ page }, use) => {
    await page.goto('/products')
    await expect(page.getByRole('heading', { name: /products/i })).toBeVisible()
    await use()
  },

  inventoryCountPage: async ({ page }, use) => {
    // Inventory count page can be slow due to database queries
    await page.goto('/ingredients/count', { timeout: 60000 })
    // Wait for the page to fully load by checking for the main heading
    await expect(
      page.getByRole('heading', { name: 'Inventory Count', exact: true })
    ).toBeVisible({ timeout: 30000 })
    await use()
  },

  customersPage: async ({ page }, use) => {
    await page.goto('/customers')
    // Wait for the customers page to load
    await expect(page.getByRole('heading', { name: /customers/i })).toBeVisible()
    await use()
  },

  menuPage: async ({ page }, use) => {
    await page.goto('/menu')
    // Wait for Products tab to be visible (default active tab)
    await expect(page.getByRole('tab', { name: 'Products' })).toBeVisible()
    // Wait for loading to finish - the page fetches products, categories, and settings
    await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 })
    await use()
  },
})

export { expect }
