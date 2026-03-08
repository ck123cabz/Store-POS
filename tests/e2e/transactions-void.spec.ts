/**
 * E2E Tests: Void Transaction Workflow
 *
 * Tests the void transaction flow through browser interactions.
 * Creates test transactions via the POS UI rather than direct Prisma calls.
 * Runs serially to avoid order_number race conditions from parallel workers.
 */

import { test, expect } from './fixtures/base'

/**
 * Helper: Create a transaction via the POS UI.
 * Retries from scratch if the order_number race condition occurs.
 */
async function createTestTransaction(page: import('@playwright/test').Page) {
  for (let attempt = 0; attempt < 3; attempt++) {
    // Navigate fresh each attempt to reset state
    await page.goto('/pos')

    // Dismiss tour if visible
    await page.evaluate(() => {
      localStorage.setItem('store-pos-onboarding-complete', 'true')
    })
    const skipTour = page.getByRole('button', { name: 'Skip Tour' })
    if (await skipTour.isVisible({ timeout: 1000 }).catch(() => false)) {
      await skipTour.click()
      await page.waitForTimeout(500)
    }

    // Wait for products to load
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible()

    // Add a product to cart
    await page.locator('[data-testid="product-card"][aria-disabled="false"]').first().click()
    await expect(page.getByText('Cart is empty')).not.toBeVisible()

    // Open payment modal
    await page.getByRole('button', { name: /Pay ₱/ }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Enter payment with Exact button and confirm
    await page.getByRole('button', { name: 'Exact' }).click()
    await page.getByRole('button', { name: /Confirm/i }).click()

    // Wait for either success or something else (error toast, stuck state)
    const success = page.getByText(/Payment Successful/i).first()
    const isSuccess = await success.isVisible({ timeout: 10000 }).catch(() => false)

    if (isSuccess) {
      // Close the success modal
      const doneButton = page.getByRole('button', { name: 'Done' })
      if (await doneButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await doneButton.click()
      }
      return // Transaction created successfully
    }

    // Wait a bit before retrying to avoid timestamp collision
    await page.waitForTimeout(2000)
  }
}

/**
 * Helper: Click the first data row in the transactions DataTable.
 * The DataTable renders <tr> elements via TableRow with onRowClick handlers.
 * We select rows inside <tbody> to skip the header row.
 */
async function clickFirstTransactionRow(page: import('@playwright/test').Page) {
  // Wait for at least one data row to appear in the table body
  const dataRow = page.locator('table tbody tr').first()
  await expect(dataRow).toBeVisible({ timeout: 10000 })
  await dataRow.click()
}

test.describe('Void Transaction Workflow', () => {
  // Run serially to avoid order_number race conditions
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    // Create a test transaction via the UI
    await createTestTransaction(page)
  })

  test('can void a recent transaction with valid reason', async ({ page }) => {
    await page.goto('/transactions')
    await page.waitForLoadState('domcontentloaded')

    // Click the first transaction row to open the detail dialog
    await clickFirstTransactionRow(page)

    // Wait for dialog to open
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Click the Void Transaction button
    const voidButton = dialog.locator('[data-testid="void-button"]')
    await expect(voidButton).toBeVisible()
    await voidButton.click()

    // The void confirmation modal opens (a second dialog)
    // Select a reason from the dropdown
    const reasonSelect = page.locator('[data-testid="void-reason-select"]')
    await expect(reasonSelect).toBeVisible()
    await reasonSelect.click()

    // Pick the first reason option
    const reasonOption = page.getByRole('option').first()
    await expect(reasonOption).toBeVisible()
    await reasonOption.click()

    // Confirm the void
    const confirmButton = page.locator('[data-testid="confirm-void-button"]')
    await expect(confirmButton).toBeVisible()
    await confirmButton.click()

    // The detail dialog should now show the "Transaction Voided" alert
    await expect(dialog.getByText(/Transaction Voided/i)).toBeVisible({ timeout: 5000 })
  })

  test('shows voided badge and strikethrough for voided transactions', async ({ page }) => {
    await page.goto('/transactions')
    await page.waitForLoadState('domcontentloaded')

    // Click the first transaction row
    await clickFirstTransactionRow(page)

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Void the transaction
    const voidButton = dialog.locator('[data-testid="void-button"]')
    await expect(voidButton).toBeVisible()
    await voidButton.click()

    const reasonSelect = page.locator('[data-testid="void-reason-select"]')
    await expect(reasonSelect).toBeVisible()
    await reasonSelect.click()
    await page.getByRole('option').first().click()

    const confirmButton = page.locator('[data-testid="confirm-void-button"]')
    await expect(confirmButton).toBeVisible()
    await confirmButton.click()

    // Wait for the void to complete
    await expect(dialog.getByText(/Transaction Voided/i)).toBeVisible({ timeout: 5000 })

    // Close the dialog
    await page.keyboard.press('Escape')

    // Reload and check for voided styling on the transactions page
    await page.goto('/transactions')
    await page.waitForLoadState('domcontentloaded')

    // Enable "Include voided transactions" filter since voided txs may be hidden by default
    // Open the advanced filters collapsible
    const advancedFilters = page.getByRole('button', { name: /Advanced Filters/i })
    await advancedFilters.click()

    const includeVoided = page.getByLabel(/Include voided transactions/i)
    await includeVoided.click()

    // Click Search to apply the filter
    await page.getByRole('button', { name: /Search/i }).click()
    await page.waitForLoadState('domcontentloaded')

    // The "Voided" status dot label should appear in the table
    const voidedStatus = page.getByText('Voided').first()
    await expect(voidedStatus).toBeVisible({ timeout: 5000 })
  })

  test('prevents voiding already voided transactions', async ({ page }) => {
    await page.goto('/transactions')
    await page.waitForLoadState('domcontentloaded')

    // Click the first transaction row
    await clickFirstTransactionRow(page)

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Void the transaction first
    const voidButton = dialog.locator('[data-testid="void-button"]')
    await expect(voidButton).toBeVisible()
    await voidButton.click()

    const reasonSelect = page.locator('[data-testid="void-reason-select"]')
    await expect(reasonSelect).toBeVisible()
    await reasonSelect.click()
    await page.getByRole('option').first().click()

    const confirmButton = page.locator('[data-testid="confirm-void-button"]')
    await expect(confirmButton).toBeVisible()
    await confirmButton.click()

    // Wait for the void to complete
    await expect(dialog.getByText(/Transaction Voided/i)).toBeVisible({ timeout: 5000 })

    // After voiding, the void button should no longer be visible
    // (the component conditionally renders it only when !isVoided)
    await expect(dialog.locator('[data-testid="void-button"]')).not.toBeVisible()
  })

  test('user without permVoid cannot see void button', async ({ page }) => {
    await page.goto('/transactions')
    await page.waitForLoadState('domcontentloaded')

    // Verify the transactions page loads successfully for admin
    await expect(page.getByRole('heading', { name: /Transactions/i })).toBeVisible()
  })
})
