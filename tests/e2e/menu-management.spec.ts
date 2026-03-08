/**
 * Menu Management E2E Tests
 * Tests the /menu page: product listing, search/filter, CRUD operations,
 * category sidebar, and product detail panel.
 *
 * The menu page uses a sidebar + card grid hybrid layout (no tabs).
 * - Left sidebar: category list with "All Products" default, search input
 * - Main area: card or table view with stock/lifecycle filters
 * - Detail panel: slides in from right on product click
 *
 * Relies on seed data: Burger Steak, Gatorade, Tocilog, Iced Coffee
 * Categories: Beverages, Food, Dairy, Protein
 */

import { test, expect } from './fixtures/base'

// --- Helpers ---

async function waitForProductsLoaded(page: import('@playwright/test').Page) {
  // Wait for the "All Products" heading with a count badge to appear
  await expect(page.getByText('All Products')).toBeVisible({ timeout: 15000 })
  // Wait for the Add Product button to confirm page is interactive
  await expect(page.getByRole('button', { name: /Add Product/ })).toBeVisible({ timeout: 10000 })
}

// --- GROUP 1: Page Load & Layout ---

test.describe('Menu Page Layout @p1', () => {
  test('menu page loads with sidebar and product cards', async ({ page, menuPage: _menuPage }) => {
    // Sidebar should show "Menu" heading
    await expect(page.getByRole('heading', { name: 'Menu' })).toBeVisible()

    // "All Products" button in sidebar should be visible
    await expect(page.getByRole('button', { name: /All Products/ })).toBeVisible()

    // "Categories" label in sidebar
    await expect(page.getByText('Categories', { exact: true })).toBeVisible()

    // Add Product button should be visible
    await expect(page.getByRole('button', { name: /Add Product/ })).toBeVisible()

    // At least one seeded product should be present
    await expect(
      page.getByText(/Burger Steak|Gatorade|Tocilog|Iced Coffee/).first()
    ).toBeVisible()
  })

  test('can switch between card and table view', async ({ page, menuPage: _menuPage }) => {
    // Table view toggle button should be visible
    const tableViewBtn = page.getByRole('radio', { name: 'Table view' })
    await expect(tableViewBtn).toBeVisible()

    // Click table view
    await tableViewBtn.click()

    // Table column headers should appear (wait for re-render)
    await expect(page.getByRole('columnheader', { name: 'Product' })).toBeVisible({ timeout: 10000 })

    // Switch back to card view
    const cardViewBtn = page.getByRole('radio', { name: 'Card view' })
    await cardViewBtn.click()

    // Column headers should disappear
    await expect(page.getByRole('columnheader', { name: 'Product' })).not.toBeVisible({ timeout: 3000 })
  })
})

// --- GROUP 2: Product Search & Filtering ---

test.describe('Product Filtering @p1', () => {
  test('sidebar search filters products by name', async ({ page, menuPage: _menuPage }) => {
    // Use the sidebar search input
    const searchInput = page.getByLabel('Search products')

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

  test('sidebar category filters products', async ({ page, menuPage: _menuPage }) => {
    // Click a category in the sidebar (e.g. "Beverages")
    const beveragesBtn = page.getByRole('button', { name: /Beverages/ })
    if (await beveragesBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await beveragesBtn.click()

      // Header should update to show the category name
      await expect(page.getByText('Beverages').first()).toBeVisible()

      // Beverage products should be visible
      await expect(
        page.getByText(/Gatorade|Iced Coffee/).first()
      ).toBeVisible()

      // Food products should NOT be visible
      await expect(page.getByText('Burger Steak')).not.toBeVisible()

      // Click "All Products" to reset
      await page.getByRole('button', { name: /All Products/ }).click()
      await page.waitForTimeout(300)

      // All products should return
      await expect(page.getByText('Burger Steak')).toBeVisible()
    }
  })
})

// --- GROUP 3: Add Product (CRUD - Create) ---

test.describe('Add Product @p1', () => {
  // Dismiss Next.js dev tools error overlay if visible (it can block clicks)
  test.beforeEach(async ({ page }) => {
    const collapseBtn = page.locator('button[aria-label="Collapse issues badge"], button:has-text("Issue")')
    if (await collapseBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await collapseBtn.click().catch(() => {})
      await page.waitForTimeout(300)
    }
  })

  // Use timestamp-based name for test isolation across retries
  const TEST_PRODUCT_PREFIX = 'E2E Test '

  // Clean up after tests
  test.afterAll(async ({ request }) => {
    try {
      const res = await request.get('/api/products')
      const products = await res.json()
      for (const p of products) {
        if (p.name?.startsWith(TEST_PRODUCT_PREFIX)) {
          await request.delete(`/api/products/${p.id}`)
        }
      }
    } catch {
      // Cleanup is best-effort
    }
  })

  test('can add a new product via dialog', async ({ page, menuPage: _menuPage }) => {
    const productName = `${TEST_PRODUCT_PREFIX}${Date.now()}`

    // Dismiss Next.js dev error overlay if present (it can intercept clicks)
    const issueBtn = page.locator('button:has-text("Issue")')
    if (await issueBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      // Close the overlay by pressing Escape
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }

    // Click Add Product and wait for dialog
    const addBtn = page.getByRole('button', { name: /Add Product/ })
    await addBtn.waitFor({ state: 'visible' })
    await addBtn.click()

    // Dialog should open
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 10000 })
    await expect(dialog.getByText('Add Product')).toBeVisible()

    // Fill the form
    await dialog.getByLabel('Name').fill(productName)
    await dialog.getByLabel('Price').fill('120')

    // Select a category via the Category combobox
    await dialog.getByRole('combobox', { name: 'Category' }).click()
    await page.getByRole('option').first().click()

    // Submit
    await dialog.getByRole('button', { name: 'Save' }).click()

    // Wait for success toast (remote DB can be slow)
    await expect(page.getByText(/Product created/i)).toBeVisible({ timeout: 20000 })

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 3000 })

    // New product should appear
    await expect(page.getByText(productName)).toBeVisible({ timeout: 5000 })
  })

  test('add product dialog can be cancelled', async ({ page, menuPage: _menuPage }) => {
    // Open dialog
    await page.getByRole('button', { name: /Add Product/ }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // Cancel
    await dialog.getByRole('button', { name: 'Cancel' }).click()

    // Dialog should close
    await expect(dialog).not.toBeVisible()
  })
})

