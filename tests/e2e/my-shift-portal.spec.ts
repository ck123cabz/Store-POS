/**
 * E2E Tests: My Shift Portal
 * Tests the employee portal page and post-login routing
 *
 * Prerequisites:
 * - A user linked to an employee record
 * - Default admin user (admin/admin) with all permissions
 */

import { test, expect } from './fixtures/base'

// Helper to ensure tour is dismissed
async function ensureTourDismissed(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    localStorage.setItem('store-pos-onboarding-complete', 'true')
  })
  const skipTour = page.getByRole('button', { name: 'Skip Tour' })
  if (await skipTour.isVisible({ timeout: 1000 }).catch(() => false)) {
    await skipTour.click()
    await page.waitForFunction(() => {
      return !document.querySelector('[class*="fixed"][class*="inset-0"][class*="bg-black"]')
    }, { timeout: 5000 }).catch(() => {})
  }
}

test.describe('My Shift Portal @portal', () => {
  // T020: Post-login routing — admin user goes to /pos
  test('admin user lands on /pos after login', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Username').fill('admin')
    await page.getByLabel('Password').fill('admin')
    await page.getByRole('button', { name: 'Sign in' }).click()

    // Admin should go to /pos
    await expect(page).toHaveURL(/\/pos/, { timeout: 15000 })
  })

  // T027: Portal page loads for authenticated user
  test('My Shift page is navigable from sidebar', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/pos/, { timeout: 15000 })
    await ensureTourDismissed(page)

    // Navigate to My Shift via sidebar
    const myShiftLink = page.getByRole('link', { name: 'My Shift' })
    await expect(myShiftLink).toBeVisible()
    await myShiftLink.click()

    await expect(page).toHaveURL(/\/my-shift/, { timeout: 10000 })
    await expect(page.getByRole('heading', { name: 'My Shift' })).toBeVisible()
  })

  // T027: Portal shows content for linked employee or "not linked" empty state
  test('My Shift page shows appropriate state', async ({ page }) => {
    await page.goto('/my-shift')
    await expect(page).toHaveURL(/\/my-shift/, { timeout: 15000 })
    await ensureTourDismissed(page)

    // Should show either the clock-in hero or the "not linked" empty state
    const clockInButton = page.getByRole('button', { name: /Clock In/i })
    const notLinkedMessage = page.getByText(/account isn't linked/i)

    // One of these should be visible
    const hasClockin = await clockInButton.isVisible({ timeout: 5000 }).catch(() => false)
    const hasNotLinked = await notLinkedMessage.isVisible({ timeout: 2000 }).catch(() => false)

    expect(hasClockin || hasNotLinked).toBe(true)
  })
})
