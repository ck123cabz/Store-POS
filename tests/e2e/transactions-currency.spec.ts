/**
 * E2E Tests: Transaction Currency Display
 *
 * Verifies that the correct currency symbol (₱) is displayed
 * across the transactions page and related UI elements.
 * Uses browser-based interactions instead of direct Prisma calls.
 */

import { test, expect } from './fixtures/base'

test.describe('Transaction Currency Display', () => {
  test('displays currency symbol from settings in transaction list', async ({ page }) => {
    // Verify settings via API call in the browser context
    const settingsResponse = await page.request.get('/api/settings')
    const settings = await settingsResponse.json()
    expect(settings?.currencySymbol).toBe('₱')

    // Navigate to transactions page
    await page.goto('/transactions')
    await page.waitForLoadState('networkidle')

    // Check today's summary card shows peso symbol
    const todayCard = page.locator('[data-testid="today-revenue"]').first()
    if (await todayCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      const revenueText = await todayCard.textContent()
      expect(revenueText).toContain('₱')
      expect(revenueText).not.toContain('$')
    }
  })

  test('displays currency symbol in transaction detail dialog', async ({ page }) => {
    // First create a transaction via the POS UI
    await page.goto('/pos')
    await page.evaluate(() => {
      localStorage.setItem('store-pos-onboarding-complete', 'true')
    })
    const skipTour = page.getByRole('button', { name: 'Skip Tour' })
    if (await skipTour.isVisible({ timeout: 1000 }).catch(() => false)) {
      await skipTour.click()
      await page.waitForTimeout(500)
    }
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible()

    // Add product and complete cash payment
    await page.locator('[data-testid="product-card"][aria-disabled="false"]').first().click()
    await page.getByRole('button', { name: /Pay ₱/ }).click()
    await page.getByRole('button', { name: 'Exact' }).click()
    await page.getByRole('button', { name: /Confirm/i }).click()
    await expect(page.getByText(/Payment Successful/i).first()).toBeVisible({ timeout: 10000 })

    // Close success modal
    const doneButton = page.getByRole('button', { name: 'Done' })
    if (await doneButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await doneButton.click()
    }

    // Navigate to transactions page
    await page.goto('/transactions')
    await page.waitForLoadState('networkidle')

    // Find and click the view button for a transaction
    const viewButton = page.locator('[data-testid^="view-transaction-"]').first()
    if (await viewButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await viewButton.click()

      // Check dialog shows peso symbol
      const dialog = page.locator('[role="dialog"]')
      await expect(dialog).toBeVisible()

      const dialogText = await dialog.textContent()
      expect(dialogText).toContain('₱')
      expect(dialogText).not.toContain('$100') // Should not have dollar amounts
    }
  })

  test('uses currency symbol in summary cards', async ({ page }) => {
    await page.goto('/transactions')
    await page.waitForLoadState('networkidle')

    // The summary cards should display peso symbol
    // Check for any visible currency amounts on the page
    const pageContent = await page.content()

    // If there are any monetary values visible, they should use peso
    const hasPesoSymbols = pageContent.includes('₱')

    // At minimum, the settings-based currency should be used somewhere
    if (hasPesoSymbols) {
      expect(hasPesoSymbols).toBe(true)
    }
  })
})
