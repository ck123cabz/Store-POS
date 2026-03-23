# Implementation Plan: Employee Admin Dashboard Completion

**Branch**: `001-employee-admin` | **Date**: 2026-03-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-employee-admin/spec.md`

## Summary

Complete the existing Employees admin dashboard by filling functional gaps: live summary card data (replacing hardcoded placeholders), status filtering on the list view, a side panel for quick profile access, date range filtering on the detail page for shifts/payments, employment status lifecycle validation with automatic user account management, and role presets for permissions. No schema changes required — all work enhances existing UI components, API routes, and shared lib utilities.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: Next.js 16 (App Router), React 19, Tailwind CSS 4.x, Radix UI, shadcn/ui, Prisma ORM 7.x, NextAuth.js v5, Zod, date-fns, Lucide React icons
**Storage**: PostgreSQL with Prisma ORM (existing schema, no migrations needed)
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Web (desktop/tablet primary, mobile responsive)
**Project Type**: Web application (Next.js monorepo)
**Performance Goals**: Dashboard loads in < 2 seconds, date range filter response < 500ms
**Constraints**: Small business POS — typical employee count < 50. No new dependencies needed.
**Scale/Scope**: 2 new lib files, 1 new component, 7 modified files, ~500 lines net new code

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Gate

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Test-First Development | PASS | Unit tests for status transitions and role presets. E2E for dashboard, filters, side panel. TDD workflow applies. |
| II. Security-First | PASS | Auth disabled-check prevents terminated employee login. Status validation on server-side API. Audit logging for status changes. All routes already check `permUsers`. |
| III. Pragmatic Simplicity | PASS | No new schema, no new API routes (only modifications). Role presets as simple constant. Status transitions as a map. Uses existing components (DateRangePicker, Sheet, ToggleGroup). |
| IV. Data Integrity | PASS | Status transition validation prevents invalid states. User account disable/enable runs in same update operation. Active shift check prevents status change during clock-in. |
| V. RESTful API Standards | PASS | Extends existing endpoints with backward-compatible query params. Error responses follow `{ error: string }` pattern. Uses appropriate status codes. |

### Post-Design Gate

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Test-First Development | PASS | Tests defined: `employee-status.test.ts`, `role-presets.test.ts`, `employee-admin.spec.ts` |
| II. Security-First | PASS | Disabled account check in `authorize()`. Server-side status transition enforcement. Audit trail for all status changes. |
| III. Pragmatic Simplicity | PASS | 3 new files (2 lib + 1 component), 7 modified. No abstractions beyond a transition map and preset constant. |
| IV. Data Integrity | PASS | Status + user account update in same API call. No partial states possible. |
| V. RESTful API Standards | PASS | `PUT /api/employees/[id]` validates transitions and returns `400` with descriptive error. `GET /payments` adds `?from=&to=` (backward compatible). Stats adds 2 new fields (backward compatible). |

## Project Structure

### Documentation (this feature)

```text
specs/001-employee-admin/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output — 7 technical decisions
├── data-model.md        # Phase 1 output — entity reference (no schema changes)
├── quickstart.md        # Phase 1 output — developer setup guide
├── contracts/
│   └── api-changes.md   # Phase 1 output — 3 endpoint modifications + auth change
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── employee-status.ts     # NEW — status transition map + validation
│   ├── role-presets.ts         # NEW — role preset definitions
│   ├── auth.ts                 # MODIFY — add disabled account check
│   └── date-ranges.ts          # EXISTING — date range presets (reuse)
├── components/
│   ├── employees/
│   │   └── employee-side-panel.tsx  # NEW — Sheet-based quick profile panel
│   └── ui/
│       └── date-range-picker.tsx    # EXISTING — reuse for shift filtering
├── app/
│   ├── api/employees/
│   │   ├── stats/route.ts           # MODIFY — add hours + payroll aggregations
│   │   └── [id]/
│   │       ├── route.ts             # MODIFY — status transition validation + user disable
│   │       └── payments/route.ts    # MODIFY — add date range query params
│   └── (dashboard)/
│       ├── employees/
│       │   ├── page.tsx             # MODIFY — status filter, side panel, live cards
│       │   └── [id]/page.tsx        # MODIFY — DateRangePicker for shifts
│       └── users/
│           └── page.tsx             # MODIFY — role preset dropdown

tests/
├── unit/
│   ├── employee-status.test.ts      # NEW — transition validation tests
│   └── role-presets.test.ts         # NEW — preset config tests
└── e2e/
    └── employee-admin.spec.ts       # NEW — dashboard, filter, panel, date range E2E
