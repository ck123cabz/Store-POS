# Implementation Plan: Employee Portal ("My Shift")

**Branch**: `012-employee-portal` | **Date**: 2026-03-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/012-employee-portal/spec.md`

## Summary

Add a personal "My Shift" portal page where employees see their clock-in status, clock in/out, manage tasks inline, and view their shift history — all scoped to the logged-in user's linked employee record. Employee-only users (no admin permissions) are auto-routed to this page after login. No schema changes required; all data models already exist.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: Next.js 16 (App Router), React 19, Tailwind CSS 4.x, Radix UI, shadcn/ui, Lucide React icons, date-fns
**Storage**: PostgreSQL with Prisma ORM 7.x (existing schema, no migrations)
**Testing**: Vitest (unit/integration), Playwright (E2E)
**Target Platform**: Web (desktop + mobile responsive)
**Project Type**: Web application (Next.js monolith — frontend + API in one project)
**Performance Goals**: Portal page load < 2s, clock-in action < 1s response
**Constraints**: No schema migrations, reuse existing API patterns, backward-compatible changes
**Scale/Scope**: Small store (< 50 employees), single new page + 4 new API routes + 2 modified files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Test-First Development | PASS | Tests will be written before implementation per TDD workflow. Integration tests for new API endpoints, E2E for portal flow. |
| II. Security-First | PASS | All new endpoints use `auth()` session checks. Clock-in/out scoped to current user's employee record only (no ID spoofing). Stale shift close validates clockOutTime is after clockIn and in the past. |
| III. Pragmatic Simplicity | PASS | No new models, no new abstractions. New endpoints follow existing patterns. Portal page is a single page component. |
| IV. Data Integrity | PASS | Clock-in prevents double-clock-in (existing check). Stale shift close validates time bounds. No concurrent edit risk (single user per employee). |
| V. RESTful API Standards | PASS | New endpoints follow existing conventions: `/api/my-shift/*`, proper HTTP methods (GET/POST/PATCH), consistent error format `{ error: string }`. |

**Post-Phase 1 Re-check**: No violations introduced. No new models, no unnecessary abstraction layers. Pagination on shifts endpoint is backward-compatible.

## Project Structure

### Documentation (this feature)

```text
specs/012-employee-portal/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: research decisions
├── data-model.md        # Phase 1: entity analysis (no new models)
├── quickstart.md        # Phase 1: build sequence
├── contracts/
│   └── api.md           # Phase 1: API contract definitions
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/
│   │   └── my-shift/
│   │       ├── route.ts              # NEW: GET /api/my-shift (portal data)
│   │       ├── clock-in/route.ts     # NEW: POST /api/my-shift/clock-in
│   │       ├── clock-out/route.ts    # NEW: POST /api/my-shift/clock-out
│   │       └── close-stale/route.ts  # NEW: PATCH /api/my-shift/close-stale
│   ├── (dashboard)/
│   │   └── my-shift/
│   │       └── page.tsx              # NEW: My Shift portal page
│   └── (auth)/
│       └── login/
│           └── page.tsx              # MODIFIED: role-based post-login routing
├── components/
│   └── layout/
│       └── sidebar.tsx               # MODIFIED: add "My Shift" nav entry

tests/
├── integration/
│   └── my-shift-api.test.ts          # NEW: API integration tests
└── e2e/
    └── my-shift-portal.spec.ts       # NEW: E2E portal flow tests
```

**Structure Decision**: Next.js monolith with collocated API routes (`src/app/api/my-shift/`) and page (`src/app/(dashboard)/my-shift/`). Follows existing project patterns — no separate backend/frontend split.

## Complexity Tracking

> No constitution violations. No complexity justification needed.
