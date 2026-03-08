/**
 * E2E Tests: Transaction Currency Display
 *
 * Verifies that the correct currency symbol (peso) is displayed
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
    await page.waitForLoadState('domcontentloaded')

    // The page heading should be visible (proves the page loaded)
    await expect(page.getByRole('heading', { name: /Transactions/i })).toBeVisible()

    // Check that the summary card for "Today's Revenue" shows the peso symbol.
    // SummaryCard renders the value as a <span> with font-mono tabular-nums.
    // The label is "Today's Revenue" and the value should contain "₱".
    const revenueCard = page.locator('[data-testid="today-revenue"]')
    await expect(revenueCard).toBeVisible({ timeout: 10000 })
    const revenueText = await revenueCard.textContent()
    expect(revenueText).toContain('₱')
    expect(revenueText).not.toContain('$')
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
    await page.waitForLoadState('domcontentloaded')

    // Click the first data row in the table to open transaction detail dialog
    const dataRow = page.locator('table tbody tr').first()
    await expect(dataRow).toBeVisible({ timeout: 10000 })
    await dataRow.click()

    // Check dialog opens and shows peso symbol
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    const dialogText = await dialog.textContent()
    expect(dialogText).toContain('₱')
    expect(dialogText).not.toContain('$100') // Should not have dollar amounts
  })

  test('displays currency symbol in table total column', async ({ page }) => {
    // First create a transaction so we have data to verify
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

    await page.locator('[data-testid="product-card"][aria-disabled="false"]').first().click()
    await page.getByRole('button', { name: /Pay ₱/ }).click()
    await page.getByRole('button', { name: 'Exact' }).click()
    await page.getByRole('button', { name: /Confirm/i }).click()
    await expect(page.getByText(/Payment Successful/i).first()).toBeVisible({ timeout: 10000 })
    const doneButton = page.getByRole('button', { name: 'Done' })
    if (await doneButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await doneButton.click()
    }

    // Navigate to transactions page
    await page.goto('/transactions')
    await page.waitForLoadState('domcontentloaded')

    // The "Total" column cells use data-testid="transaction-total" and should contain peso symbol
    const totalCells = page.locator('[data-testid="transaction-total"]')
    const count = await totalCells.count()
    expect(count).toBeGreaterThan(0)

    // Check the first total cell contains the peso symbol
    const firstTotalText = await totalCells.first().textContent()
    expect(firstTotalText).toContain('₱')
    expect(firstTotalText).not.toContain('$')
  })
})
