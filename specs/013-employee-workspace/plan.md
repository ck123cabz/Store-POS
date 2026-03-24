# Implementation Plan: Employee Admin Unified Workspace

**Branch**: `013-employee-workspace` | **Date**: 2026-03-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/013-employee-workspace/spec.md`

## Summary

Redesign the Employee Admin from a fragmented dashboard/list/detail trio into a unified 6-tab workspace (Today, Team, Schedule, Tasks, Payroll, Reports) with a split-view CRM for the Team tab. Primarily a frontend refactor — all 6 Prisma models and 15+ API endpoints already exist. Only 2 new aggregation endpoints needed. Mobile adaptation uses bottom navigation and stack navigation.

## Technical Context

**Language/Version**: TypeScript 5.x + Next.js 16 (App Router), React 19
**Primary Dependencies**: Tailwind CSS 4.x, Radix UI, shadcn/ui, Recharts, date-fns, Lucide React icons, Zod
**Storage**: PostgreSQL with Prisma ORM (existing schema, no migrations needed)
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Web (responsive: desktop ≥768px split view, mobile <768px stack nav)
**Project Type**: Web application (Next.js monolith)
**Performance Goals**: Today tab loads in <5s, Reports load in <3s for 30-day range, 30s auto-poll
**Constraints**: No new Prisma models; reuse existing design system components; match existing polling pattern
**Scale/Scope**: Small retail POS, <50 employees, <10 concurrent managers

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Test-First Development | PASS | Unit tests for new utility functions; E2E tests for tab navigation, split view, and payroll flow |
| II. Security-First | PASS | All API endpoints already validate input + check auth; no new security surface; page-level access control |
| III. Pragmatic Simplicity | PASS | Reuses existing components (Badge, Avatar, DateRangePicker, etc.); one component per tab; no new abstractions |
| IV. Data Integrity | PASS | No schema changes; payment recording uses existing atomic transaction pattern; no new write paths |
| V. RESTful API Standards | PASS | 2 new GET endpoints follow existing patterns (`{ error: string }` errors, proper status codes, plural nouns) |

**Post-Phase 1 re-check**: All gates still pass. The component architecture follows existing patterns (one page component + sub-components). No new dependencies added.

## Project Structure

### Documentation (this feature)

```text
specs/013-employee-workspace/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: technical decisions
├── data-model.md        # Phase 1: existing data model documentation
├── quickstart.md        # Phase 1: integration scenarios
├── contracts/           # Phase 1: API contracts
│   └── api-changes.md   # New endpoints + route changes
├── checklists/
│   └── requirements.md  # Spec quality validation
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (dashboard)/
│   │   └── employees/
│   │       ├── page.tsx                    # MODIFY: Replace with workspace shell
│   │       └── [id]/
│   │           └── page.tsx                # MODIFY: Replace with redirect
│   └── api/
│       ├── employees/
│       │   └── reports/
│       │       └── route.ts                # NEW: Reports aggregation endpoint
│       └── shift-templates/
│           └── week-overview/
│               └── route.ts                # NEW: Schedule grid endpoint
├── components/
│   └── employees/
│       ├── employee-side-panel.tsx          # KEEP (unused in new UI but no-op)
│       └── workspace/                      # NEW: All workspace components
│           ├── workspace-tabs.tsx           # Tab bar + routing logic
│           ├── today-tab.tsx               # Today tab content
│           ├── team-tab.tsx                # Team tab (list + split view)
│           ├── team-detail-panel.tsx        # Detail panel with 5 sub-tabs
│           ├── schedule-tab.tsx            # Schedule tab
│           ├── tasks-tab.tsx               # Tasks tab
│           ├── payroll-tab.tsx             # Payroll tab
│           ├── reports-tab.tsx             # Reports tab
│           ├── mobile-bottom-nav.tsx        # Mobile bottom nav bar
│           └── shared/
│               ├── stat-card.tsx            # Summary card component
│               └── stale-shift-alert.tsx    # Stale shift alert
├── hooks/
│   └── use-workspace-polling.ts            # NEW: Polling hook (reuses sidebar pattern)
└── lib/
    └── validations/
        └── employee.ts                     # EXISTING: Zod schemas (may extend)

tests/
├── unit/
│   ├── employee-status.test.ts             # EXISTING
│   ├── role-presets.test.ts                # EXISTING
│   └── workspace-utils.test.ts             # NEW: Date range, aggregation helpers
└── e2e/
    └── employee-workspace.spec.ts          # NEW: Tab navigation, split view, payroll
```

**Structure Decision**: Single Next.js monolith (existing pattern). New components organized under `src/components/employees/workspace/` to co-locate all tab implementations. Two new API routes follow existing directory structure under `src/app/api/`.

## Complexity Tracking

No constitution violations. No complexity justifications needed.
