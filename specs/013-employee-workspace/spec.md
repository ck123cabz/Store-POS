# Feature Specification: Employee Admin Unified Workspace

**Feature Branch**: `013-employee-workspace`
**Created**: 2026-03-24
**Status**: Draft
**Input**: Reimagine the Employee Admin as a unified 6-tab workspace (Today, Team, Schedule, Tasks, Payroll, Reports) with split-view CRM for employee detail, mobile bottom navigation, and comprehensive analytics reports. Surfaces existing but unused API endpoints for shift templates and task management.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Real-Time Operations Dashboard (Priority: P1)

As a store manager opening the Employee Admin, I see a real-time operations dashboard ("Today" tab) that answers "What's happening right now and what needs my attention?" at a glance. I see how many employees are clocked in, total hours being worked today, task completion progress, and any alerts (such as employees who forgot to clock out). I can see who is currently working, what tasks are pending or completed, and what shifts are running.

**Why this priority**: This is the default landing page and the primary value of the workspace — giving managers instant situational awareness without clicking through multiple views.

**Independent Test**: Can be fully tested by loading the employees page and verifying that real-time employee, shift, and task data is displayed in summary cards and actionable panels.

**Acceptance Scenarios**:

1. **Given** employees are clocked in, **When** I open the Employees page, **Then** I see the Today tab with a count of clocked-in employees, total hours being worked, task completion ratio, and alert count.
2. **Given** an employee forgot to clock out yesterday, **When** I view the Today tab, **Then** I see a stale shift alert with the employee's name and a "Resolve" button that lets me set an explicit clock-out time.
3. **Given** tasks are assigned for today, **When** I view the task board, **Then** I see tasks grouped by status (pending, in progress, completed) with assignment and deadline information.
4. **Given** shift templates exist, **When** I view the Today tab, **Then** I see today's active shifts with their time ranges and how many employees are assigned to each.

---

### User Story 2 - Team Split-View CRM (Priority: P1)

As a manager, I can browse my team in a full-width data table showing each employee's name, position, status, hours worked, and hourly rate. I can filter by employment status (Active, Inactive, Terminated, All) and search by name. When I click an employee, the list compresses to the left and a detail panel opens on the right — like an email client — showing the employee's full profile with sub-sections for overview, shifts, payments, tasks, and activity history. The list stays visible so I can quickly switch between employees without losing context.

**Why this priority**: The split-view CRM is the core interaction pattern that replaces three separate views (list, side panel, detail page) with one unified experience.

**Independent Test**: Can be fully tested by navigating to the Team tab, filtering employees, selecting one, and verifying the split view opens with all five detail sub-sections populated.

**Acceptance Scenarios**:

1. **Given** I am on the Team tab with no employee selected, **When** I view the page, **Then** I see a full-width table with columns for Name, Position, Status, Hours (14 days), and Rate.
2. **Given** I am on the Team tab, **When** I click an employee row, **Then** the table compresses to a narrow list on the left and a detail panel opens on the right showing the employee's profile.
3. **Given** the split view is open, **When** I click a different employee in the compressed list, **Then** the detail panel updates to show the newly selected employee without losing my list scroll position.
4. **Given** the split view is open, **When** I switch between detail sub-sections (Overview, Shifts, Payments, Tasks, Activity), **Then** the relevant data loads for the selected employee.
5. **Given** I am on the Team tab, **When** I filter by "Inactive" status, **Then** only inactive employees appear in the list.
6. **Given** I am on the Team tab, **When** I type a name in the search field, **Then** the list filters to show matching employees in real time.

---

### User Story 3 - Team-Wide Payroll Management (Priority: P2)

As a manager responsible for payroll, I can view all employees' hours and calculated pay for a selected date range on one screen. I see summary cards showing total hours, total labor cost, amount already paid, and amount still pending. A table lists every active employee with their hours worked, calculated pay, and payment status for the selected period. I can click any employee row to record a payment, pre-filled with the correct period and amount.

**Why this priority**: Payroll is a critical business function that currently requires navigating to each employee individually. A team-wide view dramatically reduces the time needed to process payroll.

**Independent Test**: Can be fully tested by selecting a date range and verifying that all employee hours, costs, and payment statuses are displayed with correct calculations, and that recording a payment updates the status.