```

**Structure Decision**: Web application pattern. All code stays within the existing `src/` directory structure following Next.js App Router conventions. New lib files in `src/lib/`, new component in `src/components/employees/` (existing directory pattern from other feature areas). Tests follow existing `tests/unit/` and `tests/e2e/` structure.

## Implementation Phases

### Phase 1: Foundation (Lib + API)

**Goal**: Shared utilities and API changes that other phases depend on.

1. **`src/lib/employee-status.ts`** — Status transition map
   - Export `VALID_TRANSITIONS: Record<string, string[]>` mapping each status to its allowed next states
   - Export `isValidTransition(from: string, to: string): boolean`
   - Export `getValidNextStates(current: string): string[]`

2. **`src/lib/role-presets.ts`** — Role preset definitions
   - Export `ROLE_PRESETS` array with label + permissions for Cashier, Manager, Kitchen Staff
   - Export `type RolePreset` interface

3. **`src/lib/auth.ts`** — Disabled account check
   - Add `if (user.status === "Disabled") return null` after user lookup, before password comparison

4. **`PUT /api/employees/[id]`** — Status transition enforcement
   - Fetch current employee to get `employmentStatus`
   - If status is changing, validate via `isValidTransition()`
   - Check for active shifts if changing away from Active
   - If employee has linked userId, update User.status ("Disabled" or "Logged Out")
   - Log status change to audit trail with changes diff

5. **`GET /api/employees/stats`** — Live dashboard data
   - Add query: sum of completed shift hours for active employees in last 14 days → `hoursThisPeriod`
   - Add query: sum of `calculatedAmount` for pending/partial payments → `payrollDue`

6. **`GET /api/employees/[id]/payments`** — Date range support
   - Add `from` and `to` query param parsing (same pattern as shifts route)
   - Filter by `periodStart >= from` and `periodEnd <= to`

### Phase 2: Frontend — Dashboard & List Enhancements

**Goal**: Status filter, live summary cards, side panel on the employees list page.

7. **Status filter on list page** (`employees/page.tsx`)
   - Add `statusFilter` state defaulting to `"Active"`
   - Add ToggleGroup with "Active", "Inactive", "Terminated", "All" options
   - Apply to `filteredEmployees` alongside existing name search

8. **Live summary cards** (`employees/page.tsx`)
   - Wire `hoursThisPeriod` and `payrollDue` from stats response into summary cards
   - Replace hardcoded "—" placeholders with real values
   - Show loading skeleton while stats fetch is in progress

9. **Side panel** (`employee-side-panel.tsx` + `employees/page.tsx`)
   - Create `EmployeeSidePanel` component using shadcn Sheet
   - Display: name, avatar, position, contact info, rate, status, start date, notes, linked account
   - Include "View Full Profile" link to `/employees/[id]`
   - On row click: open panel (desktop/tablet) or navigate (mobile via `useIsMobile()`)

### Phase 3: Frontend — Detail Page & Permissions

**Goal**: Date range filtering on detail page, role presets on Users page, status dropdown validation.

10. **Date range on detail page** (`employees/[id]/page.tsx`)
    - Add DateRangePicker with default range of last 14 days
    - Pass `from`/`to` to shifts and payments fetch calls
    - Hours summary card recalculates based on filtered shifts
    - "Record Payment" pre-fills with selected date range

11. **Status dropdown validation** (`employees/page.tsx` and `employees/[id]/page.tsx`)
    - Import `getValidNextStates()` from `src/lib/employee-status.ts`
    - Replace full status Select with only valid options based on current employee status
    - Add current status as first (disabled) option for context

12. **Role presets on Users page** (`users/page.tsx`)
    - Import `ROLE_PRESETS` from `src/lib/role-presets.ts`
    - Add a Select above the permission toggles in the form
    - On preset selection, set all permission form values to preset defaults
    - Track "Custom" state when user manually changes a toggle after preset selection

## Complexity Tracking

> No constitution violations detected. All changes follow established patterns.

| Aspect | Justification |
|--------|---------------|
| No new schema | All needed fields/models already exist |
| No new API routes | Existing routes extended with backward-compatible params |
| 2 new lib files + 1 component | Minimal: 2 small lib constants + 1 Sheet-based component |
| Existing component reuse | DateRangePicker, Sheet, ToggleGroup, StatusDot, Avatar — all exist |
