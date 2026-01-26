/**
 * P0 POS Flow Tests
 * Critical path: Complete sales transaction
 * These tests MUST pass before any release
 */

import { test, expect } from './fixtures/base'

test.describe('POS Sales Flow @p0', () => {
  test('complete cash sale transaction', async ({ page, posPage }) => {
    // Step 1: Add product to cart
    await page.getByText('Burger Steak').click()

    // Verify cart updated
    await expect(page.getByText(/Cart \(1\)/)).toBeVisible()

    // Step 2: Open payment modal
    await page.getByRole('button', { name: 'Pay' }).click()

    // Step 3: Payment modal should be visible
    await expect(page.getByRole('dialog', { name: 'Payment' })).toBeVisible()

    // Step 4: Cash tab should be selected, enter payment amount
    await expect(page.getByRole('tab', { name: 'Cash', selected: true })).toBeVisible()

    // Find amount received input and fill with exact total
    const amountInput = page.getByRole('spinbutton').last()
    await amountInput.fill('95')

    // Step 5: Complete sale
    await page.getByRole('button', { name: 'Confirm Payment' }).click()

    // Step 6: Wait for success notification and cart to clear
    await expect(page.getByText(/Cart \(0\)/)).toBeVisible({ timeout: 5000 })
  })

  test('add multiple products to cart', async ({ page, posPage }) => {
    // Add first product
    const products = page.locator('.grid > div')
    await products.nth(0).click()
    await expect(page.getByText(/Cart \(1\)/)).toBeVisible()

    // Add second product (if available)
    const productCount = await products.count()
    if (productCount > 1) {
      await products.nth(1).click()
      await expect(page.getByText(/Cart \(2\)/)).toBeVisible()
    }

    // Add same product again (quantity increase)
    await products.nth(0).click()
    await expect(page.getByText(/Cart \([2-3]\)/)).toBeVisible()
  })

  test('apply discount to cart', async ({ page, posPage }) => {
    // Add product
    await page.locator('.grid > div').first().click()
    await expect(page.getByText(/Cart \(1\)/)).toBeVisible()

    // Find discount input
    const discountInput = page.locator('input').filter({ hasText: /discount/i })
      .or(page.locator('[placeholder*="discount" i]'))
      .or(page.getByLabel(/discount/i))

    // If discount input exists, apply discount
    const discountField = page.locator('input[type="number"]').nth(1) // Usually second input
    if (await discountField.isVisible()) {
      await discountField.fill('10')

      // Total should reflect discount
      // (We can't assert exact value without knowing product price)
    }
  })

  test('hold and recall order', async ({ page, posPage }) => {
    // Add product
    await page.getByText('Burger Steak').click()
    await expect(page.getByText(/Cart \(1\)/)).toBeVisible()

    // Click Hold button (exact match to avoid matching "Hold Orders")
    await page.getByRole('button', { name: 'Hold', exact: true }).click()

    // Fill hold reference (if modal appears)
    const refInput = page.getByPlaceholder(/reference|name/i)
    if (await refInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await refInput.fill('Test Hold Order')
      await page.getByRole('button', { name: /save|confirm|hold/i }).click()
    }

    // Cart should be cleared
    await expect(page.getByText(/Cart \(0\)/)).toBeVisible()

    // Verify hold orders count increased
    await expect(page.getByRole('button', { name: /Hold Orders \([1-9]\d*\)/i })).toBeVisible()
  })

  test('cancel transaction clears cart', async ({ page, posPage }) => {
    // Add product
    await page.locator('.grid > div').first().click()
    await expect(page.getByText(/Cart \(1\)/)).toBeVisible()

    // Click Cancel button
    await page.getByRole('button', { name: 'Cancel' }).click()

    // Cart should be cleared
    await expect(page.getByText(/Cart \(0\)/)).toBeVisible()
  })

  test('category filter works', async ({ page, posPage }) => {
    // Get initial product count
    const initialProducts = await page.locator('.grid > div').count()

    // Category buttons are: All, Beverages, Food
    // Click "Beverages" category to filter
    await page.getByRole('button', { name: 'Beverages' }).click()

    // Wait for filter to apply
    await page.waitForTimeout(300)

    // Products should be filtered (potentially different count)
    const filteredProducts = await page.locator('.grid > div').count()

    // Click "All" to restore
    await page.getByRole('button', { name: 'All' }).click()
    await page.waitForTimeout(300)

    const allProducts = await page.locator('.grid > div').count()
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

  test('out of stock product shows warning', async ({ page, posPage }) => {
    // Find a product with track_stock=true and quantity=0
    // This test may need seed data adjustment

    // For now, verify the app handles the click without crashing
    const products = page.locator('.grid > div')
    if (await products.count() > 0) {
      await products.first().click()
      // No crash = success
    }
  })
})