**Acceptance Scenarios**:

1. **Given** I am on the Payroll tab, **When** I select a 14-day date range, **Then** I see summary cards showing total hours, labor cost, amount paid, and amount pending for all employees in that period.
2. **Given** employees have worked shifts in the selected period, **When** I view the payroll table, **Then** each employee row shows their name, position, hours worked, calculated pay (hours times rate), and payment status.
3. **Given** an employee has an outstanding payment, **When** I click their row, **Then** a payment dialog opens pre-filled with the employee's period, hours, and calculated amount.
4. **Given** I am on the Payroll tab, **When** I switch from a 14-day to a 30-day date range, **Then** all summary cards and table data update to reflect the new period.
5. **Given** an employee has received a partial payment, **When** I view the payroll table, **Then** their status shows "Partial" with the remaining balance visible.

---

### User Story 4 - Task Management and Approval (Priority: P2)

As a manager, I can view, create, and manage all employee tasks from the Tasks tab. I see a list of all tasks with their type, deadline, assignment, and today's completion status. I can filter tasks by status (All, Pending Approval, Active). When employees submit completed tasks for approval, I see them in an approval queue where I can approve or reject with an optional note.

**Why this priority**: Task management currently has working endpoints but no admin-facing interface. Managers have no way to create, assign, or approve tasks — this unlocks a major unused feature.

**Independent Test**: Can be fully tested by creating a task, assigning it to an employee, viewing its completion status, and testing the approval workflow (approve/reject).

**Acceptance Scenarios**:

1. **Given** I am on the Tasks tab, **When** I view the page, **Then** I see all tasks with their type, schedule, deadline, assignment, and today's completion status.
2. **Given** I click "New Task", **When** I fill in the task details (name, type, deadline, assignment, schedule), **Then** the task is created and appears in the task list.
3. **Given** an employee has submitted a task for approval, **When** I view the approval queue, **Then** I see the pending task with the employee's name, submission time, and Approve/Reject buttons.
4. **Given** I approve a pending task, **When** I click Approve, **Then** the task is marked as completed and removed from the approval queue.
5. **Given** I reject a pending task, **When** I click Reject and enter a note, **Then** the task is sent back to the employee with the rejection reason.
6. **Given** I filter by "Pending Approval", **When** I view the task list, **Then** only tasks awaiting approval are displayed.

---

### User Story 5 - Shift Template Management (Priority: P3)

As a manager, I can view, create, edit, and delete shift templates from the Schedule tab. Each template shows a color swatch, name, time range, and calculated duration. I also see a weekly overview grid showing how many employees were assigned to each shift template per day, navigable by week.

**Why this priority**: Shift template CRUD endpoints exist but have no management UI. This surfaces existing functionality that managers currently cannot access.

**Independent Test**: Can be fully tested by creating a shift template, editing its properties, viewing the week overview grid, and verifying employee counts match actual shift assignments.

**Acceptance Scenarios**:

1. **Given** I am on the Schedule tab, **When** I view the page, **Then** I see all shift templates with their color swatch, name, time range, and calculated duration.
2. **Given** I click "New Template", **When** I enter a name, start time, end time, and color, **Then** the template is created and appears in the list.
3. **Given** a shift template exists, **When** I click Edit on a template, **Then** I can modify its name, times, and color and save the changes.
4. **Given** shift logs exist for the current week, **When** I view the week overview grid, **Then** I see the number of employees who worked each shift template per day.
5. **Given** I am viewing the week overview, **When** I navigate to the previous or next week, **Then** the grid updates with data for the selected week.

---

### User Story 6 - Analytics Reports (Priority: P3)

As a manager, I can view six analytics reports on the Reports tab, controlled by a shared date range. The reports cover hours by employee, labor cost breakdown by position, task completion rates, streak leaderboard, payment history, and attendance patterns. Each report displays summary metrics relevant to team performance.

**Why this priority**: Reports provide insights for strategic decision-making but are not required for day-to-day operations. They build on data already collected by other tabs.

**Independent Test**: Can be fully tested by selecting a date range and verifying that all six report cards display correct aggregated data derived from shifts, tasks, payments, and attendance records.

