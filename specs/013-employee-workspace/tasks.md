# Tasks: Employee Admin Unified Workspace

**Input**: Design documents from `/specs/013-employee-workspace/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Constitution mandates TDD. Unit tests written before implementation (RED→GREEN). E2E tests for critical user flows after assembly.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Directory structure, shared components, and workspace shell

- [x] T001 Create workspace component directory structure: `src/components/employees/workspace/` and `src/components/employees/workspace/shared/`
- [x] T002 [P] Create shared StatCard component in `src/components/employees/workspace/shared/stat-card.tsx` — label, value (mono font), optional icon, optional border color variant
- [x] T003 [P] Create shared StaleShiftAlert component in `src/components/employees/workspace/shared/stale-shift-alert.tsx` — amber warning banner with employee name and "Resolve" button
- [x] T004 [P] Write unit tests for `use-workspace-polling` hook in `tests/unit/workspace-polling.test.ts` — test 30s interval, visibility pause, circuit breaker after 3 failures (RED phase: tests must fail)
- [x] T005 [P] Create `use-workspace-polling` hook in `src/hooks/use-workspace-polling.ts` — reuse sidebar badge pattern: 30s interval, visibility pause, AbortController, 3-failure circuit breaker (GREEN phase: make T004 tests pass)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Workspace shell and tab routing that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Create WorkspaceTabs component in `src/components/employees/workspace/workspace-tabs.tsx` — renders 6 tab headers (Today, Team, Schedule, Tasks, Payroll, Reports) using existing Tab/Active and Tab/Inactive patterns, reads/writes `?tab=` query param
- [x] T007 Replace `src/app/(dashboard)/employees/page.tsx` with workspace shell — imports WorkspaceTabs, reads `?tab=` param, lazy-renders the active tab component, defaults to Today. MUST preserve "Add Employee" button in header and retain existing Add/Edit/Delete Employee dialogs (SC-009: 100% feature preservation)
- [x] T008 Convert `src/app/(dashboard)/employees/[id]/page.tsx` to redirect — redirect to `/employees?tab=team&id=[id]` preserving backward compatibility

**Checkpoint**: Navigating to `/employees` shows tab bar with Add Employee button, switching tabs updates URL, `/employees/3` redirects correctly. Tab content areas are empty placeholders.

---

## Phase 3: User Story 1 — Real-Time Operations Dashboard (Priority: P1) 🎯 MVP

**Goal**: Today tab shows real-time ops: clocked-in employees, task board, stale shift alerts, today's shifts

**Independent Test**: Load `/employees` → see 4 summary cards, clocked-in panel, task board, and shift bar with live data

### Implementation for User Story 1

- [x] T009 [US1] Build TodayTab component in `src/components/employees/workspace/today-tab.tsx` — 4 StatCards row (Clocked In with green dot, Hours Today, Tasks Done ratio, Alerts with amber border), fetches `/api/employees/stats` and `/api/tasks/today` using `use-workspace-polling`
- [x] T010 [US1] Add ClockedInPanel section to TodayTab — card listing currently clocked-in employees (avatar, name, position, shift template, clock-in time) from stats.clockedIn data; clicking a name navigates to `?tab=team&id=`
- [x] T011 [US1] Add TaskBoard section to TodayTab — card showing today's tasks grouped by status (pending=circle icon, in_progress=loader icon, completed=circle-check icon) with assignment, deadline, and status badges
- [x] T012 [US1] Add StaleShiftAlert rendering to TodayTab — filter stats.clockedIn for shifts where clockIn date < today, render StaleShiftAlert for each with "Resolve" button that opens a dialog to set explicit clock-out time via `POST /api/employees/[id]/clock-out`
- [x] T013 [US1] Add TodayShiftsBar to TodayTab — bottom row showing shift templates (color dot, name, time range, assignment count) from stats.todayShifts

**Checkpoint**: Today tab fully functional with live data, 30s auto-refresh, stale shift resolution. Can be deployed as MVP.

---

## Phase 4: User Story 2 — Team Split-View CRM (Priority: P1)

**Goal**: Team tab with full-width table that compresses into a split view when an employee is selected

**Independent Test**: Navigate to Team tab → see full table → click employee → split view opens with 5 sub-tabs

### Implementation for User Story 2

- [x] T014 [US2] Build TeamTab component in `src/components/employees/workspace/team-tab.tsx` — toolbar with search input, status ToggleGroup (Active/Inactive/Terminated/All), and Add Employee button; reads `?id=` param for selected employee, manages split view open/closed state
- [x] T015 [US2] Build full-width employee table in TeamTab — columns: Name (avatar+name+email), Position, Status (badge), Hours 14d (mono), Rate/hr (mono); fetches `/api/employees?status=` and `/api/employees/stats` for hours data; row click sets `?id=` param
- [x] T016 [US2] Build compressed employee list in TeamTab — shown when `?id=` is set; 260px width, avatar + name + status dot per row; preserves scroll position on employee switch; selected row highlighted with accent background
- [x] T017 [US2] Build TeamDetailPanel component in `src/components/employees/workspace/team-detail-panel.tsx` — header (avatar, name, position, rate, start date, status badge, Edit button), sub-tab bar (Overview, Shifts, Payments, Tasks, Activity)
- [x] T018 [US2] Build Overview sub-tab in TeamDetailPanel — 3 stat cards (Hours 14d, Task Rate %, Streak days), Contact section (phone, email), Account section (linked user, role preset)
- [x] T019 [US2] Build Shifts sub-tab in TeamDetailPanel — DateRangePicker with presets, shift list with hours per shift, hours summary card (total, avg, calculated pay), clock in/out buttons, add manual shift dialog
- [x] T020 [US2] Build Payments sub-tab in TeamDetailPanel — payment history list with status badges (Paid/Partial/Pending), "Record Payment" button opening payment dialog pre-filled with auto-calculated amount
- [x] T021 [US2] Build Tasks sub-tab in TeamDetailPanel — filter tasks via employee's linked userId (not employeeId directly) using `/api/tasks/today`, show completion history and on-time percentage
- [x] T022 [US2] Build Activity sub-tab in TeamDetailPanel — compose timeline from ShiftLog (clock events), PaymentRecord (payments), and employee status changes; no new API needed, use existing shift/payment sub-tab data
- [x] T023 [US2] Wire cross-tab navigation — clicking employee name in Today tab (clocked-in panel, task board) navigates to `?tab=team&id=<employeeId>`

**Checkpoint**: Team tab complete with split view, all 5 sub-tabs functional, cross-tab navigation works.

---

## Phase 5: User Story 3 — Team-Wide Payroll Management (Priority: P2)

**Goal**: Payroll tab with date range picker, 4 summary cards, payroll table with inline payment recording

**Independent Test**: Select date range → see team hours/costs → click employee → record payment

### Implementation for User Story 3

- [x] T024 [US3] Build PayrollTab component in `src/components/employees/workspace/payroll-tab.tsx` — DateRangePicker with presets (7d, 14d, 30d, Month), fetches all employees and their shifts/payments for selected period
- [x] T025 [US3] Add PayrollSummaryCards to PayrollTab — 4 StatCards: Total Hours, Labor Cost ($), Paid (green border), Pending (amber border); calculated from aggregated employee data
- [x] T026 [US3] Add PayrollTable to PayrollTab — columns: Employee name, Position, Hours (mono), Calculated Pay (mono), Status (badge: Paid/Partial/Pending); footer row with totals; sorted pending-first
- [x] T027 [US3] Wire inline payment recording — clicking a payroll table row opens Record Payment dialog (using existing payment form) pre-filled with employee's period, hours, and calculated amount; on submit, refresh table data and update summary cards

**Checkpoint**: Payroll tab complete. Manager can view team payroll and record payments in under 2 minutes.

---

## Phase 6: User Story 4 — Task Management and Approval (Priority: P2)

**Goal**: Tasks tab with task list, create dialog, and approval queue with approve/reject actions

**Independent Test**: View all tasks → create a task → filter by pending → approve/reject from queue

### Implementation for User Story 4

- [x] T028 [US4] Build TasksTab component in `src/components/employees/workspace/tasks-tab.tsx` — filter pills (All, Pending Approval, Active), "New Task" button, two-column layout (task list + approval queue)
- [x] T029 [US4] Build task list in TasksTab — shows all EmployeeTasks with status icon (circle/loader/circle-check), type badge, name, deadline time, assignment (anyone or specific), today's completion status from `/api/tasks/today`
- [x] T030 [US4] Build "New Task" dialog in TasksTab — form with name, type (select: action/inventory/custom), description, deadline time, days of week (multi-select), assignment type (anyone/specific + employee select), required flag, streak-breaking flag; submits to `POST /api/tasks`
- [x] T031 [US4] Build ApprovalQueue in TasksTab — sidebar card showing tasks with status "pending", each with employee name, submission time, task details, Approve button (`POST /api/tasks/[id]/approve`) and Reject button with optional note input (`POST /api/tasks/[id]/reject`)

**Checkpoint**: Tasks tab complete. Manager can create, view, and approve/reject tasks — functionality that previously had no UI.

---

## Phase 7: User Story 7 — Mobile-Optimized Experience (Priority: P2)

**Goal**: Bottom navigation bar on mobile, stack navigation for Team tab, bottom sheets for actions

**Independent Test**: On mobile viewport → bottom nav shows 6 tabs → Team tap opens full-screen detail → actions open as bottom sheets

### Implementation for User Story 7

- [x] T032 [US7] Build MobileBottomNav component in `src/components/employees/workspace/mobile-bottom-nav.tsx` — 6 icon buttons (Sun, Users, Calendar, CheckSquare, Wallet, BarChart) using Lucide icons, highlights active tab, visible only on mobile (<768px via `useIsMobile()`)
- [x] T033 [US7] Add mobile bottom nav to workspace shell in `src/app/(dashboard)/employees/page.tsx` — render MobileBottomNav at bottom of page on mobile, hide desktop tab bar
- [x] T034 [US7] Adapt TeamTab for mobile — when `useIsMobile()` is true, clicking an employee navigates to full-screen detail (no split view); show back arrow button; sub-tabs render as horizontal scrollable pill bar
- [x] T035 [US7] Convert action dialogs to bottom sheets on mobile — Record Payment, Add Shift, New Task dialogs use existing ResponsiveDialog component (Dialog on desktop, Drawer on mobile)

**Checkpoint**: Workspace fully usable on mobile with one-handed navigation via bottom tab bar.

---

## Phase 8: User Story 5 — Shift Template Management (Priority: P3)

**Goal**: Schedule tab with shift template CRUD and week overview grid

**Independent Test**: View templates → create/edit/delete → view week grid → navigate weeks

### Implementation for User Story 5

- [x] T036 [US5] Build ScheduleTab component in `src/components/employees/workspace/schedule-tab.tsx` — "New Template" button, shift template list, week overview grid
- [x] T037 [US5] Build shift template list in ScheduleTab — cards with color swatch (circle), name, time range (mono), calculated duration, Edit and Delete buttons; Edit opens dialog with name, startTime, endTime, color picker; uses `GET/POST /api/shift-templates` and `PUT/DELETE /api/shift-templates/[id]`
- [x] T038 [US5] Create `GET /api/shift-templates/week-overview` endpoint in `src/app/api/shift-templates/week-overview/route.ts` — accepts `weekStart` query param, aggregates ShiftLog by shiftTemplateId and day for 7-day range, returns grid with template names, colors, daily counts, and column totals
- [x] T039 [US5] Build WeekOverviewGrid in ScheduleTab — table with rows per template (color dot + name) and 7 day columns (Mon-Sun) showing employee counts (mono font), footer row with totals, week navigation arrows

**Checkpoint**: Schedule tab complete. Manager can create/manage shift templates and see weekly staffing overview.

---

## Phase 9: User Story 6 — Analytics Reports (Priority: P3)

**Goal**: Reports tab with 6 report cards controlled by shared date range

**Independent Test**: Select date range → all 6 reports display correct aggregated data

### Implementation for User Story 6

- [x] T040 [P] [US6] Write unit tests for reports aggregation logic in `tests/unit/reports-aggregation.test.ts` — test hoursByEmployee calculation, labor cost breakdown, attendance late detection (RED phase: tests must fail)
- [x] T041 [US6] Create `GET /api/employees/reports` endpoint in `src/app/api/employees/reports/route.ts` — accepts `from` and `to` query params, returns hoursByEmployee, laborCostByPosition, taskCompletionRates, streakLeaderboard, paymentSummary, attendancePatterns as single aggregated response (GREEN phase: make T040 tests pass)
- [x] T042 [US6] Build ReportsTab component in `src/components/employees/workspace/reports-tab.tsx` — DateRangePicker with presets (14d, Month, Quarter), 2×3 grid of report cards, fetches `/api/employees/reports`
- [x] T043 [P] [US6] Build report cards — HoursByEmployee (ranked list + team avg), LaborCostBreakdown (by position with %), TaskCompletionRates (per-employee % with green/amber/red color coding), StreakLeaderboard (ranked by streak with flame accent), PaymentHistory (paid/pending/total), AttendancePatterns (avg clock-in times + late count)

**Checkpoint**: Reports tab complete. All 6 analytics reports display aggregated team data within 3 seconds.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: E2E tests, validation, and refinements across all stories

- [x] T044 [P] Write E2E test for tab navigation in `tests/e2e/employee-workspace.spec.ts` — verify 6 tabs load, URL updates, back/forward navigation, legacy redirect
- [x] T045 [P] Write E2E test for split view in `tests/e2e/employee-workspace.spec.ts` — verify table → split view transition, employee selection, sub-tab navigation, scroll preservation
- [x] T046 Add empty states for all tabs — zero employees, no data for date range, no pending tasks
- [x] T047 Add loading skeletons for Today tab sections — independent loading per panel
- [ ] T048 Run quickstart.md validation — verify all 8 integration scenarios pass
- [x] T049 Verify lint passes (`npm run lint`) and fix any issues

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on T001 (directory structure) — BLOCKS all user stories
- **US1 Today (Phase 3)**: Depends on Phase 2 + T002, T003, T005 (shared components + polling hook)
- **US2 Team (Phase 4)**: Depends on Phase 2 — no dependency on US1
- **US3 Payroll (Phase 5)**: Depends on Phase 2 — no dependency on US1 or US2
- **US4 Tasks (Phase 6)**: Depends on Phase 2 — no dependency on other stories
- **US7 Mobile (Phase 7)**: Depends on Phase 2 + at least US1 and US2 being built (needs content to adapt)
- **US5 Schedule (Phase 8)**: Depends on Phase 2 — no dependency on other stories
- **US6 Reports (Phase 9)**: Depends on Phase 2 — no dependency on other stories
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Independent after Phase 2
- **US2 (P1)**: Independent after Phase 2
- **US3 (P2)**: Independent after Phase 2
- **US4 (P2)**: Independent after Phase 2
- **US5 (P3)**: Independent after Phase 2, needs T038 (new endpoint) before T039
- **US6 (P3)**: Independent after Phase 2, needs T040→T041 (TDD: test→impl) before T042-T043
- **US7 (P2)**: Depends on US1 + US2 being implemented (adapts existing tab content for mobile)

### Within Each User Story

- Unit tests before implementation (TDD: T004→T005, T040→T041)
- API endpoints before UI components that consume them (US5: T038→T039, US6: T041→T042)
- Tab component before sub-sections within it
- Core layout before detail interactions

### Parallel Opportunities

- T002, T003, T004 can all run in parallel (different files, no dependencies)
- US1, US2, US3, US4, US5, US6 can all run in parallel after Phase 2
- US7 should run after US1 + US2 (it adapts their components)
- Phase 10 E2E test tasks (T044-T045) can run in parallel
- Within US6: T043 report cards can be built in parallel since they're independent components

---

## Parallel Example: After Phase 2 Completes

```
Agent A: US1 — Today tab (T009→T013)
Agent B: US2 — Team split view (T014→T023)
Agent C: US5 — Schedule tab (T036→T039)
Agent D: US6 — Reports tab (T040→T043)
```

After US1 + US2 complete:
```
Agent A: US7 — Mobile adaptation (T032→T035)
Agent B: US3 — Payroll tab (T024→T027)
Agent C: US4 — Tasks tab (T028→T031)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T008)
3. Complete Phase 3: US1 Today Tab (T009-T013)
4. **STOP and VALIDATE**: Today tab shows live ops data with 30s auto-refresh
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Tab shell working with URL routing + Add Employee preserved
2. Add US1 (Today) → Real-time ops dashboard → Deploy (MVP!)
3. Add US2 (Team) → Split-view CRM → Deploy
4. Add US3 (Payroll) + US4 (Tasks) → Business-critical tools → Deploy
5. Add US7 (Mobile) → Mobile experience → Deploy
6. Add US5 (Schedule) + US6 (Reports) → Full feature set → Deploy
7. Polish → E2E tests, empty states, loading skeletons → Final deploy

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- TDD enforced: T004→T005 (polling hook), T040→T041 (reports endpoint)
- Existing components to reuse: Badge, Avatar, DateRangePicker, ToggleGroup, ResponsiveDialog, EmptyState, Sheet
- All existing API endpoints consumed as-is — only 2 new endpoints (T038, T041)
- The `/employees/[id]` redirect (T008) preserves all existing internal links
- Add/Edit/Delete Employee dialogs preserved in workspace shell (T007) and Team tab (T014)
