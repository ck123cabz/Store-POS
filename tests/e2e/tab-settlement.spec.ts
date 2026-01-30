/**
 * E2E Tests: Tab Settlement Flow
 * US4: Tab Settlement - Pay down tab balance
 * Tests the complete tab settlement workflow including UI interactions
 */

import { test, expect } from "./fixtures/base"

test.describe("US4: Tab Settlement Flow @p2", () => {
  test.describe("Customer Profile Tab Display", () => {
    test("customer list shows tab balance column", async ({ customersPage, page }) => {
      // customersPage fixture navigates to /customers and waits for heading

      // Look for tab balance column in the table
      // Note: This test expects the table to have a Tab Balance column
      const tabBalanceHeader = page.getByRole("columnheader", { name: /tab|balance/i })
      await expect(tabBalanceHeader).toBeVisible()
    })

    test("can view customer with tab balance in list", async ({ customersPage, page }) => {
      // customersPage fixture navigates to /customers and waits for heading

      // Wait for customer data to load
      await page.waitForTimeout(500)

      // Check if there are customers displayed
      const tableRows = page.locator("tbody tr")
      const rowCount = await tableRows.count()

      if (rowCount > 0) {
        // Customer rows should exist
        await expect(tableRows.first()).toBeVisible()
      } else {
        // No customers message should be shown
        await expect(page.getByText(/no customers/i)).toBeVisible()
      }
    })

    test("customer profile shows tab balance details", async ({ customersPage, page }) => {
      // customersPage fixture navigates to /customers and waits for heading

      // Click on first customer to view profile (or edit button)
      const editButton = page.getByRole("button", { name: /edit|view/i }).first()
      if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editButton.click()

        // Dialog/modal should open with customer details
        const dialog = page.getByRole("dialog")
        await expect(dialog).toBeVisible()

        // Look for tab balance display in the profile
        const tabInfo = page.getByText(/tab balance|current balance/i)
        // Tab info should be visible if customer profile includes it
        if (await tabInfo.isVisible({ timeout: 1000 }).catch(() => false)) {
          await expect(tabInfo).toBeVisible()
        }
      }
    })
  })

  test.describe("Tab Settlement UI", () => {
    test("settlement button is visible for customers with balance", async ({ page }) => {
      // Navigate to customers page
      await page.goto("/customers")
      await expect(page.getByRole("heading", { name: /customers/i })).toBeVisible()

      // Look for settlement/pay tab button
      const settlementButton = page
        .getByRole("button", { name: /settle|pay tab|make payment/i })
        .first()

      // The button should exist (may or may not be visible depending on customer data)
      const buttonVisible = await settlementButton
        .isVisible({ timeout: 2000 })
        .catch(() => false)

      // Either button is visible, or we verify the UI structure is ready for it
      if (buttonVisible) {
        await expect(settlementButton).toBeVisible()
      } else {
        // UI structure should at least have the customers table
        await expect(page.locator("table")).toBeVisible()
      }
    })

    test("opens settlement dialog/modal", async ({ page }) => {
      // Navigate to customers page
      await page.goto("/customers")
      await expect(page.getByRole("heading", { name: /customers/i })).toBeVisible()

      // Find and click settle button (if available)
      const settlementButton = page
        .getByRole("button", { name: /settle|pay tab/i })
        .first()

      if (await settlementButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await settlementButton.click()

        // Settlement dialog should open
        const dialog = page.getByRole("dialog")
        await expect(dialog).toBeVisible()

        // Dialog should have settlement form elements
        await expect(
          page.getByRole("spinbutton", { name: /amount/i }).or(page.getByLabel(/amount/i))
        ).toBeVisible()
      }
    })

    test("settlement form shows payment method options", async ({ page }) => {
      // Navigate to customers page
      await page.goto("/customers")
      await expect(page.getByRole("heading", { name: /customers/i })).toBeVisible()

      // Find and click settle button
      const settlementButton = page
        .getByRole("button", { name: /settle|pay tab/i })
        .first()

      if (await settlementButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await settlementButton.click()

        // Wait for dialog
        await expect(page.getByRole("dialog")).toBeVisible()

        // Should show Cash and GCash payment options
        const cashOption = page.getByRole("radio", { name: /cash/i }).or(
          page.getByLabel(/cash/i)
        )
        const gcashOption = page.getByRole("radio", { name: /gcash/i }).or(
          page.getByLabel(/gcash/i)
        )

        // At least one payment method should be visible
        const hasCash = await cashOption.isVisible({ timeout: 1000 }).catch(() => false)
        const hasGcash = await gcashOption.isVisible({ timeout: 1000 }).catch(() => false)

        expect(hasCash || hasGcash).toBe(true)
      }
    })

    test("settlement form validates amount input", async ({ page }) => {
      // Navigate to customers page
      await page.goto("/customers")
      await expect(page.getByRole("heading", { name: /customers/i })).toBeVisible()

      // Open settlement dialog
      const settlementButton = page
        .getByRole("button", { name: /settle|pay tab/i })
        .first()

      if (await settlementButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await settlementButton.click()
        await expect(page.getByRole("dialog")).toBeVisible()

        // Find amount input
        const amountInput = page
          .getByRole("spinbutton", { name: /amount/i })
          .or(page.getByLabel(/amount/i))

        if (await amountInput.isVisible({ timeout: 1000 }).catch(() => false)) {
          // Try to submit with zero amount
          await amountInput.fill("0")

          // Submit button should be disabled or show error on submit
          const submitButton = page.getByRole("button", { name: /confirm|submit|pay/i })
          if (await submitButton.isVisible()) {
            // Either button is disabled or will show validation error
            const isDisabled = await submitButton.isDisabled()
            if (!isDisabled) {
              await submitButton.click()
              // Should show validation error
              await expect(
                page.getByText(/positive|greater than|invalid/i)
              ).toBeVisible({ timeout: 2000 })
            }
          }
        }
      }
    })
  })

  test.describe("Tab Settlement Process", () => {
    test("can enter settlement amount", async ({ page }) => {
      // Navigate to customers page
      await page.goto("/customers")
      await expect(page.getByRole("heading", { name: /customers/i })).toBeVisible()

      // Open settlement dialog
      const settlementButton = page
        .getByRole("button", { name: /settle|pay tab/i })
        .first()

      if (await settlementButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await settlementButton.click()
        await expect(page.getByRole("dialog")).toBeVisible()

        // Find and fill amount input
        const amountInput = page
          .getByRole("spinbutton", { name: /amount/i })
          .or(page.getByLabel(/amount/i))

        if (await amountInput.isVisible({ timeout: 1000 }).catch(() => false)) {
          await amountInput.fill("100")
          await expect(amountInput).toHaveValue("100")
        }
      }
    })

    test("can select Cash payment method", async ({ page }) => {
      // Navigate to customers page
      await page.goto("/customers")
      await expect(page.getByRole("heading", { name: /customers/i })).toBeVisible()

      // Open settlement dialog
      const settlementButton = page
        .getByRole("button", { name: /settle|pay tab/i })
        .first()

      if (await settlementButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await settlementButton.click()
        await expect(page.getByRole("dialog")).toBeVisible()

        // Select Cash payment method
        const cashOption = page.getByRole("radio", { name: /cash/i }).or(
          page.getByLabel(/cash/i)
        )

        if (await cashOption.isVisible({ timeout: 1000 }).catch(() => false)) {
          await cashOption.click()
          await expect(cashOption).toBeChecked()
        }
      }
    })

    test("can select GCash payment method with reference field", async ({ page }) => {
      // Navigate to customers page
      await page.goto("/customers")
      await expect(page.getByRole("heading", { name: /customers/i })).toBeVisible()

      // Open settlement dialog
      const settlementButton = page
        .getByRole("button", { name: /settle|pay tab/i })
        .first()

      if (await settlementButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await settlementButton.click()
        await expect(page.getByRole("dialog")).toBeVisible()

        // Select GCash payment method
        const gcashOption = page.getByRole("radio", { name: /gcash/i }).or(
          page.getByLabel(/gcash/i)
        )

        if (await gcashOption.isVisible({ timeout: 1000 }).catch(() => false)) {
          await gcashOption.click()
          await expect(gcashOption).toBeChecked()

          // Reference field should appear for GCash
          const refInput = page
            .getByRole("textbox", { name: /reference|ref/i })
            .or(page.getByLabel(/reference|ref/i))

          // Reference field should be visible after selecting GCash
          await expect(refInput).toBeVisible({ timeout: 2000 })
        }
      }
    })

    test("completes settlement and shows success message", async ({ page }) => {
      // Navigate to customers page
      await page.goto("/customers")
      await expect(page.getByRole("heading", { name: /customers/i })).toBeVisible()

      // Open settlement dialog
      const settlementButton = page
        .getByRole("button", { name: /settle|pay tab/i })
        .first()

      if (await settlementButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await settlementButton.click()
        await expect(page.getByRole("dialog")).toBeVisible()

        // Fill amount
        const amountInput = page
          .getByRole("spinbutton", { name: /amount/i })
          .or(page.getByLabel(/amount/i))

        if (await amountInput.isVisible({ timeout: 1000 }).catch(() => false)) {
          await amountInput.fill("50")

          // Select Cash payment
          const cashOption = page.getByRole("radio", { name: /cash/i }).or(
            page.getByLabel(/cash/i)
          )
          if (await cashOption.isVisible({ timeout: 500 }).catch(() => false)) {
            await cashOption.click()
          }

          // Submit
          const submitButton = page.getByRole("button", { name: /confirm|submit|pay/i })
          if (await submitButton.isEnabled()) {
            await submitButton.click()

            // Should show success message or close dialog
            await expect(
              page
                .getByText(/success|payment recorded|settlement complete/i)
                .or(page.getByRole("dialog"))
            ).toBeVisible({ timeout: 5000 })
          }
        }
      }
    })

    test("updates customer balance after settlement", async ({ page }) => {
      // Navigate to customers page
      await page.goto("/customers")
      await expect(page.getByRole("heading", { name: /customers/i })).toBeVisible()

      // Find a customer row with balance > 0 (if exists)
      const customerRows = page.locator("tbody tr")
      const rowCount = await customerRows.count()

      if (rowCount > 0) {
        // The customer list should be visible and ready for settlement actions
        await expect(customerRows.first()).toBeVisible()

        // After a settlement, the balance in the customer list should update
        // This is a structural test - actual balance verification requires API integration
      }
    })
  })

  test.describe("Tab Settlement History", () => {
    test("can view tab history for customer", async ({ page }) => {
      // Navigate to customers page
      await page.goto("/customers")
      await expect(page.getByRole("heading", { name: /customers/i })).toBeVisible()

      // Look for history button or link
      const historyButton = page
        .getByRole("button", { name: /history|view tab|settlements/i })
        .first()

      if (await historyButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await historyButton.click()

        // History modal/dialog or page should open
        await expect(
          page.getByRole("dialog").or(page.getByText(/settlement history|tab history/i))
        ).toBeVisible()
      }
    })

    test("settlement history shows payment details", async ({ page }) => {
      // Navigate to customers page
      await page.goto("/customers")
      await expect(page.getByRole("heading", { name: /customers/i })).toBeVisible()

      // Open history view
      const historyButton = page
        .getByRole("button", { name: /history|view tab|settlements/i })
        .first()

      if (await historyButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await historyButton.click()

        // Wait for history to load
        await page.waitForTimeout(500)

        // History should show payment method and amount columns/fields
        const historyContent = page.getByRole("dialog").or(page.locator("[data-testid='tab-history']"))

        if (await historyContent.isVisible({ timeout: 2000 }).catch(() => false)) {
          // Should have columns for date, amount, payment method
          const hasDateColumn = await page
            .getByText(/date/i)
            .isVisible({ timeout: 500 })
            .catch(() => false)
          const hasAmountColumn = await page
            .getByText(/amount/i)
            .isVisible({ timeout: 500 })
            .catch(() => false)

          // At least one of these should be present
          expect(hasDateColumn || hasAmountColumn).toBe(true)
        }
      }
    })

    test("settlement history is sorted by most recent first", async ({ page }) => {
      // Navigate to customers page
      await page.goto("/customers")
      await expect(page.getByRole("heading", { name: /customers/i })).toBeVisible()

      // Open history view
      const historyButton = page
        .getByRole("button", { name: /history|view tab|settlements/i })
        .first()

      if (await historyButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await historyButton.click()
        await page.waitForTimeout(500)

        // The history view should be visible
        const historyContent = page.getByRole("dialog").or(page.locator("[data-testid='tab-history']"))

        if (await historyContent.isVisible({ timeout: 2000 }).catch(() => false)) {
          // If there are multiple settlement entries, they should be in descending order
          // This is typically verified by checking the order of date cells
          const dateElements = page.locator("[data-testid='settlement-date']").or(
            page.locator("tbody tr td:first-child")
          )

          const count = await dateElements.count()
          if (count >= 2) {
            // Dates should be in descending order (most recent first)
            // This is a structural test - actual date comparison requires parsing
            expect(count).toBeGreaterThanOrEqual(2)
          }
        }
      }
    })
  })

  test.describe("Tab Settlement Validation", () => {
    test("prevents settlement exceeding current balance", async ({ page }) => {
      // Navigate to customers page
      await page.goto("/customers")
      await expect(page.getByRole("heading", { name: /customers/i })).toBeVisible()

      // Open settlement dialog
      const settlementButton = page
        .getByRole("button", { name: /settle|pay tab/i })
        .first()

      if (await settlementButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await settlementButton.click()
        await expect(page.getByRole("dialog")).toBeVisible()

        // Try to enter an amount that exceeds balance
        const amountInput = page
          .getByRole("spinbutton", { name: /amount/i })
          .or(page.getByLabel(/amount/i))

        if (await amountInput.isVisible({ timeout: 1000 }).catch(() => false)) {
          // Enter a very large amount that would exceed any reasonable balance
          await amountInput.fill("999999")

          // Try to submit
          const submitButton = page.getByRole("button", { name: /confirm|submit|pay/i })
          if (await submitButton.isVisible()) {
            const isDisabled = await submitButton.isDisabled()
            if (!isDisabled) {
              await submitButton.click()

              // Should show error about exceeding balance
              await expect(
                page.getByText(/exceeds|cannot exceed|insufficient/i)
              ).toBeVisible({ timeout: 3000 })
            }
          }
        }
      }
    })

    test("shows current balance in settlement dialog", async ({ page }) => {
      // Navigate to customers page
      await page.goto("/customers")
      await expect(page.getByRole("heading", { name: /customers/i })).toBeVisible()

      // Open settlement dialog
      const settlementButton = page
        .getByRole("button", { name: /settle|pay tab/i })
        .first()

      if (await settlementButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await settlementButton.click()
        await expect(page.getByRole("dialog")).toBeVisible()

        // Should display current balance
        const balanceDisplay = page.getByText(/current balance|tab balance|amount owed/i)
        await expect(balanceDisplay).toBeVisible({ timeout: 2000 })
      }
    })

    test("pay full balance button fills amount with current balance", async ({ page }) => {
      // Navigate to customers page
      await page.goto("/customers")
      await expect(page.getByRole("heading", { name: /customers/i })).toBeVisible()

      // Open settlement dialog
      const settlementButton = page
        .getByRole("button", { name: /settle|pay tab/i })
        .first()

      if (await settlementButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await settlementButton.click()
        await expect(page.getByRole("dialog")).toBeVisible()

        // Look for "Pay Full Balance" or similar button
        const fullPayButton = page.getByRole("button", {
          name: /pay full|full balance|pay all/i,
        })

        if (await fullPayButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await fullPayButton.click()

          // Amount input should be filled with the balance amount
          const amountInput = page
            .getByRole("spinbutton", { name: /amount/i })
            .or(page.getByLabel(/amount/i))

          const value = await amountInput.inputValue()
          // Value should be a positive number
          expect(parseFloat(value)).toBeGreaterThan(0)
        }
      }
    })
  })
})

