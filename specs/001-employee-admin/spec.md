# Feature Specification: Employee Admin Dashboard Completion

**Feature Branch**: `001-employee-admin`
**Created**: 2026-03-23
**Status**: Draft
**Input**: User description: "Employees page looks incomplete. This should be considered the admin panel which means the owner or managers would be the focus for this view. As it is, it's ok but lacks the functionality to be a fully featured admin dashboard to manage the employees."

## Clarifications

### Session 2026-03-23

- Q: What are the valid employment status transitions and what happens to the linked user account? → A: Flexible with guardrails — Active ↔ Inactive freely, Active/Inactive → Terminated, Terminated → Active (rehire). User account login automatically disabled when not Active, re-enabled on reactivation.
- Q: Should the employee detail view be a side panel, full page, or hybrid? → A: Hybrid — side panel for quick profile summary from the list, with a "View Full Profile" link that opens a dedicated full page for shifts/pay detail.
- Q: Are "Users" and "Employees" the same page or separate? → A: Separate pages. "Users" manages POS login accounts. "Employees" is a separate sidebar page for employee management. No renaming needed.

## Existing Functionality (Already Built)

The Employees page (`/employees`) and detail page (`/employees/[id]`) already include:

- **Dashboard view**: Summary cards (Active Employees, Hours This Period, Payroll Due, Pending Payments), "Currently Clocked In" panel, "Today's Shifts" panel
- **List view**: Name search, DataTable with Name/Position/Status/Rate columns, View/Edit/Delete actions, mobile card rendering
- **Employee CRUD**: Full form with first/last name, phone, email, position, hourly rate, start date, employment status, user account linking, and notes
- **Detail page**: Profile header with avatar/status/edit/clock-in-out, recent shifts list (last 10), hours summary card (total hours, shifts worked, avg hours, calculated pay), payment history with status badges
- **Shift management**: Clock in/out buttons, "Add Shift" dialog with date/time/break/template/notes
- **Payment recording**: "Record Payment" dialog with period selection, automatic hour/amount calculation, payment method

This spec focuses **only on the gaps** needed to make this a fully featured admin dashboard.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Live Dashboard Summary Cards (Priority: P1)

As a store owner viewing the employees dashboard, I want the summary cards (Hours This Period, Payroll Due, Pending Payments) to show real calculated data instead of placeholder dashes, so I get an instant overview of my labor costs and outstanding payments.

Currently the dashboard summary cards show hardcoded placeholders ("—" for Hours This Period and Payroll Due, "0" for Pending Payments). These should pull real data from shift logs and payment records.

**Why this priority**: The dashboard is the first thing a manager sees. Placeholder data makes the entire page feel incomplete and untrustworthy. Fixing this delivers immediate value with minimal UI changes.

**Independent Test**: Can be tested by creating employees with shift logs and payment records, navigating to the employees dashboard, and verifying all four summary cards show accurate calculated values.

**Acceptance Scenarios**:

1. **Given** employees have completed shifts this pay period, **When** a manager views the dashboard, **Then** the "Hours This Period" card shows the total hours across all active employees for the current period.
2. **Given** employees have pending payment records, **When** a manager views the dashboard, **Then** the "Payroll Due" card shows the total calculated amount for unpaid/pending periods.
3. **Given** some payment records have "Pending" or "Partial" status, **When** a manager views the dashboard, **Then** the "Pending Payments" card shows the count of outstanding payment records.
4. **Given** no employees have shifts or payments, **When** a manager views the dashboard, **Then** all cards show "0" or the currency equivalent, not placeholder dashes.

---

### User Story 2 - Status Filter and Enhanced List Controls (Priority: P1)

As a manager with 10+ employees, I want to filter the employee list by employment status (Active, Inactive, Terminated, All), so I can quickly find the employees I need without scrolling through the entire list.

The list view currently only supports name search. There is no way to filter by employment status or filter out terminated employees.

**Why this priority**: Without status filtering, the list becomes cluttered with inactive/terminated employees as staff turns over. This is a basic admin table feature that managers expect.

**Independent Test**: Can be tested by navigating to the list view with employees in various statuses, selecting a status filter, and verifying only matching employees appear. The default should show Active employees.

**Acceptance Scenarios**:

1. **Given** a manager is on the list view, **When** the page loads, **Then** only Active employees are shown by default.
2. **Given** a manager selects the "All" status filter, **When** the filter is applied, **Then** employees of all statuses are shown.
3. **Given** a manager selects the "Inactive" filter, **When** the filter is applied, **Then** only Inactive employees are shown.
4. **Given** a manager has both a name search and a status filter active, **When** viewing the list, **Then** both filters apply simultaneously (intersection).

---

### User Story 3 - Side Panel Quick Profile View (Priority: P2)

