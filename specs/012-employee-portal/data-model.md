# Data Model: Employee Portal

**Feature Branch**: `012-employee-portal`
**Date**: 2026-03-23

## Existing Models (No Changes Required)

### Employee

Already has all fields needed for the portal:

| Field | Type | Notes |
|-------|------|-------|
| id | Int (PK) | Auto-increment |
| firstName | String | Display name |
| lastName | String | Display name |
| position | String | Shown on portal header |
| hourlyRate | Decimal | For shift cost calculation |
| employmentStatus | String | Active/Inactive/Terminated |
| userId | Int? (FK → User) | Links employee to login account. **This is the key join for portal access.** |

### ShiftLog

Existing model, used for shift history and clock-in/out state:

| Field | Type | Notes |
|-------|------|-------|
| id | Int (PK) | Auto-increment; used as pagination cursor |
| employeeId | Int (FK → Employee) | Scopes shifts to employee |
| date | DateTime | Shift date |
| clockIn | DateTime | Shift start time |
| clockOut | DateTime? | Null = currently clocked in (active shift) |
| breakMinutes | Int | Break deduction |
| shiftTemplateId | Int? (FK) | Optional link to shift template |
| notes | String | Shift notes |

**Active shift detection**: `WHERE employeeId = X AND clockOut IS NULL`

### User

Session data provides permissions for routing logic:

| Field | Purpose for Portal |
|-------|-------------------|
| id | Session identity |
| permProducts, permCategories, permUsers, permSettings, permReports, permAuditLog | If ALL are false → "employee-only" user → auto-route to portal |

### TaskCompletion, EmployeeTask, UserStreak

Reused via existing `/api/dashboard/employee` endpoint. No direct model access from portal code.

## New Models

**None.** No schema changes or migrations required.

## Key Queries

### Portal Page Load (GET /api/my-shift)

```
1. Get session user ID
2. Find Employee WHERE userId = session.user.id
3. Find ShiftLog WHERE employeeId = employee.id AND clockOut IS NULL (active shift)
4. Return { employee, activeShift }
```

### Shift History (GET /api/employees/[id]/shifts + pagination)

```
Existing query + cursor pagination:
  WHERE employeeId = X
  ORDER BY date DESC
  CURSOR: id < lastSeenId
  TAKE: 10
```

### Stale Shift Close (PATCH /api/my-shift/close-stale)

```
1. Get session user → employee
2. Find ShiftLog WHERE employeeId = employee.id AND clockOut IS NULL
3. Validate provided clockOutTime > clockIn
4. Update ShiftLog SET clockOut = provided clockOutTime
```

## State Transitions

### Portal View State (Client-Side)

```
[Not Linked] → User has no employee record → Show "contact manager" message
     ↓
[Not Clocked In] → Employee exists, no active shift → Show Clock In button
     ↓ (Clock In)
[Clocked In] → Active shift exists → Show timer, tasks, Clock Out button
     ↓ (Clock Out)
[Shift Summary] → Transient state → Show hours/tasks/streak summary
     ↓ (Dismiss)
[Not Clocked In] → Back to clock-in state

[Stale Shift] → Active shift from previous day → Show warning + manual clock-out form
     ↓ (Submit actual clock-out time)
[Not Clocked In] → Stale shift closed → Ready for new clock-in
```
