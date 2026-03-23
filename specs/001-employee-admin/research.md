# Research: Employee Admin Dashboard Completion

**Feature**: 001-employee-admin
**Date**: 2026-03-24

## Decision 1: Disabling User Account Login on Employee Status Change

**Decision**: Use the existing `status` field on the User model. Set it to `"Disabled"` when the linked employee becomes non-Active. Add a check in the `authorize()` function in `src/lib/auth.ts` to reject login attempts from disabled users.

**Rationale**: The `status` field is already a free-form string used for login state tracking (e.g., `"Logged In_<timestamp>"`, `"Logged Out"`). Using `"Disabled"` is consistent with this pattern and requires zero schema changes. The authorize function is the single chokepoint for all logins.

**Alternatives considered**:
- Add a `disabled` boolean to User model: Requires a Prisma migration. More explicit but unnecessary given the string status field is already in use.
- Soft-delete User record: Destructive; breaks referential integrity with transactions.
- Check employee status at login time via join: More complex, couples auth to employee model.

## Decision 2: Dashboard Summary Card Data Source

**Decision**: Extend the existing `/api/employees/stats` endpoint to include total hours and payroll calculations. The endpoint already queries `ShiftLog` and `PaymentRecord` data; we add aggregation.

**Rationale**: The stats endpoint already runs 4 parallel queries (active count, clocked-in shifts, today's shifts, pending payments). Adding 2 more aggregations to the same endpoint keeps the data in one fetch and avoids new API routes.

**Alternatives considered**:
- Separate `/api/employees/dashboard` endpoint: Unnecessary new route for the same data.
- Client-side calculation: Would require fetching all shifts and payments for all employees — too expensive.

## Decision 3: Date Range Filtering Approach

**Decision**: Use query parameters on existing API endpoints. The shifts API already supports `?from=&to=`. Add the same to the payments API. On the frontend, use the existing `DateRangePicker` component (`src/components/ui/date-range-picker.tsx`) with a default range of 14 days.

**Rationale**: The backend pattern is already established. The DateRangePicker component exists and uses `useIsMobile()` for responsive behavior. No new components needed.

**Alternatives considered**:
- Fetch all data and filter client-side: Won't scale as shift history grows.
- Pagination instead of date range: Doesn't match the use case (managers think in pay periods, not pages).

## Decision 4: Side Panel Implementation

**Decision**: Use the shadcn `Sheet` component (slide-over from the right edge) on desktop/tablet. On mobile (`useIsMobile()`), retain the existing behavior of navigating to `/employees/[id]`.

**Rationale**: Sheet is already available in the component library and follows the established pattern (e.g., sidebar). The `useIsMobile()` hook is already used throughout the codebase for responsive branching.

**Alternatives considered**:
- Custom drawer component: Unnecessary when Sheet exists.
- Modal/dialog: Too constrained for profile content; Sheet allows natural scrolling.
- Inline expandable row: Disrupts table layout and is harder to implement with DataTable.

## Decision 5: Status Filter Control

**Decision**: Use client-side filtering with a `ToggleGroup` control. The employee list is already fully loaded from `/api/employees`. Add a status filter state defaulting to "Active".

**Rationale**: Small dataset (< 100 employees for a typical POS store). Server-side filtering adds unnecessary complexity. ToggleGroup matches the existing UI patterns (mentioned in CLAUDE.md component patterns).

**Alternatives considered**:
- Server-side `?status=` parameter: Over-engineering for the expected data volume.
- Select dropdown: Less discoverable than visible toggle buttons for 3-4 options.

## Decision 6: Role Presets

**Decision**: Define role presets as a constant map in `src/lib/role-presets.ts`. Pure frontend config — no API or database needed. Each preset maps a name to a set of boolean permission values.

**Rationale**: Presets are predefined and not user-editable (per spec assumptions). A simple constant is the simplest possible implementation. It's used only in the form component to populate toggles.

**Alternatives considered**:
- Database-backed presets: Over-engineering for 3 predefined presets.
- Settings API integration: Adds complexity for something that rarely changes.

## Decision 7: Employment Status Transition Validation

**Decision**: Define a `VALID_TRANSITIONS` map in a shared lib file (`src/lib/employee-status.ts`). Validate in the `PUT /api/employees/[id]` route before updating. The same map is used on the frontend to control which options appear in the status dropdown.

**Rationale**: Single source of truth for transitions. Shared between API validation and UI rendering. Keeps the logic testable independently of either layer.

**Alternatives considered**:
- Frontend-only validation: Insecure; API must enforce business rules.
- Database trigger: PostgreSQL triggers are harder to test and maintain in this stack.
