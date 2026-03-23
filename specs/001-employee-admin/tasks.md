# Tasks: Employee Admin Dashboard Completion

**Input**: Design documents from `/specs/001-employee-admin/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Included per project constitution (Principle I: Test-First Development is NON-NEGOTIABLE). Integration tests precede every API change. Unit tests precede every lib file.

**Organization**: Tasks are grouped by user story. All 6 stories can be implemented independently after the foundational phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Foundational (Shared Lib + Auth)

**Purpose**: Shared utilities used by multiple user stories. MUST complete before US5 and US6 can begin. US1, US2, US3, and US4 may start in parallel with this phase (see Dependencies).

- [x] T001 [P] Write unit tests for employee status transitions in tests/unit/employee-status.test.ts — test `isValidTransition()` and `getValidNextStates()` for all valid/invalid transition combinations: Active↔Inactive, Active/Inactive→Terminated, Terminated→Active, reject Terminated→Inactive
- [x] T002 [P] Write unit tests for role presets in tests/unit/role-presets.test.ts — test that ROLE_PRESETS exports Cashier, Manager, Kitchen Staff with correct permission maps, and that each preset has all 8 permission keys
- [x] T003 [P] Write integration test for auth disabled check in tests/integration/auth-disabled.test.ts — test that `authorize()` rejects a user whose status is `"Disabled"` (returns null), and that a user with status `"Logged Out"` or `""` still passes authentication successfully
- [x] T004 [P] Create employee status transition map in src/lib/employee-status.ts — export `VALID_TRANSITIONS` record, `isValidTransition(from, to)` function, and `getValidNextStates(current)` function per data-model.md lifecycle rules
- [x] T005 [P] Create role preset definitions in src/lib/role-presets.ts — export `RolePreset` interface and `ROLE_PRESETS` array with Cashier (permProducts+permTransactions), Manager (all true), Kitchen Staff (permProducts+permCategories) per data-model.md
- [x] T006 Run unit tests (T001, T002) to confirm they pass green with T004 and T005 implementations
- [x] T007 Add disabled account check in src/lib/auth.ts — after `const user = await prisma.user.findUnique(...)` and before `bcrypt.compare()`, add `if (user.status === "Disabled") return null` per contracts/api-changes.md auth section
- [x] T008 Run integration test (T003) to confirm it passes green with T007 implementation

**Checkpoint**: Shared libs created, tested, and auth hardened. All user story work can now begin.

---

## Phase 2: User Story 1 — Live Dashboard Summary Cards (Priority: P1) MVP

**Goal**: Replace hardcoded placeholder values in the dashboard summary cards (Hours This Period, Payroll Due, Pending Payments) with real calculated data from shift logs and payment records.

**Independent Test**: Navigate to /employees dashboard view. Verify all four summary cards display real calculated values (not "—" or hardcoded "0"). Create shifts and payments, refresh, confirm values update.

### Implementation for User Story 1

- [x] T009 [P] [US1] Write integration test for stats endpoint in tests/integration/employees-stats.test.ts — test that GET /api/employees/stats returns `hoursThisPeriod` (number) and `payrollDue` (number) fields alongside existing `activeCount`, `clockedIn`, `pendingPayments`. Test with seed data: verify hours aggregate correctly for completed shifts in last 14 days, verify payrollDue sums calculatedAmount from Pending/Partial payments. Test returns 0 when no data.
- [x] T010 [US1] Enhance GET /api/employees/stats in src/app/api/employees/stats/route.ts — add two new Prisma queries to the existing Promise.all: (1) aggregate completed shift hours for active employees in last 14 days → `hoursThisPeriod`, (2) sum `calculatedAmount` from PaymentRecords with status "Pending" or "Partial" → `payrollDue`. Return both new fields in JSON response alongside existing fields. Verify T009 passes green.
- [x] T011 [US1] Wire live summary card data in src/app/(dashboard)/employees/page.tsx — update `fetchStats` to read `hoursThisPeriod` and `payrollDue` from the stats response. Replace the hardcoded `"—"` in the Hours This Period card with `hoursThisPeriod` formatted to 1 decimal, replace Payroll Due `"—"` with `payrollDue` formatted as currency, and wire `pendingPayments` count (already returned but hardcoded to 0 in state). Show `0` or currency `0.00` when no data instead of dashes.
- [x] T012 [US1] Add loading skeletons to summary cards in src/app/(dashboard)/employees/page.tsx — while stats are loading, show animated skeleton placeholders in the SummaryCard values instead of stale or empty values. Use the existing loading pattern from the DataTable component.

**Checkpoint**: Dashboard summary cards show real data. US1 is independently functional and testable.

---

## Phase 3: User Story 2 — Status Filter and Enhanced List Controls (Priority: P1)

**Goal**: Add employment status filter (Active/Inactive/Terminated/All) to the employee list view, defaulting to Active only.

**Independent Test**: Navigate to /employees list view. Verify only Active employees show by default. Click each filter button and verify correct filtering. Combine with name search and verify intersection works.

### Implementation for User Story 2

- [x] T013 [US2] Add status filter state and ToggleGroup control in src/app/(dashboard)/employees/page.tsx — add `statusFilter` state defaulting to `"Active"`. Add a ToggleGroup component with items "Active", "Inactive", "Terminated", "All" next to the existing search input in the list view toolbar. Style with existing ToggleGroup/button patterns.
- [x] T014 [US2] Apply status filter to employee list in src/app/(dashboard)/employees/page.tsx — update the `filteredEmployees` computed value to filter by `employmentStatus` when `statusFilter` is not "All", applying as intersection with the existing name search filter.

**Checkpoint**: List filters by status with Active as default. US2 is independently functional and testable.

---

## Phase 4: User Story 3 — Side Panel Quick Profile View (Priority: P2)

**Goal**: Clicking an employee row opens a side panel (Sheet) showing their profile summary, with a "View Full Profile" link to the detail page. On mobile, retain existing navigation behavior.

**Independent Test**: Click an employee row in list view. Verify Sheet opens with full profile info. Click another row — panel updates. Click "View Full Profile" — navigates to /employees/[id]. Click close/press Escape — panel closes.

### Implementation for User Story 3

- [x] T015 [P] [US3] Create EmployeeSidePanel component in src/components/employees/employee-side-panel.tsx — use shadcn Sheet (side="right") with SheetHeader showing employee name and position, SheetContent with sections: contact info (phone, email), employment details (position, hourly rate, start date, status badge), notes, linked user account info (username or "No login account"). Include "View Full Profile" Link button to `/employees/[id]`. Accept `employee: Employee | null`, `open: boolean`, `onOpenChange: (open: boolean) => void` props.
- [x] T016 [US3] Integrate side panel into list view in src/app/(dashboard)/employees/page.tsx — add `selectedEmployee` state and `panelOpen` state. On row click: if `useIsMobile()` is true, navigate to `/employees/[id]` (existing behavior). If desktop/tablet, set `selectedEmployee` and open the panel. Render `<EmployeeSidePanel>` at the bottom of the page component. Remove or conditionalize the existing `onRowClick` navigation.

**Checkpoint**: Side panel works on desktop, mobile retains navigation. US3 is independently functional.

---

## Phase 5: User Story 4 — Date Range Filtering for Shifts and Payments (Priority: P2)

**Goal**: Add date range picker to the employee detail page that filters shifts, recalculates hours summary, and pre-fills payment forms with the selected period.

**Independent Test**: Open /employees/[id]. Verify DateRangePicker appears with default 14-day range. Select different range — shifts list and hours summary update. Click "Record Payment" — form pre-fills with selected range and calculated hours/amount.

### Implementation for User Story 4

- [x] T017 [P] [US4] Write integration test for payments date range filtering in tests/integration/employees-payments.test.ts — test that GET /api/employees/[id]/payments with `?from=&to=` returns only payments within the date range, returns all payments when params are omitted (backward compat), returns 400 for invalid date format, and returns 400 when `from > to`.
- [x] T018 [US4] Add date range query params to GET /api/employees/[id]/payments in src/app/api/employees/[id]/payments/route.ts — parse `from` and `to` from request URL searchParams. Validate: return 400 if date format is invalid (`isNaN(new Date(from).getTime())`), return 400 if `from > to`. When valid, add `periodStart: { gte: new Date(from) }` and `periodEnd: { lte: new Date(to) }` to the Prisma where clause. Backward compatible: when omitted, return all payments. Verify T017 passes green.
- [x] T019 [US4] Add DateRangePicker to detail page in src/app/(dashboard)/employees/[id]/page.tsx — import DateRangePicker from src/components/ui/date-range-picker.tsx. Add `dateRange` state with default of `{ from: subDays(new Date(), 14), to: new Date() }`. Render the picker above the shifts section. Include presets: "Last 7 days", "Last 14 days", "Last 30 days", "This month" from src/lib/date-ranges.ts.
- [x] T020 [US4] Wire date range to shifts and payments fetch in src/app/(dashboard)/employees/[id]/page.tsx — update `fetchShifts` to append `?from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}` to the API URL. Update `fetchPayments` similarly. Re-fetch when dateRange changes (add to useEffect/useCallback dependency). Remove the `.slice(0, 10)` limit on `recentShifts` since date range now controls the window.
- [x] T021 [US4] Update hours summary to use filtered data in src/app/(dashboard)/employees/[id]/page.tsx — the `totalHours`, `completedShifts`, `avgHours`, and `calculatedPay` derived values already compute from the `shifts` state array. Since shifts are now filtered by date range from the API, these values automatically reflect the selected period. Update the "This Period" label to show the selected date range. Update the "Record Payment" button's `onClick` to pre-fill `paymentForm.periodStart` and `paymentForm.periodEnd` with the current dateRange values.

**Checkpoint**: Date range filtering works for shifts and payments, hours summary reflects selected period. US4 is independently functional.

---

## Phase 6: User Story 5 — Employment Status Lifecycle and Account Management (Priority: P2)

**Goal**: Enforce valid status transitions in the API, automatically disable/enable linked user accounts on status changes, and show only valid status options in the UI dropdown.

**Independent Test**: Edit an Active employee → change to Inactive → verify linked user account status is "Disabled". Change back to Active → verify account re-enabled. Try invalid transition (Terminated→Inactive) → verify API returns 400. Try changing status while clocked in → verify blocked.

### Implementation for User Story 5

- [x] T022 [P] [US5] Write integration test for status transition validation in tests/integration/employee-status-api.test.ts — test: (1) PUT with valid transition (Active→Inactive) succeeds and sets linked User.status to "Disabled", (2) PUT with valid transition back to Active re-enables User.status to "Logged Out", (3) PUT with invalid transition (Terminated→Inactive) returns 400 with descriptive error, (4) PUT changing away from Active while employee has active shift (clockOut=null) returns 400, (5) audit log entry is created with old/new status values.
- [x] T023 [US5] Add status transition validation to PUT /api/employees/[id] in src/app/api/employees/[id]/route.ts — before the Prisma update: (1) fetch current employee to get existing employmentStatus, (2) if employmentStatus is changing, validate with `isValidTransition()` from src/lib/employee-status.ts — return 400 with descriptive error if invalid, (3) if changing away from Active, check for active shifts (clockOut is null) via `prisma.shiftLog.findFirst({ where: { employeeId, clockOut: null } })` — return 400 if found, (4) use `diffChanges()` from src/lib/audit.ts for the audit log entry.
- [x] T024 [US5] Add automatic user account management to PUT /api/employees/[id] in src/app/api/employees/[id]/route.ts — after the employee update, if status changed and employee has a linked userId: if new status is not Active, set `User.status = "Disabled"` via `prisma.user.update()`. If new status is Active, set `User.status = "Logged Out"`. Log the status change to audit trail with `logAudit({ entity: "employee", action: "status_change", changes: { employmentStatus: { old: currentStatus, new: newStatus } } })`. Verify T022 passes green.
- [x] T025 [US5] Show only valid status transitions in employee edit forms — in src/app/(dashboard)/employees/page.tsx and src/app/(dashboard)/employees/[id]/page.tsx, import `getValidNextStates()` from src/lib/employee-status.ts. Replace the static SelectItem list (Active, Inactive, Terminated) with dynamically generated items: include the current status as a disabled option for context, then add each valid next state as selectable. Only render the status field when editing (existing behavior).

**Checkpoint**: Status lifecycle enforced server-side and reflected in UI. Linked accounts auto-managed. US5 is independently functional.

---

## Phase 7: User Story 6 — Role Presets for Permission Management (Priority: P3)

**Goal**: Add a role preset dropdown to the Users page permission section that auto-fills permission toggles, with the ability to customize afterward.

**Independent Test**: Open Users page, click Add User or Edit. Select "Cashier" preset — verify permProducts and permTransactions toggle on, others off. Toggle one manually — preset label shows "Custom". Select "Manager" — verify all toggles on.

### Implementation for User Story 6

- [x] T026 [US6] Add role preset Select to Users page form in src/app/(dashboard)/users/page.tsx — import `ROLE_PRESETS` from src/lib/role-presets.ts. Add a `selectedPreset` state (string, default ""). Add a Select component above the permission toggles with options: empty/"Select a role...", plus one SelectItem per preset from ROLE_PRESETS. On selection, call `form.setValue()` for each permission key using the preset's values. Track "Custom" state: when any individual permission toggle changes after a preset was applied, update the preset label to show "(Custom)".

**Checkpoint**: Role presets work on Users page. US6 is independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: E2E tests, contract tests, edge case handling, and integration verification

- [ ] T027 [P] Write E2E tests for dashboard and filters in tests/e2e/employee-admin.spec.ts — test: (1) dashboard summary cards show real values (not "—"), (2) status filter defaults to Active and correctly filters, (3) search + filter intersection works
- [ ] T028 [P] Write E2E tests for side panel and detail page in tests/e2e/employee-admin.spec.ts — test: (4) clicking employee row opens side panel with correct data, (5) "View Full Profile" navigates to detail page, (6) date range picker filters shifts and updates hours summary
- [ ] T029 [P] Write E2E tests for status lifecycle in tests/e2e/employee-admin.spec.ts — test: (7) changing status to Inactive disables linked account, (8) invalid transition shows error, (9) status dropdown shows only valid options
- [ ] T030 [P] Write contract tests for backward compatibility of modified endpoints in tests/integration/employee-api-contracts.test.ts — verify: (1) GET /api/employees/stats still returns `activeCount`, `clockedIn`, `todayShifts`, `pendingPayments` alongside new fields, (2) GET /api/employees/[id]/payments returns all payments when `from`/`to` are omitted, (3) PUT /api/employees/[id] still accepts updates with no status change (existing behavior preserved)
- [x] T031 Handle edge cases — (1) in employees/[id]/page.tsx: show empty state when date range has no shifts with selected range noted, (2) in PUT /api/employees/[id]: handle case where employee's linked user was independently deleted (userId points to non-existent user — log warning but don't fail the employee update)
- [ ] T032 Run full test suite and verify all tests pass — `npm run test:unit` for employee-status and role-presets tests, `npm run test:e2e` for employee-admin E2E tests, `npm run lint` for no lint errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately
- **US1 (Phase 2)**: **No foundational dependency** — can start immediately (only modifies stats endpoint)
- **US2 (Phase 3)**: **No foundational dependency** — can start immediately (pure client-side filter)
- **US3 (Phase 4)**: **No foundational dependency** — can start immediately (new component + list integration)
- **US4 (Phase 5)**: **No foundational dependency** — can start immediately (payments API + detail page)
- **US5 (Phase 6)**: **Depends on Phase 1** — uses employee-status.ts (T004) and auth.ts change (T007)
- **US6 (Phase 7)**: **Depends on Phase 1** — uses role-presets.ts (T005)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1** (P1): Independent — only needs stats API enhancement
- **US2** (P1): Independent — pure client-side filtering
- **US3** (P2): Independent — new component + list page integration
- **US4** (P2): Independent — detail page + payments API date params
- **US5** (P2): Depends on Phase 1 (employee-status.ts + auth.ts)
- **US6** (P3): Depends on Phase 1 (role-presets.ts)

### File Conflict Awareness

**⚠️ `employees/page.tsx` is modified by US1 (T011-T012), US2 (T013-T014), US3 (T016), and US5 (T025).** These stories touch different sections of the same file, but parallel execution will produce merge conflicts. **Recommendation**: Serialize US1 → US2 → US3 → US5 for `employees/page.tsx` changes, or assign to a single agent. US4 and US6 are truly parallel (different files entirely).

### Within Each User Story

1. Integration tests first (Red — must fail)
2. API changes second (Green — tests pass)
3. Frontend changes last
4. Verify checkpoint before moving on

### Parallel Opportunities

- **Phase 1**: T001, T002, T003, T004, T005 all run in parallel (different files)
- **Immediately**: US1, US2, US3, US4 can start in parallel with Phase 1 (no lib dependencies)
- **After Phase 1**: US5, US6 unblock
- **Within US3**: T015 (component) and T016 (integration) are sequential
- **Within US5**: T022 first (test), then T023-T024 (same file, sequential), T025 parallel (different files)
- **Phase 8**: T027, T028, T029, T030 all run in parallel (different test blocks)

---

## Parallel Example: Maximum Parallelism

```text
# Start immediately — no waiting for foundational:
Agent 1: Phase 1 — T001-T008 (libs + auth, sequential within)
Agent 2: US1 — T009, T010, T011, T012 (stats API + dashboard cards)
Agent 3: US4 — T017, T018, T019, T020, T021 (date range API + detail page)

