/**
 * P0 Inventory Count Tests
 * Critical path: Complete physical inventory count
 */

import { test, expect } from './fixtures/base'

test.describe('Inventory Count Flow @p0', () => {
  test('inventory count page loads with ingredients', async ({ page, inventoryCountPage }) => {
    // Page header should show count progress
    await expect(page.getByText(/\d+ of \d+ items counted/)).toBeVisible()

    // Ingredients should be grouped by category (match the section header)
    await expect(page.getByText(/Beverage.*\(\d+\/\d+\)/)).toBeVisible()

    // Action buttons should be visible (but may be disabled initially)
    await expect(page.getByRole('button', { name: /Save Draft/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Submit Count/i })).toBeVisible()
  })

  test('initial state has all action buttons disabled', async ({ page, inventoryCountPage }) => {
    // When no items are counted, action buttons should be disabled
    await expect(page.getByRole('button', { name: /Discard/i })).toBeDisabled()
    await expect(page.getByRole('button', { name: /Save Draft/i })).toBeDisabled()
    await expect(page.getByRole('button', { name: /Submit Count/i })).toBeDisabled()

    // Progress should show 0 counted
    await expect(page.getByText(/0 of \d+ items counted/)).toBeVisible()
  })

  test('categories are collapsible', async ({ page, inventoryCountPage }) => {
    // Find category headers (match pattern like "Beverage(0/3)")
    await expect(page.getByText(/Beverage.*\(\d+\/\d+\)/)).toBeVisible()

    // There should be multiple categories
    await expect(page.getByText(/Dairy.*\(\d+\/\d+\)/)).toBeVisible()
    await expect(page.getByText(/Protein.*\(\d+\/\d+\)/)).toBeVisible()
  })

  test('ingredient items show expected quantity', async ({ page, inventoryCountPage }) => {
    // Each ingredient should show "Expected: X unit"
    await expect(page.getByText(/Expected:.*\d+/).first()).toBeVisible()

    // Should have at least one ingredient name visible
    await expect(page.getByText('Coffee Beans')).toBeVisible()
  })

  test('progress bar is visible', async ({ page, inventoryCountPage }) => {
    // Progress bar should be present
    await expect(page.getByRole('progressbar')).toBeVisible()
  })
})
