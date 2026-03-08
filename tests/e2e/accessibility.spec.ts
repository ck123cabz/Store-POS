/**
 * E2E Tests: Accessibility (WCAG 2.1 AA)
 *
 * Uses @axe-core/playwright to run automated accessibility audits
 * on key pages. Tests verify WCAG 2.1 Level AA compliance.
 *
 * Note: color-contrast rule is disabled because the design system uses
 * oklch() color functions that axe-core cannot reliably resolve,
 * producing false positives. Color contrast was manually verified during
 * the Story 8.3 dark mode pass and Story 8.4 accessibility audit.
 */

import { test, expect } from './fixtures/base'
import AxeBuilder from '@axe-core/playwright'

/**
 * Helper to dismiss the onboarding tour if visible.
 */
async function dismissTour(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    localStorage.setItem('store-pos-onboarding-complete', 'true')
  })
  const skipTour = page.getByRole('button', { name: 'Skip Tour' })
  if (await skipTour.isVisible({ timeout: 1000 }).catch(() => false)) {
    await skipTour.click()
    await page.waitForTimeout(500)
  }
}

/**
 * Create an AxeBuilder instance with common configuration.
 * Disables color-contrast because oklch() CSS colors produce unreliable results.
 */
function createAxeBuilder(page: import('@playwright/test').Page) {
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    // color-contrast disabled: oklch() color functions cannot be reliably
    // resolved by axe-core, producing false positives on the design system's
    // semantic tokens. Contrast was verified manually in Story 8.3/8.4.
    .disableRules(['color-contrast'])
}

test.describe('Accessibility @a11y', () => {
  test('POS page passes axe-core AA scan', async ({ page, posPage: _posPage }) => {
    const results = await createAxeBuilder(page).analyze()
    expect(results.violations).toEqual([])
  })

  test('Menu page passes axe-core AA scan', async ({ page, menuPage: _menuPage }) => {
    const results = await createAxeBuilder(page).analyze()
    expect(results.violations).toEqual([])
  })

  test('Transactions page passes axe-core AA scan', async ({ page }) => {
    await page.goto('/transactions')
    await page.waitForLoadState('domcontentloaded')

    const results = await createAxeBuilder(page).analyze()
    expect(results.violations).toEqual([])
  })

  test('Analytics page passes axe-core AA scan', async ({ page }) => {
    await page.goto('/analytics')
    await dismissTour(page)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000) // Extra time for charts to render

    const results = await createAxeBuilder(page)
      // Recharts SVG elements may have structural issues we can't fix
      .exclude('.recharts-wrapper')
      .analyze()
    expect(results.violations).toEqual([])
  })

  test('Ingredients page passes axe-core AA scan', async ({ page }) => {
    await page.goto('/ingredients')
    await page.waitForLoadState('domcontentloaded')

    const results = await createAxeBuilder(page).analyze()
    expect(results.violations).toEqual([])
  })

  test('Login page passes axe-core AA scan', async ({ browser }) => {
    // Use a fresh context without auth to test the login page
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')

    const results = await createAxeBuilder(page).analyze()
    await context.close()
    expect(results.violations).toEqual([])
  })
})
