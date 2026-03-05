/**
 * Menu Management E2E Tests
 * Tests the /menu page: product listing, search/filter, CRUD operations,
 * categories tab, and product detail panel.
 *
 * Relies on seed data: Burger Steak, Gatorade, Tocilog, Iced Coffee
 * Categories: Beverages, Food, Dairy, Protein
 */

import { test, expect } from './fixtures/base'

// ─── Helpers ──────────────────────────────────────────────

async function waitForTableLoaded(page: import('@playwright/test').Page) {
  // Wait for the product table column header to confirm data loaded
  await expect(
    page.getByRole('columnheader', { name: 'Product' })
  ).toBeVisible({ timeout: 10000 })
}

// ─── GROUP 1: Page Load & Layout ─────────────────────────

test.describe('Menu Page Layout @p1', () => {
  test('menu page loads with products tab active', async ({ page, menuPage: _menuPage}) => {
    // Products tab should be active
    const productsTab = page.getByRole('tab', { name: 'Products' })
    await expect(productsTab).toHaveAttribute('data-state', 'active')

    // Categories tab should exist but not be active
    const categoriesTab = page.getByRole('tab', { name: 'Categories' })
    await expect(categoriesTab).toBeVisible()
    await expect(categoriesTab).toHaveAttribute('data-state', 'inactive')

    // Add Product button should be visible
    await expect(page.getByRole('button', { name: /Add Product/ })).toBeVisible()

    // Search input should be visible
    await expect(page.getByPlaceholder('Search products...')).toBeVisible()

    // At least one seeded product should be present
    await expect(
      page.getByText(/Burger Steak|Gatorade|Tocilog|Iced Coffee/).first()
    ).toBeVisible()
  })

  test('can switch between Products and Categories tabs', async ({ page, menuPage: _menuPage}) => {
    // Click Categories tab
    await page.getByRole('tab', { name: 'Categories' }).click()

    // Categories table should be visible with its column headers
    await expect(page.getByRole('columnheader', { name: 'Category' })).toBeVisible()

    // The button label should switch to "Add Category"
    await expect(page.getByRole('button', { name: /Add Category/ })).toBeVisible()

    // Switch back to Products
    await page.getByRole('tab', { name: 'Products' }).click()

    // Products table should return
    await waitForTableLoaded(page)

    // Button should revert to "Add Product"
    await expect(page.getByRole('button', { name: /Add Product/ })).toBeVisible()
  })
})

// ─── GROUP 2: Product Search & Filtering ─────────────────

test.describe('Product Filtering @p1', () => {
  test('search filters products by name', async ({ page, menuPage: _menuPage}) => {
    await waitForTableLoaded(page)

    const searchInput = page.getByPlaceholder('Search products...')

    // Search for "Burger"
    await searchInput.fill('Burger')

    // Burger Steak should still be visible
    await expect(page.getByText('Burger Steak')).toBeVisible()

    // Gatorade should NOT be visible
    await expect(page.getByText('Gatorade')).not.toBeVisible()

    // Clear search
    await searchInput.clear()

    // Gatorade should return
    await expect(page.getByText('Gatorade')).toBeVisible()
  })

  test('category dropdown filters products', async ({ page, menuPage: _menuPage}) => {
    await waitForTableLoaded(page)

    // Open category filter and pick "Beverages"
    const categorySelect = page.locator('button[role="combobox"]').filter({ hasText: /All Categories|Beverages|Food/ }).first()
    await categorySelect.click()
    await page.getByRole('option', { name: 'Beverages' }).click()

    // Wait for filter to apply
    await page.waitForTimeout(300)

    // Beverages products should be visible (Gatorade, Iced Coffee are Beverages from seed)
    await expect(
      page.getByText(/Gatorade|Iced Coffee/).first()
    ).toBeVisible()

    // Food products should NOT be visible
    await expect(page.getByText('Burger Steak')).not.toBeVisible()

    // Reset to All Categories
    await categorySelect.click()
    await page.getByRole('option', { name: 'All Categories' }).click()
    await page.waitForTimeout(300)

    // All products should return
    await expect(page.getByText('Burger Steak')).toBeVisible()
  })
})

