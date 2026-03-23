# Feature Specification: Transactions Page UI/UX Refactor

**Feature Branch**: `011-transactions-ui`
**Created**: 2026-03-23
**Status**: Draft
**Input**: User description: "Refactor transactions page UI/UX for improved intuitiveness, responsive design across desktop and mobile, unified filter bar, card-based mobile layout, and contextual detail views with state-specific actions"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse and Filter Transactions (Priority: P1)

A cashier or manager opens the Transactions page to review sales. They see summary metrics at the top (revenue, transaction count, average order, peak hour) followed by a unified filter bar. Quick time presets (Today, Yesterday, This Week, This Month, All) are visible as a segmented control on the left. Additional filters for status, cashier, and search are available inline on the right. The user can quickly narrow down the list without opening a separate filter panel.

**Why this priority**: This is the primary interaction — every visit to the Transactions page starts with browsing and filtering. If filtering is confusing, everything downstream suffers.

**Independent Test**: Can be fully tested by navigating to the Transactions page, verifying summary cards display correct data, applying each time preset, using status/cashier dropdowns, and searching by order number. Delivers the core value of finding transactions quickly.

**Acceptance Scenarios**:

1. **Given** a user navigates to the Transactions page, **When** the page loads, **Then** they see 4 summary cards (revenue, count, avg order, peak hour) and a unified filter bar with time presets defaulting to "Today"
2. **Given** a user is on the Transactions page, **When** they click a time preset pill (e.g., "This Week"), **Then** the table/card list updates to show transactions from that time range and the active pill is visually highlighted
3. **Given** a user is on the Transactions page, **When** they select a status filter (e.g., "Completed"), **Then** only transactions matching that status are displayed
4. **Given** a user types in the search field, **When** they enter an order number or customer name, **Then** matching transactions appear in the list in real time
5. **Given** a user has applied multiple filters, **When** they click a different time preset, **Then** the status, cashier, and search filters reset to their defaults

---

### User Story 2 - View Transaction Details (Priority: P1)

A cashier taps or clicks on a transaction to see its full details in a receipt-style layout. On desktop, a detail dialog appears. On mobile, a bottom sheet slides up. The detail view shows: order number and status badge, date/time, itemized line items with quantities and prices, subtotal/tax/total breakdown, payment method and details, and cashier/till information.

**Why this priority**: Viewing details is the second most common action after browsing. The receipt-style layout mirrors what cashiers already understand from physical receipts — reducing the learning curve to zero.

**Independent Test**: Can be tested by clicking any transaction row/card and verifying the detail view displays all expected fields in the correct layout. Delivers the value of understanding any transaction at a glance.

**Acceptance Scenarios**:

1. **Given** a user is on the desktop Transactions page, **When** they click a transaction row, **Then** a detail dialog appears showing the full receipt-style breakdown
2. **Given** a user is on the mobile Transactions page, **When** they tap a transaction card, **Then** a bottom sheet slides up showing the full receipt-style breakdown
3. **Given** a transaction detail is open, **When** the user views the items section, **Then** each line item shows quantity, product name, and line total
4. **Given** a transaction detail is open, **When** the user views the payment section, **Then** the payment method, status, cashier name, and till number are displayed
5. **Given** a voided transaction detail is open, **When** the user views it, **Then** the total is shown with a strikethrough, the void reason is displayed, and the voided-by name and time are visible

---

### User Story 3 - Take Action on Pending GCash Transactions (Priority: P2)

A cashier opens a GCash Pending transaction and sees "Confirm Payment" and "Cancel" buttons prominently displayed at the bottom of the detail view. After confirming, the transaction status changes to Completed. After cancelling, the transaction is marked as Cancelled and stock is restored.

**Why this priority**: GCash is a growing payment method. Pending transactions require timely action to close the books. Surfacing these actions directly in the detail view (rather than requiring multiple clicks) reduces the steps to complete the workflow.

