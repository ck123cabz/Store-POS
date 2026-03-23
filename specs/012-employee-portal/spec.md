# Feature Specification: Employee Portal

**Feature Branch**: `012-employee-portal`
**Created**: 2026-03-23
**Status**: Draft
**Input**: User description: "in the employees tab, it's a bit confusing how the flow works for each employee. where do they go when they clock in? how do we make that step intuitive. like an employee portal is different from admin portal"

## Clarifications

### Session 2026-03-23

- Q: Should admin and employee portals be fully separated (different navigation, hidden menu items)? → A: No. The current system stays as-is. The employee portal is a personal hub page within the existing app — not a separate experience. No navigation changes needed.
- Q: How much shift history should the portal show? → A: All shifts with pagination.
- Q: How should stale unclosed shifts be resolved? → A: Employee enters their actual clock-out time when closing the stale shift.
- Q: Should the portal's task section be interactive or read-only? → A: Interactive — employees can start and complete tasks directly from the portal.
- Q: What should the sidebar link be called? → A: "My Shift" — focused on the clock-in/out action.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Personal Employee Portal Page (Priority: P1)

Each employee gets a personal portal/hub page that shows everything about *them*: their clock-in status, their shift history, their tasks, and their streak. When an employee like "Christian Pats" logs in, they land on their portal and immediately see whether they're clocked in or not, with a clear action to clock in or out.

**Why this priority**: This is the core ask — a single, intuitive page where an employee sees their own stuff and can clock in/out without confusion. Today the employee data is scattered across the admin employees page and the generic task dashboard, with no personal "home base."

**Independent Test**: Can be fully tested by logging in as an employee-linked user and verifying they see their personal portal with clock-in/out, shift history, and tasks — all scoped to them.

**Acceptance Scenarios**:

1. **Given** a user linked to an employee record is not clocked in, **When** they view their portal, **Then** they see their name, current date/time, and a prominent "Clock In" button.
2. **Given** an employee taps "Clock In", **When** the action succeeds, **Then** they see confirmation of their clock-in time and the page updates to show their active shift status.
3. **Given** an employee is currently clocked in, **When** they view their portal, **Then** they see their active shift duration (time since clock-in), a "Clock Out" button, and their tasks for the day.
4. **Given** an employee views their portal, **When** they scroll down, **Then** they see their full shift history (all past clock-ins/outs with hours worked), paginated.
5. **Given** an employee views their portal, **When** they look at the tasks section, **Then** they see tasks assigned to or relevant to them and can start/complete tasks directly inline (same data and actions as the existing task dashboard).
6. **Given** an employee has a stale unclosed shift from a previous day, **When** they view the portal, **Then** they see a warning about the open shift and can close it by entering their actual clock-out time.

---

### User Story 2 - Post-Login Routing for Employees (Priority: P2)

When a user who is linked to an employee record (and has no admin permissions) logs in, they should be automatically routed to their personal employee portal page instead of the main dashboard. Admin users continue to land on the existing dashboard as they do today.

**Why this priority**: Without routing, employees still land on the admin dashboard and have to manually navigate to their portal. Automatic routing makes the portal the natural starting point for their shift.

**Independent Test**: Can be fully tested by logging in with an employee-only user and verifying they land on their portal, then logging in as an admin and verifying they land on the admin dashboard.

**Acceptance Scenarios**:

1. **Given** a user with no admin permissions and a linked employee record, **When** they log in, **Then** they are routed to their personal employee portal page.
2. **Given** a user with admin permissions, **When** they log in, **Then** they land on the existing admin dashboard (no change to current behavior).
3. **Given** any user, **When** they navigate to "My Shift" in the sidebar, **Then** they can access the portal regardless of how they were routed at login.

---

### User Story 3 - Shift Summary on Clock-Out (Priority: P3)

When an employee clocks out from their portal, they see a brief summary of their shift: total hours worked, tasks completed, and streak status. This gives closure to their workday.

