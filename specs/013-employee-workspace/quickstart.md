# Quickstart: Employee Admin Unified Workspace

**Branch**: `013-employee-workspace`

## Prerequisites

- Node.js, PostgreSQL running, database seeded (`npx prisma db seed`)
- Development server at `http://localhost:3000`
- Default login: admin/admin

## Integration Scenario 1: Tab Navigation

1. Navigate to `/employees`
2. Verify default tab is "Today"
3. Click each tab header: Today → Team → Schedule → Tasks → Payroll → Reports
4. Verify URL updates to `?tab=team`, `?tab=schedule`, etc.
5. Use browser back/forward — tabs should restore correctly
6. On mobile viewport (<768px), verify bottom navigation bar appears

## Integration Scenario 2: Split View CRM

1. Navigate to `/employees?tab=team`
2. Verify full-width employee table with Name, Position, Status, Hours, Rate columns
3. Click an employee row — list compresses left, detail panel opens right
4. Verify URL updates to `?tab=team&id=<employeeId>`
5. Click a different employee in the compressed list — detail updates, list doesn't scroll
6. Switch between Overview / Shifts / Payments / Tasks / Activity sub-tabs
7. Click outside or press Escape — split view closes, list returns to full width

## Integration Scenario 3: Today Tab Real-Time

1. Navigate to `/employees` (default Today tab)
2. Verify 4 summary cards: Clocked In, Hours Today, Tasks Done, Alerts
3. Clock in an employee from another browser tab
4. Wait 30 seconds — Clocked In count should increment
5. If a stale shift exists, verify amber alert with "Resolve" button
6. Click "Resolve" — set clock-out time dialog appears

## Integration Scenario 4: Payroll Flow

1. Navigate to `/employees?tab=payroll`
2. Select "14d" preset — summary cards and table populate
3. Verify Total Hours = sum of all employee hours in table
4. Verify Labor Cost = sum of all Calculated Pay column
5. Click an employee row with "Pending" status
6. Record Payment dialog opens pre-filled with hours and calculated amount
7. Submit payment — status updates to "Paid"

## Integration Scenario 5: Task Management

1. Navigate to `/employees?tab=tasks`
2. Click "New Task" — fill in name, type, deadline, assignment
3. Task appears in list (auto-approved if you have permUsers)
4. From employee portal (/my-shift), start and complete a task
5. Return to Tasks tab — task shows "Done" status for today
6. Filter by "Pending Approval" — only pending tasks visible

## Integration Scenario 6: Schedule Management

1. Navigate to `/employees?tab=schedule`
2. Click "New Template" — create "Weekend Short" with 9:00-13:00 and yellow color
3. Template appears in list with color swatch and "4 hours" duration
4. View week overview grid — verify employee counts match shift assignments
5. Navigate to previous/next week — grid updates

## Integration Scenario 7: Legacy Route Redirect

1. Navigate to `/employees/3` (old detail page URL)
2. Verify redirect to `/employees?tab=team&id=3`
3. Employee #3 should be selected in the split view

## Integration Scenario 8: Mobile Experience

1. Resize to mobile viewport (<768px)
2. Verify bottom navigation bar with 6 tab icons
3. Tap Team tab — full-width employee list
4. Tap an employee — full-screen detail with back arrow
5. Tap "Record Payment" — bottom sheet slides up (not centered dialog)
6. Press back — returns to employee list

## Key Files to Verify

- `src/app/(dashboard)/employees/page.tsx` — main workspace page
- `src/app/(dashboard)/employees/[id]/page.tsx` — redirect to workspace
- `src/components/employees/workspace/*.tsx` — tab components
- `src/app/api/employees/reports/route.ts` — new reports aggregation endpoint
- `src/app/api/shift-templates/week-overview/route.ts` — new schedule grid endpoint
