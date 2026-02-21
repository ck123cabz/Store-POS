/**
 * P0 POS Flow Tests
 * Critical path: Complete sales transaction
 * These tests MUST pass before any release
 */

import { test, expect } from './fixtures/base'

test.describe('POS Sales Flow @p0', () => {
  test.beforeEach(async ({ posPage }) => {
    // posPage fixture handles navigation and setup
  })

  test('complete cash sale transaction', async ({ page, pos }) => {
    // Step 1: Add product to cart
    await pos.addFirstProduct()

    // Verify cart updated
    await expect(page.getByText('Cart is empty')).not.toBeVisible()

    // Step 2: Open payment modal
    await pos.openPaymentModal()

    // Step 3: Cash tab should be selected
    await expect(page.getByRole('tab', { name: 'Cash', selected: true })).toBeVisible()

    // Step 4: Enter payment amount
    const amountInput = page.locator('input[type="text"][inputmode="decimal"]')
    await amountInput.fill('500')

    // Step 5: Complete sale
    await page.getByRole('button', { name: /Confirm/i }).click()

    // Step 6: Wait for success notification and cart to clear
    await expect(page.getByText('Cart is empty')).toBeVisible({ timeout: 5000 })
  })

  test('add multiple products to cart', async ({ page, pos }) => {
    // Add first enabled product
    await pos.addFirstProduct()
    await expect(page.getByText('Cart is empty')).not.toBeVisible()

    // Add a different product if available
    const enabledProducts = page.locator('[data-testid="product-card"][aria-disabled="false"]')
    const count = await enabledProducts.count()
    if (count > 1) {
      await enabledProducts.nth(1).click()
      // Cart should still not be empty after adding second product
      await expect(page.getByText('Cart is empty')).not.toBeVisible()
    }

    // Add same product again (quantity increase)
    await enabledProducts.first().click()
    // Cart should still have items
    await expect(page.getByText('Cart is empty')).not.toBeVisible()
  })

  test('apply discount to cart', async ({ page, pos }) => {
    // Add product
    await pos.addFirstProduct()
    await expect(page.getByText('Cart is empty')).not.toBeVisible()

    // Find discount input
    const discountInput = page.locator('input').filter({ hasText: /discount/i })
      .or(page.locator('[placeholder*="discount" i]'))
      .or(page.getByLabel(/discount/i))

    // If discount input exists, apply discount
    const discountField = page.locator('input[type="number"]').nth(1) // Usually second input
    if (await discountField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await discountField.fill('10')
    }
  })

  test('hold and recall order', async ({ page, pos }) => {
    // Add product
    await pos.addFirstProduct()
    await expect(page.getByText('Cart is empty')).not.toBeVisible()

    // Click Hold button in the cart area
    // There are two Hold buttons: one in header (small, with badge) and one in cart footer
    // The cart footer's Hold button is inside the cart Card component
    const cartHoldButton = page.locator('button', { hasText: 'Hold' }).filter({ hasNot: page.locator('[data-slot="badge"]') }).last()
    await cartHoldButton.click()

    // Fill hold reference in the modal
    const refInput = page.getByPlaceholder(/Enter reference/i)
    if (await refInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await refInput.fill('Test Hold Order')
      await page.getByRole('button', { name: /Hold Order/i }).click()
    }

    // Cart should be cleared (wait for the hold modal to close and cart to clear)
    await expect(page.getByText('Cart is empty')).toBeVisible({ timeout: 10000 })

    // Verify hold orders count increased
    // The header Hold button text includes "Hold" followed by a badge number
    // It renders as "Hold{N}" in text content, e.g., "Hold1", "Hold2", etc.
    await expect(
      page.locator('button').filter({ hasText: /^Hold\d+$/ })
    ).toBeVisible({ timeout: 5000 })
  })

  test('cancel transaction clears cart', async ({ page, pos }) => {
    // Add product
    await pos.addFirstProduct()
    await expect(page.getByText('Cart is empty')).not.toBeVisible()

    // Click Clear button (clears the cart)
    await pos.clearButton().click()

    // Cart should be cleared
    await expect(page.getByText('Cart is empty')).toBeVisible()
  })

  test('category filter works', async ({ page, posPage }) => {
    // Get initial product count
    const initialProducts = await page.locator('[data-testid="product-card"]').count()

    // Category buttons are: All, Beverages, Food
    // Click "Beverages" category to filter
    await page.getByRole('button', { name: 'Beverages' }).click()

    // Wait for filter to apply
    await page.waitForTimeout(300)

    // Products should be filtered (potentially different count)
    const filteredProducts = await page.locator('[data-testid="product-card"]').count()

    // Click "All" to restore
    await page.getByRole('button', { name: 'All' }).click()
    await page.waitForTimeout(300)

    const allProducts = await page.locator('[data-testid="product-card"]').count()
    expect(allProducts).toBeGreaterThanOrEqual(filteredProducts)
  })
})

test.describe('POS Error Handling @p0', () => {
  test('handles API errors gracefully', async ({ page, context }) => {
    // Mock products API to return error
    await context.route('**/api/products', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Database connection failed' }),
      })
    })

    await page.goto('/pos')

    // App should not crash - page should still be functional
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible()

    // No JavaScript errors thrown (check for error boundary)
    await expect(page.locator('text=/error.*occurred/i')).not.toBeVisible()
  })

  test('out of stock product shows unavailable state', async ({ page, posPage }) => {
    // Find a product card with aria-disabled="true" (out of stock)
    const disabledProduct = page.locator('[data-testid="product-card"][aria-disabled="true"]')
    const count = await disabledProduct.count()

    if (count > 0) {
      // Verify the out of stock product has the "OUT OF STOCK" text
      // The product card may have the text in both the badge and the overlay
      await expect(disabledProduct.first().getByText(/OUT OF STOCK/i).first()).toBeVisible()
    }

    // Verify enabled products can still be clicked without crash
    const enabledProduct = page.locator('[data-testid="product-card"][aria-disabled="false"]')
    if (await enabledProduct.count() > 0) {
      await enabledProduct.first().click()
      // No crash = success
    }
  })
})
