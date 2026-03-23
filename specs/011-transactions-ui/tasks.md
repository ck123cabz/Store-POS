# Tasks: Transactions Page UI/UX Refactor

**Input**: Design documents from `/specs/011-transactions-ui/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/components.md

**Tests**: Constitution Principle I (Test-First Development) requires TDD. E2E tests for user stories, unit tests for utilities.

**Organization**: Tasks grouped by user story. US1 and US5 are combined (same page, different viewports — inseparable in practice).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Create directory structure and scaffolding for new components

- [x] T001 Create component directory at `src/components/transactions/`
- [x] T002 [P] Create empty barrel export file at `src/components/transactions/index.ts`
- [x] T003 [P] Create utility file scaffold at `src/lib/export-transactions.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extract shared state management hook that ALL components depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Extract `useTransactions` hook from `src/app/(dashboard)/transactions/page.tsx` to `src/hooks/use-transactions.ts` — move all filter state (activeQuickFilter, status, cashier, search, includeVoided, dateFrom, dateTo, till), data fetching (transactions, todayData, users), pagination (page, pageSize, totalCount), and action handlers (refreshTransactions, refreshTodayData) into the hook. See `contracts/components.md` for interface.
- [x] T005 Verify the existing page still works after hook extraction — `page.tsx` should import and use `useTransactions()` with no behavior change. Run `npm run dev` and manually verify transactions page loads with existing UI.

**Checkpoint**: Hook extracted — page still works as before. All downstream components can now consume `useTransactions()`.

---

## Phase 3: User Story 1 + 5 — Browse, Filter & Mobile Cards (Priority: P1) 🎯 MVP

**Goal**: Replace the dual filter system with a unified bar, render desktop table + mobile cards, show summary metrics in both layouts

**Independent Test**: Navigate to Transactions page on desktop — see summary cards, unified filter bar, data table. Resize to mobile — see compact metric strip, pill filters, card list. Apply filters in both viewports.

### E2E Tests for US1+US5

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T006 [P] [US1] Write E2E test for unified filter bar — verify segmented time presets, status/cashier dropdowns, search input, and voided checkbox render and function in `tests/e2e/transaction-filters.spec.ts` (update existing test file)
- [x] T007 [P] [US5] Write E2E test for mobile card layout — verify cards show order#, badge, total, payment icon, items, customer, time; verify pending card has amber border; verify voided card has reduced opacity in `tests/e2e/transaction-mobile.spec.ts` (new file)

### Implementation for US1+US5