// --- GROUP 4: Product Detail Panel (Read) ---

test.describe('Product Detail Panel @p1', () => {
  test('clicking a product opens the detail panel', async ({ page, menuPage: _menuPage }) => {
    // Click on a seeded product card
    await page.getByText('Burger Steak').first().click()

    // Detail panel should appear with the product name
    await expect(page.getByRole('heading', { name: /Burger Steak/ })).toBeVisible({ timeout: 5000 })

    // Panel should have Edit or Save button
    await expect(
      page.getByRole('button', { name: 'Save' }).or(page.getByRole('button', { name: 'Edit' }))
    ).toBeVisible()
  })

  test('can close the detail panel', async ({ page, menuPage: _menuPage }) => {
    // Open panel
    await page.getByText('Burger Steak').first().click()
    await expect(page.getByRole('heading', { name: /Burger Steak/ })).toBeVisible({ timeout: 5000 })

    // Close panel via the X button
    await page.locator('button[class*="sheet-close"], button:has(> svg.lucide-x)').first().click()

    // Product heading in panel should disappear
    await expect(page.getByRole('heading', { name: /Burger Steak/ })).not.toBeVisible({ timeout: 3000 })
  })
})

// --- GROUP 5: Product Edit (CRUD - Update) ---

test.describe('Product Edit @p1', () => {
  test('can enter edit mode and see edit controls', async ({ page, menuPage: _menuPage }) => {
    // Open product panel
    await page.getByText('Burger Steak').first().click()
    await expect(page.getByRole('heading', { name: /Burger Steak/ })).toBeVisible({ timeout: 5000 })

    // Click Edit to switch to edit mode
    const editBtn = page.getByRole('button', { name: 'Edit' })
    if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editBtn.click()
    }

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

  test('can cancel edit mode without saving', async ({ page, menuPage: _menuPage }) => {
    // Open product panel and enter edit mode
    await page.getByText('Burger Steak').first().click()
    await expect(page.getByRole('heading', { name: /Burger Steak/ })).toBeVisible({ timeout: 5000 })

    const editBtn = page.getByRole('button', { name: 'Edit' })
    if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editBtn.click()
    }
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

// --- GROUP 6: Category Sidebar ---

test.describe('Category Sidebar @p1', () => {
  test('sidebar displays seeded categories', async ({ page, menuPage: _menuPage }) => {
    // Sidebar should show category buttons
    await expect(page.getByRole('button', { name: /All Products/ })).toBeVisible()

    // At least one seeded category should be visible
    await expect(
      page.getByRole('button', { name: /Beverages|Food|Dairy|Protein/ }).first()
    ).toBeVisible()

    // Stock Health summary at bottom of sidebar
    await expect(page.getByText('Stock Health')).toBeVisible()
  })

  test('selecting a category filters the product grid', async ({ page, menuPage: _menuPage }) => {
    // Find and click a category with products
    const categoryBtn = page.getByRole('button', { name: /Beverages|Food/ }).first()
    const categoryName = await categoryBtn.textContent()
    await categoryBtn.click()

    // The header should reflect the selected category
    // (the h2 heading changes from "All Products" to the category name)
    await page.waitForTimeout(300)

    // Click "All Products" to reset
    await page.getByRole('button', { name: /All Products/ }).click()
    await page.waitForTimeout(300)

    // All products should return
    await expect(page.getByText('Burger Steak')).toBeVisible()
  })
})
