# Research: Employee Portal

**Feature Branch**: `012-employee-portal`
**Date**: 2026-03-23

## Research Findings

### R1: Post-Login Routing Mechanism

**Decision**: Client-side redirect in the login page based on session user permissions and employee linkage.

**Rationale**: The login page (`src/app/(auth)/login/page.tsx`) currently hard-codes `router.push("/pos")` after successful sign-in. No middleware exists for auth routing. The simplest approach is to check the user's permissions and employee linkage after login, then route accordingly. This avoids introducing middleware complexity.

**Alternatives considered**:
- NextAuth `redirect` callback — rejected because it runs server-side during OAuth flow but credentials provider uses `redirect: false` client-side.
- Next.js middleware — rejected because it adds a new layer that doesn't exist in the codebase. Over-engineering for a single redirect condition.

### R2: Employee Record Lookup for Current User

**Decision**: New API endpoint `GET /api/my-shift` that returns the current user's employee record and active shift status in one call.

**Rationale**: The portal page needs to know: (1) is the current user linked to an employee? (2) what is their employee ID? (3) do they have an active shift? Currently, there's no endpoint that resolves "current session user → employee record." Existing endpoints require the employee ID upfront (`/api/employees/[id]`). A dedicated endpoint avoids multiple round-trips on page load.

**Alternatives considered**:
- Client-side: fetch `/api/users`, find current user, then fetch employee by userId — rejected because it's 2-3 sequential requests.
- Extend NextAuth session to include `employeeId` — rejected because it requires schema changes to the session/JWT and makes the token heavier for all users.

### R3: Stale Shift Resolution (Manual Clock-Out Time)

**Decision**: New endpoint `PATCH /api/my-shift/close-stale` that accepts a `clockOutTime` from the employee to close an unclosed shift with a past timestamp.

**Rationale**: The existing clock-out endpoint (`POST /api/employees/[id]/clock-out`) always sets `clockOut: now`. For stale shifts, the employee needs to enter their actual departure time. A separate endpoint is clearer than adding optional parameters to the existing clock-out flow.

**Alternatives considered**:
- Add optional `clockOut` parameter to existing clock-out endpoint — rejected because it changes the semantics of an existing endpoint that other code may depend on.
- Admin-only resolution — rejected per clarification session (employees self-resolve).

### R4: Shift History Pagination

**Decision**: Cursor-based pagination on the existing `/api/employees/[id]/shifts` endpoint using `cursor` and `take` query parameters.

**Rationale**: The existing endpoint returns all shifts with optional date filtering. Adding `cursor` (last shift ID) and `take` (page size, default 10) parameters follows Prisma's native cursor pagination pattern and is backward-compatible (existing callers that don't pass these params get all results as before).

**Alternatives considered**:
- Offset-based pagination — works but cursor is more efficient for large datasets and aligns with Prisma patterns.
- New endpoint — rejected; the existing endpoint just needs pagination params.

### R5: Reusing Task Dashboard Data

**Decision**: Reuse the existing `/api/dashboard/employee` endpoint for the portal's task section. Task actions (start/complete) use existing `/api/tasks/[id]/start` and `/api/tasks/[id]/complete` endpoints.

**Rationale**: The dashboard endpoint already returns formatted tasks with status, streak info, leaderboard, and alerts — exactly what the portal needs. No new task API is required.

**Alternatives considered**:
- New portal-specific task endpoint — rejected; the existing endpoint returns all needed data and is already optimized with parallel queries.

### R6: Sidebar Integration

**Decision**: Add a "My Shift" entry to the sidebar's Management nav group, with `permission: null` (visible to all users) and a `Clock` icon. Route: `/my-shift`.

**Rationale**: The sidebar at `src/components/layout/sidebar.tsx` uses a declarative `navGroups` array. Adding one entry is a one-line change. Using `permission: null` ensures all users (including employees without admin perms) can see the link.

**Alternatives considered**:
- Replace existing "Tasks" link — rejected; Tasks (`/employee`) and My Shift (`/my-shift`) serve different purposes. Tasks is the team-level task dashboard; My Shift is the personal portal.