**Independent Test**: Can be tested by creating a GCash transaction in the POS, then navigating to Transactions, opening the pending transaction, and using the Confirm/Cancel buttons. Delivers the value of resolving pending payments efficiently.

**Acceptance Scenarios**:

1. **Given** a GCash Pending transaction detail is open, **When** the user views the action bar, **Then** they see a green "Confirm Payment" button and a neutral "Cancel" button
2. **Given** a user clicks "Confirm Payment", **When** the action completes, **Then** the transaction status updates to Completed, the badge changes to green, and the summary cards refresh
3. **Given** a user clicks "Cancel", **When** the action completes, **Then** the transaction status updates to Cancelled, stock is restored, and the detail view reflects the new state
4. **Given** a GCash Pending transaction detail is open, **When** the user scrolls to the bottom, **Then** a "Void Transaction" text link is also available as a secondary action

---

### User Story 4 - Settle On Tab Transactions (Priority: P2)

A cashier opens an On Tab transaction and sees the customer's name prominently displayed in a colored banner. The detail view shows all items on the tab, the total due, and three action options: "Settle Tab" (primary, full-width button showing the amount), "Add Items" (secondary), and "Void" (destructive, outlined in red).

**Why this priority**: Tabs are a core feature for food & beverage POS. Customers frequently add items before settling. Having "Add Items" alongside "Settle Tab" supports the natural workflow without navigating away.

**Independent Test**: Can be tested by creating a Tab transaction, navigating to Transactions, opening the tab, and verifying the customer banner, action buttons, and settle flow. Delivers the value of managing tabs end-to-end from the transactions list.

**Acceptance Scenarios**:

1. **Given** an On Tab transaction detail is open, **When** the user views the header, **Then** a colored info banner shows the customer's name (e.g., "Juan Cruz's Tab")
2. **Given** an On Tab transaction detail is open, **When** the user views the action bar, **Then** they see "Settle Tab — [amount]" as the primary button, "Add Items" as secondary, and "Void" as destructive
3. **Given** a user clicks "Settle Tab", **When** the action initiates, **Then** they are taken to a payment flow to collect the outstanding amount
4. **Given** a user clicks "Add Items", **When** the action initiates, **Then** they are taken to the POS product grid with the tab order loaded for additions

---

### User Story 5 - Responsive Mobile Card Layout (Priority: P1)

A cashier uses a tablet or phone to check transactions. Instead of a cramped table, they see a vertically stacked card list. Each card shows: order number + status badge + total on the first row, and payment method icon + item count + customer name + time on the second row. Cards for pending/actionable transactions have colored borders to draw attention.

**Why this priority**: Mobile is a primary use case for cashiers who step away from the register. The current table-based mobile view truncates columns and loses context. Cards preserve all essential information in a thumb-friendly format.

**Independent Test**: Can be tested by viewing the Transactions page on a mobile viewport (< 768px) and verifying cards render with all expected data. Delivers the value of full transaction visibility on any device.

**Acceptance Scenarios**:

1. **Given** a user views the Transactions page on a mobile device, **When** the page loads, **Then** transactions are displayed as cards instead of table rows
2. **Given** a mobile card is displayed, **When** the user scans it, **Then** they see order number, status badge, total, payment method with icon, item count, customer name, and time
3. **Given** a GCash Pending transaction exists, **When** it appears in the mobile card list, **Then** its card border is colored amber (warning) to indicate it needs attention
4. **Given** a voided transaction exists, **When** it appears in the mobile card list, **Then** the card has reduced opacity and the total has a strikethrough
5. **Given** a mobile user is viewing the card list, **When** they view the summary strip above, **Then** they see a compact horizontal row with revenue, order count, and average order
6. **Given** a mobile user taps the "Filter" button, **When** the bottom sheet opens, **Then** they see status, cashier, date range, and "Include voided" controls with an "Apply" button to confirm selections

---

### User Story 6 - Void a Transaction (Priority: P3)

A manager opens any non-voided transaction and can initiate a void. The void action is always available but visually de-emphasized (text link or outlined destructive button) to prevent accidental use. A confirmation modal requires selecting a reason before finalizing.

