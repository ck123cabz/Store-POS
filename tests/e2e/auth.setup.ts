/**
 * Authentication Setup for E2E Tests
 * Runs once before all tests to establish authenticated session
 */

import { test as setup, expect } from '@playwright/test'

const authFile = 'tests/e2e/.auth/user.json'

setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login')

  // Pre-set onboarding complete in localStorage to skip the tour
  await page.evaluate(() => {
    localStorage.setItem('store-pos-onboarding-complete', 'true')
  })

  // Fill in credentials (default admin/admin from seed)
  await page.getByLabel('Username').fill('admin')
  await page.getByLabel('Password').fill('admin')

  // Submit login - button is labeled "Login"
  await page.getByRole('button', { name: 'Login' }).click()

  // Wait for redirect to dashboard/POS
  await expect(page).toHaveURL(/\/(pos|dashboard)?/)

  // Verify we're logged in
  await expect(page.getByText(/Administrator|admin/i)).toBeVisible()

  // Save authentication state
  await page.context().storageState({ path: authFile })
})
