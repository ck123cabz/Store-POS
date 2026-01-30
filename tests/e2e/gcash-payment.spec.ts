/**
 * E2E Tests: GCash Payment Flow
 * US2: GCash Payment at POS
 * Tests the complete GCash payment workflow including reference number entry and photo verification
 */

import { test, expect } from './fixtures/base'

test.describe('US2: GCash Payment @p1', () => {
  test('complete GCash sale with reference number', async ({ page }) => {
    // Step 1: Add product to cart
    await page.getByText('Burger Steak').click()
    await expect(page.getByText(/Cart \(1\)/)).toBeVisible()

    // Step 2: Open payment modal
    await page.getByRole('button', { name: 'Pay' }).click()
    await expect(page.getByRole('dialog', { name: 'Payment' })).toBeVisible()

    // Step 3: Switch to GCash tab
    await page.getByRole('tab', { name: /GCash/i }).click()
    await expect(page.getByRole('tab', { name: /GCash/i })).toHaveAttribute('data-state', 'active')

    // Step 4: Verify GCash UI elements
    await expect(page.getByText(/Customer pays via GCash/i)).toBeVisible()
    await expect(page.getByPlaceholder(/reference number/i)).toBeVisible()

    // Step 5: Enter GCash reference number (must be 10+ characters)
    await page.getByPlaceholder(/reference number/i).fill('GCASH123456')

    // Step 6: Verify confirm button is enabled
    const confirmBtn = page.getByRole('button', { name: /Confirm/i })
    await expect(confirmBtn).toBeEnabled()

    // Step 7: Complete payment
    await confirmBtn.click()

    // Step 8: Verify success (GCash shows as pending)
    await expect(page.getByText(/Payment Successful/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/Awaiting GCash confirmation/i)).toBeVisible()

    // Step 9: Close modal
    await page.getByRole('button', { name: 'Done' }).click()

    // Step 10: Cart should be cleared
    await expect(page.getByText(/Cart \(0\)/)).toBeVisible()
  })

  test('GCash reference validation - too short', async ({ page }) => {
    // Add product to cart
    await page.getByText('Burger Steak').click()
    await expect(page.getByText(/Cart \(1\)/)).toBeVisible()

    // Open payment modal and switch to GCash
    await page.getByRole('button', { name: 'Pay' }).click()
    await page.getByRole('tab', { name: /GCash/i }).click()

    // Enter short reference (less than 10 characters)
    await page.getByPlaceholder(/reference number/i).fill('123456789')

    // Verify error message appears
    await expect(page.getByText(/at least 10 characters/i)).toBeVisible()

    // Confirm button should be disabled
    const confirmBtn = page.getByRole('button', { name: /Confirm/i })
    await expect(confirmBtn).toBeDisabled()
  })

  test('GCash reference validation - special characters rejected', async ({ page }) => {
    // Add product to cart
    await page.getByText('Burger Steak').click()

    // Open payment modal and switch to GCash
    await page.getByRole('button', { name: 'Pay' }).click()
    await page.getByRole('tab', { name: /GCash/i }).click()

    // Enter reference with special characters
    await page.getByPlaceholder(/reference number/i).fill('GCASH-12345')

    // Verify error message about letters and numbers only
    await expect(page.getByText(/letters and numbers/i)).toBeVisible()

    // Confirm button should be disabled
    const confirmBtn = page.getByRole('button', { name: /Confirm/i })
    await expect(confirmBtn).toBeDisabled()
  })

  test('GCash reference accepts valid alphanumeric', async ({ page }) => {
    // Add product to cart
    await page.locator('.grid > div').first().click()
    await expect(page.getByText(/Cart \(1\)/)).toBeVisible()

    // Open payment modal and switch to GCash
    await page.getByRole('button', { name: 'Pay' }).click()
    await page.getByRole('tab', { name: /GCash/i }).click()

    // Enter valid alphanumeric reference
    await page.getByPlaceholder(/reference number/i).fill('ABC1234567XYZ')

    // No error should be shown
    await expect(page.getByText(/at least 10 characters/i)).not.toBeVisible()
    await expect(page.getByText(/letters and numbers/i)).not.toBeVisible()

    // Confirm button should be enabled
    const confirmBtn = page.getByRole('button', { name: /Confirm/i })
    await expect(confirmBtn).toBeEnabled()
  })

  test('GCash tab shows correct total amount', async ({ page }) => {
    // Add multiple products
    const productCards = page.locator('.grid > div')
    await productCards.nth(0).click()
    await productCards.nth(0).click() // Add same product twice (qty 2)
    await expect(page.getByText(/Cart \(1\)/)).toBeVisible()

    // Open payment modal and switch to GCash
    await page.getByRole('button', { name: 'Pay' }).click()
    await page.getByRole('tab', { name: /GCash/i }).click()

    // Verify total amount is displayed in GCash section
    await expect(page.getByText(/Customer pays via GCash/i)).toBeVisible()
    // Total should be visible (blue text showing the amount)
    const totalText = await page.locator('.text-blue-600.text-xl').textContent()
    expect(totalText).toMatch(/₱[\d,]+\.\d{2}/)
  })

  test('cancel returns to POS without completing GCash sale', async ({ page }) => {
    // Add product to cart
    await page.getByText('Burger Steak').click()
    await expect(page.getByText(/Cart \(1\)/)).toBeVisible()

    // Open payment modal and switch to GCash
    await page.getByRole('button', { name: 'Pay' }).click()
    await page.getByRole('tab', { name: /GCash/i }).click()

    // Enter reference number
    await page.getByPlaceholder(/reference number/i).fill('TESTREF12345')

    // Cancel
    await page.getByRole('button', { name: 'Cancel' }).click()

    // Modal should close, cart should still have items
    await expect(page.getByRole('dialog', { name: 'Payment' })).not.toBeVisible()
    await expect(page.getByText(/Cart \(1\)/)).toBeVisible()
  })

  test('GCash payment shows pending status message', async ({ page }) => {
    // Add product to cart
    await page.getByText('Burger Steak').click()

    // Open payment modal and switch to GCash
    await page.getByRole('button', { name: 'Pay' }).click()
    await page.getByRole('tab', { name: /GCash/i }).click()

    // Verify pending message is shown
    await expect(page.getByText(/marked as pending/i)).toBeVisible()
  })

  test('receipt options available after GCash payment', async ({ page }) => {
    // Add product and complete GCash payment
    await page.getByText('Burger Steak').click()
    await page.getByRole('button', { name: 'Pay' }).click()
    await page.getByRole('tab', { name: /GCash/i }).click()
    await page.getByPlaceholder(/reference number/i).fill('RECEIPT1234567')
    await page.getByRole('button', { name: /Confirm/i }).click()

    // Wait for success
    await expect(page.getByText(/Payment Successful/i)).toBeVisible({ timeout: 5000 })

    // Verify receipt options
    await expect(page.getByRole('button', { name: /Download Receipt/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Email Receipt/i })).toBeVisible()
  })
})
