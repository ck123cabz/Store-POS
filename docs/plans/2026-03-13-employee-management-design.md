# Employee Management System — Design Document

**Date:** 2026-03-13
**Status:** Approved

## Overview

Add a full Employee Management section under Management in the Store POS sidebar. Employees are separate from Users (can optionally link to a User for system access). The feature covers: employee roster, shift templates + clock in/out logging, hours tracking, and payroll calculation with manual payment recording.

## Data Model

### Employee (new model)

| Field | Type | Notes |
|-------|------|-------|
| id | Int (auto-increment) | PK |
| firstName | String | Required |
| lastName | String | Required |
| phone | String? | Optional |
| email | String? | Optional |
| position | String | e.g. "Server", "Line Cook", "Cashier" |
| hourlyRate | Decimal | Required |
| employmentStatus | String | "Active" / "Inactive" / "Terminated", default "Active" |
| startDate | DateTime | Required |
| endDate | DateTime? | Nullable |
| userId | Int? | Optional FK → User (for employees with system access) |
| notes | String? | Optional text |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

### ShiftTemplate (new model)

| Field | Type | Notes |
|-------|------|-------|
| id | Int (auto-increment) | PK |
| name | String | e.g. "Morning", "Evening", "Night" |
| startTime | String | Time string e.g. "06:00" |
| endTime | String | Time string e.g. "14:00" |
| color | String | Hex color for UI display |
| isActive | Boolean | Default true |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

### ShiftLog (new model)

| Field | Type | Notes |
|-------|------|-------|
| id | Int (auto-increment) | PK |
| employeeId | Int | FK → Employee |
| date | DateTime | The date of the shift |
| clockIn | DateTime | When they clocked in |
| clockOut | DateTime? | Nullable if still clocked in |
| breakMinutes | Int | Default 0, manual entry |
| shiftTemplateId | Int? | Optional FK → ShiftTemplate |
| notes | String? | Optional |
| createdAt | DateTime | Auto |

### PaymentRecord (new model)

| Field | Type | Notes |
|-------|------|-------|
| id | Int (auto-increment) | PK |
| employeeId | Int | FK → Employee |
| periodStart | DateTime | Start of pay period |
| periodEnd | DateTime | End of pay period |
| hoursWorked | Decimal | Calculated sum of hours |
| calculatedAmount | Decimal | hoursWorked × hourlyRate |
| paidAmount | Decimal | Actual amount paid |
| paidDate | DateTime? | Nullable until marked paid |
| status | String | "Pending" / "Paid" / "Advance" / "Partial" |
| paymentMethod | String? | "Cash" / "Bank Transfer" / "Other" |
| notes | String? | For advance explanations, etc. |
| createdAt | DateTime | Auto |

### Settings Additions

| Field | Type | Notes |
|-------|------|-------|
| payPeriodType | String | "custom" / "weekly" / "bi-weekly" / "monthly", default "custom" |
| payPeriodStartDay | Int | 1=Monday ... 7=Sunday, default 1 |

## Pages & Navigation

### Sidebar
- New item under Management: **Employees** (`/employees`)
- Permission: reuse `permUsers`

### Routes

| Route | Purpose |
|-------|---------|
| `/employees` | Dashboard + employee list (toggle view) |
| `/employees/[id]` | Employee detail page |

### Dashboard View (`/employees` default)
- 4 summary cards: Active Employees, Hours This Period, Payroll Due, Pending Payments
- Currently Clocked In panel (live list)
- Today's Shifts panel (shift template assignments for today)

### Employee List View
- Table: Name + phone, Position, Status badge, Rate/hr, Hours (period), Actions (view/edit)
- Search bar + Add Employee button
- Click row → detail page

### Employee Detail (`/employees/[id]`)
- Breadcrumb: Employees / {Name}
- Profile card: avatar, name, position, rate, start date, status, Edit + Clock In buttons
- Two-column layout:
  - Left: Recent Shifts (date, template, clock in/out times, hours)
  - Right: Hours Summary (total, shifts, avg, calculated pay) + Payment History

### Settings Additions
- New "Payroll" section: pay period type dropdown, pay period start day dropdown
- New "Shift Templates" section: list with color dot, name, times, active badge, edit/delete

## Key Interactions

### Adding an Employee
- Dialog form: first name, last name, position, hourly rate, phone, email, start date, notes
- Optional: link to existing User (dropdown of unlinked users)

### Clock In/Out
- "Clock In" creates ShiftLog with clockIn = now, optional shift template selection
- "Clock Out" completes the record
- Manual entry supported for past shifts

### Payment Flow
1. Select date range → auto-calculate hours & amount owed
2. "Record Payment" → enter amount, method, date, notes
3. Status auto-determined: full = "Paid", partial = "Partial", pre-period = "Advance"

### Calculated Fields
- `hoursWorked` = sum of `(clockOut - clockIn - breakMinutes)` for shifts in period
- `calculatedAmount` = `hoursWorked × employee.hourlyRate`
- Dashboard "Payroll Due" = sum of all unpaid calculated amounts

### Audit Trail
- Employee create/edit/delete → audit log
- Payment records → audit log
- Clock in/out not logged (ShiftLog is its own record)

## API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/employees` | List employees (with query filters) |
| POST | `/api/employees` | Create employee |
| GET | `/api/employees/[id]` | Get employee detail |
| PUT | `/api/employees/[id]` | Update employee |
| DELETE | `/api/employees/[id]` | Delete employee |
| POST | `/api/employees/[id]/clock-in` | Clock in |
| POST | `/api/employees/[id]/clock-out` | Clock out |
| GET | `/api/employees/[id]/shifts` | Get shift logs |
| POST | `/api/employees/[id]/shifts` | Manual shift entry |
| GET | `/api/employees/[id]/payments` | Get payment records |
| POST | `/api/employees/[id]/payments` | Record payment |
| GET | `/api/shift-templates` | List shift templates |
| POST | `/api/shift-templates` | Create template |
| PUT | `/api/shift-templates/[id]` | Update template |
| DELETE | `/api/shift-templates/[id]` | Delete template |

## UI Prototype
Pencil MCP prototype created with 4 screens:
1. Employee Dashboard
2. Employee List
3. Employee Detail
4. Settings — Payroll & Shift Templates
