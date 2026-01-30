/**
 * E2E Tests: Cash Payment Flow
 * US1: Cash Payment at POS
 * Tests the complete cash payment workflow including change calculation
 */

import { test, expect } from './fixtures/base'

test.describe('US1: Cash Payment @p1', () => {
  test('complete cash sale with exact amount', async ({ page, posPage }) => {
    // Step 1: Add product to cart
    await page.getByText('Burger Steak').click()
    await expect(page.getByText(/Cart \(1\)/)).toBeVisible()

    // Step 2: Open payment modal
    await page.getByRole('button', { name: 'Pay' }).click()

    // Step 3: Verify payment modal opens with Cash tab selected
    await expect(page.getByRole('dialog', { name: 'Payment' })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Cash/i })).toHaveAttribute('data-state', 'active')

    // Step 4: Use "Exact" quick amount button
    await page.getByRole('button', { name: 'Exact' }).click()

    // Step 5: Verify change shows 0
    await expect(page.getByText(/Change/i)).toBeVisible()
    await expect(page.getByText(/₱?0\.00/)).toBeVisible()

    // Step 6: Complete payment
    await page.getByRole('button', { name: /Confirm/i }).click()

    // Step 7: Verify success
    await expect(page.getByText(/Payment Successful/i)).toBeVisible({ timeout: 5000 })

    // Step 8: Close modal
    await page.getByRole('button', { name: 'Done' }).click()

    // Step 9: Cart should be cleared
    await expect(page.getByText(/Cart \(0\)/)).toBeVisible()
  })

  test('cash sale with change calculation', async ({ page, posPage }) => {
    // Add product to cart
    await page.getByText('Burger Steak').click()
    await expect(page.getByText(/Cart \(1\)/)).toBeVisible()

    // Open payment modal
    await page.getByRole('button', { name: 'Pay' }).click()
    await expect(page.getByRole('dialog', { name: 'Payment' })).toBeVisible()

    // Enter amount using quick amount button (₱100)
    await page.getByRole('button', { name: /₱100|100/ }).click()

    // Verify change is displayed (assuming Burger Steak is less than ₱100)
    const changeSection = page.locator('text=/Change/i').locator('..')
    await expect(changeSection).toBeVisible()

    // Complete payment
    await page.getByRole('button', { name: /Confirm/i }).click()

    // Verify success shows change amount
    await expect(page.getByText(/Payment Successful/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/Change:/i)).toBeVisible()
  })

  test('cash sale using numpad input', async ({ page, posPage }) => {
    // Add product to cart
    await page.locator('.grid > div').first().click()
    await expect(page.getByText(/Cart \(1\)/)).toBeVisible()

    // Open payment modal
    await page.getByRole('button', { name: 'Pay' }).click()
    await expect(page.getByRole('dialog', { name: 'Payment' })).toBeVisible()

    // Use numpad to enter amount
    await page.getByRole('button', { name: '5' }).click()
    await page.getByRole('button', { name: '0' }).click()
    await page.getByRole('button', { name: '0' }).click()

    // Verify amount input shows 500
    const amountInput = page.locator('input[type="text"]').first()
    await expect(amountInput).toHaveValue('500')

    // Complete payment
    await page.getByRole('button', { name: /Confirm/i }).click()

    // Verify success
    await expect(page.getByText(/Payment Successful/i)).toBeVisible({ timeout: 5000 })
  })

  test('cannot complete cash sale with insufficient amount', async ({ page, posPage }) => {
    // Add product to cart
    await page.getByText('Burger Steak').click()
    await expect(page.getByText(/Cart \(1\)/)).toBeVisible()

    // Open payment modal
    await page.getByRole('button', { name: 'Pay' }).click()
    await expect(page.getByRole('dialog', { name: 'Payment' })).toBeVisible()

    // Enter insufficient amount
    await page.getByRole('button', { name: '1' }).click()

    // Verify "Amount Due" shows instead of "Change"
    await expect(page.getByText(/Amount Due/i)).toBeVisible()

    // Confirm button should be disabled
    const confirmBtn = page.getByRole('button', { name: /Confirm/i })
    await expect(confirmBtn).toBeDisabled()
  })

  test('cash payment shows correct totals', async ({ page, posPage }) => {
    // Add multiple products
    const productCards = page.locator('.grid > div')
    await productCards.nth(0).click()
    await expect(page.getByText(/Cart \(1\)/)).toBeVisible()
    await productCards.nth(0).click() // Add same product again
    await expect(page.getByText(/Cart \(1\)/)).toBeVisible() // Still 1 item, but qty 2

    // Open payment modal
    await page.getByRole('button', { name: 'Pay' }).click()
    await expect(page.getByRole('dialog', { name: 'Payment' })).toBeVisible()

    // Verify total amount is displayed
    await expect(page.getByText(/Total Amount/i)).toBeVisible()
    // Total should be greater than 0
    const totalText = await page.locator('text=/₱[\d,]+\.\d{2}/').first().textContent()
    expect(totalText).toBeTruthy()
  })

  test('backspace removes digits from amount', async ({ page, posPage }) => {
    // Add product to cart
    await page.locator('.grid > div').first().click()
    await expect(page.getByText(/Cart \(1\)/)).toBeVisible()

    // Open payment modal
    await page.getByRole('button', { name: 'Pay' }).click()
    await expect(page.getByRole('dialog', { name: 'Payment' })).toBeVisible()

    // Enter amount using numpad
    await page.getByRole('button', { name: '1' }).click()
    await page.getByRole('button', { name: '2' }).click()
    await page.getByRole('button', { name: '3' }).click()

    // Verify amount
    const amountInput = page.locator('input[type="text"]').first()
    await expect(amountInput).toHaveValue('123')

    // Use backspace
    await page.locator('[data-testid="backspace"]').or(
      page.getByRole('button').filter({ has: page.locator('svg') }).last()
    ).click()

    // Verify backspace worked
    await expect(amountInput).toHaveValue('12')
  })

  test('receipt options available after payment', async ({ page, posPage }) => {
    // Add product and complete payment
    await page.getByText('Burger Steak').click()
    await page.getByRole('button', { name: 'Pay' }).click()
    await page.getByRole('button', { name: 'Exact' }).click()
    await page.getByRole('button', { name: /Confirm/i }).click()

    // Wait for success
    await expect(page.getByText(/Payment Successful/i)).toBeVisible({ timeout: 5000 })

    // Verify receipt options
    await expect(page.getByRole('button', { name: /Download Receipt/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Email Receipt/i })).toBeVisible()
  })

  test('cancel returns to POS without completing sale', async ({ page, posPage }) => {
    // Add product to cart
    await page.getByText('Burger Steak').click()
    await expect(page.getByText(/Cart \(1\)/)).toBeVisible()

    // Open payment modal
    await page.getByRole('button', { name: 'Pay' }).click()
    await expect(page.getByRole('dialog', { name: 'Payment' })).toBeVisible()

    // Cancel
    await page.getByRole('button', { name: 'Cancel' }).click()

    // Modal should close, cart should still have items
    await expect(page.getByRole('dialog', { name: 'Payment' })).not.toBeVisible()
    await expect(page.getByText(/Cart \(1\)/)).toBeVisible()
  })
})
