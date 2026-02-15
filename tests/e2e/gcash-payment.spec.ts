/**
 * E2E Tests: GCash Payment Flow
 * US2: GCash Payment at POS
 * Tests the complete GCash payment workflow using photo capture (not reference number)
 *
 * Actual GCash UI flow:
 *   1. Click GCash tab in payment modal
 *   2. See "Capture customer's GCash payment screen" prompt
 *   3. Upload photo (or use camera) via GCashCamera component
 *   4. Click "Use Photo" to confirm capture
 *   5. "Payment screenshot captured - ready to confirm" appears
 *   6. Confirm button becomes enabled
 *   7. After payment: "Awaiting GCash confirmation"
 */

import { test, expect } from './fixtures/base'

test.describe('US2: GCash Payment @p1', () => {
  test.beforeEach(async ({ posPage }) => {
    // posPage fixture handles navigation and setup
  })

  test('complete GCash sale with photo capture', async ({ page, pos }) => {
    // Step 1: Add product to cart
    await pos.addFirstProduct()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Step 2: Open payment modal
    await pos.openPaymentModal()

    // Step 3: Switch to GCash tab
    await page.getByRole('tab', { name: /GCash/i }).click()
    await expect(page.getByRole('tab', { name: /GCash/i })).toHaveAttribute('data-state', 'active')

    // Step 4: Verify GCash UI elements
    await expect(page.getByText(/Capture customer.*GCash payment screen/i)).toBeVisible()

    // Step 5: Upload GCash photo (simulates file upload since no camera in headless)
    await pos.uploadGCashPhoto()

    // Step 6: Confirm button should be enabled now
    const confirmBtn = page.getByRole('button', { name: /Confirm/i })
    await expect(confirmBtn).toBeEnabled()

    // Step 7: Complete payment
    await confirmBtn.click()

    // Step 8: Verify success
    await expect(page.getByText(/Payment Successful/i).first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/Awaiting GCash confirmation/i)).toBeVisible()

    // Step 9: Close modal
    await page.getByRole('button', { name: 'Done' }).click()

    // Step 10: Cart should be cleared
    await expect(page.getByText(/0 items/)).toBeVisible()
  })

  test('GCash confirm disabled without photo', async ({ page, pos }) => {
    // Add product to cart
    await pos.addFirstProduct()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Open payment modal and switch to GCash
    await pos.openPaymentModal()
    await page.getByRole('tab', { name: /GCash/i }).click()

    // Confirm button should be disabled without photo capture
    const confirmBtn = page.getByRole('button', { name: /Confirm/i })
    await expect(confirmBtn).toBeDisabled()
  })

  test('GCash tab shows correct total amount', async ({ page, pos }) => {
    // Add product
    await pos.addFirstProduct()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Open payment modal and switch to GCash
    await pos.openPaymentModal()
    await page.getByRole('tab', { name: /GCash/i }).click()

    // Verify GCash prompt text is shown
    await expect(page.getByText(/Capture customer.*GCash payment screen/i)).toBeVisible()

    // Total should be visible (blue text showing the amount)
    const totalText = await page.locator('.text-blue-600').first().textContent()
    expect(totalText).toMatch(/₱[\d,]+\.\d{2}/)
  })

  test('cancel returns to POS without completing GCash sale', async ({ page, pos }) => {
    // Add product to cart
    await pos.addFirstProduct()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Open payment modal and switch to GCash
    await pos.openPaymentModal()
    await page.getByRole('tab', { name: /GCash/i }).click()

    // Cancel payment (the "Cancel" button is in the payment modal footer)
    await page.getByRole('button', { name: 'Cancel' }).first().click()

    // Modal should close, cart should still have items
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()
  })

  test('GCash payment shows pending status after completion', async ({ page, pos }) => {
    // Add product to cart and complete GCash payment
    await pos.addFirstProduct()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    await pos.openPaymentModal()
    await page.getByRole('tab', { name: /GCash/i }).click()

    // Upload photo and complete payment
    await pos.uploadGCashPhoto()
    await page.getByRole('button', { name: /Confirm/i }).click()

    // Wait for success
    await expect(page.getByText(/Payment Successful/i).first()).toBeVisible({ timeout: 5000 })

    // Verify pending status message
    await expect(page.getByText(/Awaiting GCash confirmation/i)).toBeVisible()
  })

  test('receipt options available after GCash payment', async ({ page, pos }) => {
    // Add product and complete GCash payment
    await pos.addFirstProduct()
    await pos.openPaymentModal()
    await page.getByRole('tab', { name: /GCash/i }).click()
    await pos.uploadGCashPhoto()
    await page.getByRole('button', { name: /Confirm/i }).click()

    // Wait for success
    await expect(page.getByText(/Payment Successful/i).first()).toBeVisible({ timeout: 5000 })

    // Verify receipt options
    await expect(page.getByRole('button', { name: /Download Receipt/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Email Receipt/i })).toBeVisible()
  })
})
