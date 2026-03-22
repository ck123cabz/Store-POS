/**
 * Mobile Navigation Smoke Tests
 * Validates core mobile navigation patterns at 375×812 viewport
 * Run with: npx playwright test --project=mobile tests/e2e/mobile-smoke.spec.ts
 */

import { test, expect } from './fixtures/base'

// Helper to dismiss tour on mobile
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

// Helper to assert no horizontal overflow
async function assertNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth
  })
  expect(hasOverflow).toBe(false)
}

// Helper to open sidebar on mobile (tap the sidebar trigger)
async function openMobileSidebar(page: import('@playwright/test').Page) {
  const trigger = page.locator('button[data-sidebar="trigger"]')
  await trigger.click()
  // Wait for sidebar overlay to be visible
  await expect(page.locator('[data-sidebar="sidebar"]')).toBeVisible({ timeout: 5000 })
}

test.describe('Mobile Navigation @mobile', () => {
  test('sidebar drawer opens and closes on navigate', async ({ page }) => {
    await page.goto('/pos', { waitUntil: 'domcontentloaded' })
    await ensureTourDismissed(page)

    // Wait for POS page to load
    await expect(page.getByRole('button', { name: /^All/ })).toBeVisible({ timeout: 30000 })

    const pages = [
      { link: 'Menu', url: '/menu' },
      { link: 'Transactions', url: '/transactions' },
      { link: 'Ingredients', url: '/ingredients' },
      { link: 'Analytics', url: '/analytics' },
      { link: 'POS', url: '/pos' },
    ]

    for (const nav of pages) {
      // Open sidebar
      await openMobileSidebar(page)

      // Click navigation link
      await page.getByRole('link', { name: nav.link }).click()

      // Verify navigation happened
      await expect(page).toHaveURL(nav.url, { timeout: 15000 })

      // Sidebar should be closed after navigation
      await expect(page.locator('[data-sidebar="sidebar"]')).not.toBeVisible({ timeout: 5000 })

      // No horizontal overflow on this page
      await assertNoHorizontalOverflow(page)
    }
  })

  test('header height is compact on mobile (≤56px)', async ({ page }) => {
    await page.goto('/pos', { waitUntil: 'domcontentloaded' })
    await ensureTourDismissed(page)

    // Wait for page to load
    await expect(page.getByRole('button', { name: /^All/ })).toBeVisible({ timeout: 30000 })

    // Measure header height
    const headerHeight = await page.locator('header').first().evaluate((el) => {
      return el.getBoundingClientRect().height
    })

    expect(headerHeight).toBeLessThanOrEqual(56)
  })

  test('no horizontal overflow on key pages', async ({ page }) => {
    await page.goto('/pos', { waitUntil: 'domcontentloaded' })
    await ensureTourDismissed(page)

    const pagePaths = [
      '/pos',
      '/menu',
      '/transactions',
      '/ingredients',
      '/ingredients/count',
      '/analytics',
      '/analytics/daily-pulse',
      '/analytics/weekly',
      '/settings',
      '/customers',
      '/users',
      '/employees',
      '/orders',
      '/calendar',
      '/waste',
      '/audit-log',
    ]

    for (const path of pagePaths) {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      // Give the page a moment to render
      await page.waitForTimeout(500)
      await assertNoHorizontalOverflow(page)
    }
  })
})
