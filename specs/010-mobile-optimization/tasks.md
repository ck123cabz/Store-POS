# Tasks: Full Mobile Optimization

**Input**: Design documents from `/specs/010-mobile-optimization/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Included per Constitution Principle I (Test-First Development). Playwright E2E tests for mobile viewport + Vitest unit test for search logic.

**Organization**: Tasks grouped by user story. Each story is independently testable. Foundation phase includes US3 (Navigation) since it's a prerequisite for all stories.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Playwright mobile project configuration and global CSS mobile utilities

- [x] T001 Add `mobile` project to Playwright config with viewport 375×812, isMobile: true, hasTouch: true in tests/playwright.config.ts
- [x] T002 Add global CSS mobile utilities (safe area helpers, Dynamic Type min-height helpers, touch-target size helpers) in src/app/globals.css

---

## Phase 2: Foundational (US3 Navigation + Shared Components)

**Purpose**: Core mobile infrastructure that ALL user stories depend on. Includes US3 (Navigation) since header and sidebar affect every page.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundation

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T003 [US3] Write failing mobile navigation E2E test: open sidebar drawer, navigate to 5 pages, verify sidebar closes on navigate, header ≤56px, no horizontal overflow on each page in tests/e2e/mobile-smoke.spec.ts

### Implementation for Foundation

- [x] T004 [P] [US3] Compact mobile header — reduce height to ≤56px on mobile, ensure sidebar trigger and user menu accessible at 375px in src/components/layout/header.tsx
- [x] T005 [P] [US3] Verify/fix sidebar mobile drawer — ensure overlay mode (not push), closes on link tap and outside tap, no content hidden behind it in src/components/layout/sidebar.tsx
- [x] T006 [P] Add `mobileCardRender` optional prop to DataTable — when `useIsMobile()` is true and prop provided, render cards instead of table rows; preserve pagination in src/components/ui/data-table.tsx
- [x] T007 [P] Ensure SummaryCardGrid renders 1 column on mobile (single-col grid below md breakpoint) in src/components/ui/summary-card.tsx
- [x] T008 [P] Verify ResponsiveDialog renders correctly at 375px viewport — form inputs not cut off, action buttons visible in src/components/ui/responsive-dialog.tsx
- [x] T009 [P] Verify DateRangePicker shows single calendar month on mobile (already uses useIsMobile) in src/components/ui/date-range-picker.tsx
- [x] T010 [US3] Run mobile navigation E2E test and verify it passes after header/sidebar fixes

**Checkpoint**: Foundation ready — mobile navigation works, shared components mobile-ready. User story implementation can begin.

---

## Phase 3: User Story 1 — POS Operator Takes Orders on a Phone (Priority: P1) 🎯 MVP

**Goal**: Full POS checkout workflow (browse → search → add to cart → pay) works flawlessly on a 375px phone screen.

**Independent Test**: Open POS on 375px viewport, search product, add 3 items, apply discount, select customer, complete cash payment — all without horizontal scroll or unreachable UI.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T011 [P] [US1] Write failing mobile POS E2E test: navigate to /pos at 375×812, verify product grid shows 2 columns, add product via tap, open cart drawer via MobileCartBar, adjust quantity, tap Pay, complete payment in tests/e2e/mobile-pos.spec.ts
- [x] T012 [P] [US1] Write failing unit test for product search filter logic (filter by name substring, case-insensitive, debounced) in tests/unit/mobile-search.test.ts

### Implementation for User Story 1

- [x] T013 [P] [US1] Create MobileSearchBar component — collapsible inline search input with auto-focus, debounced onChange, clear button; only renders on mobile in src/components/pos/mobile-search-bar.tsx
- [x] T014 [P] [US1] Adjust product grid minmax to 140px for 2-col layout at 375px, ensure product cards have ≥44px touch targets in src/components/pos/product-grid.tsx
- [x] T015 [US1] Wire MobileSearchBar into POS page — add searchQuery state, pass to ProductGrid for filtering, show on mobile in place of ⌘K button in src/app/(dashboard)/pos/page.tsx
- [x] T016 [US1] Add search filtering to ProductGrid — filter products by name matching searchQuery prop in src/components/pos/product-grid.tsx
- [x] T017 [P] [US1] Refine CartDrawer at 375px — verify all cart actions accessible (quantity, remove, discount, customer, Pay/Hold/Clear), add safe area padding on footer in src/components/pos/cart-drawer.tsx
- [x] T018 [P] [US1] Verify/fix PaymentModal at 375px — numpad, payment type tabs, split payment UI, confirm button above safe area in src/components/pos/payment-modal.tsx
- [x] T019 [P] [US1] Verify MobileCartBar safe area insets — ensure pb-safe works with iOS Safari bottom bar in src/components/pos/mobile-cart-bar.tsx
- [x] T020 [US1] Update POS loading skeleton to show mobile layout (2-col product grid skeleton, hidden cart panel) when at mobile viewport in src/app/(dashboard)/pos/page.tsx
- [x] T021 [US1] Run mobile POS E2E test and unit test — verify both pass after implementation

**Checkpoint**: POS page fully functional on mobile. This is the MVP — can stop and validate here.

---

## Phase 4: User Story 2 — Manager Reviews Transactions on a Phone (Priority: P2)

**Goal**: Transactions page shows mobile-friendly card layout, row tap opens detail sheet, date filtering works at 375px. Orders page also optimized.

**Independent Test**: Navigate to /transactions on 375px, filter by date, scroll list, tap row to see detail — no horizontal scroll.

### Implementation for User Story 2

- [x] T022 [P] [US2] Add mobileCardRender to Transactions DataTable — card shows order#, customer, total, status badge, date in src/app/(dashboard)/transactions/page.tsx
- [x] T023 [US2] Add mobile transaction detail sheet — full-screen sheet showing all transaction fields (items, payment info, void status) triggered by row/card tap in src/app/(dashboard)/transactions/page.tsx
- [x] T024 [P] [US2] Verify Transactions filter bar layout at 375px — DateRangePicker, status filter, search input stack or scroll horizontally in src/app/(dashboard)/transactions/page.tsx
- [x] T025 [P] [US2] Optimize Orders page mobile layout — OrderBoard single-column tab view (New/Cooking/Ready tabs, one column visible at a time) in src/components/kitchen/order-board.tsx
- [x] T026 [P] [US2] Ensure Orders page wrapper uses full-width padding on mobile in src/app/(dashboard)/orders/page.tsx

**Checkpoint**: Transactions and Orders fully functional on mobile.

---

## Phase 5: User Story 4 — Manager Manages Products/Menu on a Phone (Priority: P3)

**Goal**: Menu page collapses from 3-panel layout to single-panel stacked navigation on mobile with back affordances.

**Independent Test**: Navigate to /menu on 375px, browse categories via horizontal scroll, select product, view detail in full-screen sheet, go back — all single-column.

### Implementation for User Story 4

- [x] T027 [US4] Add mobileView state ("categories" | "list" | "detail") to Menu page, toggle panels based on useIsMobile() in src/app/(dashboard)/menu/page.tsx
- [x] T028 [US4] Convert MenuSidebar to horizontal scrollable category chips on mobile in src/app/(dashboard)/menu/components/menu-sidebar.tsx (or inline in menu/page.tsx)
- [x] T029 [US4] Product detail opens as full-screen sheet with back button on mobile in src/app/(dashboard)/menu/components/product-panel.tsx
- [x] T030 [US4] Product grid: max 2 columns on mobile, list rows touch-friendly (≥44px row height) in src/app/(dashboard)/menu/components/product-cards.tsx

**Checkpoint**: Menu page fully functional on mobile with stacked navigation.

---

## Phase 6: User Story 5 — Staff Manages Ingredients/Inventory on a Phone (Priority: P3)

**Goal**: Ingredients list/detail works at 375px, inventory count has touch-friendly controls, waste page has mobile card view.

**Independent Test**: Navigate to /ingredients on 375px, tap ingredient, view detail, go back, start restock — all usable.

### Implementation for User Story 5

- [x] T031 [P] [US5] Refine Ingredients page mobile list/detail toggle at 375px — verify list fills screen, detail has clear back button, all info readable in src/app/(dashboard)/ingredients/page.tsx
- [x] T032 [P] [US5] Verify IngredientList renders touch-friendly rows at 375px (≥44px height, readable text) in src/components/ingredients/ingredient-list.tsx
- [x] T033 [P] [US5] Verify restock dialog form inputs are full-width on mobile, keyboard doesn't obscure submit in src/components/inventory/restock-dialog.tsx
- [x] T034 [US5] Optimize Inventory Count page for mobile — full-width ingredient rows, large stepper controls (≥44px buttons), quantity inputs ≥16px font in src/app/(dashboard)/ingredients/count/page.tsx
- [x] T035 [US5] Add mobileCardRender to Waste page DataTable — card shows date, ingredient, quantity, cost, reason in src/app/(dashboard)/waste/page.tsx

**Checkpoint**: Ingredients, Inventory Count, and Waste pages fully functional on mobile.

---

## Phase 7: User Story 6 — Manager Views Analytics on a Phone (Priority: P4)

**Goal**: Analytics dashboard, Daily Pulse, and Weekly pages render readable charts and stacked cards at 375px.

**Independent Test**: Open /analytics on 375px, verify summary cards stacked, charts fill width, toggle group visible.

### Implementation for User Story 6

- [x] T036 [P] [US6] Verify Analytics dashboard mobile layout — SummaryCardGrid 1-col, ToggleGroup doesn't overflow, charts fill width in src/app/(dashboard)/analytics/page.tsx
- [x] T037 [P] [US6] Verify Recharts axis labels readable on mobile — rotate or abbreviate if needed, ensure ResponsiveContainer fills viewport in src/app/(dashboard)/analytics/page.tsx
- [x] T038 [P] [US6] Optimize Daily Pulse page mobile layout — form cards stack vertically, inputs full-width, breadcrumb wraps in src/app/(dashboard)/analytics/daily-pulse/page.tsx
- [x] T039 [P] [US6] Optimize Weekly analytics page mobile layout — charts stack vertically, data tables use mobile card view in src/app/(dashboard)/analytics/weekly/page.tsx

**Checkpoint**: All analytics pages functional on mobile.

---

## Phase 8: User Story 7 — Manager Configures Settings on a Phone (Priority: P4)

**Goal**: Settings page tabs accessible, form fields usable, save button reachable at 375px.

**Independent Test**: Navigate to /settings on 375px, switch tabs, edit field, save — no cut-off inputs or unreachable buttons.

### Implementation for User Story 7

- [x] T040 [US7] Make Settings tab bar horizontally scrollable on mobile (overflow-x-auto or wrap) in src/app/(dashboard)/settings/page.tsx
- [x] T041 [US7] Ensure Settings form cards stack vertically at full width on mobile, all inputs ≥16px font size in src/app/(dashboard)/settings/page.tsx

**Checkpoint**: Settings page fully functional on mobile.

---

## Phase 9: User Story 8 — Admin Manages Users/Employees/Calendar/Audit Log (Priority: P4)

**Goal**: All remaining admin pages (Users, Employees, Customer detail, Employee detail, Audit Log, Calendar) work at 375px.

**Independent Test**: Navigate to each page on 375px, view list, tap for detail — no horizontal scroll.

### Implementation for User Story 8

- [x] T042 [P] [US8] Add mobileCardRender to Users DataTable — card shows name, username, status, role summary in src/app/(dashboard)/users/page.tsx
- [x] T043 [P] [US8] Add mobileCardRender to Employees DataTable — card shows name, position, status, contact in src/app/(dashboard)/employees/page.tsx
- [x] T044 [P] [US8] Optimize Employee detail page mobile layout — profile info, stats, action buttons stack vertically at 375px in src/app/(dashboard)/employees/[id]/page.tsx
- [x] T045 [P] [US8] Optimize Customer detail page mobile layout — profile, tab balance, stats, action buttons stack vertically at 375px in src/app/(dashboard)/customers/[id]/page.tsx
- [x] T046 [P] [US8] Add mobileCardRender to Customers DataTable — card shows name, phone, tab balance, status in src/app/(dashboard)/customers/page.tsx
- [x] T047 [P] [US8] Optimize Audit Log mobile layout — prefer timeline view on mobile, or add mobileCardRender to DataTable showing timestamp, actor, action in src/app/(dashboard)/audit-log/page.tsx
- [x] T048 [US8] Convert Calendar page to vertical day-list view on mobile — list of days with revenue, transactions, vibe; tap opens detail dialog; month nav preserved in src/app/(dashboard)/calendar/page.tsx

**Checkpoint**: All 19 dashboard pages now have mobile-optimized layouts.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Dynamic Type compliance, accessibility audits, and comprehensive regression testing across all stories

- [x] T049 Audit all fixed `h-*` classes on buttons, inputs, and interactive elements across all modified files — convert to `min-h-*` where text could overflow for Dynamic Type support
- [x] T050 [P] Font size audit — ensure no text below 12px on mobile, body text ≥14px, all form inputs ≥16px across all pages
- [x] T051 [P] Touch target audit — verify ≥44×44px on all interactive elements across all pages, add padding where needed
- [x] T052 [P] Safe area audit — verify all fixed/sticky bottom elements use pb-safe or env(safe-area-inset-bottom) across cart drawer, modals, and any floating elements
- [x] T053 [P] Skeleton screen audit — verify all page loading skeletons match mobile layout when at mobile viewport across all 19 pages
- [x] T054 Write comprehensive cross-page mobile smoke E2E test — visit all 19 pages at 375×812, assert no horizontal overflow and key elements visible in tests/e2e/mobile-smoke.spec.ts
- [x] T055 Run full test suite (`npm run test:all`), lint (`npm run lint`), and build (`npm run build`) — all must pass
- [x] T056 Manual QA walkthrough of all 19 pages on 375×812 Chrome DevTools viewport per quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 POS (Phase 3)**: Depends on Phase 2 — this is the MVP
- **US2 Transactions (Phase 4)**: Depends on Phase 2 (uses DataTable mobileCardRender from T006)
- **US4 Menu (Phase 5)**: Depends on Phase 2
- **US5 Ingredients (Phase 6)**: Depends on Phase 2 (uses DataTable mobileCardRender from T006)
- **US6 Analytics (Phase 7)**: Depends on Phase 2 (uses SummaryCardGrid from T007)
- **US7 Settings (Phase 8)**: Depends on Phase 2
- **US8 Admin pages (Phase 9)**: Depends on Phase 2 (uses DataTable mobileCardRender from T006)
- **Polish (Phase 10)**: Depends on all user story phases (3–9)

### User Story Dependencies

- **US1 (P1 - POS)**: Can start after Phase 2. No dependencies on other stories. **MVP target.**
- **US2 (P2 - Transactions)**: Can start after Phase 2. Independent of US1.
- **US3 (P2 - Navigation)**: Integrated into Phase 2 (Foundational). Prerequisite for all stories.
- **US4 (P3 - Menu)**: Can start after Phase 2. Independent of US1/US2.
- **US5 (P3 - Ingredients)**: Can start after Phase 2. Independent of US1/US2/US4.
- **US6 (P4 - Analytics)**: Can start after Phase 2. Independent.
- **US7 (P4 - Settings)**: Can start after Phase 2. Independent.
- **US8 (P4 - Admin)**: Can start after Phase 2. Independent.

### Within Each User Story

- Tests written first, verified to FAIL before implementation (Constitution Principle I)
- Component/utility changes before page-level wiring
- Core functionality before polish
- Story complete before starting next priority

### Parallel Opportunities

Within Phase 2 (Foundational): T004, T005, T006, T007, T008, T009 can all run in parallel (different files).

Within Phase 3 (US1 POS): T013, T014 in parallel (new file + different existing file). T017, T018, T019 in parallel (different component files).

Phases 4–9 (US2, US4–US8): All can run in parallel after Phase 2 completes — they modify different page files and have no cross-dependencies.

Within Phase 9 (US8): T042, T043, T044, T045, T046, T047 all in parallel (different page files).

Within Phase 10 (Polish): T050, T051, T052, T053 in parallel (different audit concerns).

---

## Parallel Example: User Story 1 (POS)

```bash
# Step 1 — Write failing tests in parallel:
Task T011: "Mobile POS E2E test in tests/e2e/mobile-pos.spec.ts"
Task T012: "Search filter unit test in tests/unit/mobile-search.test.ts"

