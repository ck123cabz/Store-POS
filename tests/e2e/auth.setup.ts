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

  // Wait for redirect to dashboard/POS (give extra time for initial load/compilation)
  await expect(page).toHaveURL(/\/(pos|dashboard)?/, { timeout: 60000 })

  // Wait for any compilation to finish after redirect
  if (await compiling.isVisible({ timeout: 1000 }).catch(() => false)) {
    await compiling.waitFor({ state: 'hidden', timeout: 120000 })
  }

  // Wait a bit for the page to settle after compilation
  await page.waitForLoadState('networkidle', { timeout: 30000 })

  // Verify we're logged in by checking for POS elements (like the "All" button) or sidebar elements
  // The user name display varies, so let's check for a key element that proves we're on the main app
  await expect(
    page.getByRole('button', { name: 'All' }).or(page.getByText(/Dashboard|POS|Products/i).first())
  ).toBeVisible({ timeout: 30000 })

  // Wait a bit to ensure all cookies are set by NextAuth
  await page.waitForTimeout(2000)

  // Force a page reload to ensure cookies are properly captured
  // This is needed because NextAuth v5 sets the session cookie asynchronously
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'All' }).or(page.getByText(/Dashboard|POS|Products/i).first())
  ).toBeVisible({ timeout: 30000 })

  // Save authentication state
  await page.context().storageState({ path: authFile })
})
