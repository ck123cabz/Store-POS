/**
 * E2E Tests: Tab (Pay Later) Payment Flow
 * US3: Tab Payment (Store Credit) at POS
 *
 * Actual Pay Later UI (pay-later-modal.tsx):
 *   - Triggered by "Pay Later" button in cart (NOT a tab in payment modal)
 *   - Dialog title: "Pay Later - Select Customer"
 *   - Search input: "Search customer name or phone..."
 *   - Customer list: clickable Card components (not dropdown/combobox)
 *   - Selected preview: Customer, Current Tab, This Order, New Tab Balance
 *   - Confirm button: "Add to Tab" (disabled without customer)
 */

import { test, expect } from './fixtures/base'

test.describe('US3: Tab Payment Flow @p2', () => {
  test.beforeEach(async ({ posPage }) => {
    // posPage fixture handles navigation and setup
  })

  test('can open Pay Later modal', async ({ page, pos }) => {
    // Add product to cart
    await pos.addFirstProduct()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Click Pay Later button (in the cart, not the payment modal)
    await pos.payLaterButton().click()

    // Verify Pay Later modal opens
    await expect(page.getByText(/Pay Later - Select Customer/i)).toBeVisible()

    // Search input should be visible
    await expect(page.getByPlaceholder(/Search customer name or phone/i)).toBeVisible()
  })

  test('Pay Later requires customer selection', async ({ page, pos }) => {
    // Add product to cart
    await pos.addFirstProduct()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Open Pay Later modal
    await pos.payLaterButton().click()
    await expect(page.getByText(/Pay Later - Select Customer/i)).toBeVisible()

    // "Add to Tab" button should be disabled without customer selection
    const addToTabBtn = page.getByRole('button', { name: /Add to Tab/i })
    await expect(addToTabBtn).toBeDisabled()
  })

  test('shows customer tab balance when selected', async ({ page, pos }) => {
    // Add product to cart
    await pos.addFirstProduct()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Open Pay Later modal
    await pos.payLaterButton().click()
    await expect(page.getByText(/Pay Later - Select Customer/i)).toBeVisible()

    // Wait for customers to load and click the first customer card
    const customerCards = page.locator('.cursor-pointer').filter({ has: page.locator('text=/Tab Balance/') })
    const cardCount = await customerCards.count()

    if (cardCount > 0) {
      await customerCards.first().click()

      // Verify the selected customer preview shows balance info
      await expect(page.getByText(/Current Tab/i)).toBeVisible()
      await expect(page.getByText(/New Tab Balance/i)).toBeVisible()
    }
  })

  test('completes tab payment successfully', async ({ page, pos }) => {
    // Add product to cart
    await pos.addFirstProduct()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Open Pay Later modal
    await pos.payLaterButton().click()
    await expect(page.getByText(/Pay Later - Select Customer/i)).toBeVisible()

    // Wait for customers to load and click first customer
    const customerCards = page.locator('.cursor-pointer').filter({ has: page.locator('text=/Tab Balance/') })
    const cardCount = await customerCards.count()

    if (cardCount > 0) {
      await customerCards.first().click()

      // Verify preview section appears
      await expect(page.getByText(/Current Tab/i)).toBeVisible()

      // Click "Add to Tab"
      const addToTabBtn = page.getByRole('button', { name: /Add to Tab/i })
      await expect(addToTabBtn).toBeEnabled()
      await addToTabBtn.click()

      // Modal should close and cart should be cleared
      await expect(page.getByText(/Pay Later - Select Customer/i)).not.toBeVisible({ timeout: 5000 })
      await expect(page.getByText(/0 items/)).toBeVisible()
    }
  })

  test('cancel returns without completing tab payment', async ({ page, pos }) => {
    // Add product to cart
    await pos.addFirstProduct()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Open Pay Later modal
    await pos.payLaterButton().click()
    await expect(page.getByText(/Pay Later - Select Customer/i)).toBeVisible()

    // Cancel the modal
    await page.getByRole('button', { name: 'Cancel' }).click()

    // Modal should close, cart should still have items
    await expect(page.getByText(/Pay Later - Select Customer/i)).not.toBeVisible()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()
  })

  test('shows order total in Pay Later modal', async ({ page, pos }) => {
    // Add product to cart
    await pos.addFirstProduct()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Open Pay Later modal
    await pos.payLaterButton().click()
    await expect(page.getByText(/Pay Later - Select Customer/i)).toBeVisible()

    // Verify order total is displayed
    await expect(page.getByText(/Order Total/i)).toBeVisible()
    const totalText = await page.locator('.text-primary').filter({ hasText: /₱/ }).first().textContent()
    expect(totalText).toMatch(/₱[\d,]+\.\d{2}/)
  })

  test('can create new customer from Pay Later modal', async ({ page, pos }) => {
    // Add product to cart
    await pos.addFirstProduct()
    await expect(page.getByText(/1 item(?!s)/)).toBeVisible()

    // Open Pay Later modal
    await pos.payLaterButton().click()
    await expect(page.getByText(/Pay Later - Select Customer/i)).toBeVisible()

    // Click "New Customer" button
    await page.getByRole('button', { name: /New Customer/i }).click()

    // Verify new customer form is visible
    await expect(page.getByPlaceholder(/Customer name/i)).toBeVisible()
    await expect(page.getByPlaceholder(/Phone number/i)).toBeVisible()
  })
})