# After Agent 1 finishes Phase 1:
Agent 4: US5 — T022, T023, T024, T025 (status lifecycle)
Agent 5: US6 — T026 (role presets)

# Serialize on employees/page.tsx (after US1 agent finishes):
Agent 2 (continued): US2 — T013, T014 (status filter)
Agent 2 (continued): US3 — T015, T016 (side panel)
Agent 2 (continued): US5/T025 (status dropdown — if not done by Agent 4)
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Start Phase 1 and US1 in parallel
2. Complete US1: Live dashboard summary cards
3. Complete US2: Status filter (serialize after US1 for same file)
4. **STOP and VALIDATE**: Dashboard shows real data, list filters by status
5. Deploy/demo — the page immediately feels "complete" to managers

### Incremental Delivery

1. Phase 1 + US1 in parallel → dashboard shows real numbers → **Demo: "no more placeholder data"**
2. US2 → list filters by status → **Demo: "find employees faster"**
3. US3 → side panel quick view → **Demo: "preview without navigating"**
4. US4 → date range on detail page → **Demo: "review hours for any period"**
5. US5 → status lifecycle enforcement → **Demo: "security: terminated = locked out"**
6. US6 → role presets → **Demo: "one-click permission setup"**
7. Polish → E2E + contract tests, edge cases → **Ship with confidence**

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No Prisma migrations needed — all schema exists
- Total: 32 tasks across 8 phases
- Constitution TDD compliance: every API change has a preceding integration test
- Constitution contract test compliance: backward compatibility tests in Phase 8
- All user stories are independently testable and deliverable
- Commit after each task or logical group