// ─── GROUP 3: Add Product (CRUD - Create) ────────────────

test.describe('Add Product @p1', () => {
  const TEST_PRODUCT_NAME = 'E2E Test Espresso'

  // Clean up after tests
  test.afterAll(async ({ request }) => {
    try {
      const res = await request.get('/api/products')
      const products = await res.json()
      const testProduct = products.find(
        (p: { name: string }) => p.name === TEST_PRODUCT_NAME
      )
      if (testProduct) {
        await request.delete(`/api/products/${testProduct.id}`)
      }
    } catch {
      // Cleanup is best-effort
    }
  })

  test('can add a new product via dialog', async ({ page, menuPage: _menuPage}) => {
    await waitForTableLoaded(page)

    // Click Add Product
    await page.getByRole('button', { name: /Add Product/ }).click()

    // Dialog should open
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Add Product')).toBeVisible()

    // Fill the form
    await dialog.getByLabel('Name').fill(TEST_PRODUCT_NAME)
    await dialog.getByLabel('Price').fill('120')

    // Select a category
    await dialog.locator('button[role="combobox"]').click()
    await page.getByRole('option').first().click()

    // Submit
    await dialog.getByRole('button', { name: 'Save' }).click()

    // Wait for success toast
    await expect(page.getByText(/Product created/i)).toBeVisible({ timeout: 5000 })

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 3000 })

    // New product should appear in the table
    await expect(page.getByText(TEST_PRODUCT_NAME)).toBeVisible({ timeout: 5000 })
  })

  test('add product dialog can be cancelled', async ({ page, menuPage: _menuPage}) => {
    await waitForTableLoaded(page)

    // Open dialog
    await page.getByRole('button', { name: /Add Product/ }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Cancel
    await dialog.getByRole('button', { name: 'Cancel' }).click()

    // Dialog should close
    await expect(dialog).not.toBeVisible()
  })
})

// ─── GROUP 4: Product Detail Panel (Read) ────────────────

test.describe('Product Detail Panel @p1', () => {
  test('clicking a product opens the detail panel', async ({ page, menuPage: _menuPage}) => {
    await waitForTableLoaded(page)

    // Click on a seeded product row
    await page.getByRole('row').filter({ hasText: 'Burger Steak' }).click()

    // Sheet/panel should appear with the product name (now shows "Edit Burger Steak")
    await expect(page.getByRole('heading', { name: /Burger Steak/ })).toBeVisible({ timeout: 3000 })

    // Panel should have Save/Cancel buttons (now opens directly in edit mode)
    await expect(page.getByRole('button', { name: 'Save' }).or(page.getByRole('button', { name: 'Edit' }))).toBeVisible()

    // Name field or pricing info should be visible
    await expect(page.getByLabel('Name').or(page.getByText('Pricing'))).toBeVisible()
  })

  test('can close the detail panel', async ({ page, menuPage: _menuPage}) => {
    await waitForTableLoaded(page)

    // Open panel
    await page.getByRole('row').filter({ hasText: 'Burger Steak' }).click()
    await expect(page.getByRole('heading', { name: /Burger Steak/ })).toBeVisible({ timeout: 3000 })

    // Close panel via the Sheet's X close button
    await page.locator('button[class*="sheet-close"], button:has(> svg.lucide-x)').first().click()

    // Product heading in panel should disappear
    await expect(page.getByRole('heading', { name: /Burger Steak/ })).not.toBeVisible({ timeout: 3000 })
  })
})

// ─── GROUP 5: Product Edit (CRUD - Update) ───────────────

