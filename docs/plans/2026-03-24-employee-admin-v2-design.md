# Employee Admin v2 — Unified Workspace Redesign

**Date:** 2026-03-24
**Status:** Design Complete — Ready for Implementation
**Pencil Prototype:** `official-store-pos.pen` (bottom of canvas, label "Employee Admin — Reimagined (v2)")

---

## Problem

The current employee admin has fragmented UX:
- Dashboard and list views are disconnected (toggle switch)
- Side panel is a half-measure — too narrow for real CRM work
- Detail page tries to do everything in one scroll
- No admin UI for shift templates, task management, or team-wide payroll
- Several existing API endpoints have no corresponding UI

## Solution

A unified **tabbed workspace** at `/employees` with 6 top-level tabs, a **split-view CRM** for the Team tab, and **mobile-first adaptation** with bottom navigation.

---

## Architecture

### URL Structure

Single page component with query params (not nested routes):
```
/employees                    → Today tab (default)
/employees?tab=team           → Team tab (full table)
/employees?tab=team&id=3      → Team tab with split view, employee #3 selected
/employees?tab=schedule       → Schedule tab
/employees?tab=tasks          → Tasks tab
/employees?tab=payroll        → Payroll tab
/employees?tab=reports        → Reports tab
```

**Why query params:** Split view needs employee list + detail to coexist in one component tree. Separate routes would force full re-renders and lose list scroll position.

### Component Tree

```
EmployeesPage
├── PageHeader ("Employees" + primary CTA)
├── TabBar (Today | Team | Schedule | Tasks | Payroll | Reports)
└── TabContent
    ├── TodayTab
    │   ├── StatCards (4: Clocked In, Hours Today, Tasks Done, Alerts)
    │   ├── ClockedInPanel + TaskBoard (2-col)
    │   └── TodayShiftsBar
    ├── TeamTab
    │   ├── Toolbar (Search + StatusFilter toggle group)
    │   ├── EmployeeTable (full width when no selection)
    │   └── SplitView (when employee selected)
    │       ├── CompressedList (260px, avatar + name + status dot)
    │       └── DetailPanel
    │           ├── ProfileHeader (avatar, name, meta, status, edit)
    │           ├── SubTabBar (Overview | Shifts | Payments | Tasks | Activity)
    │           └── SubTabContent
    ├── ScheduleTab
    │   ├── ShiftTemplateList (CRUD cards with color swatches)
    │   └── WeekOverviewGrid (shift × day heatmap)
    ├── TasksTab
    │   ├── FilterPills (All | Pending | Active)
    │   ├── TaskList (status icons, metadata, assignment)
    │   └── ApprovalQueue (sidebar with Approve/Reject buttons)
    ├── PayrollTab
    │   ├── DateRangePicker (with presets: 7d, 14d, 30d, Month)
    │   ├── SummaryCards (4: Total Hours, Labor Cost, Paid, Pending)
    │   └── PayrollTable (employee rows with status badges + footer total)
    └── ReportsTab
        ├── DateRangePicker (with presets: 14d, Month, Quarter)
        └── ReportGrid (2×3)
            ├── HoursByEmployee
            ├── LaborCostBreakdown
            ├── TaskCompletionRates
            ├── StreakLeaderboard
            ├── PaymentHistory
            └── AttendancePatterns
```

---

## Tab Details

### 1. Today (Default Landing)

**Purpose:** Real-time operations — "What needs my attention right now?"

| Element | Data Source | Notes |
|---------|-----------|-------|
| Clocked In count | `/api/employees/stats` | Green pulse dot |
| Hours Today | ShiftLog aggregation | All employees, today |
| Tasks Done | `/api/tasks/today` | Ratio format: "8 / 12" |
| Alerts | Stale shifts query | Amber border, warning icon |
| Clocked In list | `/api/employees/stats` | Avatar, name, position, shift, clock-in time |
| Stale Shifts | ShiftLog where clockOut IS NULL AND date < today | "Resolve" button → set explicit clock-out |
| Task Board | `/api/tasks/today` | Status icons: circle (pending), loader (in progress), circle-check (done) |
| Today's Shifts | `/api/shift-templates` + todayShifts | Color dots, time range, assignment count |

### 2. Team (Split View CRM)

**No Selection State:** Full-width data table with columns: Name (+ email), Position, Status badge, Hours (14d), Rate/hr. Status filter toggle group (Active/Inactive/Terminated/All).

**Selection State:** List compresses to 260px (avatar + name + status dot). Detail panel fills remaining width with 5 sub-tabs:

| Sub-tab | Content |
|---------|---------|
| **Overview** | 3 stat cards (Hours 14d, Task Rate %, Streak days) + Contact info + Account info |
| **Shifts** | DateRangePicker, shift list with hours, hours summary card, clock in/out, add manual shift |
| **Payments** | Payment history with status badges, record payment with auto-calc |
| **Tasks** | Assigned tasks, completion history, on-time %, pending approvals |
| **Activity** | Audit log timeline: status changes, payments, clock events |

