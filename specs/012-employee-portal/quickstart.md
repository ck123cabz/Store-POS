# Quickstart: Employee Portal

**Feature Branch**: `012-employee-portal`
**Date**: 2026-03-23

## Prerequisites

- Node.js 18+, PostgreSQL running, `.env` configured
- `npm install` completed
- Database seeded (`npx prisma db seed`) with at least one employee linked to a user account

## Quick Setup

```bash
git checkout 012-employee-portal
npm install
npm run dev
```

## What to Build (Build Order)

### Step 1: API — GET /api/my-shift
- New route: `src/app/api/my-shift/route.ts`
- Resolves session user → employee → active shift
- Returns `{ employee, activeShift, isStaleShift }`
- Test: `npm run test:unit` (write contract test first per constitution)

### Step 2: API — POST /api/my-shift/clock-in
- New route: `src/app/api/my-shift/clock-in/route.ts`
- Reuses existing clock-in logic (check for open shift, create ShiftLog)
- Blocks if stale shift exists
- Test: integration test with clock-in/out cycle

### Step 3: API — POST /api/my-shift/clock-out
- New route: `src/app/api/my-shift/clock-out/route.ts`
- Closes active shift, returns shift summary (hours, tasks completed, streak)
- Test: integration test

### Step 4: API — PATCH /api/my-shift/close-stale
- New route: `src/app/api/my-shift/close-stale/route.ts`
- Accepts manual clockOutTime, validates it's after clockIn and in the past
- Test: integration test with stale shift scenario

### Step 5: API — Pagination on GET /api/employees/[id]/shifts
- Modify existing route to support `cursor` + `take` params
- Backward-compatible (no params = full list as before)
- Test: unit test for pagination logic

### Step 6: Frontend — My Shift Portal Page
- New page: `src/app/(dashboard)/my-shift/page.tsx`
- Sections: Clock-in/out hero, active shift timer, tasks (interactive), shift history (paginated)
- State management: fetch `/api/my-shift` on load, derive view state

### Step 7: Frontend — Stale Shift Resolution Dialog
- Modal/dialog when `isStaleShift: true`
- Time picker for actual clock-out time
- Calls `PATCH /api/my-shift/close-stale`

### Step 8: Frontend — Clock-Out Summary Dialog
- Shown after successful clock-out
- Displays hours worked, tasks completed, streak
- Dismiss returns to clock-in state

### Step 9: Sidebar — Add "My Shift" Link
- Edit `src/components/layout/sidebar.tsx`
- Add entry to Management nav group with Clock icon
- `permission: null` (visible to all)

### Step 10: Login Routing
- Edit `src/app/(auth)/login/page.tsx`
- After login, check session: if employee-only user → `router.push("/my-shift")`
- Otherwise → `router.push("/pos")` (existing behavior)

## Key Files

| File | Purpose |
|------|---------|
| `src/app/api/my-shift/route.ts` | New: portal data endpoint |
| `src/app/api/my-shift/clock-in/route.ts` | New: clock-in for current user |
| `src/app/api/my-shift/clock-out/route.ts` | New: clock-out + summary |
| `src/app/api/my-shift/close-stale/route.ts` | New: stale shift resolution |
| `src/app/api/employees/[id]/shifts/route.ts` | Modified: add pagination |
| `src/app/(dashboard)/my-shift/page.tsx` | New: portal page |
| `src/components/layout/sidebar.tsx` | Modified: add "My Shift" link |
| `src/app/(auth)/login/page.tsx` | Modified: role-based redirect |

## Testing

```bash
# Run unit tests for new API logic
npm run test:unit

# Run E2E tests for portal flow
npm run test:e2e

# Smoke test manually
# 1. Login as admin → should go to /pos
# 2. Login as employee-only user → should go to /my-shift
# 3. Clock in → see timer and tasks
# 4. Clock out → see summary
```

## No Schema Changes

No Prisma migrations needed. All data models already exist.