- [x] T008 [P] [US1] Create `TransactionSummaryCards` component at `src/components/transactions/transaction-summary-cards.tsx` — desktop: 4-card grid (revenue, count, avg order, peak hour) with trend indicators; mobile: compact 3-metric horizontal strip with dividers. Use `useIsMobile()` for layout switch. Consume `todayData` from props.
- [x] T009 [P] [US1] Create `TransactionFilterBar` component at `src/components/transactions/transaction-filter-bar.tsx` — desktop: horizontal bar with segmented time control (Today/Yesterday/This Week/This Month/All), inline status Select, cashier Select, search Input, and "Include voided" Checkbox. See `contracts/components.md` for props interface.
- [x] T010 [P] [US5] Create `TransactionFilterSheet` component at `src/components/transactions/transaction-filter-sheet.tsx` — mobile: bottom Sheet with status dropdown, cashier dropdown, DateRangePicker, and "Include voided" toggle, plus "Apply" and "Clear" buttons. Uses existing Sheet component from shadcn/ui.
- [x] T011 [P] [US1] Create `TransactionTable` component at `src/components/transactions/transaction-table.tsx` — desktop data table with sortable columns (Order, Time, Customer, Items, Payment, Total, Status). Reuse existing `DataTable` component. Add payment icons (banknote/smartphone/notebook-tabs/split from Lucide). Add color-coded status badges per `data-model.md` state transition map. Voided rows at reduced opacity with strikethrough total.
- [x] T012 [P] [US5] Create `TransactionCard` component at `src/components/transactions/transaction-card.tsx` — mobile card with row1 (order# in mono + status badge + total in mono) and row2 (payment icon + method · item count · customer name + time). Amber border for pending, reduced opacity for voided, strikethrough total for voided.
- [x] T013 [US5] Create `TransactionCardList` component at `src/components/transactions/transaction-card-list.tsx` — vertical list rendering `TransactionCard` components with gap spacing. Handles empty state and loading state.
- [x] T014 [US1] Refactor `src/app/(dashboard)/transactions/page.tsx` — replace the monolith body with composed components: `TransactionSummaryCards`, `TransactionFilterBar` (desktop) or mobile pills + `TransactionFilterSheet` (mobile), `TransactionTable` (desktop) or `TransactionCardList` (mobile). Page should be ~150 lines, delegating all rendering to child components. Wire `useTransactions()` hook to all components.
- [x] T015 [US1] Update barrel export at `src/components/transactions/index.ts` with all Phase 3 components
- [x] T016 [US1] Verify E2E tests T006 and T007 pass — run `npx playwright test transaction-filters transaction-mobile`

**Checkpoint**: Transactions page fully functional with new layout on both desktop and mobile. Filters work. Cards render on mobile. Table renders on desktop. Summary metrics display correctly.

---

## Phase 4: User Story 2 — View Transaction Details (Priority: P1)

**Goal**: Show receipt-style detail view when a transaction is selected — Dialog on desktop, Sheet on mobile

**Independent Test**: Click any transaction row/card → detail view opens showing order#, status badge, date/time, itemized line items, subtotal/tax/total, payment method, cashier, till number. Close and reopen on different transactions.

### E2E Tests for US2

- [x] T017 [P] [US2] Write E2E test for transaction detail view — verify clicking a row opens dialog (desktop) or sheet (mobile), verify items list, totals section, payment info, and cashier details display correctly in `tests/e2e/transaction-detail.spec.ts` (new file)

### Implementation for US2

- [x] T018 [US2] Create `TransactionDetail` component at `src/components/transactions/transaction-detail.tsx` — receipt-style layout: header (order# + badge + date/time + close button), items section (label + quantity×product→price for each item), totals section (subtotal + tax + total), payment details (method with icon + status + reference/change), metadata (cashier + till). Voided: show strikethrough total + void reason + voided-by + voided-at. Split: show each method as separate line. GCash: show photo proof viewer. Uses Dialog on desktop, Sheet on mobile via `useIsMobile()`.
- [x] T019 [US2] Wire `TransactionDetail` into `page.tsx` — add selected transaction state, open/close handlers, pass `onActionComplete` callback for refreshing after actions.
- [x] T020 [US2] Verify E2E test T017 passes — run `npx playwright test transaction-detail`

**Checkpoint**: Transaction detail view works on both viewports. All data fields display correctly. GCash photo proof loads.

---

## Phase 5: User Story 3 — GCash Pending Actions (Priority: P2)

**Goal**: Add "Confirm Payment" and "Cancel" action buttons to the detail view for GCash Pending transactions

**Independent Test**: Create a GCash transaction in POS, navigate to Transactions, open the pending transaction, verify Confirm/Cancel buttons appear, test both actions update status.

### Implementation for US3

- [x] T021 [US3] Create `TransactionActions` component at `src/components/transactions/transaction-actions.tsx` — state-specific action bar rendered at the bottom of `TransactionDetail`. For GCash Pending: green "Confirm Payment" button (with check icon) + neutral "Cancel" button + secondary "Void Transaction" text link. Loading states for confirm/cancel. See `contracts/components.md` for full props interface.
- [x] T022 [US3] Wire `TransactionActions` into `TransactionDetail` — pass existing confirm/cancel API handlers from `useTransactions` hook, permission checks from session, and loading states. Render action bar conditionally based on transaction type and status.
- [x] T023 [US3] Verify GCash confirm/cancel flow end-to-end — run existing `npx playwright test gcash-payment` and manually test Confirm/Cancel in detail view

**Checkpoint**: GCash Pending transactions show action buttons. Confirm changes status to Completed. Cancel changes status to Cancelled and restores stock.

---

## Phase 6: User Story 4 — Settle On Tab Transactions (Priority: P2)

**Goal**: Add customer banner + "Settle Tab" / "Add Items" / "Void" actions for On Tab transactions

**Independent Test**: Create a Tab transaction in POS, navigate to Transactions, open the tab, verify customer banner, verify Settle Tab shows amount, verify Add Items navigates to POS.

### Implementation for US4

- [x] T024 [US4] Add On Tab variant to `TransactionDetail` at `src/components/transactions/transaction-detail.tsx` — render colored info banner below header showing customer name (e.g., "Juan Cruz's Tab") when transaction is Tab type with a customer.
- [x] T025 [US4] Add On Tab variant to `TransactionActions` at `src/components/transactions/transaction-actions.tsx` — primary "Settle Tab — ₱[amount]" button (full-width, with wallet icon), secondary "Add Items" button (with plus icon), destructive "Void" button (red outlined). Settle navigates to POS payment flow, Add Items navigates to POS product grid with order loaded.
- [x] T026 [US4] Verify tab flow end-to-end — run existing `npx playwright test tab-payment tab-settlement` and manually test Settle/Add Items navigation

**Checkpoint**: On Tab transactions show customer banner and three action buttons. Settle Tab initiates payment flow. Add Items navigates to POS grid.

---

## Phase 7: User Story 6 — Void Transaction (Priority: P3)

**Goal**: Extract void modal, ensure void action is consistently accessible but visually de-emphasized

**Independent Test**: Open any completed transaction, click "Void Transaction", select reason, confirm. Verify status changes, stock restores, detail view updates.

### Implementation for US6

- [x] T027 [US6] Create `TransactionVoidModal` component at `src/components/transactions/transaction-void-modal.tsx` — extract void modal from page.tsx monolith. Reason Select with options from `VALID_VOID_REASONS`, custom Textarea when "Other" selected, error Alert display, Confirm/Cancel buttons with loading state. See `contracts/components.md` for props.
- [x] T028 [US6] Add Completed variant to `TransactionActions` at `src/components/transactions/transaction-actions.tsx` — for completed (non-voided) transactions, show only "Void Transaction" as a secondary text link or destructive outlined button. Hidden when user lacks `permVoid`.
- [x] T029 [US6] Wire `TransactionVoidModal` into `page.tsx` — connect void modal open/close state, pass void API handler, refresh transactions and summary after successful void.
- [x] T030 [US6] Update existing void E2E test selectors in `tests/e2e/transactions-void.spec.ts` to match new UI (void button location moved from old modal trigger to detail view action bar)
- [x] T031 [US6] Verify void flow — run `npx playwright test transactions-void`

**Checkpoint**: Void works from any transaction detail view. Permission checks enforced. Existing void E2E tests pass with updated selectors.

---

## Phase 8: User Story 7 — Export Transaction Data (Priority: P3)

**Goal**: Add export button that downloads filtered transactions as CSV

**Independent Test**: Apply filters, click Export, verify downloaded CSV contains the correct filtered transactions with all required fields.

### Unit Tests for US7

- [x] T032 [P] [US7] Write unit test for CSV generation utility in `tests/unit/export-transactions.test.ts` — test header row, data formatting, currency handling, voided transaction marking, empty data handling

### Implementation for US7

- [x] T033 [US7] Implement `exportTransactionsToCSV` utility at `src/lib/export-transactions.ts` — generate CSV string with headers (Order #, Date, Time, Customer, Items, Payment, Total, Status). Format currency with symbol, mark voided as "VOIDED" in status column. Use Blob + URL.createObjectURL for download.
- [x] T034 [US7] Create `TransactionExport` component at `src/components/transactions/transaction-export.tsx` — Export button with download icon in page header. On click: generate CSV from currently filtered transactions, trigger browser download with filename `transactions-[date-range].csv`.
- [x] T035 [US7] Wire `TransactionExport` into page header in `src/app/(dashboard)/transactions/page.tsx` — pass filtered transactions and filter state as props.
- [x] T036 [US7] Write E2E test for export in `tests/e2e/transaction-export.spec.ts` — verify Export button visible, verify download triggers, verify CSV content matches displayed data
- [x] T037 [US7] Verify unit and E2E tests pass — run `npm run test:unit -- export-transactions && npx playwright test transaction-export`

**Checkpoint**: Export button downloads CSV. File contains correct filtered data. Voided transactions marked. Unit tests pass.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Adapt existing tests, cleanup, final validation

- [x] T038 Update existing E2E test selectors in `tests/e2e/transactions-currency.spec.ts` for new UI component structure
- [x] T039 [P] Remove dead code from `src/app/(dashboard)/transactions/page.tsx` — delete any remaining inline rendering logic that was extracted to components
- [x] T040 [P] Update barrel export at `src/components/transactions/index.ts` with all final components
- [x] T041 Run full test suite — `npm run test:all` — fix any regressions
- [x] T042 Run build validation — `npm run build` — ensure no TypeScript errors or build warnings
- [x] T043 Manual responsive testing — verify layout transitions at 768px breakpoint, test on actual mobile device or Chrome DevTools mobile presets

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1+US5 (Phase 3)**: Depends on Phase 2 — builds the page skeleton
- **US2 (Phase 4)**: Depends on Phase 3 — needs a list to select from
- **US3 (Phase 5)**: Depends on Phase 4 — extends detail view with GCash actions
- **US4 (Phase 6)**: Depends on Phase 4 — extends detail view with Tab actions
- **US6 (Phase 7)**: Depends on Phase 4 — void action lives in detail view
- **US7 (Phase 8)**: Depends on Phase 3 — needs filter state and transaction data
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Phase 2 (Foundation)
  └── Phase 3 (US1+US5: Browse + Filter + Mobile Cards)  🎯 MVP
        ├── Phase 4 (US2: View Details)
        │     ├── Phase 5 (US3: GCash Actions)    ← can run in parallel
        │     ├── Phase 6 (US4: Tab Actions)       ← can run in parallel
        │     └── Phase 7 (US6: Void)              ← can run in parallel
        └── Phase 8 (US7: Export)                  ← independent of Phase 4
```

### Parallel Opportunities

**Within Phase 3** (after hook extraction):
- T008, T009, T010, T011, T012 can ALL run in parallel (different files)

**After Phase 4** (detail view complete):
- Phase 5 (GCash), Phase 6 (Tab), Phase 7 (Void) can run in parallel (all extend the same `TransactionActions` component but modify different code paths)

**Phase 8** (Export) can run in parallel with Phases 5-7 (completely independent files)

---

## Parallel Example: Phase 3 (US1+US5)

```bash
# Launch all component files in parallel (different files, no deps):
Task: "T008 [P] Create TransactionSummaryCards in src/components/transactions/transaction-summary-cards.tsx"
Task: "T009 [P] Create TransactionFilterBar in src/components/transactions/transaction-filter-bar.tsx"
Task: "T010 [P] Create TransactionFilterSheet in src/components/transactions/transaction-filter-sheet.tsx"
Task: "T011 [P] Create TransactionTable in src/components/transactions/transaction-table.tsx"
Task: "T012 [P] Create TransactionCard in src/components/transactions/transaction-card.tsx"

# Then sequentially (depends on above):
Task: "T013 Create TransactionCardList in src/components/transactions/transaction-card-list.tsx"
Task: "T014 Refactor page.tsx to compose components"
```

---

## Implementation Strategy

### MVP First (Phase 3 Only — US1+US5)

1. Complete Phase 1: Setup (directory + scaffolds)
2. Complete Phase 2: Foundational (extract `useTransactions` hook)
3. Complete Phase 3: US1+US5 (filter bar + table + mobile cards + summary)
4. **STOP and VALIDATE**: Test both desktop and mobile views independently
5. Deploy/demo if ready — full browse + filter experience is usable

### Incremental Delivery

1. Setup + Foundation → Hook ready
2. US1+US5 (Browse + Mobile Cards) → **MVP!** Full list experience
3. US2 (Detail View) → Receipt-style details on tap/click
4. US3+US4 (GCash + Tab Actions) → Actionable detail views
5. US6 (Void) → Void from detail view
6. US7 (Export) → Download filtered CSV
7. Each phase adds value without breaking previous phases

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Constitution Principle I requires TDD — write failing tests before implementation
- The 1040-line `page.tsx` is the sole refactor target — all changes originate from decomposing it
- Existing E2E tests (`transaction-filters`, `transactions-void`, `transactions-currency`) need selector updates, not rewrites
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
