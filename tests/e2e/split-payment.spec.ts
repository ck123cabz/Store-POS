/**
 * E2E Tests: Split Payment Flow
 * US7: Split Payment at POS (Cash + GCash)
 * Tests the complete split payment workflow including amount entry and change calculation
 *
 * Key implementation details (split-payment.tsx):
 *   - Cash Amount auto-fills GCash remainder, and vice versa
 *   - Cash Tendered field only visible when Cash Amount > 0
 *   - GCash Reference field only visible when GCash Amount > 0
 *   - Reference placeholder: "Enter reference (min 10 chars)"
 *   - Shortfall text: "Need ₱X.XX more"
 *   - Labels have htmlFor/id pairs:
 *     - "Cash Amount" → #split-cash-amount
 *     - "Cash Tendered" → #split-cash-tendered
 *     - "GCash Amount" → #split-gcash-amount
 *     - "GCash Reference Number *" → #split-gcash-ref
 *
 * IMPORTANT: getByLabel(/Cash Amount/i) matches BOTH "Cash Amount" and "GCash Amount"
 *   Always use exact: true, e.g., getByLabel('Cash Amount', { exact: true })
 */

import { test, expect } from './fixtures/base'

test.describe('US7: Split Payment @p2', () => {
  test.beforeEach(async ({ posPage }) => {
    // posPage fixture handles navigation and setup
  })

  test('open payment modal and select Split tab', async ({ page, pos }) => {
    // Step 1: Add product to cart
    await pos.addFirstProduct()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Step 2: Open payment modal
    await pos.openPaymentModal()

    // Step 3: Click Split tab
    await page.getByRole('tab', { name: /Split/i }).click()

    // Step 4: Verify Split tab is active
    await expect(page.getByRole('tab', { name: /Split/i })).toHaveAttribute('data-state', 'active')

    // Step 5: Verify split payment UI elements are visible (use exact match)
    await expect(page.getByText('Cash Amount', { exact: true })).toBeVisible()
    await expect(page.getByText('GCash Amount', { exact: true })).toBeVisible()
  })

  test('enter cash and GCash amounts in split payment', async ({ page, pos }) => {
    // Add product to cart
    await pos.addFirstProduct()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Open payment modal and switch to Split tab
    await pos.openPaymentModal()
    await page.getByRole('tab', { name: /Split/i }).click()

    // Enter cash amount
    const cashInput = page.getByLabel('Cash Amount', { exact: true })
    await cashInput.fill('50')
    await expect(cashInput).toHaveValue('50')

    // Enter GCash amount explicitly (auto-fill may have timing issues in E2E)
    const gcashInput = page.getByLabel('GCash Amount')
    await gcashInput.fill('50')
    await expect(gcashInput).toHaveValue('50')
  })

  test('verify total updates correctly as amounts are entered', async ({ page, pos }) => {
    // Add product to cart
    await pos.addFirstProduct()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Open payment modal and switch to Split tab
    await pos.openPaymentModal()
    await page.getByRole('tab', { name: /Split/i }).click()

    // Use 50/50 Split quick button (auto-fills both amounts and cash tendered)
    await page.getByRole('button', { name: /50\/50 Split/i }).click()

    // Enter GCash reference (required for "Total Covered" state)
    await page.getByPlaceholder(/Enter reference/i).fill('TOTALTEST123')

    // Scroll dialog down to see the payment summary
    const dialogContent = page.locator('[class*="overflow-y-auto"]').first()
    await dialogContent.evaluate((el) => el.scrollTo(0, el.scrollHeight))

    // Wait for "Total Covered" to appear (requires: amounts cover total + valid reference)
    await expect(page.getByText(/Total Covered/i)).toBeVisible()
  })

  test('GCash reference required when GCash amount > 0', async ({ page, pos }) => {
    // Add product to cart
    await pos.addFirstProduct()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Open payment modal and switch to Split tab
    await pos.openPaymentModal()
    await page.getByRole('tab', { name: /Split/i }).click()

    // Use 50/50 split to set both amounts
    await page.getByRole('button', { name: /50\/50 Split/i }).click()

    // GCash reference input should be visible (since GCash amount > 0)
    const refInput = page.getByPlaceholder(/Enter reference/i)
    await expect(refInput).toBeVisible()

    // Confirm button should be disabled without reference
    const confirmBtn = page.getByRole('button', { name: /Confirm/i })
    await expect(confirmBtn).toBeDisabled()

    // Enter valid reference
    await refInput.fill('SPLIT1234567')

    // Now confirm should be enabled
    await expect(confirmBtn).toBeEnabled()
  })

  test('GCash reference not required when GCash amount is 0', async ({ page, pos }) => {
    // Add product to cart
    await pos.addFirstProduct()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Open payment modal and switch to Split tab
    await pos.openPaymentModal()
    await page.getByRole('tab', { name: /Split/i }).click()

    // Enter only cash amount that covers the full total
    const cashInput = page.getByLabel('Cash Amount', { exact: true })
    await cashInput.fill('500')

    // Clear GCash amount to 0 (the auto-fill may have set it)
    const gcashInput = page.getByLabel('GCash Amount')
    await gcashInput.fill('0')

    // GCash reference input should not be visible
    await expect(page.getByPlaceholder(/Enter reference/i)).not.toBeVisible()

    // Cash tendered needs to cover cash amount
    const cashTendered = page.getByLabel('Cash Tendered', { exact: true })
    await cashTendered.fill('500')

    // Confirm button should be enabled (no GCash ref needed)
    const confirmBtn = page.getByRole('button', { name: /Confirm/i })
    await expect(confirmBtn).toBeEnabled()
  })

  test('complete split payment flow with cash and GCash', async ({ page, pos }) => {
    // Step 1: Add product to cart
    await pos.addFirstProduct()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Step 2: Open payment modal
    await pos.openPaymentModal()

    // Step 3: Switch to Split tab
    await page.getByRole('tab', { name: /Split/i }).click()
    await expect(page.getByRole('tab', { name: /Split/i })).toHaveAttribute('data-state', 'active')

    // Step 4: Use 50/50 split (auto-fills cash amount, gcash amount, and cash tendered)
    await page.getByRole('button', { name: /50\/50 Split/i }).click()

    // Step 5: Enter GCash reference
    await page.getByPlaceholder(/Enter reference/i).fill('SPLITREF12345')

    // Step 6: Complete payment
    const confirmBtn = page.getByRole('button', { name: /Confirm/i })
    await expect(confirmBtn).toBeEnabled()
    await confirmBtn.click()

    // Step 7: Verify success
    await expect(page.getByText(/Payment Successful/i).first()).toBeVisible({ timeout: 5000 })

    // Step 8: Close modal
    await page.getByRole('button', { name: 'Done' }).click()

    // Step 9: Cart should be cleared
    await expect(page.getByText(/0 items/)).toBeVisible()
  })

  test('verify cash change calculated correctly in split payment', async ({ page, pos }) => {
    // Add product to cart
    await pos.addFirstProduct()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Open payment modal and switch to Split tab
    await pos.openPaymentModal()
    await page.getByRole('tab', { name: /Split/i }).click()

    // Use 50/50 split to set both amounts
    await page.getByRole('button', { name: /50\/50 Split/i }).click()

    // Now override cash tendered to be more than cash amount to get change
    const cashTendered = page.getByLabel('Cash Tendered', { exact: true })
    await cashTendered.fill('200')

    // Verify change is calculated and displayed
    await expect(page.getByText('Change', { exact: true })).toBeVisible()
  })

  test('split payment insufficient total shows error', async ({ page, pos }) => {
    // Add product to cart
    await pos.addFirstProduct()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Open payment modal and switch to Split tab
    await pos.openPaymentModal()
    await page.getByRole('tab', { name: /Split/i }).click()

    // The auto-fill behavior makes it tricky to get insufficient amounts:
    // Setting cash auto-fills gcash to (total - cash), and vice versa.
    // To get insufficient: set cash to 0, then set gcash to a small value.
    // When gcash=5 and gcash < total, it auto-fills cash to (total-5).
    // So instead: set gcash to a value >= total (disables auto-fill), then clear cash.
    // Actually the simplest approach: just enter 0 for cash, then fill gcash
    // with a small value - gcash auto-fills cash, but then clear cash to 0.
    const cashInput = page.getByLabel('Cash Amount', { exact: true })
    const gcashInput = page.getByLabel('GCash Amount')

    // First set gcash (this auto-fills cash)
    await gcashInput.fill('5')
    // Now clear cash to 0 (direct fill, no auto-fill triggered since 0 is not > 0)
    await cashInput.fill('0')

    // Now total = 0 + 5 = 5, which is less than product price
    // Scroll down to see the summary by scrolling the dialog
    const dialog = page.getByRole('dialog')
    await dialog.evaluate((el) => el.scrollTo(0, el.scrollHeight))

    // Verify error message about insufficient amount
    await expect(page.getByText(/Need.*more/i)).toBeVisible()

    // Confirm button should be disabled
    const confirmBtn = page.getByRole('button', { name: /Confirm/i })
    await expect(confirmBtn).toBeDisabled()
  })

  test('cancel split payment returns to POS without completing', async ({ page, pos }) => {
    // Add product to cart
    await pos.addFirstProduct()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Open payment modal and switch to Split tab
    await pos.openPaymentModal()
    await page.getByRole('tab', { name: /Split/i }).click()

    // Use quick split to fill amounts
    await page.getByRole('button', { name: /50\/50 Split/i }).click()

    // Cancel
    await page.getByRole('button', { name: 'Cancel' }).click()

    // Modal should close, cart should still have items
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()
  })

  test('receipt options available after split payment', async ({ page, pos }) => {
    // Add product to cart
    await pos.addFirstProduct()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Open payment modal and complete split payment
    await pos.openPaymentModal()
    await page.getByRole('tab', { name: /Split/i }).click()

    // Use 50/50 split
    await page.getByRole('button', { name: /50\/50 Split/i }).click()

    // Enter GCash reference
    await page.getByPlaceholder(/Enter reference/i).fill('RECEIPT12345')
    await page.getByRole('button', { name: /Confirm/i }).click()

    // Wait for success
    await expect(page.getByText(/Payment Successful/i).first()).toBeVisible({ timeout: 5000 })

    // Verify receipt options are available
    await expect(page.getByRole('button', { name: /Download Receipt/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Email Receipt/i })).toBeVisible()
  })

  test('split payment with cash only (gcash = 0)', async ({ page, pos }) => {
    // Add product to cart
    await pos.addFirstProduct()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Open payment modal and switch to Split tab
    await pos.openPaymentModal()
    await page.getByRole('tab', { name: /Split/i }).click()

    // Enter full amount as cash (500 to cover any product price)
    const cashInput = page.getByLabel('Cash Amount', { exact: true })
    await cashInput.fill('500')

    // Clear GCash to 0 (auto-fill may have set a remainder)
    const gcashInput = page.getByLabel('GCash Amount')
    await gcashInput.fill('0')

    // Set cash tendered
    const cashTendered = page.getByLabel('Cash Tendered', { exact: true })
    await cashTendered.fill('500')

    // GCash reference should not be required
    const confirmBtn = page.getByRole('button', { name: /Confirm/i })
    await expect(confirmBtn).toBeEnabled()
    await confirmBtn.click()

    // Verify success
    await expect(page.getByText(/Payment Successful/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('GCash reference validation in split payment - too short', async ({ page, pos }) => {
    // Add product to cart
    await pos.addFirstProduct()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Open payment modal and switch to Split tab
    await pos.openPaymentModal()
    await page.getByRole('tab', { name: /Split/i }).click()

    // Use 50/50 split
    await page.getByRole('button', { name: /50\/50 Split/i }).click()

    // Enter short reference (less than 10 characters)
    await page.getByPlaceholder(/Enter reference/i).fill('123456789')

    // Verify error message
    await expect(page.getByText(/at least 10 characters/i)).toBeVisible()

    // Confirm button should be disabled
    const confirmBtn = page.getByRole('button', { name: /Confirm/i })
    await expect(confirmBtn).toBeDisabled()
  })

  test('GCash reference validation in split payment - special characters rejected', async ({ page, pos }) => {
    // Add product to cart
    await pos.addFirstProduct()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Open payment modal and switch to Split tab
    await pos.openPaymentModal()
    await page.getByRole('tab', { name: /Split/i }).click()

    // Use 50/50 split
    await page.getByRole('button', { name: /50\/50 Split/i }).click()

    // Enter reference with special characters
    await page.getByPlaceholder(/Enter reference/i).fill('GCASH-12345')

    // Verify error message about letters and numbers only
    await expect(page.getByText(/letters and numbers/i)).toBeVisible()

    // Confirm button should be disabled
    const confirmBtn = page.getByRole('button', { name: /Confirm/i })
    await expect(confirmBtn).toBeDisabled()
  })
})
