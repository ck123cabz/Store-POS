import { test, expect } from "@playwright/test"

test.describe("Employee Workspace", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto("/login")
    await page.fill('input[name="username"]', "admin")
    await page.fill('input[name="password"]', "admin")
    await page.getByRole("button", { name: /sign in/i }).click()
    await page.waitForURL("**/pos")
  })

  test.describe("Tab Navigation", () => {
    test("navigates to employees page with default Today tab", async ({ page }) => {
      await page.goto("/employees")
      await expect(page.getByRole("heading", { name: "Employees" })).toBeVisible()
      // Default tab is Today - should show stat cards
      await expect(page.getByText("Clocked In")).toBeVisible()
      await expect(page.getByText("Hours Today")).toBeVisible()
    })

    test("switches tabs and updates URL query param", async ({ page }) => {
      await page.goto("/employees")

      // Click Team tab
      await page.getByRole("button", { name: "Team" }).click()
      await expect(page).toHaveURL(/\?tab=team/)

      // Click Schedule tab
      await page.getByRole("button", { name: "Schedule" }).click()
      await expect(page).toHaveURL(/\?tab=schedule/)

      // Click Tasks tab
      await page.getByRole("button", { name: "Tasks" }).click()
      await expect(page).toHaveURL(/\?tab=tasks/)

      // Click Payroll tab
      await page.getByRole("button", { name: "Payroll" }).click()
      await expect(page).toHaveURL(/\?tab=payroll/)

      // Click Reports tab
      await page.getByRole("button", { name: "Reports" }).click()
      await expect(page).toHaveURL(/\?tab=reports/)

      // Click Today tab - URL clears tab param
      await page.getByRole("button", { name: "Today" }).click()
      await expect(page).not.toHaveURL(/tab=/)
    })

    test("preserves Add Employee button across all tabs", async ({ page }) => {
      await page.goto("/employees")
      await expect(page.getByRole("button", { name: /add employee/i })).toBeVisible()

      // Switch to Team tab
      await page.getByRole("button", { name: "Team" }).click()
      await expect(page.getByRole("button", { name: /add employee/i })).toBeVisible()
    })

    test("legacy redirect: /employees/[id] redirects to workspace", async ({ page }) => {
      await page.goto("/employees/1")
      await expect(page).toHaveURL(/\/employees\?tab=team&id=1/)
    })

    test("opens Add Employee dialog from header button", async ({ page }) => {
      await page.goto("/employees")
      await page.getByRole("button", { name: /add employee/i }).click()
      await expect(page.getByRole("dialog")).toBeVisible()
      await expect(page.getByRole("heading", { name: "Add Employee" })).toBeVisible()
    })
  })

  test.describe("Team Split View", () => {
    test("shows employee table on Team tab", async ({ page }) => {
      await page.goto("/employees?tab=team")
      // Should see search input and status toggle
      await expect(page.getByPlaceholder("Search employees...")).toBeVisible()
      await expect(page.getByRole("radio", { name: "Active" })).toBeVisible()
    })

    test("clicking employee row opens split view with detail panel", async ({ page }) => {
      await page.goto("/employees?tab=team")
      // Wait for employees to load
      await page.waitForTimeout(1000)

      // Click first employee row in the table
      const firstRow = page.locator("table tbody tr").first()
      if (await firstRow.isVisible()) {
        await firstRow.click()
        // URL should now have id param
        await expect(page).toHaveURL(/id=\d+/)
        // Detail panel should show sub-tabs
        await expect(page.getByRole("button", { name: "Overview" })).toBeVisible()
        await expect(page.getByRole("button", { name: "Shifts" })).toBeVisible()
        await expect(page.getByRole("button", { name: "Payments" })).toBeVisible()
      }
    })
  })
})