As a manager reviewing employees from the list, I want to click an employee row to see a quick summary panel without leaving the list, so I can review contact info and basic details for multiple employees quickly without navigating away.

Currently clicking an employee row navigates to the full detail page (`/employees/[id]`). The hybrid approach adds a side panel that shows the profile summary, with a "View Full Profile" link to reach the existing detail page for shift/pay management.

**Why this priority**: The side panel improves workflow for common manager tasks (looking up a phone number, checking a rate, reviewing status) without losing list context. The full detail page already handles deep management, so this is additive.

**Independent Test**: Can be tested by clicking an employee row in the list view, verifying the side panel opens with profile details, clicking another employee row to switch panel content, and clicking "View Full Profile" to navigate to the detail page.

**Acceptance Scenarios**:

1. **Given** a manager clicks an employee row, **When** the side panel opens, **Then** it displays: name, position, contact info (phone, email), hourly rate, start date, employment status, notes, and linked user account (if any).
2. **Given** the side panel is open, **When** the manager clicks a different employee row, **Then** the panel updates to show that employee's details.
3. **Given** the side panel is open, **When** the manager clicks "View Full Profile", **Then** they navigate to the existing `/employees/[id]` detail page.
4. **Given** the side panel is open, **When** the manager clicks the close button or presses Escape, **Then** the panel closes and the full list is visible.

---

### User Story 4 - Date Range Filtering for Shifts and Payments (Priority: P2)

As a store owner reviewing an employee's detail page, I want to filter shifts and payments by date range, so I can review hours and pay for specific periods (e.g., last week, last month, custom range) instead of only seeing the most recent 10 shifts.

The detail page currently shows the last 10 shifts and all payments with no date filtering. The hours summary card calculates totals across all shifts without period boundaries.

**Why this priority**: Period-based filtering is essential for payroll verification. Without it, managers can't easily answer "how many hours did this person work last week?" — the core use case for the shifts section.

**Independent Test**: Can be tested by opening an employee's detail page, selecting a date range, verifying shifts and hours summary update to reflect only that period, and creating a payment record that auto-calculates from the filtered period.

**Acceptance Scenarios**:

1. **Given** a manager is on an employee's detail page, **When** they select a date range for shifts, **Then** the shift list and hours summary update to show only shifts within that range.
2. **Given** a date range is selected, **When** the manager views the hours summary card, **Then** it shows total hours, shifts worked, and calculated pay for that specific range only.
3. **Given** no date range is selected, **When** the page loads, **Then** the default range is the current pay period (last 2 weeks).
4. **Given** a manager selects a date range, **When** they click "Record Payment", **Then** the payment form pre-fills with the selected date range and auto-calculates hours and amount for that period.

---

### User Story 5 - Employment Status Lifecycle and Account Management (Priority: P2)

As a store owner, I want the system to enforce valid employment status transitions and automatically manage linked user account access when an employee's status changes, so I don't accidentally leave active login accounts for terminated employees.

Currently the status dropdown allows any transition with no validation, and changing status has no effect on the linked user account.

**Why this priority**: This is a security and data integrity concern. Terminated employees with active login accounts is a real risk for a POS system that handles money.

**Independent Test**: Can be tested by changing an employee's status through each valid transition and verifying the linked user account is automatically disabled/enabled. Also test that invalid transitions are blocked.

**Acceptance Scenarios**:

1. **Given** an Active employee with a linked user account, **When** a manager changes their status to Inactive, **Then** the linked user account's login access is automatically disabled.
2. **Given** an Inactive employee, **When** a manager changes their status back to Active, **Then** the linked user account's login access is re-enabled.
3. **Given** a Terminated employee, **When** a manager changes their status to Active (rehire), **Then** the linked user account is re-enabled and the employee reappears in the Active filter.
4. **Given** the system enforces valid transitions, **When** a manager views the status dropdown, **Then** only valid next states are shown (e.g., a Terminated employee sees only "Active", not "Inactive").

---

### User Story 6 - Role Presets for Permission Management (Priority: P3)

As a store owner, I want to assign role presets (e.g., "Cashier", "Manager", "Kitchen Staff") when linking an employee to a user account, so I don't have to manually toggle 6+ individual permission switches for every new hire.

