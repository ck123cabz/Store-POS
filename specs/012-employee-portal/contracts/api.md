# API Contracts: Employee Portal

**Feature Branch**: `012-employee-portal`
**Date**: 2026-03-23

## New Endpoints

### GET /api/my-shift

Returns the current user's employee record, active shift, and summary stats for the portal page.

**Auth**: Required (session)

**Response 200** (user is linked to employee):
```json
{
  "employee": {
    "id": 3,
    "firstName": "Christian",
    "lastName": "Pats",
    "position": "Line Cook",
    "hourlyRate": "15.00",
    "employmentStatus": "Active"
  },
  "activeShift": {
    "id": 42,
    "clockIn": "2026-03-23T08:00:00.000Z",
    "clockOut": null,
    "shiftTemplate": { "name": "Morning", "color": "#3B82F6" },
    "notes": ""
  },
  "isStaleShift": false
}
```

**Response 200** (no active shift):
```json
{
  "employee": { ... },
  "activeShift": null,
  "isStaleShift": false
}
```

**Response 200** (stale shift from previous day):
```json
{
  "employee": { ... },
  "activeShift": {
    "id": 41,
    "clockIn": "2026-03-22T17:00:00.000Z",
    "clockOut": null,
    ...
  },
  "isStaleShift": true
}
```

**Response 200** (user not linked to employee):
```json
{
  "employee": null,
  "activeShift": null,
  "isStaleShift": false
}
```

**Response 401**: `{ "error": "Unauthorized" }`

---

### POST /api/my-shift/clock-in

Clocks in the current user's linked employee. Convenience wrapper around existing clock-in logic.

**Auth**: Required (session, user must be linked to employee)

**Request body** (optional):
```json
{
  "shiftTemplateId": 1,
  "notes": "Opening shift"
}
```

**Response 201**:
```json
{
  "id": 43,
  "employeeId": 3,
  "date": "2026-03-23T00:00:00.000Z",
  "clockIn": "2026-03-23T08:00:00.000Z",
  "clockOut": null,
  "breakMinutes": 0,
  "notes": "Opening shift"
}
```

**Response 400**: `{ "error": "Already clocked in" }`
**Response 400**: `{ "error": "Must close stale shift before clocking in" }`
**Response 404**: `{ "error": "No linked employee record" }`
**Response 401**: `{ "error": "Unauthorized" }`

---

### POST /api/my-shift/clock-out

Clocks out the current user's linked employee. Returns shift summary for the clock-out screen.

**Auth**: Required (session, user must be linked to employee)

**Request body** (optional):
```json
{
  "breakMinutes": 30,
  "notes": "Closing shift"
}
```

**Response 200**:
```json
{
  "shift": {
    "id": 43,
    "clockIn": "2026-03-23T08:00:00.000Z",
    "clockOut": "2026-03-23T16:30:00.000Z",
    "breakMinutes": 30,
    "hoursWorked": 8.0
  },
  "summary": {
    "tasksCompletedToday": 5,
    "tasksTotal": 7,
    "currentStreak": 12
  }
}
```

**Response 400**: `{ "error": "Not clocked in" }`
**Response 404**: `{ "error": "No linked employee record" }`
**Response 401**: `{ "error": "Unauthorized" }`

---

### PATCH /api/my-shift/close-stale

Closes a stale (unclosed) shift with a manually entered clock-out time.

**Auth**: Required (session, user must be linked to employee)

**Request body**:
```json
{
  "clockOutTime": "2026-03-22T22:30:00.000Z"
}
```

**Validation**:
- `clockOutTime` must be after the shift's `clockIn` time
- `clockOutTime` must be in the past (not future)

**Response 200**:
```json
{
  "id": 41,
  "clockIn": "2026-03-22T17:00:00.000Z",
  "clockOut": "2026-03-22T22:30:00.000Z",
  "hoursWorked": 5.5
}
```

**Response 400**: `{ "error": "Clock out time must be after clock in time" }`
**Response 400**: `{ "error": "No stale shift found" }`
**Response 404**: `{ "error": "No linked employee record" }`
**Response 401**: `{ "error": "Unauthorized" }`

---

## Modified Endpoints

### GET /api/employees/[id]/shifts (add pagination)

**New query parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| cursor | number | - | Shift ID to paginate after (exclusive) |
| take | number | - | Number of shifts to return (max 50) |

**Response 200** (when cursor/take provided):
```json
{
  "shifts": [ ... ],
  "nextCursor": 35,
  "hasMore": true
}
```

**Backward compatibility**: When `cursor`/`take` are not provided, response remains the flat array `[...]` as today.

---

## Existing Endpoints (Reused, No Changes)

| Endpoint | Usage in Portal |
|----------|----------------|
| `GET /api/dashboard/employee` | Task list, streak, leaderboard, alerts |
| `POST /api/tasks/[id]/start` | Start task inline from portal |
| `POST /api/tasks/[id]/complete` | Complete task inline from portal |