test.describe('Product Edit @p1', () => {
  test('can enter edit mode and see edit controls', async ({ page, menuPage: _menuPage}) => {
    await waitForTableLoaded(page)

    // Open product panel (opens in view mode first)
    await page.getByRole('row').filter({ hasText: 'Burger Steak' }).click()
    await expect(page.getByRole('heading', { name: /Burger Steak/ })).toBeVisible({ timeout: 3000 })

    // Click Edit to switch to edit mode
    await page.getByRole('button', { name: 'Edit' }).click()

    // Should see edit-mode controls: Save and Cancel buttons
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()

    // Name input should be visible and pre-filled
    const nameInput = page.getByLabel('Name')
    await expect(nameInput).toBeVisible()
    await expect(nameInput).toHaveValue('Burger Steak')

    // Price input should be visible
    await expect(page.getByLabel('Price')).toBeVisible()
  })

  test('can cancel edit mode without saving', async ({ page, menuPage: _menuPage}) => {
    await waitForTableLoaded(page)

    // Open product panel and enter edit mode
    await page.getByRole('row').filter({ hasText: 'Burger Steak' }).click()
    await expect(page.getByRole('heading', { name: /Burger Steak/ })).toBeVisible({ timeout: 3000 })
    await page.getByRole('button', { name: 'Edit' }).click()
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible({ timeout: 5000 })

    // Modify the name
    const nameInput = page.getByLabel('Name')
    await nameInput.clear()
    await nameInput.fill('SHOULD NOT SAVE')

    // Click Cancel to return to view mode
    await page.getByRole('button', { name: 'Cancel' }).click()

    // Should return to view mode - Edit button should be visible again
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible({ timeout: 3000 })

    // Product heading should still show original name
    await expect(page.getByRole('heading', { name: /Burger Steak/ })).toBeVisible()

    // The modified name should NOT appear anywhere
    await expect(page.getByText('SHOULD NOT SAVE')).not.toBeVisible()
  })
})

// ─── GROUP 6: Categories Tab ─────────────────────────────

test.describe('Categories Tab @p1', () => {
  test('categories tab displays seeded categories', async ({ page, menuPage: _menuPage}) => {
    // Switch to Categories tab
    await page.getByRole('tab', { name: 'Categories' }).click()

    // Table headers should be visible
    await expect(page.getByRole('columnheader', { name: 'Category' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Products' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Stock Health' })).toBeVisible()

    // Seeded categories should be visible
    await expect(
      page.getByRole('cell', { name: /Beverages|Food|Dairy|Protein/ }).first()
    ).toBeVisible()
  })

  test('can expand a category to see its products', async ({ page, menuPage: _menuPage}) => {
    // Switch to Categories tab
    await page.getByRole('tab', { name: 'Categories' }).click()
    await expect(page.getByRole('columnheader', { name: 'Category' })).toBeVisible()

    // Find a category row with products and click its expand button
    // Look for a row that has a non-zero product count, then click the chevron
    const categoryRow = page.getByRole('row').filter({ hasText: /Beverages|Food/ }).first()
    await categoryRow.locator('button').first().click()

    // Expanded section should show product names
    await expect(
      page.getByText(/Products in (Beverages|Food)/).first()
    ).toBeVisible({ timeout: 3000 })

    // "View in Products" button should be visible
    await expect(page.getByRole('button', { name: /View in Products/ })).toBeVisible()
  })

  test('View in Products switches to filtered Products tab', async ({ page, menuPage: _menuPage}) => {
    // Switch to Categories tab
    await page.getByRole('tab', { name: 'Categories' }).click()
    await expect(page.getByRole('columnheader', { name: 'Category' })).toBeVisible()

    // Expand a category
    const categoryRow = page.getByRole('row').filter({ hasText: /Beverages|Food/ }).first()
    await categoryRow.locator('button').first().click()
    await expect(
      page.getByText(/Products in (Beverages|Food)/).first()
    ).toBeVisible({ timeout: 3000 })

    // Click "View in Products"
    await page.getByRole('button', { name: /View in Products/ }).click()

    // Should switch to Products tab
    await expect(page.getByRole('tab', { name: 'Products' })).toHaveAttribute('data-state', 'active')

    // Products table should be visible
    await waitForTableLoaded(page)
  })
})
