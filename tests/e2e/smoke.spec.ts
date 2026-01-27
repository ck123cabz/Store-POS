/**
 * P0 Smoke Tests
 * Quick validation that core app functionality works
 * Run time target: <2 minutes
 */

import { test, expect } from './fixtures/base'

// Helper to ensure tour is dismissed
async function ensureTourDismissed(page: import('@playwright/test').Page) {
  // Ensure onboarding is marked complete in localStorage
  await page.evaluate(() => {
    localStorage.setItem('store-pos-onboarding-complete', 'true')
  })

  // If tour modal is still visible (from cache), dismiss it
  const skipTour = page.getByRole('button', { name: 'Skip Tour' })
  if (await skipTour.isVisible({ timeout: 1000 }).catch(() => false)) {
    await skipTour.click()
    await page.waitForFunction(() => {
      return !document.querySelector('[class*="fixed"][class*="inset-0"][class*="bg-black"]')
    }, { timeout: 5000 }).catch(() => {})
  }
}

test.describe('Smoke Tests @smoke @p0', () => {
  test('app loads without errors', async ({ page }) => {
    await page.goto('/')

    // Should redirect to /pos (default dashboard)
    await expect(page).toHaveURL(/\/pos/)

    // Dismiss tour if visible
    await ensureTourDismissed(page)

    // No error dialogs should be present (excluding the welcome tour)
    await expect(page.locator('[role="alertdialog"]')).not.toBeVisible()

    // Check for console errors
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    // Navigate around to trigger potential errors
    await page.waitForTimeout(1000)

    // Filter out expected errors (like missing optional services)
    const criticalErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('NEXT_PUBLIC')
    )

    expect(criticalErrors).toHaveLength(0)
  })

  test('user is authenticated', async ({ page }) => {
    await page.goto('/pos')
    await ensureTourDismissed(page)

    // User info should be visible in header
    await expect(page.getByText(/Administrator/i)).toBeVisible()
  })

  test('POS page displays products', async ({ page, posPage }) => {
    // posPage fixture navigates to /pos and dismisses tour

    // Category filter should be visible
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible()

    // Products should be visible (look for product names or prices)
    await expect(page.getByText(/Burger Steak|Gatorade|Tocilog|Iced Coffee/i).first()).toBeVisible()
  })

  test('navigation sidebar works', async ({ page }) => {
    await page.goto('/pos')
    await ensureTourDismissed(page)

    // Test navigation to key pages
    await page.getByRole('link', { name: 'Products' }).click()
    await expect(page).toHaveURL('/products')

    await page.getByRole('link', { name: 'Transactions' }).click()
    await expect(page).toHaveURL('/transactions')

    await page.getByRole('link', { name: 'Ingredients' }).click()
    await expect(page).toHaveURL('/ingredients')
  })

  test('transaction can be created', async ({ page, posPage }) => {
    // posPage fixture navigates to /pos and dismisses tour

    // Verify cart starts empty (new UI shows "0 items" in Current Order header)
    await expect(page.getByText('0 items')).toBeVisible()

    // Click first product to add to cart
    await page.getByText('Burger Steak').click()

    // Cart should update to show 1 item
    await expect(page.getByText('1 item')).toBeVisible()

    // Pay button should be enabled (now shows "Pay ₱X.XX")
    const payButton = page.getByRole('button', { name: /Pay/ })
    await expect(payButton).toBeEnabled()
  })
})
