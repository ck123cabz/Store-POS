# API Contracts: Employee Admin Dashboard Completion

**Feature**: 001-employee-admin
**Date**: 2026-03-24

All endpoints require authenticated session with `permUsers` permission (existing behavior).

---

## Modified Endpoints

### GET /api/employees/stats

**Change**: Add `hoursThisPeriod`, `payrollDue` fields to response.

**Current response**:
```json
{
  "activeCount": 5,
  "clockedIn": [...],
  "todayShifts": [...],
  "pendingPayments": 2
}
```

**New response**:
```json
{
  "activeCount": 5,
  "clockedIn": [...],
  "todayShifts": [...],
  "pendingPayments": 2,
  "hoursThisPeriod": 142.5,
  "payrollDue": 2137.50
}
```

- `hoursThisPeriod`: Sum of completed shift hours for all active employees in the last 14 days. Decimal, rounded to 1 place.
- `payrollDue`: Sum of `calculatedAmount` from PaymentRecords with status "Pending" or "Partial". Decimal, rounded to 2 places.

---

### PUT /api/employees/[id]

**Change**: Add status transition validation and automatic user account management.

**New behavior**:
1. If `employmentStatus` is changing, validate against allowed transitions:
   - Active → Inactive, Terminated
   - Inactive → Active, Terminated
   - Terminated → Active
   - Any other transition → `400 { error: "Invalid status transition from {old} to {new}" }`
2. If employee has an active shift (clockOut = null) and status is changing away from Active → `400 { error: "Cannot change status while employee has an active shift. Please clock out first." }`
3. If status changes and employee has a linked user account:
   - Changing away from Active → set User.status = "Disabled"
   - Changing to Active → set User.status = "Logged Out" (clears disabled state)
4. Log status change to audit trail with old/new values via `logAudit({ action: "status_change", changes: { employmentStatus: { old, new } } })`

**Error responses** (new):
- `400 { error: "Invalid status transition from Terminated to Inactive" }`
- `400 { error: "Cannot change status while employee has an active shift. Please clock out first." }`

---

### GET /api/employees/[id]/payments

**Change**: Add optional `from` and `to` query parameters for date filtering.

**Current**: Returns all payments for the employee, ordered by `createdAt` desc.

**New query parameters**:
- `from` (optional, ISO date string): Filter payments where `periodStart >= from`
- `to` (optional, ISO date string): Filter payments where `periodEnd <= to`

**Behavior**: When params are omitted, returns all payments (backwards compatible).

---

## Unchanged Endpoints (reference)

| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/employees` | GET | No changes needed |
| `/api/employees` | POST | No changes needed |
| `/api/employees/[id]` | GET | No changes needed |
| `/api/employees/[id]` | DELETE | No changes needed |
| `/api/employees/[id]/shifts` | GET | Already has `?from=&to=` support |
| `/api/employees/[id]/shifts` | POST | No changes needed |
| `/api/employees/[id]/payments` | POST | No changes needed |
| `/api/employees/[id]/clock-in` | POST | No changes needed |
| `/api/employees/[id]/clock-out` | POST | No changes needed |
| `/api/users` | GET, POST | No changes needed |
| `/api/users/[id]` | GET, PUT, DELETE | No changes needed |

---

## Auth Change

### authorize() in src/lib/auth.ts

**Change**: Add disabled account check before password comparison.

**New behavior**: After finding the user by username and before checking password:
```
if (user.status === "Disabled") return null
```

This silently rejects login for disabled accounts (same UX as wrong password — no information leak about account state).
