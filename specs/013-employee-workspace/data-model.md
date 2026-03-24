# Data Model: Employee Admin Unified Workspace

**Branch**: `013-employee-workspace`
**Status**: No new models required — all entities already exist in Prisma schema

## Existing Models (No Changes)

### Employee
| Field | Type | Notes |
|-------|------|-------|
| id | Int (PK, auto) | |
| firstName | String | |
| lastName | String | |
| phone | String | Default "" |
| email | String | Default "" |
| position | String | Default "" |
| hourlyRate | Decimal(10,2) | Default 0 |
| employmentStatus | String | "Active" / "Inactive" / "Terminated" |
| startDate | DateTime | Default now |
| endDate | DateTime? | Set on termination |
| userId | Int? (unique) | Links to User for login |
| notes | String | Default "" |

**Relations**: `user User?`, `shifts ShiftLog[]`, `payments PaymentRecord[]`

### ShiftLog
| Field | Type | Notes |
|-------|------|-------|
| id | Int (PK, auto) | |
| employeeId | Int (FK) | Cascade delete |
| date | DateTime | Shift date |
| clockIn | DateTime | |
| clockOut | DateTime? | Null = currently clocked in |
| breakMinutes | Int | Default 0 |
| shiftTemplateId | Int? (FK) | SetNull on template delete |
| notes | String | Default "" |

**Relations**: `employee Employee`, `shiftTemplate ShiftTemplate?`
**Indexes**: `employeeId`, `date`

### ShiftTemplate
| Field | Type | Notes |
|-------|------|-------|
| id | Int (PK, auto) | |
| name | String | e.g. "Morning Shift" |
| startTime | String | "HH:MM" format |
| endTime | String | "HH:MM" format |
| color | String | Hex color, default "#3B82F6" |
| isActive | Boolean | Default true |

**Relations**: `shifts ShiftLog[]`

### PaymentRecord
| Field | Type | Notes |
|-------|------|-------|
| id | Int (PK, auto) | |
| employeeId | Int (FK) | Cascade delete |
| periodStart | DateTime | Pay period start |
| periodEnd | DateTime | Pay period end |
| hoursWorked | Decimal(10,2) | Auto-calculated from shifts |
| calculatedAmount | Decimal(10,2) | hoursWorked × hourlyRate |
| paidAmount | Decimal(10,2) | Actually paid |
| paidDate | DateTime? | |
| status | String | "Pending" / "Partial" / "Paid" / "Advance" |
| paymentMethod | String | "Cash" / "Bank Transfer" / "Other" |
| notes | String | Default "" |

**Relations**: `employee Employee`

### EmployeeTask
| Field | Type | Notes |
|-------|------|-------|
| id | Int (PK, auto) | |
| name | String | Task name |
| type | String | "action" / "inventory" / "custom" |
| description | String? | |
| icon | String | Default "📋" |
| sortOrder | Int | Display ordering |
| deadlineTime | String | "HH:MM" format |
| deadlineType | String | Default "daily" |
| daysOfWeek | Int[] | Array of 0-6 (Sun-Sat) |
| assignmentType | String | "anyone" or "specific" |
| assignedToId | Int? (FK) | Specific user assignment |
| allowDelegation | Boolean | Default false |
| required | Boolean | Default false |
| streakBreaking | Boolean | Default false |
| status | String | "pending" / "approved" / "rejected" |
| createdById | Int (FK) | |
| approvedById | Int? (FK) | |
| rejectionNote | String? | |
| isActive | Boolean | Soft delete flag |

**Relations**: `completions TaskCompletion[]`, `createdBy User`, `approvedBy User?`, `assignedTo User?`

### TaskCompletion
| Field | Type | Notes |
|-------|------|-------|
| id | Int (PK, auto) | |
| date | Date | Unique with taskId |
| taskId | Int (FK) | |
| taskName | String | Denormalized for history |
| taskType | String | Denormalized |
| status | String | "pending" / "in_progress" / "completed" / "missed" |
| startedAt | DateTime? | |
| completedAt | DateTime? | |
| completedById | Int? (FK) | |
| completedByName | String? | Denormalized |
| deadlineTime | String | |
| wasOnTime | Boolean? | |
| data | Json? | Task-specific completion data |

**Unique**: `[date, taskId]`
**Relations**: `task EmployeeTask`, `completedBy User?`

### UserStreak
| Field | Type | Notes |
|-------|------|-------|
| id | Int (PK, auto) | |
| userId | Int (unique FK) | |
| userName | String | Denormalized |
| currentStreak | Int | Default 0 |
| longestStreak | Int | Default 0 |
| lastCompletedDate | Date? | |
| streakStartedDate | Date? | |
| milestones | Json | Array of achieved threshold days |

**Relations**: `user User`

## State Transitions

### Employee Status
```
Active → Inactive, Terminated
Inactive → Active, Terminated
Terminated → Active
```
Enforced by `src/lib/employee-status.ts` on both API and UI. Status change blocked if employee has an active (open) shift.

### Task Approval Status
```
pending → approved (by manager with permUsers)
pending → rejected (by manager with permUsers, with optional note)
```
Tasks created by users with `permUsers` are auto-approved.

### Task Completion Status
```
pending → in_progress (via /start)
in_progress → completed (via /complete)
(missed is set by system when date passes without completion)
```

### Payment Status
```
Auto-determined on creation:
- Paid: paidAmount >= calculatedAmount
- Partial: 0 < paidAmount < calculatedAmount
- Pending: paidAmount = 0
- Advance: explicitly set by user
```

## Migration Impact

**None** — No Prisma schema changes required. All models exist and are production-ready.
