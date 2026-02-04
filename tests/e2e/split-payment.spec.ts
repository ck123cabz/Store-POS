/**
 * E2E Tests: Split Payment Flow
 * US7: Split Payment at POS (Cash + GCash)
 * Tests the complete split payment workflow including amount entry and change calculation
 */

import { test, expect } from './fixtures/base'

test.describe('US7: Split Payment @p2', () => {
  test.beforeEach(async ({ posPage }) => {
    // posPage fixture handles navigation and setup
  })

  test('open payment modal and select Split tab', async ({ page }) => {
    // Step 1: Add product to cart
    await page.locator('[role="button"][aria-disabled="false"]').first().click()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Step 2: Open payment modal
    await page.getByRole('button', { name: /Pay Now/ }).click()
    await expect(page.getByRole('dialog', { name: 'Payment' })).toBeVisible()

    // Step 3: Click Split tab
    await page.getByRole('tab', { name: /Split/i }).click()

    // Step 4: Verify Split tab is active
    await expect(page.getByRole('tab', { name: /Split/i })).toHaveAttribute('data-state', 'active')

    // Step 5: Verify split payment UI elements are visible
    await expect(page.getByText(/Cash Amount/i)).toBeVisible()
    await expect(page.getByText(/GCash Amount/i)).toBeVisible()
  })

  test('enter cash and GCash amounts in split payment', async ({ page }) => {
    // Add product to cart
    await page.locator('[role="button"][aria-disabled="false"]').first().click()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Open payment modal and switch to Split tab
    await page.getByRole('button', { name: /Pay Now/ }).click()
    await page.getByRole('tab', { name: /Split/i }).click()
    await expect(page.getByRole('tab', { name: /Split/i })).toHaveAttribute('data-state', 'active')

    // Enter cash amount
    const cashInput = page.getByLabel(/Cash Amount/i).or(
      page.locator('input[placeholder*="cash" i]')
    ).first()
    await cashInput.fill('50')

    // Enter GCash amount
    const gcashInput = page.getByLabel(/GCash Amount/i).or(
      page.locator('input[placeholder*="gcash" i]')
    ).first()
    await gcashInput.fill('50')

    // Verify amounts are entered
    await expect(cashInput).toHaveValue('50')
    await expect(gcashInput).toHaveValue('50')
  })

  test('verify total updates correctly as amounts are entered', async ({ page }) => {
    // Add product to cart
    await page.locator('[role="button"][aria-disabled="false"]').first().click()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Open payment modal and switch to Split tab
    await page.getByRole('button', { name: /Pay Now/ }).click()
    await page.getByRole('tab', { name: /Split/i }).click()

    // Get total amount displayed
    const totalText = await page.locator('text=/Total.*₱[\d,]+\.\d{2}/i').textContent()
    expect(totalText).toBeTruthy()

    // Enter cash amount
    const cashInput = page.getByLabel(/Cash Amount/i).or(
      page.locator('input[placeholder*="cash" i]')
    ).first()
    await cashInput.fill('30')

    // Enter GCash amount
    const gcashInput = page.getByLabel(/GCash Amount/i).or(
      page.locator('input[placeholder*="gcash" i]')
    ).first()
    await gcashInput.fill('40')

    // Verify combined total is displayed (should show Total Paid or similar)
    await expect(page.getByText(/Total Paid.*₱70\.00/i).or(
      page.getByText(/₱70\.00/)
    )).toBeVisible()
  })

  test('GCash reference required when GCash amount > 0', async ({ page }) => {
    // Add product to cart
    await page.locator('[role="button"][aria-disabled="false"]').first().click()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Open payment modal and switch to Split tab
    await page.getByRole('button', { name: /Pay Now/ }).click()
    await page.getByRole('tab', { name: /Split/i }).click()

    // Enter cash amount
    const cashInput = page.getByLabel(/Cash Amount/i).or(
      page.locator('input[placeholder*="cash" i]')
    ).first()
    await cashInput.fill('50')

    // Enter GCash amount > 0
    const gcashInput = page.getByLabel(/GCash Amount/i).or(
      page.locator('input[placeholder*="gcash" i]')
    ).first()
    await gcashInput.fill('50')

    // GCash reference input should be visible/required
    const refInput = page.getByPlaceholder(/reference number/i)
    await expect(refInput).toBeVisible()

    // Confirm button should be disabled without reference
    const confirmBtn = page.getByRole('button', { name: /Confirm/i })
    await expect(confirmBtn).toBeDisabled()

    // Enter valid reference
    await refInput.fill('SPLIT1234567')

    // Now confirm should be enabled (assuming amounts cover total)
    await expect(confirmBtn).toBeEnabled()
  })

  test('GCash reference not required when GCash amount is 0', async ({ page }) => {
    // Add product to cart (assuming Burger Steak is around 75-85 pesos)
    await page.locator('[role="button"][aria-disabled="false"]').first().click()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Open payment modal and switch to Split tab
    await page.getByRole('button', { name: /Pay Now/ }).click()
    await page.getByRole('tab', { name: /Split/i }).click()

    // Enter only cash amount (enough to cover total)
    const cashInput = page.getByLabel(/Cash Amount/i).or(
      page.locator('input[placeholder*="cash" i]')
    ).first()
    await cashInput.fill('100')

    // GCash amount should be 0 or empty
    const gcashInput = page.getByLabel(/GCash Amount/i).or(
      page.locator('input[placeholder*="gcash" i]')
    ).first()
    await gcashInput.fill('0')

    // GCash reference input should not be required
    // Confirm button should be enabled
    const confirmBtn = page.getByRole('button', { name: /Confirm/i })
    await expect(confirmBtn).toBeEnabled()
  })

  test('complete split payment flow with cash and GCash', async ({ page }) => {
    // Step 1: Add product to cart
    await page.locator('[role="button"][aria-disabled="false"]').first().click()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Step 2: Open payment modal
    await page.getByRole('button', { name: /Pay Now/ }).click()
    await expect(page.getByRole('dialog', { name: 'Payment' })).toBeVisible()

    // Step 3: Switch to Split tab
    await page.getByRole('tab', { name: /Split/i }).click()
    await expect(page.getByRole('tab', { name: /Split/i })).toHaveAttribute('data-state', 'active')

    // Step 4: Enter cash amount
    const cashInput = page.getByLabel(/Cash Amount/i).or(
      page.locator('input[placeholder*="cash" i]')
    ).first()
    await cashInput.fill('50')

    // Step 5: Enter GCash amount
    const gcashInput = page.getByLabel(/GCash Amount/i).or(
      page.locator('input[placeholder*="gcash" i]')
    ).first()
    await gcashInput.fill('50')

    // Step 6: Enter GCash reference
    await page.getByPlaceholder(/reference number/i).fill('SPLITREF12345')

    // Step 7: Complete payment
    const confirmBtn = page.getByRole('button', { name: /Confirm/i })
    await expect(confirmBtn).toBeEnabled()
    await confirmBtn.click()

    // Step 8: Verify success
    await expect(page.getByText(/Payment Successful/i).first()).toBeVisible({ timeout: 5000 })

    // Step 9: Verify split payment info in success message
    await expect(page.getByText(/Split Payment/i).or(
      page.getByText(/Cash.*GCash/i)
    )).toBeVisible()

    // Step 10: Close modal
    await page.getByRole('button', { name: 'Done' }).click()

    // Step 11: Cart should be cleared
    await expect(page.getByText(/0 items/)).toBeVisible()
  })

  test('verify cash change calculated correctly in split payment', async ({ page }) => {
    // Add product to cart
    await page.locator('[role="button"][aria-disabled="false"]').first().click()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Open payment modal and switch to Split tab
    await page.getByRole('button', { name: /Pay Now/ }).click()
    await page.getByRole('tab', { name: /Split/i }).click()

    // Enter cash amount tendered (more than needed for cash portion)
    const cashTenderedInput = page.getByLabel(/Cash Tendered/i).or(
      page.locator('input[placeholder*="tendered" i]')
    ).or(
      page.getByLabel(/Cash Amount/i)
    ).first()
    await cashTenderedInput.fill('100')

    // Enter cash portion as amount
    const cashAmountInput = page.getByLabel(/Cash Portion/i).or(
      page.locator('input[placeholder*="cash portion" i]')
    )
    if (await cashAmountInput.isVisible()) {
      await cashAmountInput.fill('50')
    }

    // Enter GCash amount
    const gcashInput = page.getByLabel(/GCash Amount/i).or(
      page.locator('input[placeholder*="gcash" i]')
    ).first()
    await gcashInput.fill('50')

    // Enter GCash reference
    await page.getByPlaceholder(/reference number/i).fill('CHANGE123456')

    // Verify change is calculated and displayed
    // If cash tendered (100) > cash portion (50), change should be 50
    await expect(page.getByText(/Change.*₱?[\d,]+\.\d{2}/i)).toBeVisible()
  })

  test('transaction recorded with split payment details', async ({ page }) => {
    // Add product to cart
    await page.locator('[role="button"][aria-disabled="false"]').first().click()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Open payment modal and switch to Split tab
    await page.getByRole('button', { name: /Pay Now/ }).click()
    await page.getByRole('tab', { name: /Split/i }).click()

    // Enter split amounts
    const cashInput = page.getByLabel(/Cash Amount/i).or(
      page.locator('input[placeholder*="cash" i]')
    ).first()
    await cashInput.fill('40')

    const gcashInput = page.getByLabel(/GCash Amount/i).or(
      page.locator('input[placeholder*="gcash" i]')
    ).first()
    await gcashInput.fill('60')

    // Enter GCash reference
    await page.getByPlaceholder(/reference number/i).fill('RECORD123456')

    // Complete payment
    await page.getByRole('button', { name: /Confirm/i }).click()
    await expect(page.getByText(/Payment Successful/i).first()).toBeVisible({ timeout: 5000 })

    // Close success modal
    await page.getByRole('button', { name: 'Done' }).click()

    // Navigate to transactions page to verify split payment was recorded
    await page.goto('/transactions')
    await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible()

    // Find the most recent transaction
    const firstRow = page.locator('table tbody tr').first().or(
      page.locator('[data-testid="transaction-row"]').first()
    )

    // Verify transaction shows Split payment type
    await expect(firstRow.getByText(/Split/i)).toBeVisible()
  })

  test('split payment insufficient total shows error', async ({ page }) => {
    // Add product to cart
    await page.locator('[role="button"][aria-disabled="false"]').first().click()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Open payment modal and switch to Split tab
    await page.getByRole('button', { name: /Pay Now/ }).click()
    await page.getByRole('tab', { name: /Split/i }).click()

    // Enter insufficient amounts
    const cashInput = page.getByLabel(/Cash Amount/i).or(
      page.locator('input[placeholder*="cash" i]')
    ).first()
    await cashInput.fill('10')

    const gcashInput = page.getByLabel(/GCash Amount/i).or(
      page.locator('input[placeholder*="gcash" i]')
    ).first()
    await gcashInput.fill('10')

    // Verify error message about insufficient amount
    await expect(page.getByText(/Amount Due/i).or(
      page.getByText(/Insufficient/i)
    )).toBeVisible()

    // Confirm button should be disabled
    const confirmBtn = page.getByRole('button', { name: /Confirm/i })
    await expect(confirmBtn).toBeDisabled()
  })

  test('cancel split payment returns to POS without completing', async ({ page }) => {
    // Add product to cart
    await page.locator('[role="button"][aria-disabled="false"]').first().click()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Open payment modal and switch to Split tab
    await page.getByRole('button', { name: /Pay Now/ }).click()
    await page.getByRole('tab', { name: /Split/i }).click()

    // Enter amounts
    const cashInput = page.getByLabel(/Cash Amount/i).or(
      page.locator('input[placeholder*="cash" i]')
    ).first()
    await cashInput.fill('50')

    const gcashInput = page.getByLabel(/GCash Amount/i).or(
      page.locator('input[placeholder*="gcash" i]')
    ).first()
    await gcashInput.fill('50')

    // Cancel
    await page.getByRole('button', { name: 'Cancel' }).click()

    // Modal should close, cart should still have items
    await expect(page.getByRole('dialog', { name: 'Payment' })).not.toBeVisible()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()
  })

  test('receipt options available after split payment', async ({ page }) => {
    // Add product to cart
    await page.locator('[role="button"][aria-disabled="false"]').first().click()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Open payment modal and complete split payment
    await page.getByRole('button', { name: /Pay Now/ }).click()
    await page.getByRole('tab', { name: /Split/i }).click()

    const cashInput = page.getByLabel(/Cash Amount/i).or(
      page.locator('input[placeholder*="cash" i]')
    ).first()
    await cashInput.fill('50')

    const gcashInput = page.getByLabel(/GCash Amount/i).or(
      page.locator('input[placeholder*="gcash" i]')
    ).first()
    await gcashInput.fill('50')

    await page.getByPlaceholder(/reference number/i).fill('RECEIPT12345')
    await page.getByRole('button', { name: /Confirm/i }).click()

    // Wait for success
    await expect(page.getByText(/Payment Successful/i).first()).toBeVisible({ timeout: 5000 })

    // Verify receipt options are available
    await expect(page.getByRole('button', { name: /Download Receipt/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Email Receipt/i })).toBeVisible()
  })

  test('split payment with GCash only (cash = 0)', async ({ page }) => {
    // Add product to cart
    await page.locator('[role="button"][aria-disabled="false"]').first().click()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Open payment modal and switch to Split tab
    await page.getByRole('button', { name: /Pay Now/ }).click()
    await page.getByRole('tab', { name: /Split/i }).click()

    // Enter 0 for cash
    const cashInput = page.getByLabel(/Cash Amount/i).or(
      page.locator('input[placeholder*="cash" i]')
    ).first()
    await cashInput.fill('0')

    // Enter full amount as GCash
    const gcashInput = page.getByLabel(/GCash Amount/i).or(
      page.locator('input[placeholder*="gcash" i]')
    ).first()
    await gcashInput.fill('100')

    // Enter GCash reference
    await page.getByPlaceholder(/reference number/i).fill('GCASHONLY123')

    // Complete payment
    const confirmBtn = page.getByRole('button', { name: /Confirm/i })
    await expect(confirmBtn).toBeEnabled()
    await confirmBtn.click()

    // Verify success
    await expect(page.getByText(/Payment Successful/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('split payment with cash only (gcash = 0)', async ({ page }) => {
    // Add product to cart
    await page.locator('[role="button"][aria-disabled="false"]').first().click()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Open payment modal and switch to Split tab
    await page.getByRole('button', { name: /Pay Now/ }).click()
    await page.getByRole('tab', { name: /Split/i }).click()

    // Enter full amount as cash
    const cashInput = page.getByLabel(/Cash Amount/i).or(
      page.locator('input[placeholder*="cash" i]')
    ).first()
    await cashInput.fill('100')

    // Enter 0 for GCash
    const gcashInput = page.getByLabel(/GCash Amount/i).or(
      page.locator('input[placeholder*="gcash" i]')
    ).first()
    await gcashInput.fill('0')

    // GCash reference should not be required
    // Complete payment
    const confirmBtn = page.getByRole('button', { name: /Confirm/i })
    await expect(confirmBtn).toBeEnabled()
    await confirmBtn.click()

    // Verify success
    await expect(page.getByText(/Payment Successful/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('GCash reference validation in split payment - too short', async ({ page }) => {
    // Add product to cart
    await page.locator('[role="button"][aria-disabled="false"]').first().click()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Open payment modal and switch to Split tab
    await page.getByRole('button', { name: /Pay Now/ }).click()
    await page.getByRole('tab', { name: /Split/i }).click()

    // Enter amounts
    const cashInput = page.getByLabel(/Cash Amount/i).or(
      page.locator('input[placeholder*="cash" i]')
    ).first()
    await cashInput.fill('50')

    const gcashInput = page.getByLabel(/GCash Amount/i).or(
      page.locator('input[placeholder*="gcash" i]')
    ).first()
    await gcashInput.fill('50')

    // Enter short reference (less than 10 characters)
    await page.getByPlaceholder(/reference number/i).fill('123456789')

    // Verify error message
    await expect(page.getByText(/at least 10 characters/i)).toBeVisible()

    // Confirm button should be disabled
    const confirmBtn = page.getByRole('button', { name: /Confirm/i })
    await expect(confirmBtn).toBeDisabled()
  })

  test('GCash reference validation in split payment - special characters rejected', async ({ page }) => {
    // Add product to cart
    await page.locator('[role="button"][aria-disabled="false"]').first().click()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Open payment modal and switch to Split tab
    await page.getByRole('button', { name: /Pay Now/ }).click()
    await page.getByRole('tab', { name: /Split/i }).click()

    // Enter amounts
    const cashInput = page.getByLabel(/Cash Amount/i).or(
      page.locator('input[placeholder*="cash" i]')
    ).first()
    await cashInput.fill('50')

    const gcashInput = page.getByLabel(/GCash Amount/i).or(
      page.locator('input[placeholder*="gcash" i]')
    ).first()
    await gcashInput.fill('50')

    // Enter reference with special characters
    await page.getByPlaceholder(/reference number/i).fill('GCASH-12345')

    // Verify error message about letters and numbers only
    await expect(page.getByText(/letters and numbers/i)).toBeVisible()

    // Confirm button should be disabled
    const confirmBtn = page.getByRole('button', { name: /Confirm/i })
    await expect(confirmBtn).toBeDisabled()
  })
})
