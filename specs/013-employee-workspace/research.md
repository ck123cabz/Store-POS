# Research: Employee Admin Unified Workspace

**Date**: 2026-03-24
**Branch**: `013-employee-workspace`

## Decision 1: Frontend-First Redesign

**Decision**: This feature is primarily a frontend redesign. No new database models or migrations are needed. Only 2 new API endpoints are required.

**Rationale**: All 6 Prisma models (Employee, ShiftLog, ShiftTemplate, PaymentRecord, EmployeeTask, TaskCompletion, UserStreak) already exist. 15+ API endpoints covering full CRUD for employees, shifts, tasks (including approval workflow), and payments are already implemented and tested. The gap is entirely in the admin-facing UI.

**Alternatives considered**:
- Full rewrite including backend: Rejected — backend is already feature-complete and well-structured
- Incremental tab additions to existing page: Rejected — the fundamental layout pattern (dashboard/list toggle + separate detail page) doesn't support the split-view CRM goal

## Decision 2: New API Endpoints

**Decision**: Add 2 new endpoints for aggregation queries that don't exist.

1. **`GET /api/employees/reports`** — Server-side aggregation for Reports tab
   - Query params: `from`, `to`
   - Returns: `{ hoursByEmployee[], laborCostByPosition[], taskCompletionRates[], streakLeaderboard[], paymentSummary, attendancePatterns[] }`

2. **`GET /api/shift-templates/week-overview`** — Schedule grid data
   - Query params: `weekStart` (ISO date)
   - Returns: `{ grid: { templateId, templateName, color, days: number[7] }[], totals: number[7] }`

**Rationale**: These aggregations cross multiple models and date ranges. Doing them client-side would require fetching all employees, all shifts, all payments, and all task completions separately — inefficient and error-prone. A single server-side query with proper GROUP BY is faster and more reliable.

**Alternatives considered**:
- Client-side aggregation from existing endpoints: Rejected — requires N+1 fetches (one per employee per data type) and large data transfer
- GraphQL: Rejected — overkill for 2 additional queries; the project uses REST consistently

## Decision 3: Tab State Management via Query Params

**Decision**: Use URL query parameters (`?tab=team&id=3`) instead of nested routes for tab and employee selection state.

**Rationale**: The split view requires the employee list and detail panel to coexist in one component tree, sharing state (employee list, selected employee, filters). Nested routes (`/employees/team/3`) would force full re-renders on navigation and lose list scroll position. Query params allow the page component to manage all state internally while keeping URLs shareable and bookmarkable.

**Alternatives considered**:
- Nested routes (`/employees/team/[id]`): Rejected — breaks split view state sharing
- Client-only state (no URL): Rejected — URLs not shareable, back button doesn't work
- Parallel routes (Next.js `@panel` slots): Rejected — adds complexity for minimal gain; the split view is simpler as controlled state

## Decision 4: Polling Pattern Reuse

**Decision**: Reuse the existing `use-sidebar-badges.ts` polling pattern (30s interval, visibility pause, AbortController, 3-failure circuit breaker) for the Today tab data refresh.

**Rationale**: The pattern is already battle-tested in production. Consistent polling behavior across the app reduces cognitive load and avoids duplicate implementations.

**Alternatives considered**:
- WebSockets/SSE: Rejected — overkill for a POS system with <10 concurrent managers; adds infrastructure complexity
- SWR/React Query with `refreshInterval`: Viable alternative, but the project doesn't use these libraries and adding a dependency for one polling use case violates the "minimal dependencies" constitution principle

## Decision 5: Legacy Route Redirect

**Decision**: Convert `/employees/[id]/page.tsx` to a redirect that forwards to `/employees?tab=team&id=[id]`.

**Rationale**: Existing links (sidebar badges, employee portal "View Profile", bookmarks) point to `/employees/[id]`. A redirect preserves backward compatibility without maintaining two implementations of the detail view.

**Alternatives considered**:
- Keep both routes (old detail + new workspace): Rejected — duplicates code and creates maintenance burden
- Remove old route with no redirect: Rejected — breaks existing internal links

## Decision 6: Mobile Breakpoint Strategy

**Decision**: Use `useIsMobile()` hook (already exists in the codebase) with the existing 768px breakpoint. Desktop (≥768px) gets split view. Mobile (<768px) gets stack navigation with bottom nav.

**Rationale**: The `useIsMobile()` hook is already used throughout the app (ResponsiveDialog, DateRangePicker, etc.). Using the same breakpoint ensures consistent behavior.

**Alternatives considered**:
- Container queries: Rejected — browser support limitations and the project doesn't use them elsewhere
- Three breakpoints (mobile/tablet/desktop): Rejected for initial build — tablet can use the desktop split view with a narrower list; optimize later if needed

## Decision 7: Component Architecture

**Decision**: Create a component hierarchy under `src/components/employees/workspace/` with one component per tab and shared sub-components.

```
src/components/employees/workspace/
├── workspace-tabs.tsx          # Top-level tab bar + tab routing
├── today-tab.tsx               # Today tab content
├── team-tab.tsx                # Team tab (list + split view)
├── team-detail-panel.tsx       # Detail panel with 5 sub-tabs
├── schedule-tab.tsx            # Schedule tab
├── tasks-tab.tsx               # Tasks tab
├── payroll-tab.tsx             # Payroll tab
├── reports-tab.tsx             # Reports tab
├── mobile-bottom-nav.tsx       # Mobile bottom navigation
└── shared/
    ├── stat-card.tsx           # Reusable stat card with label + value
    ├── stale-shift-alert.tsx   # Stale shift alert with resolve action
    └── payroll-table.tsx       # Shared payroll table (used in Payroll tab + detail Payments sub-tab)
```

**Rationale**: One component per tab keeps files focused and manageable. The workspace page (`/employees/page.tsx`) becomes a thin router that renders the active tab based on query params.

**Alternatives considered**:
- All tabs in one file: Rejected — would be 2000+ lines
- Each tab as a separate route: Rejected — breaks shared state for split view (see Decision 3)
