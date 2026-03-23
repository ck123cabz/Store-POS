# Tasks: Employee Portal ("My Shift")

**Input**: Design documents from `/specs/012-employee-portal/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/api.md

**Tests**: Included — constitution mandates Test-First Development (TDD).

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Verify environment and scaffold new route directories

- [X] T001 Verify dev server starts and existing tests pass (`npm run dev`, `npm run test:unit`)
- [X] T002 Add "My Shift" nav entry with Clock icon to sidebar Management group in `src/components/layout/sidebar.tsx` — route `/my-shift`, permission `null`
- [X] T003 Create scaffold page at `src/app/(dashboard)/my-shift/page.tsx` with "My Shift" heading and loading state

**Checkpoint**: "My Shift" is visible in sidebar and navigable (shows scaffold page)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core API endpoint that resolves session user → employee → active shift. ALL portal features depend on this.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests

- [X] T004 Write integration test for `GET /api/my-shift` in `tests/integration/my-shift-api.test.ts` — test cases: authenticated user with linked employee, user with active shift, user with stale shift, user with no employee link, unauthenticated request

### Implementation

- [X] T005 Implement `GET /api/my-shift` route in `src/app/api/my-shift/route.ts` — resolve session user → find Employee by userId → find active ShiftLog (clockOut IS NULL) → determine isStaleShift (clockIn date < today) → return `{ employee, activeShift, isStaleShift }` per contract

**Checkpoint**: Foundation ready — `GET /api/my-shift` returns correct data for all user states. User story implementation can begin.

---

## Phase 3: User Story 1 — Personal Employee Portal Page (Priority: P1) 🎯 MVP

**Goal**: A single page where employees see their clock-in status, clock in/out, view tasks inline, see streak/milestones, and browse paginated shift history.

**Independent Test**: Log in as an employee-linked user → navigate to /my-shift → see clock-in button → clock in → see timer + tasks → scroll to see shift history → clock out.

### Tests for User Story 1

> **Write these tests FIRST, ensure they FAIL before implementation**

- [X] T006 [P] [US1] Write integration test for `POST /api/my-shift/clock-in` in `tests/integration/my-shift-api.test.ts` — test cases: successful clock-in, already clocked in (400), stale shift blocking (400), no employee link (404), unauthenticated (401)
- [X] T007 [P] [US1] Write integration test for `POST /api/my-shift/clock-out` in `tests/integration/my-shift-api.test.ts` — test cases: successful clock-out, not clocked in (400), no employee link (404)
- [X] T008 [P] [US1] Write integration test for `PATCH /api/my-shift/close-stale` in `tests/integration/my-shift-api.test.ts` — test cases: successful close with valid time, clockOutTime before clockIn (400), no stale shift (400), future time (400)
- [X] T009 [P] [US1] Write integration test for pagination on `GET /api/employees/[id]/shifts` in `tests/integration/my-shift-api.test.ts` — test cases: cursor+take returns page, hasMore flag, backward-compatible (no params returns full list)

### API Implementation for User Story 1

- [X] T010 [P] [US1] Implement `POST /api/my-shift/clock-in` in `src/app/api/my-shift/clock-in/route.ts` — resolve session → employee, check no stale shift, check no active shift, create ShiftLog, return 201 per contract
- [X] T011 [P] [US1] Implement `POST /api/my-shift/clock-out` in `src/app/api/my-shift/clock-out/route.ts` — resolve session → employee, find active shift, set clockOut to now, return closed shift per contract
- [X] T012 [P] [US1] Implement `PATCH /api/my-shift/close-stale` in `src/app/api/my-shift/close-stale/route.ts` — resolve session → employee, find unclosed shift, validate clockOutTime > clockIn and in past, update ShiftLog, return per contract
- [X] T013 [US1] Add cursor-based pagination to `GET /api/employees/[id]/shifts` in `src/app/api/employees/[id]/shifts/route.ts` — support `cursor` and `take` query params, return `{ shifts, nextCursor, hasMore }` when provided, preserve existing flat array response when params omitted

### Frontend Implementation for User Story 1

- [X] T014 [US1] Build clock-in/out hero section in `src/app/(dashboard)/my-shift/page.tsx` — show employee name + position, current date/time, prominent "Clock In" button when not clocked in, "Clock Out" button + elapsed timer when clocked in. Fetch from `GET /api/my-shift` on load.
- [X] T015 [US1] Build stale shift warning banner in `src/app/(dashboard)/my-shift/page.tsx` — when `isStaleShift: true`, show AlertBanner with warning and a dialog/form to enter actual clock-out time. Call `PATCH /api/my-shift/close-stale` on submit. Dismiss returns to normal clock-in state.
- [X] T016 [US1] Build interactive tasks section in `src/app/(dashboard)/my-shift/page.tsx` — fetch from `GET /api/dashboard/employee`, render task list grouped by shift section (opening/service/closing) with Start/Complete action buttons. Reuse existing task card pattern from `/employee` page. Call `POST /api/tasks/[id]/start` and `POST /api/tasks/[id]/complete` for actions.
- [X] T017 [US1] Build streak and milestones section in `src/app/(dashboard)/my-shift/page.tsx` — display current streak, longest streak, milestone badges, progress bar to next milestone. Data sourced from `GET /api/dashboard/employee` response.
- [X] T018 [US1] Build paginated shift history section in `src/app/(dashboard)/my-shift/page.tsx` — fetch from `GET /api/employees/[id]/shifts?take=10`, display table/list with date, clock-in, clock-out, hours worked. "Load More" button fetches next page via cursor. Show empty state when no shifts.
- [X] T019 [US1] Build "not linked" empty state in `src/app/(dashboard)/my-shift/page.tsx` — when `GET /api/my-shift` returns `employee: null`, show EmptyState component with message "Your account isn't linked to an employee record. Ask a manager to set this up."

**Checkpoint**: User Story 1 is fully functional. An employee can navigate to /my-shift, clock in/out, manage tasks, view streak, browse shift history, and resolve stale shifts.

---

## Phase 4: User Story 2 — Post-Login Routing (Priority: P2)

**Goal**: Employee-only users (no admin permissions, linked employee record) are automatically routed to /my-shift after login. Admins continue going to /pos.

**Independent Test**: Log in as employee-only user → lands on /my-shift. Log in as admin → lands on /pos.

### Tests for User Story 2

- [X] T020 [US2] Write E2E test for post-login routing in `tests/e2e/my-shift-portal.spec.ts` — test cases: employee-only user → redirected to /my-shift, admin user → stays on /pos, employee-only user can still navigate to /pos via sidebar

### Implementation for User Story 2

- [X] T021 [US2] Modify login page in `src/app/(auth)/login/page.tsx` — after successful `signIn()`, fetch `GET /api/my-shift` to check if user has linked employee. If employee exists AND user has no admin permissions (check session: all perm flags false), `router.push("/my-shift")`. Otherwise `router.push("/pos")` (existing behavior).

**Checkpoint**: User Stories 1 AND 2 are both functional. Employee-only users auto-land on their portal.

---

## Phase 5: User Story 3 — Shift Summary on Clock-Out (Priority: P3)

**Goal**: When clocking out, employees see a brief summary dialog showing hours worked, tasks completed today, and streak count before returning to the clock-in state.

**Independent Test**: Clock out from the portal → summary dialog appears with hours/tasks/streak → dismiss → returns to clock-in view.

### Tests for User Story 3

- [X] T022 [US3] Write integration test for clock-out summary data in `tests/integration/my-shift-api.test.ts` — verify `POST /api/my-shift/clock-out` response includes `summary` field with `tasksCompletedToday`, `tasksTotal`, `currentStreak`

### Implementation for User Story 3

- [X] T023 [US3] Enhance `POST /api/my-shift/clock-out` in `src/app/api/my-shift/clock-out/route.ts` — after closing shift, query today's TaskCompletions count and UserStreak. Return `{ shift: { ..., hoursWorked }, summary: { tasksCompletedToday, tasksTotal, currentStreak } }` per contract.
- [X] T024 [US3] Build shift summary dialog in `src/app/(dashboard)/my-shift/page.tsx` — after successful clock-out, show a dialog/card with: hours worked (formatted), tasks completed (X of Y), current streak (N days). "Done" button dismisses and returns portal to not-clocked-in state.

**Checkpoint**: All three user stories are functional. Full portal experience is complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, mobile responsiveness, and full E2E coverage

- [X] T025 [P] Handle midnight-spanning shifts — verify hours calculation in clock-out endpoint works correctly when clockIn and clockOut span different dates
- [X] T026 [P] Mobile responsive pass on `src/app/(dashboard)/my-shift/page.tsx` — ensure clock-in hero, task list, and shift history table work on mobile viewports (sm breakpoint). Use existing responsive patterns (DataTable mobileCardRender, responsive grid).
- [X] T027 [P] Write E2E smoke test for full portal flow in `tests/e2e/my-shift-portal.spec.ts` — login as employee → see portal → clock in → see timer + tasks → start a task → complete it → clock out → see summary → dismiss → back to clock-in state
- [X] T028 Verify shared-device behavior — confirm that logging out and logging in as a different employee shows only the new employee's data with no stale state from previous session

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 — core portal page
- **US2 (Phase 4)**: Depends on Phase 2 only — can run in parallel with US1
- **US3 (Phase 5)**: Depends on US1 T011 (clock-out endpoint exists) — enhances it
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — no dependency on other stories
- **US2 (P2)**: Can start after Phase 2 — needs `GET /api/my-shift` from Phase 2 but NOT US1 page
- **US3 (P3)**: Depends on US1's clock-out endpoint (T011) — enhances the response and adds frontend dialog

### Within Each User Story

- Tests MUST be written and FAIL before implementation (constitution Principle I)
- API endpoints before frontend (frontend depends on API)
- Core sections before polish sections
- Commit after each task or logical group

### Parallel Opportunities

**Phase 2**: T004 (test) can run before T005 (will fail — that's expected per TDD)

**Phase 3 (US1)**:
- T006, T007, T008, T009 — all test tasks can run in parallel (different test cases)
- T010, T011, T012 — all API endpoint tasks can run in parallel (different route files)
- T014 through T019 are sequential (same page.tsx file) but can be committed incrementally

**Cross-story parallelism**: US1 and US2 can be worked on simultaneously after Phase 2.

---

## Parallel Example: User Story 1

```bash
# Launch all US1 tests together (write first, will fail):
Task T006: "Integration test for POST /api/my-shift/clock-in"
Task T007: "Integration test for POST /api/my-shift/clock-out"
Task T008: "Integration test for PATCH /api/my-shift/close-stale"
Task T009: "Integration test for shift pagination"

# Launch all US1 API endpoints together (make tests pass):
Task T010: "POST /api/my-shift/clock-in in src/app/api/my-shift/clock-in/route.ts"
Task T011: "POST /api/my-shift/clock-out in src/app/api/my-shift/clock-out/route.ts"
Task T012: "PATCH /api/my-shift/close-stale in src/app/api/my-shift/close-stale/route.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T005) — CRITICAL
3. Complete Phase 3: User Story 1 (T006-T019)
4. **STOP and VALIDATE**: Navigate to /my-shift, clock in/out, verify tasks and history work
5. Deploy/demo if ready — employees can use portal via sidebar link

### Incremental Delivery

1. Setup + Foundational → "My Shift" page navigable with data
2. Add US1 → Full portal working (clock-in/out, tasks, history) → **MVP ready!**
3. Add US2 → Employees auto-routed after login → Seamless experience
4. Add US3 → Clock-out summary → Polished experience
5. Polish → Mobile, edge cases, E2E → Production ready

---

## Notes

- No Prisma migrations needed — all models already exist
- [P] tasks = different files, no dependencies between them
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Constitution requires TDD: write tests first, verify they fail, then implement
- Commit after each task or logical group
- The portal page (T014-T019) is one file — build sections incrementally, not in parallel
