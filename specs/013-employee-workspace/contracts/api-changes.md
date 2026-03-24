# API Contracts: Employee Admin Unified Workspace

**Branch**: `013-employee-workspace`

## Existing Endpoints (No Changes)

All existing endpoints are consumed as-is by the new workspace UI:

| Endpoint | Used By Tab | Notes |
|----------|-------------|-------|
| `GET /api/employees` | Team | Employee list with `?status=` filter |
| `GET /api/employees/[id]` | Team (detail) | Single employee profile |
| `PUT /api/employees/[id]` | Team (detail) | Edit employee |
| `DELETE /api/employees/[id]` | Team (detail) | Delete employee |
| `GET /api/employees/stats` | Today | Dashboard summary (clockedIn, hours, payroll, shifts) |
| `GET /api/employees/[id]/shifts` | Team (detail), Payroll | Shift history with `?from=&to=` |
| `POST /api/employees/[id]/shifts` | Team (detail) | Add manual shift |
| `GET /api/employees/[id]/payments` | Team (detail), Payroll | Payment history with `?from=&to=` |
| `POST /api/employees/[id]/payments` | Team (detail), Payroll | Record payment |
| `POST /api/employees/[id]/clock-in` | Team (detail), Today | Admin clock-in |
| `POST /api/employees/[id]/clock-out` | Team (detail), Today | Admin clock-out |
| `GET /api/shift-templates` | Schedule, Today | List templates |
| `POST /api/shift-templates` | Schedule | Create template |
| `PUT /api/shift-templates/[id]` | Schedule | Update template |
| `DELETE /api/shift-templates/[id]` | Schedule | Delete template |
| `GET /api/tasks` | Tasks | List all tasks |
| `POST /api/tasks` | Tasks | Create task |
| `GET /api/tasks/today` | Today, Tasks | Today's tasks with status |
| `PUT /api/tasks/[id]` | Tasks | Update task |
| `DELETE /api/tasks/[id]` | Tasks | Soft-delete task |
| `POST /api/tasks/[id]/approve` | Tasks | Approve pending task |
| `POST /api/tasks/[id]/reject` | Tasks | Reject pending task |

## New Endpoints

### GET /api/employees/reports

**Purpose**: Server-side aggregation for the Reports tab. Returns all six report datasets in one request.

**Query Parameters**:
- `from` (ISO date string, required) — Period start
- `to` (ISO date string, required) — Period end

**Response** (200):
```json
{
  "hoursByEmployee": [
    { "employeeId": 1, "name": "Jane Doe", "position": "Cashier", "hours": 42.5 }
  ],
  "laborCostByPosition": [
    { "position": "Cashier", "totalCost": 870.0, "percentage": 42 }
  ],
  "taskCompletionRates": [
    { "employeeId": 1, "name": "Jane Doe", "completed": 28, "total": 30, "rate": 93.3 }
  ],
  "streakLeaderboard": [
    { "userId": 1, "name": "Jane Doe", "currentStreak": 14, "longestStreak": 21 }
  ],
  "paymentSummary": {
    "totalPaid": 1440.0,
    "totalPending": 697.5,
    "totalAmount": 2137.5
  },
  "attendancePatterns": [
    {
      "templateId": 1,
      "templateName": "Morning Shift",
      "avgClockInMinutes": 472,
      "lateCount": 3
    }
  ],
  "teamAvgHours": 35.6
}
```

**Error Responses**:
- `400 { "error": "Missing required query parameters: from, to" }`
- `400 { "error": "Invalid date format" }`

**Implementation Notes**:
- `hoursByEmployee`: `GROUP BY employeeId` on ShiftLog, calculate hours from clockIn/clockOut/breakMinutes
- `laborCostByPosition`: Join Employee.position with ShiftLog hours × Employee.hourlyRate
- `taskCompletionRates`: Count TaskCompletion where status="completed" per completedById
- `streakLeaderboard`: Read UserStreak ordered by currentStreak DESC
- `paymentSummary`: Sum PaymentRecord by status within date range
- `attendancePatterns`: Compare ShiftLog.clockIn time to ShiftTemplate.startTime; late = clockIn > startTime + 15min

---

### GET /api/shift-templates/week-overview

**Purpose**: Aggregated shift assignment counts per template per day for the Schedule tab's weekly grid.

**Query Parameters**:
- `weekStart` (ISO date string, required) — Monday of the target week

**Response** (200):
```json
{
  "weekStart": "2026-03-17",
  "weekEnd": "2026-03-23",
  "grid": [
    {
      "templateId": 1,
      "templateName": "Morning Shift",
      "color": "#3B82F6",
      "days": [4, 4, 3, 4, 4, 2, 1]
    },
    {
      "templateId": 2,
      "templateName": "Evening Shift",
      "color": "#22C55E",
      "days": [3, 3, 3, 3, 3, 2, 1]
    }
  ],
  "totals": [7, 7, 6, 7, 7, 4, 2]
}
```

**Error Responses**:
- `400 { "error": "Missing required query parameter: weekStart" }`
- `400 { "error": "Invalid date format" }`

**Implementation Notes**:
- Query ShiftLog records where `date` falls within the 7-day range
- Group by `shiftTemplateId` and day-of-week
- `days` array index: 0=Monday, 1=Tuesday, ..., 6=Sunday
- Include all active templates even if they have 0 shifts that week (show zeros)
- `totals` is the column sum across all templates

---

### GET /api/employees/[id]/stale-shifts (extension to existing stats)

**Note**: Stale shift detection already exists in `/api/my-shift` (`isStaleShift` flag). For the Today tab alerts, the `/api/employees/stats` endpoint already returns `clockedIn` which includes all open shifts. The UI can detect stale shifts by checking if `clockIn` date < today. No new endpoint needed — just client-side filtering of the existing stats response.

## Route Changes

### /employees/[id]/page.tsx → Redirect

The existing detail page at `src/app/(dashboard)/employees/[id]/page.tsx` will be replaced with a redirect component:

```
GET /employees/3 → 307 Redirect → /employees?tab=team&id=3
```

This preserves all existing links (sidebar, employee portal "View Profile" link, bookmarks).
