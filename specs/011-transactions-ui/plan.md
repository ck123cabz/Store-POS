# Implementation Plan: Transactions Page UI/UX Refactor

**Branch**: `011-transactions-ui` | **Date**: 2026-03-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-transactions-ui/spec.md`

## Summary

Refactor the 1040-line transactions page monolith into a modular, responsive component architecture. Replace the dual-filter system (quick filters + collapsible advanced panel) with a unified filter bar. Switch mobile from truncated table rows to information-rich cards. Add receipt-style detail views with state-specific action buttons (GCash confirm/cancel, Tab settle/add items, void). Add transaction export functionality. All changes are frontend-only — existing API endpoints and data models are unchanged.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19, Next.js 16 (App Router)
**Primary Dependencies**: Tailwind CSS 4.x, Radix UI, shadcn/ui components, Lucide React icons, date-fns
**Storage**: N/A (frontend-only refactor; PostgreSQL + Prisma unchanged)
**Testing**: Vitest (unit), Playwright (E2E) — existing test suites at `tests/e2e/transaction-filters.spec.ts`, `transactions-void.spec.ts`, `transactions-currency.spec.ts`
**Target Platform**: Web (desktop + mobile responsive at 768px breakpoint)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Initial render < 2 seconds; seamless responsive transitions at 768px
**Constraints**: Mobile-first touch targets (min 44px); existing API contracts unchanged; existing permission model unchanged
**Scale/Scope**: Single page refactor (`transactions/page.tsx`) decomposed into ~8-10 component files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Test-First Development | **PASS** | E2E tests exist for transaction filters, void, currency. New E2E tests required for mobile card layout, detail view actions, export. Unit tests for any extracted utility functions. |
| II. Security-First | **PASS** | Frontend-only — no new API surface. `permVoid` check preserved in component logic. Search input uses existing sanitized API query params. No direct DOM injection. |
| III. Pragmatic Simplicity | **PASS** | Decomposing a 1040-line monolith into focused components *reduces* complexity. No new abstractions beyond component extraction. Reuse existing UI primitives (Sheet, Dialog, Badge, ToggleGroup). |
| IV. Data Integrity | **PASS** | No data operations change. GCash confirm/cancel and void use existing atomic API calls. Export reads filtered data only. |
| V. RESTful API Standards | **PASS** | No API changes. Existing endpoints preserved as-is. Export may use existing GET endpoint with additional query params or client-side CSV generation. |

**Gate Result**: All principles pass. No violations require justification.

## Project Structure

### Documentation (this feature)

```text
specs/011-transactions-ui/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: research findings
├── data-model.md        # Phase 1: existing data model reference
├── quickstart.md        # Phase 1: development setup guide
├── contracts/           # Phase 1: component interface contracts
│   └── components.md    # Component API contracts
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
src/
├── app/(dashboard)/transactions/
│   └── page.tsx                        # Refactored: thin orchestrator (~150 lines)
├── components/transactions/            # NEW: extracted transaction components
│   ├── transaction-summary-cards.tsx   # Summary metrics (desktop cards + mobile strip)
│   ├── transaction-filter-bar.tsx      # Unified filter bar (desktop segmented + dropdowns)
│   ├── transaction-filter-sheet.tsx    # Mobile advanced filter bottom sheet
│   ├── transaction-table.tsx           # Desktop data table with sortable columns
│   ├── transaction-card-list.tsx       # Mobile card list
│   ├── transaction-card.tsx            # Individual mobile transaction card
│   ├── transaction-detail.tsx          # Receipt-style detail view (dialog/sheet)
│   ├── transaction-actions.tsx         # State-specific action buttons
│   ├── transaction-void-modal.tsx      # Void reason selection modal
│   └── transaction-export.tsx          # Export button + download logic
├── hooks/
│   └── use-transactions.ts             # NEW: shared transaction fetching + filter state
└── lib/
    └── export-transactions.ts          # NEW: CSV generation utility

tests/
├── e2e/
│   ├── transaction-filters.spec.ts     # UPDATE: adapt to new filter bar UI
│   ├── transaction-detail.spec.ts      # NEW: detail view + actions
│   ├── transaction-mobile.spec.ts      # NEW: mobile card layout
│   ├── transaction-export.spec.ts      # NEW: export functionality
│   ├── transactions-void.spec.ts       # UPDATE: adapt to new void UI location
│   └── transactions-currency.spec.ts   # UPDATE: verify currency display unchanged
└── unit/
    └── export-transactions.test.ts     # NEW: CSV generation tests
```

**Structure Decision**: Extract transaction-specific components into `src/components/transactions/` following the existing pattern (see `src/components/customers/`, `src/components/pos/`, `src/components/ingredients/`). A custom hook `use-transactions.ts` centralizes filter state and data fetching, matching the pattern of `use-cart.ts` and `use-settings.ts`.

## Build Sequence

### Phase A: Foundation (P1 stories — filter + table + mobile cards)

**Order matters**: Filter state hook → Summary cards → Filter bar → Desktop table → Mobile cards → Page orchestrator

1. **`use-transactions.ts` hook** — Extract all state management (filters, fetching, pagination) from the monolith into a reusable hook. This unblocks all UI components.
2. **`transaction-summary-cards.tsx`** — Desktop 4-card grid + mobile 3-metric compact strip. Consumes today's data from the hook.
3. **`transaction-filter-bar.tsx`** — Desktop: segmented time control + status/cashier/search dropdowns + voided toggle. Consumes and updates filter state from hook.
4. **`transaction-filter-sheet.tsx`** — Mobile: bottom sheet with advanced filter controls + Apply button.
5. **`transaction-table.tsx`** — Desktop data table with sortable columns, status badges, payment icons. Reuses existing `DataTable` component.
6. **`transaction-card.tsx` + `transaction-card-list.tsx`** — Mobile card component and list. Colored borders for actionable states.
7. **`page.tsx` refactor** — Thin orchestrator composing the above components. ~150 lines.

### Phase B: Detail Views (P1-P2 stories — detail + actions)

8. **`transaction-detail.tsx`** — Receipt-style layout: header with badge, items list, totals, payment info. Dialog on desktop, Sheet on mobile.
9. **`transaction-actions.tsx`** — State-specific action bar: GCash (Confirm/Cancel/Void), Tab (Settle/Add Items/Void), Completed (Void only). Consumes transaction state.
10. **`transaction-void-modal.tsx`** — Extract void modal from monolith. Reason selection + confirmation.

### Phase C: Export (P3 story)

11. **`lib/export-transactions.ts`** — CSV generation utility. Formats transaction data with headers.
12. **`transaction-export.tsx`** — Export button component. Triggers download of filtered transactions.

### Phase D: Testing & Polish

13. **Update existing E2E tests** — Adapt selectors for new filter bar, void UI location.
14. **New E2E tests** — Mobile card layout, detail view actions, export.
15. **Unit tests** — CSV generation utility, any extracted formatting helpers.