**Split View Behavior:**
- Smooth width animation on selection
- List scroll position preserved
- Selected employee highlighted with accent background
- Clicking employee name in any other tab navigates to Team tab with that employee selected

### 3. Schedule

**Purpose:** Shift template CRUD — currently has API endpoints but **no management UI**.

- **Template list:** Name, color swatch, time range, calculated duration, Edit button
- **Create dialog:** Name, start/end time, color picker
- **Week overview grid:** Heatmap showing employee count per shift template per day. Navigable by week. Built from ShiftLog joined to ShiftTemplate.
- **New query needed:** Aggregate ShiftLog by shiftTemplateId + date for selected week

### 4. Tasks

**Purpose:** Task management for admins — currently only visible in employee self-service portal.

- **Task list:** All EmployeeTasks with type badge, deadline, assignment, schedule, today's completion status
- **Filter pills:** All / Pending Approval / Active
- **Create task dialog:** Name, type, description, deadline time, days of week, assignment, required flag, streak-breaking flag
- **Approval queue:** Tasks with `status: "pending"` — inline Approve/Reject with optional rejection note
- **Endpoints:** `/api/tasks` (CRUD), `/api/tasks/today`, `/api/tasks/[id]/approve`, `/api/tasks/[id]/reject` — all existing

### 5. Payroll

**Purpose:** Team-wide payroll management instead of employee-by-employee.

- **Date range picker** controls entire view
- **4 summary cards:** Total Hours, Labor Cost, Paid (green border), Pending (amber border)
- **Payroll table:** All active employees with hours, calculated pay, payment status. Sorted pending-first.
- **Inline payment:** Click row → Record Payment dialog pre-filled with employee's period + hours + calculated amount
- **Status indicators:** Paid (OK badge), Partial (Warning badge), Pending (Default badge)

### 6. Reports

**Purpose:** 6 analytics report cards in a 2×3 grid.

| Report | Visualization | Data Source |
|--------|--------------|-------------|
| Hours by Employee | Ranked list + average | ShiftLog agg by employeeId |
| Labor Cost Breakdown | By position with percentages | ShiftLog hours × hourlyRate |
| Task Completion Rates | Per-employee % with color coding | TaskCompletion counts |
| Streak Leaderboard | Ranked list with flame accents | UserStreak records |
| Payment History | Paid/Pending/Total running totals | PaymentRecord agg |
| Attendance Patterns | Avg clock-in times, late arrival count | ShiftLog clockIn vs ShiftTemplate startTime |

Global date range picker (14d, Month, Quarter) controls all 6 reports simultaneously.

---

## Mobile Adaptation

### Bottom Navigation Bar
6 tabs become bottom nav with icons:
```
☀️ Today | 👥 Team | 📅 Schedule | ☑️ Tasks | 💰 Payroll | 📊 Reports
```

### Stack Navigation (Team Tab)
1. Full-width employee list → tap pushes to...
2. Full-screen employee detail with back arrow
3. Sub-tabs become horizontal scrollable pill bar
4. Actions (record payment, add shift) open as bottom sheets

### Responsive Breakpoints
- **Desktop** (≥1024px): Full split view, side-by-side layouts
- **Tablet** (768-1023px): Split view with narrower list (~200px)
- **Mobile** (<768px): Stack navigation, bottom nav bar, bottom sheets

---

## API Impact

### Existing Endpoints (No Changes Needed)
- `/api/employees` — employee list
- `/api/employees/[id]` — employee detail
- `/api/employees/[id]/shifts` — shift history (supports date range params)
- `/api/employees/[id]/payments` — payment history
- `/api/employees/stats` — dashboard stats, clocked-in list
- `/api/shift-templates` — full CRUD
- `/api/tasks` — full CRUD
- `/api/tasks/today` — today's tasks with completion status
- `/api/tasks/[id]/approve` and `/reject` — approval workflow

### New/Modified Endpoints
- **`/api/employees/reports`** — server-side aggregation for Reports tab (hours, costs, attendance patterns across all employees for a date range)
- **`/api/shift-templates/week-overview`** — aggregate ShiftLog by shiftTemplateId + date for week overview grid

---

## Implementation Order

1. **Tab infrastructure** — TabBar component, URL query param routing, shared state
2. **Team tab** — split view with compressed list + detail panel (most complex)
3. **Today tab** — stat cards + clocked-in panel + task board
4. **Payroll tab** — date range picker + summary cards + payroll table
5. **Tasks tab** — task list + approval queue
6. **Schedule tab** — shift template CRUD + week overview
7. **Reports tab** — 6 report cards with shared date range
8. **Mobile adaptation** — bottom nav, stack navigation, bottom sheets