**Acceptance Scenarios**:

1. **Given** I am on the Reports tab, **When** I select a monthly date range, **Then** all six report cards update to show data for the selected period.
2. **Given** employees have shift records, **When** I view the Hours by Employee report, **Then** I see a ranked list of employees by total hours with a team average.
3. **Given** employees have different positions and rates, **When** I view the Labor Cost Breakdown, **Then** I see the cost split by position with percentages and a total.
4. **Given** task completions exist, **When** I view the Task Completion Rates report, **Then** I see per-employee completion percentages with color-coded indicators (green for high, amber for medium, red for low).
5. **Given** employees have active streaks, **When** I view the Streak Leaderboard, **Then** I see employees ranked by current streak with their personal best.
6. **Given** shift logs exist, **When** I view the Attendance Patterns report, **Then** I see average clock-in times by shift type and a count of late arrivals.

---

### User Story 7 - Mobile-Optimized Experience (Priority: P2)

As a manager using a mobile device, the six workspace tabs appear as a bottom navigation bar with icons for easy thumb access. When I tap on an employee in the Team tab, the detail view opens full-screen with a back button (stack navigation) instead of the desktop split view. Sub-sections (Overview, Shifts, Payments, Tasks, Activity) appear as a horizontal scrollable pill bar. Actions like recording payments or adding shifts open as bottom sheets instead of dialogs.

**Why this priority**: Store managers frequently check the dashboard from their phones while on the floor. A mobile-first experience is essential for real-world usage.

**Independent Test**: Can be fully tested by viewing the workspace on a mobile viewport and verifying that bottom navigation, stack navigation, and bottom sheets function correctly.

**Acceptance Scenarios**:

1. **Given** I am on a mobile device, **When** I open the Employees page, **Then** I see a bottom navigation bar with icons for all six tabs.
2. **Given** I am on the Team tab on mobile, **When** I tap an employee, **Then** the detail view opens full-screen with a back arrow to return to the list.
3. **Given** I am viewing an employee detail on mobile, **When** I view the sub-sections, **Then** they appear as a horizontally scrollable pill bar that I can swipe through.
4. **Given** I tap "Record Payment" on mobile, **When** the action triggers, **Then** a bottom sheet slides up (instead of a centered dialog) for data entry.
5. **Given** I am on a tablet in portrait mode, **When** I select an employee, **Then** the split view adapts with a narrower list column.

---

### Edge Cases

- What happens when there are zero employees? All tabs should display appropriate empty states with guidance to add the first employee.
- What happens when a manager has restricted permissions? All six tabs remain visible — access is controlled at the Employees page level, not per-tab.
- What happens when the selected date range returns no data? Summary cards should show zero values and tables/reports should display "No data for this period" messages.
- How does the system handle an employee being terminated while their detail panel is open? The detail panel should update the status badge and show only valid actions for the new status.
- What happens when two managers try to approve the same pending task? The first approval should succeed and the second should see a "task already approved" message.
- What happens on extremely slow connections? The Today tab should show loading skeletons for each section independently so partial data can render as it arrives.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a unified workspace with six top-level tabs: Today, Team, Schedule, Tasks, Payroll, and Reports.
- **FR-002**: System MUST default to the Today tab when the Employees page is loaded.
- **FR-003**: System MUST display summary cards on the Today tab showing clocked-in count, hours being worked today, task completion ratio, and alert count. Data MUST auto-refresh every 30 seconds while the tab is visible, pausing when the browser tab is hidden.
- **FR-004**: System MUST show stale shift alerts (employees who forgot to clock out) with a resolution action.
- **FR-005**: System MUST display a full-width employee data table on the Team tab when no employee is selected.
- **FR-006**: System MUST support filtering employees by status (Active, Inactive, Terminated, All) and searching by name.
- **FR-007**: System MUST open a split-view detail panel when an employee is selected on the Team tab, compressing the list to the left.
- **FR-008**: System MUST preserve list scroll position when navigating between employees in the split view.
- **FR-009**: System MUST provide five detail sub-sections: Overview, Shifts, Payments, Tasks, and Activity.
- **FR-010**: System MUST allow managers to create, edit, and delete shift templates from the Schedule tab.
- **FR-011**: System MUST display a weekly overview grid showing employee counts per shift template per day.
- **FR-012**: System MUST allow managers to view, create, and manage tasks from the Tasks tab.
- **FR-013**: System MUST provide an approval queue for tasks submitted by employees, with approve and reject actions.
- **FR-014**: System MUST display team-wide payroll data for a selectable date range on the Payroll tab.
- **FR-015**: System MUST show summary cards for total hours, labor cost, amount paid, and amount pending.
- **FR-016**: System MUST allow inline payment recording from the payroll table, pre-filled with the employee's calculated amount.
- **FR-017**: System MUST display six analytics reports on the Reports tab: hours by employee, labor cost breakdown, task completion rates, streak leaderboard, payment history, and attendance patterns.
- **FR-018**: System MUST support date range filtering with presets on the Payroll and Reports tabs.
- **FR-019**: System MUST adapt to mobile viewports with a bottom navigation bar and stack navigation for the Team tab.
- **FR-020**: System MUST open actions (record payment, add shift, create task) as bottom sheets on mobile devices.
- **FR-021**: System MUST allow clicking an employee name in any tab to navigate to their detail in the Team tab.
- **FR-022**: System MUST make all six tabs visible to any user who has access to the Employees page. No per-tab permission gating is required; access control is enforced at the page level only.
- **FR-023**: System MUST redirect the legacy `/employees/[id]` route to the workspace Team tab with that employee selected, preserving backward compatibility for existing bookmarks and links.