# Step 2 — Build components in parallel:
Task T013: "MobileSearchBar component in src/components/pos/mobile-search-bar.tsx"
Task T014: "Product grid 2-col adjustment in src/components/pos/product-grid.tsx"

# Step 3 — Wire into page (depends on T013, T014):
Task T015: "Wire search bar into POS page"
Task T016: "Add search filtering to ProductGrid"

# Step 4 — Verify related components in parallel:
Task T017: "CartDrawer 375px refinement"
Task T018: "PaymentModal 375px verification"
Task T019: "MobileCartBar safe area"

# Step 5 — Final page updates:
Task T020: "POS skeleton mobile layout"
Task T021: "Run tests, verify pass"
```

## Parallel Example: All P4 Stories (Phases 7–9)

```bash
# These can all run simultaneously after Phase 2:
Agent 1: Phase 7 (US6 Analytics — T036-T039)
Agent 2: Phase 8 (US7 Settings — T040-T041)
Agent 3: Phase 9 (US8 Admin pages — T042-T048)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T010)
3. Complete Phase 3: User Story 1 - POS (T011–T021)
4. **STOP and VALIDATE**: Test POS on 375px phone — full checkout flow works
5. Deploy/demo if ready — the highest-value mobile workflow is live

### Incremental Delivery

