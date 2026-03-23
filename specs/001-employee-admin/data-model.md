# Data Model: Employee Admin Dashboard Completion

**Feature**: 001-employee-admin
**Date**: 2026-03-24

## Schema Changes

**No Prisma schema changes required.** All entities already exist. This feature enhances how existing data is queried, displayed, and validated.

## Entity Reference

### Employee (existing — no changes)

| Field | Type | Notes |
|-------|------|-------|
| id | Int (PK, autoincrement) | |
| firstName | String | Required |
| lastName | String | Required |
| phone | String | Default "" |
| email | String | Default "" |
| position | String | Default "" |
| hourlyRate | Decimal(10,2) | Default 0 |
| employmentStatus | String | "Active", "Inactive", "Terminated" |
| startDate | DateTime | Default now() |
| endDate | DateTime? | Set when terminated |
| userId | Int? (unique, FK → User.id) | Optional link to login account |
| notes | String | Default "" |

**Status Lifecycle** (new validation — not a schema change):
```
Active ↔ Inactive  (free transition)
Active  → Terminated
Inactive → Terminated
Terminated → Active  (rehire)
```
Invalid: Terminated → Inactive (must go through Active)

### User (existing — behavioral change only)

| Field | Type | Change |
|-------|------|--------|
| status | String | **New value**: `"Disabled"` — used to block login when linked employee is non-Active |

The `status` field is free-form. Existing values: `"Logged In_<timestamp>"`, `"Logged Out"`, `""`. New value `"Disabled"` is set/cleared automatically by the employee status change API.

**Auth behavior change**: The `authorize()` function in `src/lib/auth.ts` must check `if (user.status === "Disabled") return null` before password comparison.

### ShiftLog (existing — no changes)

| Field | Type | Notes |
|-------|------|-------|
| id | Int (PK) | |
| employeeId | Int (FK → Employee) | |
| date | DateTime | Shift date |
| clockIn | DateTime | |
| clockOut | DateTime? | null = currently clocked in |
| breakMinutes | Int | Default 0 |
| shiftTemplateId | Int? (FK → ShiftTemplate) | |
| notes | String | |

**Query changes**: Shifts API already supports `?from=&to=` date range params. Stats endpoint will aggregate hours across all active employees for the current period.

### PaymentRecord (existing — query change only)

| Field | Type | Notes |
|-------|------|-------|
| id | Int (PK) | |
| employeeId | Int (FK → Employee) | |
| periodStart | DateTime | |
| periodEnd | DateTime | |
| hoursWorked | Decimal(10,2) | |
| calculatedAmount | Decimal(10,2) | |
| paidAmount | Decimal(10,2) | |
| paidDate | DateTime? | |
| status | String | "Pending", "Partial", "Paid", "Advance" |
| paymentMethod | String | |
| notes | String | |

**Query changes**: Payments GET endpoint needs `?from=&to=` support (currently returns all). Stats endpoint will sum `calculatedAmount` for pending/partial records to compute "Payroll Due".

### Role Preset (new — application config, NOT database)

Defined as a TypeScript constant in `src/lib/role-presets.ts`:

```typescript
interface RolePreset {
  label: string
  permissions: {
    permProducts: boolean
    permCategories: boolean
    permTransactions: boolean
    permUsers: boolean
    permSettings: boolean
    permReports: boolean
    permAuditLog: boolean
    permVoid: boolean
  }
}
```

Predefined presets:
- **Cashier**: permProducts + permTransactions
- **Manager**: all permissions true
- **Kitchen Staff**: permProducts + permCategories

## Relationships (no changes)

```
Employee 1──0..1 User       (userId FK, unique)
Employee 1──*    ShiftLog   (employeeId FK, cascade delete)
Employee 1──*    PaymentRecord (employeeId FK, cascade delete)
ShiftLog  *──0..1 ShiftTemplate (shiftTemplateId FK, set null)
```

## Indexes (no changes needed)

Existing indexes on `ShiftLog(employeeId)`, `ShiftLog(date)`, `PaymentRecord(employeeId)` are sufficient for the date-range queries in this feature.