### Key Entities

- **Shift Template**: A reusable definition of a work shift with a name, start time, end time, color, and calculated duration. Used to classify shift assignments.
- **Task**: A work item assigned to employees with a name, type (action/inventory/custom), description, deadline, schedule (days of week), assignment, and flags for required and streak-breaking.
- **Task Completion**: A record of an employee completing a task, including timestamp and approval status (pending, approved, rejected).
- **Payment Record**: A record of compensation paid to an employee for a specific period, including amount, method, date, and status (paid, partial, pending).
- **Shift Log**: A record of an employee's clock-in and clock-out times for a specific shift, linked to a shift template.
- **User Streak**: A record of an employee's consecutive-day task completion streak, including current count and personal best.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Managers can assess the current operational status (who's working, what tasks are pending, any alerts) within 5 seconds of opening the Employees page.
- **SC-002**: Managers can view a specific employee's full profile (shifts, payments, tasks) without navigating away from the employee list.
- **SC-003**: Processing payroll for all employees takes under 2 minutes using the team-wide Payroll tab, compared to the current per-employee workflow.
- **SC-004**: Managers can create, approve, or reject employee tasks directly from the admin workspace — functionality that previously had no user interface.
- **SC-005**: Managers can create and manage shift templates without direct data entry — functionality that previously had no user interface.
- **SC-006**: All six analytics reports load and display aggregated team data within 3 seconds for a 30-day date range.
- **SC-007**: The workspace is fully usable on mobile devices with one-handed navigation via the bottom tab bar.
- **SC-008**: Navigating between tabs and between employees in the split view preserves state (scroll position, selected filters, date ranges) without page reloads.
- **SC-009**: 100% of existing employee admin functionality is preserved — no features are lost in the redesign.

## Clarifications

### Session 2026-03-24

- Q: Which permission gates which workspace tab? → A: All six tabs are visible to any user with Employees page access. No per-tab permission gating.
- Q: How does Today tab data stay current? → A: Auto-poll every 30 seconds while visible, pause when browser tab is hidden (matches existing sidebar polling pattern).
- Q: What happens to the existing `/employees/[id]` route? → A: Redirect to `/employees?tab=team&id=[id]` to preserve backward compatibility for bookmarks and existing links.

### Assumptions

- Existing endpoints for shift templates, tasks, and task approval are fully functional and do not require backend changes.
- The employee self-service portal (My Shift) remains unchanged — this redesign only affects the admin-facing views.
- Employee permissions are already enforced at the service level; the workspace only needs to hide UI elements for unauthorized features.
- The date range picker component and design system components (Badge, Avatar, Button, etc.) already exist and can be reused.
- Payroll calculations use simple hourly rate times hours worked — no overtime rules, tax calculations, or deductions are in scope.
