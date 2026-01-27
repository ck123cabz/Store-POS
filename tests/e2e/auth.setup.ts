/**
 * Authentication Setup for E2E Tests
 * Runs once before all tests to establish authenticated session
 */

import { test as setup, expect } from '@playwright/test'

const authFile = 'tests/e2e/.auth/user.json'

setup('authenticate', async ({ page }) => {
  // Navigate to login page and wait for it to fully load
  await page.goto('/login', { waitUntil: 'networkidle', timeout: 90000 })

  // Pre-set onboarding complete in localStorage to skip the tour
  await page.evaluate(() => {
    localStorage.setItem('store-pos-onboarding-complete', 'true')
  })

  // Wait for the login form to be ready (give extra time for compilation)
  await page.waitForSelector('#username', { state: 'visible', timeout: 60000 })

  // Wait for Next.js compilation to finish (if visible)
  const compiling = page.locator('text=Compiling')
  if (await compiling.isVisible({ timeout: 1000 }).catch(() => false)) {
    await compiling.waitFor({ state: 'hidden', timeout: 120000 })
  }

  // Fill in credentials (default admin/admin from seed)
  await page.fill('#username', 'admin')
  await page.fill('#password', 'admin')

  // Submit login - button is labeled "Login"
  await page.getByRole('button', { name: 'Login' }).click()

  // Wait for redirect to dashboard/POS
  await expect(page).toHaveURL(/\/(pos|dashboard)?/)

  // Verify we're logged in
  await expect(page.getByText(/Administrator|admin/i)).toBeVisible()

  // Save authentication state
  await page.context().storageState({ path: authFile })
})