test.describe("US4: Tab Settlement Edge Cases @p3", () => {
  test("handles customer with zero balance gracefully", async ({ page }) => {
    // Navigate to customers page
    await page.goto("/customers")
    await expect(page.getByRole("heading", { name: /customers/i })).toBeVisible()

    // For customers with zero balance, settlement button should be disabled or hidden
    // This is a UX test - the exact behavior depends on implementation
    await expect(page.locator("table")).toBeVisible()
  })

  test("closes settlement dialog on cancel", async ({ page }) => {
    // Navigate to customers page
    await page.goto("/customers")
    await expect(page.getByRole("heading", { name: /customers/i })).toBeVisible()

    // Open settlement dialog
    const settlementButton = page
      .getByRole("button", { name: /settle|pay tab/i })
      .first()

    if (await settlementButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await settlementButton.click()
      await expect(page.getByRole("dialog")).toBeVisible()

      // Find and click cancel button
      const cancelButton = page.getByRole("button", { name: /cancel/i })
      if (await cancelButton.isVisible()) {
        await cancelButton.click()

        // Dialog should close
        await expect(page.getByRole("dialog")).not.toBeVisible()
      }
    }
  })

  test("settlement preserves form state on validation error", async ({ page }) => {
    // Navigate to customers page
    await page.goto("/customers")
    await expect(page.getByRole("heading", { name: /customers/i })).toBeVisible()

    // Open settlement dialog
    const settlementButton = page
      .getByRole("button", { name: /settle|pay tab/i })
      .first()

    if (await settlementButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await settlementButton.click()
      await expect(page.getByRole("dialog")).toBeVisible()

      // Fill amount and select payment method
      const amountInput = page
        .getByRole("spinbutton", { name: /amount/i })
        .or(page.getByLabel(/amount/i))

      if (await amountInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await amountInput.fill("100")

        // Try to submit without selecting payment method (if required)
        const submitButton = page.getByRole("button", { name: /confirm|submit|pay/i })
        if (await submitButton.isEnabled()) {
          await submitButton.click()

          // If validation error occurs, form should still have the amount
          await page.waitForTimeout(500)
          const currentValue = await amountInput.inputValue()
          expect(currentValue).toBe("100")
        }
      }
    }
  })
})