**Why this priority**: Nice-to-have that enhances the portal experience but isn't required for the core clock-in/out and personal hub to function.

**Independent Test**: Can be fully tested by clocking out from the portal and verifying a summary appears showing shift duration and task completion.

**Acceptance Scenarios**:

1. **Given** a clocked-in employee taps "Clock Out" on their portal, **When** the clock-out succeeds, **Then** they see a summary showing: hours worked this shift, tasks completed today, and current streak count.
2. **Given** an employee views the clock-out summary, **When** they dismiss it, **Then** the portal returns to the "not clocked in" state with the Clock In button visible.

---

### Edge Cases

- What happens when an employee's shift spans midnight (clock in at 11 PM, clock out at 2 AM)? System should track total hours correctly regardless of date boundary.
- How does the system handle if an employee forgets to clock out from a previous shift? The portal warns them and lets them close the stale shift by entering their actual clock-out time before starting a new one.
- What happens if the admin removes the employee-user link while the employee is logged in? On next page load, the portal should show a message that their account is no longer linked.
- How does the portal behave on shared devices (tablet at the counter)? Each login/logout cycle fully resets state — no data leaks between sessions.
- What if a user is not linked to any employee record but navigates to the portal page? They should see a message indicating they need to be linked by a manager.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a personal employee portal page accessible to any user linked to an employee record.
- **FR-002**: The portal MUST display the employee's current clock-in status (not clocked in, or clocked in since X:XX with elapsed time).
- **FR-003**: The portal MUST provide a prominent Clock In action when the employee is not clocked in.
- **FR-004**: The portal MUST provide a prominent Clock Out action when the employee has an active shift.
- **FR-005**: The portal MUST display the employee's full shift history (date, clock-in time, clock-out time, hours worked) with pagination.
- **FR-006**: The portal MUST display the employee's tasks for the current day with interactive actions (start/complete tasks inline), reusing existing task dashboard data.
- **FR-007**: The portal MUST display the employee's streak and milestone information.
- **FR-008**: System MUST route employee-only users (no admin permissions, linked employee record) to the portal after login.
- **FR-009**: System MUST prevent clock-in if the employee has an active unclosed shift, and allow the employee to close it by entering their actual clock-out time.
- **FR-011**: The portal MUST be accessible via a "My Shift" link in the sidebar navigation.
- **FR-010**: System MUST show a shift summary (hours worked, tasks completed, streak) when an employee clocks out.

### Key Entities

- **Shift**: An employee's work period bounded by clock-in and clock-out times. Existing `ShiftLog` model. Displayed in the portal's shift history section.
- **Portal View State**: Whether the employee is currently clocked in or not. Determines which actions (Clock In vs. Clock Out) and which content (active shift timer vs. clock-in prompt) are shown.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Employees can clock in within 5 seconds of reaching the portal (one-tap action).
- **SC-002**: 100% of employee-only users are routed to their portal after login without manual navigation.
- **SC-003**: Portal displays all personal data (shift history, tasks, streak) on a single page — no navigation required to see the full picture.
- **SC-004**: Clock-out summary appears within 2 seconds of clocking out.
- **SC-005**: Shared-device usage works correctly with back-to-back employee sessions without stale data.

## Assumptions

- The existing Employee-to-User linkage (via `userId` on the Employee model) determines portal access.
- An employee-only user has none of: `permProducts`, `permCategories`, `permUsers`, `permSettings`, `permReports`, `permAuditLog`.
- The existing clock-in/clock-out API endpoints and ShiftLog model will be reused.
- The existing task dashboard data (from `/api/dashboard/employee`) will be reused in the portal's task section.
- The portal is an additional page in the existing app — not a separate app or layout. Accessible via "My Shift" sidebar link.
- Admin users can also visit the portal page via the "My Shift" sidebar link if they are linked to an employee record.