This applies to the Users page account creation flow. Presets provide a sensible default that can be further customized. (The employee form's user-linking only links to existing accounts; it does not create new accounts or set permissions, so presets are not applicable there.)

**Why this priority**: Quality-of-life improvement. The current permission toggles work; presets make them faster. Lower priority because the core admin gaps (Stories 1-5) deliver more operational value.

**Independent Test**: Can be tested by opening the user account creation flow, selecting a role preset, verifying toggles update to match, then manually adjusting one toggle to confirm customization works.

**Acceptance Scenarios**:

1. **Given** a manager is configuring permissions on the Users page, **When** they select a role preset, **Then** all permission toggles update to match the preset's defaults.
2. **Given** a manager has applied a role preset, **When** they manually toggle an individual permission, **Then** the preset label changes to indicate "Custom" modifications.
3. **Given** the system has predefined role presets, **When** a manager views the options, **Then** they see at least: "Cashier" (transactions + products), "Manager" (all permissions), and "Kitchen Staff" (products + categories only).

---

### Edge Cases

- What happens when a manager tries to change an employee's status to Inactive while they are currently clocked in?
- What happens when deleting an employee who has existing shift logs and payment records?
- How does the system handle an employee whose linked user account is deleted independently from the Users page?
- What if the summary cards API is slow — should the dashboard show loading skeletons or stale cached values?
- What happens when a manager selects a date range with no shifts — does the payment auto-calculation show zero?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Dashboard summary cards MUST display live calculated data: total hours this period across all active employees, total payroll due (unpaid calculated amounts), and count of pending payment records.
- **FR-002**: System MUST provide a status filter control on the list view to filter by Active, Inactive, Terminated, or All employees.
- **FR-003**: The list view MUST default to showing only Active employees.
- **FR-004**: System MUST show a side panel with a quick profile summary (name, position, contact info, rate, status, notes, linked account) when an employee row is clicked in the list view.
- **FR-005**: The side panel MUST include a "View Full Profile" link that navigates to the existing `/employees/[id]` detail page.
- **FR-006**: The employee detail page MUST support date range filtering for shifts, with the hours summary updating to reflect the selected range.
- **FR-007**: The default date range on the detail page MUST be the current pay period (last 2 weeks).
- **FR-008**: The "Record Payment" form MUST pre-fill with the currently selected date range and auto-calculate hours and amount for that period.
- **FR-009**: System MUST enforce valid employment status transitions: Active ↔ Inactive (freely), Active/Inactive → Terminated, and Terminated → Active (rehire).
- **FR-009a**: System MUST automatically disable the linked user account's login access when an employee's status changes away from Active, and re-enable it when status returns to Active.
- **FR-010**: The status dropdown in the employee edit form MUST only show valid next states based on the current status.
- **FR-011**: System MUST provide role presets (Cashier, Manager, Kitchen Staff) that set default permission configurations when configuring a user account.
- **FR-012**: System MUST allow customizing individual permissions after applying a role preset.
- **FR-013**: System MUST prevent changing an employee's status away from Active while they have an active (clocked-in) shift, prompting the manager to clock out first.
- **FR-014**: System MUST log all employee status changes to the audit trail, including the old and new status values.

### Key Entities

- **Employee**: Already exists. Employment status lifecycle clarified: Active ↔ Inactive (freely), Active/Inactive → Terminated, Terminated → Active (rehire). Linked user account login is automatically disabled when status is not Active.
- **User Account**: Already exists. One-to-one optional relationship with Employee. Login access is now managed automatically based on employee status.
- **Role Preset**: A named collection of default permissions (e.g., "Cashier", "Manager") that can be applied to a user account for quick setup. Defined as application configuration, not user-editable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All four dashboard summary cards display real data (no placeholder dashes) when employee/shift/payment data exists.
- **SC-002**: Managers can filter the employee list to a specific status in a single interaction (one click/tap).
- **SC-003**: Managers can view an employee's contact info and basic details from the list via the side panel without navigating away from the list page.
- **SC-004**: Reviewing an employee's hours for a specific pay period takes under 30 seconds by selecting a date range and reading the summary.
- **SC-005**: When an employee is terminated or deactivated, their linked user account is automatically disabled within the same operation — no separate manual step required.
- **SC-006**: Assigning permissions via role presets reduces the number of manual interactions from 6+ toggle switches to a single selection.
- **SC-007**: 100% of employee status changes are captured in the audit trail with old and new values.

## Assumptions

- The existing Employee, ShiftLog, PaymentRecord, and ShiftTemplate database models provide sufficient data structure. No schema changes are needed.
- The existing API routes (`/api/employees`, `/api/employees/[id]`, `/api/employees/[id]/shifts`, `/api/employees/[id]/payments`, `/api/employees/stats`) provide the data foundation. Some may need additional query parameters (date range) or response fields.
- Role presets are defined as application configuration rather than user-editable entities.
- The "Users" page remains separate and unchanged. Employee admin and user account management are distinct sidebar pages. The only integration point is the user account linking from the employee form and automatic account disable/enable on status changes.
- "Current pay period" defaults to the last 2 weeks. A configurable pay period setting is out of scope for this feature.
- The side panel is desktop/tablet only. On mobile, clicking an employee row continues to navigate directly to the detail page.
