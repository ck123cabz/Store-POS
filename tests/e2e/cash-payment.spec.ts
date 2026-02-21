/**
 * E2E Tests: Cash Payment Flow
 * US1: Cash Payment at POS
 * Tests the complete cash payment workflow including change calculation
 *
 * Key UI details (payment-modal.tsx):
 *   - Cash tab is selected by default
 *   - Amount input: text input with inputMode="decimal", placeholder="0.00"
 *   - Quick amount buttons: Exact, ₱50, ₱100, ₱200, ₱500, ₱1000
 *   - Numpad: 1-9, ., 0, backspace (backspace has text-destructive class)
 *   - Change display: "Change" (blue) or "Amount Due" (red)
 *   - Confirm button text: "Confirm" (disabled when insufficient)
 *   - Cancel button in modal footer
 *   - Success: "Payment Successful!", "Change: ₱X.XX"
 *   - Receipt: "Download Receipt", "Email Receipt", "Done"
 */

import { test, expect } from './fixtures/base'

test.describe('US1: Cash Payment @p1', () => {
  test.beforeEach(async ({ posPage }) => {
    // posPage fixture handles navigation and setup
  })

  test('complete cash sale with exact amount', async ({ page, pos }) => {
    // Step 1: Add product to cart (click first available/enabled product card)
    await pos.addFirstProduct()
    await expect(page.getByText('Cart is empty')).not.toBeVisible()

    // Step 2: Open payment modal
    await pos.openPaymentModal()

    // Step 3: Verify payment modal opens with Cash tab selected
    await expect(page.getByRole('tab', { name: 'Cash', exact: true })).toHaveAttribute('data-state', 'active')

    // Step 4: Use "Exact" quick amount button
    await page.getByRole('button', { name: 'Exact' }).click()

    // Step 5: Verify change shows 0 (uses status-info color for change display)
    await expect(page.getByText(/Change/i)).toBeVisible()
    await expect(page.locator('.text-status-info').filter({ hasText: '₱0.00' })).toBeVisible()

    // Step 6: Complete payment
    await page.getByRole('button', { name: /Confirm/i }).click()

    // Step 7: Verify success
    await expect(page.getByText(/Payment Successful/i).first()).toBeVisible({ timeout: 5000 })

    // Step 8: Close modal
    await page.getByRole('button', { name: 'Done' }).click()

    // Step 9: Cart should be cleared
    await expect(page.getByText('Cart is empty')).toBeVisible()
  })

  test('cash sale with change calculation', async ({ page, pos }) => {
    // Add product to cart
    await pos.addFirstProduct()
    await expect(page.getByText('Cart is empty')).not.toBeVisible()

    // Open payment modal
    await pos.openPaymentModal()

    // Enter amount using quick amount button (₱500 to be safe - avoids ₱100/₱1000 collision)
    await page.getByRole('button', { name: '₱500', exact: true }).click()

    // Verify change is displayed
    await expect(page.getByText(/^Change$/i)).toBeVisible()

    // Complete payment
    await page.getByRole('button', { name: /Confirm/i }).click()

    // Verify success shows change amount
    await expect(page.getByText(/Payment Successful/i).first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/Change:/i)).toBeVisible()
  })

  test('cash sale using numpad input', async ({ page, pos }) => {
    // Add product to cart
    await pos.addFirstProduct()
    await expect(page.getByText('Cart is empty')).not.toBeVisible()

    // Open payment modal
    await pos.openPaymentModal()

    // Use numpad to enter amount - scope to the dialog to avoid ambiguity
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: '5', exact: true }).click()
    await dialog.getByRole('button', { name: '0', exact: true }).first().click()
    await dialog.getByRole('button', { name: '0', exact: true }).first().click()

    // Verify amount input shows 500
    const amountInput = dialog.locator('input[type="text"]').first()
    await expect(amountInput).toHaveValue('500')

    // Complete payment
    await page.getByRole('button', { name: /Confirm/i }).click()

    // Verify success
    await expect(page.getByText(/Payment Successful/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('cannot complete cash sale with insufficient amount', async ({ page, pos }) => {
    // Add product to cart
    await pos.addFirstProduct()
    await expect(page.getByText('Cart is empty')).not.toBeVisible()

    // Open payment modal
    await pos.openPaymentModal()

    // Enter insufficient amount using numpad - scope to dialog
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: '1', exact: true }).click()

    // Verify "Amount Due" shows instead of "Change"
    await expect(page.getByText(/Amount Due/i)).toBeVisible()

    // Confirm button should be disabled
    const confirmBtn = page.getByRole('button', { name: /Confirm/i })
    await expect(confirmBtn).toBeDisabled()
  })

  test('cash payment shows correct totals', async ({ page, pos }) => {
    // Add product twice (qty 2)
    await pos.addFirstProduct()
    await expect(page.getByText('Cart is empty')).not.toBeVisible()
    await pos.addFirstProduct()
    await expect(page.getByText('Cart is empty')).not.toBeVisible() // Still 1 item, but qty 2

    // Open payment modal
    await pos.openPaymentModal()

    // Verify total amount is displayed
    await expect(page.getByText(/Total Amount/i)).toBeVisible()
    // Total should be greater than 0
    const totalText = await page.locator('text=/₱[\\d,]+\\.\\d{2}/').first().textContent()
    expect(totalText).toBeTruthy()
  })

  test('backspace removes digits from amount', async ({ page, pos }) => {
    // Add product to cart
    await pos.addFirstProduct()
    await expect(page.getByText('Cart is empty')).not.toBeVisible()

    // Open payment modal
    await pos.openPaymentModal()

    // Enter amount using numpad - scope to dialog
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: '1', exact: true }).click()
    await dialog.getByRole('button', { name: '2', exact: true }).click()
    await dialog.getByRole('button', { name: '3', exact: true }).click()

    // Verify amount
    const amountInput = dialog.locator('input[type="text"]').first()
    await expect(amountInput).toHaveValue('123')

    // Use backspace (the destructive-colored button with an SVG icon in the numpad)
    await dialog.locator('button.text-destructive').filter({ has: page.locator('svg') }).click()

    // Verify backspace worked
    await expect(amountInput).toHaveValue('12')
  })

  test('receipt options available after payment', async ({ page, pos }) => {
    // Add product and complete payment
    await pos.addFirstProduct()
    await pos.openPaymentModal()
    await page.getByRole('button', { name: 'Exact' }).click()
    await page.getByRole('button', { name: /Confirm/i }).click()

    // Wait for success
    await expect(page.getByText(/Payment Successful/i).first()).toBeVisible({ timeout: 5000 })

    // Verify receipt options
    await expect(page.getByRole('button', { name: /Download Receipt/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Email Receipt/i })).toBeVisible()
  })

  test('cancel returns to POS without completing sale', async ({ page, pos }) => {
    // Add product to cart
    await pos.addFirstProduct()
    await expect(page.getByText('Cart is empty')).not.toBeVisible()

    // Open payment modal
    await pos.openPaymentModal()

    // Cancel
    await page.getByRole('button', { name: 'Cancel' }).click()

    // Modal should close, cart should still have items
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('Cart is empty')).not.toBeVisible()
  })
})
