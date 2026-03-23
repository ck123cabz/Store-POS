# Research: Transactions Page UI/UX Refactor

**Date**: 2026-03-23 | **Branch**: `011-transactions-ui`

## Overview

No critical NEEDS CLARIFICATION items exist — the spec is fully clarified. Research focused on best practices for the component decomposition and pattern selection.

## R1: Monolith Decomposition Pattern

**Decision**: Extract transaction page into ~10 focused components + 1 custom hook

**Rationale**: The current 1040-line `page.tsx` handles state management, data fetching, filtering, table rendering, detail views, void modals, and GCash actions all in one file. Extracting into a component tree with a shared hook follows the existing codebase pattern (see `src/components/pos/`, `src/components/customers/`) and aligns with Constitution Principle III (Pragmatic Simplicity).

**Alternatives considered**:
- **Keep monolith, just add mobile cards**: Rejected — doesn't address the core UX issue of competing filter systems, and makes the file even larger.
- **Full state management library (Zustand/Jotai)**: Rejected — overkill for a single page's state. A custom hook with `useState` + `useCallback` matches existing patterns (`use-cart.ts`, `use-settings.ts`).

## R2: Filter Bar Pattern (Segmented Control + Inline Dropdowns)

**Decision**: Single horizontal bar with segmented time presets (left) and contextual filters (right)

**Rationale**: Replaces the current dual-system (ToggleGroup quick filters + Collapsible advanced panel) that confuses users. The segmented control is a well-established pattern for mutually exclusive time ranges. Inline dropdowns for status/cashier/search keep secondary filters visible without dominating.

**Alternatives considered**:
- **Tab-based filtering (separate tab per time range)**: Rejected — tabs imply separate content, not filter variations on the same data.
- **Single search box with filter tokens**: Rejected — too advanced for POS cashier audience, requires learning syntax.

## R3: Mobile Detail View Pattern (Bottom Sheet)

**Decision**: Bottom sheet (using existing Sheet component from shadcn/ui) for mobile detail view

**Rationale**: Bottom sheets are the standard mobile pattern for contextual detail without full navigation. The app already uses `Sheet` for mobile detail views in the current transactions page. Preserving this pattern means zero new dependencies and consistent UX.

**Alternatives considered**:
- **Full page navigation**: Rejected — breaks context (user loses place in transaction list) and requires back-navigation.
- **Inline card expansion**: Rejected — pushes other cards down, disorienting for long lists.

## R4: Export Implementation

**Decision**: Client-side CSV generation from currently filtered/displayed data

**Rationale**: The transactions are already loaded client-side after filtering. Generating CSV in the browser avoids a new API endpoint, keeps the refactor frontend-only, and works offline. The `Blob` + `URL.createObjectURL` pattern is widely supported.

**Alternatives considered**:
- **Server-side export endpoint**: Rejected — would require a new API route, violating the "frontend-only refactor" scope. Can be added later for large dataset export.
- **PDF export**: Rejected — adds heavy dependency (jspdf/pdfmake) for minimal benefit. CSV is universally importable.

## R5: Existing E2E Test Adaptation

**Decision**: Update selectors in existing tests, add new test files for new UI patterns

**Rationale**: Three existing E2E test files (`transaction-filters.spec.ts`, `transactions-void.spec.ts`, `transactions-currency.spec.ts`) test the current UI. Their selectors (e.g., `getByRole`, `getByTestId`) will need updating to match the new component structure. Core assertion logic (filter results, void behavior, currency formatting) should remain unchanged.

**Alternatives considered**:
- **Delete and rewrite all tests**: Rejected — existing tests have valuable assertion logic. Adapt, don't discard.