**Why this priority**: Voiding is infrequent but critical for accountability. The current UX already supports this; the refactor ensures it's consistently accessible without dominating the action hierarchy.

**Independent Test**: Can be tested by opening any completed transaction, clicking "Void Transaction", selecting a reason, and confirming. Delivers the value of maintaining audit trail integrity.

**Acceptance Scenarios**:

1. **Given** a non-voided transaction detail is open, **When** the user looks for void functionality, **Then** they find a "Void Transaction" link or button that is visually secondary (not primary)
2. **Given** a user clicks "Void Transaction", **When** the void modal opens, **Then** they must select a reason from a predefined list (or enter a custom reason for "Other")
3. **Given** a user confirms the void, **When** the action completes, **Then** the transaction is marked voided, stock and ingredients are restored, and the detail view updates to show void info
4. **Given** a user without void permission opens a transaction, **When** they view the action area, **Then** the void option is not displayed

---

### User Story 7 - Export Transaction Data (Priority: P3)

A manager wants to export the currently filtered transaction list for reporting or bookkeeping. They click the "Export" button in the page header and receive a downloadable file containing the visible transactions. The export respects all active filters (time preset, status, cashier, search, include voided).

**Why this priority**: Export is a secondary workflow used primarily by managers for end-of-day or weekly reporting. It builds on the filter system (P1) and adds offline utility.

**Independent Test**: Can be tested by applying filters, clicking Export, and verifying the downloaded file contains exactly the transactions currently displayed. Delivers the value of portable transaction records for accounting.

**Acceptance Scenarios**:

1. **Given** a user is on the Transactions page with filters applied, **When** they click the "Export" button, **Then** a file is downloaded containing only the transactions matching the current filters
2. **Given** a user exports transactions, **When** the file downloads, **Then** it includes order number, date/time, customer, items count, payment method, total, and status for each transaction
3. **Given** a user is on mobile, **When** they look for the export option, **Then** the export button is accessible from the page header or a menu overflow
4. **Given** a user exports with "Include voided" enabled, **When** the file generates, **Then** voided transactions are included and clearly marked as voided

---

### Edge Cases