1. Setup + Foundational → Mobile navigation and shared components ready
2. Add US1 POS → Test → Deploy (MVP! Revenue-critical path works on phone)
3. Add US2 Transactions → Test → Deploy (Managers can review sales on phone)
4. Add US4 Menu + US5 Ingredients → Test → Deploy (Product/inventory management on phone)
5. Add US6–US8 → Test → Deploy (All pages optimized)
6. Polish phase → Final QA → Complete

### Parallel Agent Strategy

With multiple agents/developers:

1. All complete Setup + Foundational together
2. Once Foundational is done:
   - Agent A: US1 POS (Phase 3) — highest priority
   - Agent B: US2 Transactions (Phase 4) — second priority
3. After US1/US2 validated:
   - Agent A: US4 Menu (Phase 5)
   - Agent B: US5 Ingredients (Phase 6)
   - Agent C: US6 Analytics + US7 Settings + US8 Admin (Phases 7–9, all parallel)
4. All agents: Polish phase (Phase 10, audit tasks in parallel)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US3 (Navigation) is embedded in Phase 2 (Foundational) since all pages depend on it
- Each user story is independently completable and testable after Phase 2
- Constitution Principle I: Write tests FIRST, verify they FAIL, then implement
- Total: 56 tasks across 10 phases
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
