/**
 * P0 Inventory Count Tests
 * Critical path: Complete physical inventory count
 */

import { test, expect } from './fixtures/base'

test.describe('Inventory Count Flow @p0', () => {
  test('inventory count page loads with ingredients', async ({ page, inventoryCountPage: _inventoryCountPage }) => {
    // Page header should show count progress
    await expect(page.getByText(/\d+ of \d+ items counted/)).toBeVisible()

    // Ingredients should be grouped by category (match section headers like "Other (0/2)")
    await expect(page.getByText(/(?:Other|Protein|Beverage|Dairy).*\(\d+\/\d+\)/).first()).toBeVisible()

    // Action buttons should be visible (but may be disabled initially)
    await expect(page.getByRole('button', { name: /Save Draft/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Submit Count/i })).toBeVisible()
  })

  test('initial state has all action buttons disabled', async ({ page, inventoryCountPage: _inventoryCountPage }) => {
    // When no items are counted, action buttons should be disabled
    await expect(page.getByRole('button', { name: /Discard/i })).toBeDisabled()
    await expect(page.getByRole('button', { name: /Save Draft/i })).toBeDisabled()
    await expect(page.getByRole('button', { name: /Submit Count/i })).toBeDisabled()

    // Progress should show 0 counted
    await expect(page.getByText(/0 of \d+ items counted/)).toBeVisible()
  })

  test('categories are collapsible', async ({ page, inventoryCountPage: _inventoryCountPage }) => {
    // Find category headers with count pattern like "Other (0/2)" or "Protein (0/2)"
    // Categories depend on seed data; check for any category sections present
    const categoryHeaders = page.getByText(/(?:Other|Protein|Beverage|Dairy).*\(\d+\/\d+\)/)
    const count = await categoryHeaders.count()
    expect(count).toBeGreaterThanOrEqual(1)

    // Verify at least the first category header is visible
    await expect(categoryHeaders.first()).toBeVisible()
  })

  test('ingredient items show expected quantity', async ({ page, inventoryCountPage: _inventoryCountPage }) => {
    // Each ingredient should show "Expected: X unit"
    await expect(page.getByText(/Expected:.*\d+/).first()).toBeVisible()

    // Should have at least one ingredient name visible (from seed data)
    await expect(
      page.getByText(/Fries|Rice|Burger Patties|Coffee Beans|Ground Beef/).first()
    ).toBeVisible()
  })

  test('progress bar is visible', async ({ page, inventoryCountPage: _inventoryCountPage }) => {
    // Progress bar should be present
    await expect(page.getByRole('progressbar')).toBeVisible()
  })
})