- What happens when the transaction list is empty for a selected time range? An empty state message is displayed with an icon, description, and suggestion to adjust filters.
- How does the system handle network errors during GCash confirm/cancel or void? An error alert is shown within the detail view with a retry option. The action buttons remain enabled.
- What happens when two users try to confirm/cancel the same GCash transaction simultaneously? The second action fails gracefully with a message indicating the transaction state has changed, and the detail view refreshes.
- How do split payment transactions display in the detail view? The payment section shows each payment method as a separate line (e.g., "Cash: ₱500 + GCash: ₱300").
- What happens when a user resizes their browser from desktop to mobile width? The layout transitions between table and card views at the 768px breakpoint without losing scroll position or filter state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a unified filter bar combining time presets (segmented control), contextual filters (status, cashier, search), and an "Include voided" toggle checkbox in a single row on desktop
- **FR-002**: System MUST display time presets as horizontally scrollable pills on mobile, with a "Filter" button that opens a bottom sheet containing status, cashier, date range, and "Include voided" controls with an "Apply" action
- **FR-003**: System MUST show 4 summary metric cards on desktop (Today's Revenue, Transactions, Avg Order, Peak Hour) and a compact 3-metric horizontal strip on mobile
- **FR-004**: System MUST render transactions as a data table with sortable columns on desktop (Order, Time, Customer, Items, Payment, Total, Status)
- **FR-005**: System MUST render transactions as vertically stacked cards on mobile viewports (< 768px), showing order number, status badge, total, payment icon/method, item count, customer, and time
- **FR-006**: System MUST display transaction status using color-coded pill badges: Completed (green), Pending (amber), On Tab (blue), Voided (red), Cancelled (red)
- **FR-007**: System MUST display voided transactions at reduced opacity with a strikethrough on the total amount
- **FR-008**: System MUST show a receipt-style detail view when a transaction is selected — dialog on desktop, bottom sheet on mobile
- **FR-009**: System MUST display contextual action buttons in the detail view based on transaction state: Confirm/Cancel for GCash Pending, Settle Tab/Add Items/Void for On Tab, and Void for Completed transactions
- **FR-010**: System MUST display a prominent customer banner in the detail view for On Tab transactions showing the customer's name
- **FR-011**: System MUST include the total amount in the "Settle Tab" button label for immediate context
- **FR-012**: System MUST display payment method with an identifying icon (banknote for Cash, smartphone for GCash, notebook for Tab, split icon for Split)
- **FR-013**: System MUST support pagination for the transaction list, showing the count range and total (e.g., "Showing 1–15 of 38 transactions")
- **FR-014**: System MUST apply colored borders on mobile cards for transactions requiring attention (amber for Pending)
- **FR-015**: System MUST preserve filter state when navigating to/from the detail view
- **FR-016**: System MUST respect the user's void permission — hiding the void action for users without the void permission
- **FR-017**: System MUST provide an "Export" button that downloads the currently filtered transaction list as a file, respecting all active filters
- **FR-018**: System MUST include order number, date/time, customer name, item count, payment method, total, and status in exported data
- **FR-019**: System MUST mark voided transactions clearly in the export when "Include voided" is enabled

### Key Entities

- **Transaction**: A sales record with order number, items, total, payment type, status, associated customer, and cashier. Has lifecycle states: Pending → Completed, or Pending → Cancelled, or Completed → Voided. Tab transactions have a settlement flow.
- **Transaction Detail View**: A composite presentation of a transaction combining line items (quantity × product → price), financial summary (subtotal, tax, total), payment details (method, reference, status), and contextual actions based on current state.
- **Filter State**: The combination of active time preset, status filter, cashier filter, search query, and "include voided" toggle that determines which transactions are displayed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can locate any specific transaction within 10 seconds using the unified filter bar (down from the current multi-step filter/search process)
- **SC-002**: All transaction information (status, payment, customer, total) is visible without scrolling on a single mobile card — zero-tap information density
- **SC-003**: GCash payment confirmation can be completed in 2 taps from the transaction list (tap card → tap Confirm) instead of the current multi-step flow
- **SC-004**: Tab settlement can be initiated in 2 taps from the transaction list (tap card → tap Settle Tab)
- **SC-005**: The page transitions seamlessly between desktop table and mobile card layouts at the 768px breakpoint with no layout shift or data loss
- **SC-006**: 100% of transaction states (Completed, Pending, On Tab, Voided, Cancelled) are distinguishable at a glance through color-coded status badges
- **SC-007**: The transactions page loads and renders the initial view (summary + filter + first page of transactions) within 2 seconds on a standard connection

## Clarifications

### Session 2026-03-23

- Q: Where does the "Include voided" toggle live in the redesigned filter bar? → A: Add it as a small toggle/checkbox at the end of the unified filter bar on desktop. On mobile, it is accessible via the "Filter" button's advanced options.
- Q: Is the Export button in scope for this refactor? → A: Yes — include export as a new user story (P3) with acceptance criteria covering filtered export, required fields, and voided transaction handling.
- Q: What UI pattern should the mobile "Filter" button use for advanced options? → A: Bottom sheet with status, cashier dropdowns, date range picker, and "Include voided" toggle, plus an "Apply" button.

### Assumptions

- The existing API endpoints (`/api/transactions`, `/api/transactions/today`, `/api/users`) remain unchanged; this refactor is purely frontend
- The mobile breakpoint remains at 768px as determined by the `useIsMobile()` hook
- Transaction data models and permission system are unchanged
- "Settle Tab" navigates to the existing POS payment flow with the tab order pre-loaded
- "Add Items" navigates to the POS product grid with the tab order loaded
- The void modal with reason selection is preserved from the current implementation
- Summary cards continue to show today's data regardless of the selected time filter
- The GCash photo proof viewer in the detail view is preserved
