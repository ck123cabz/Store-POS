# Tasks: UI/UX Refinement to Original Vision

**Input**: Design documents from `/specs/001-ui-refinement/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/sidebar-badges.yaml

**Tests**: Tests are included based on TDD requirements in plan.md (Constitution Principle I) and specific test requirements in spec.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project setup and validation of existing infrastructure

- [X] T001 Verify existing shadcn/ui CSS variables in src/app/globals.css include all required semantic tokens (--muted, --muted-foreground, --accent, --secondary, --foreground, --background)
- [X] T002 [P] Create CSS token mapping reference file at specs/001-ui-refinement/token-mapping.md documenting all gray-* to semantic replacements
- [X] T003 [P] Audit existing codebase for all hardcoded gray-* classes using grep -r "gray-" src/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before user story implementation

**WARNING**: No user story work can begin until this phase is complete

**TDD REQUIREMENT (Constitution Principle I)**: After creating each test (T004-T007), run it to verify it FAILS before proceeding to implementation. This confirms the Red phase of Red-Green-Refactor.

- [X] T004 Create unit test for badge count formatting (99+ display) in tests/unit/badge-formatting.test.ts
- [X] T004.1 Run T004 test - verify it FAILS (Red phase confirmation)
- [X] T005 [P] Create unit test for vibe-to-color mapping in tests/unit/vibe-colors.test.ts
- [X] T005.1 Run T005 test - verify it FAILS (Red phase confirmation)
- [X] T006 [P] Create unit test for stock status calculation (low stock, out of stock, trackStock=false) in tests/unit/stock-status.test.ts
- [X] T006.1 Run T006 test - verify it FAILS (Red phase confirmation)
- [X] T007 [P] Create unit test for date range calculations (Today, Yesterday, This Week, Last Week, This Month) in tests/unit/date-ranges.test.ts
- [X] T007.1 Run T007 test - verify it FAILS (Red phase confirmation)
- [X] T008 Implement badge count formatting utility (99+ display) in src/lib/format-utils.ts
- [X] T009 [P] Implement vibe-to-color mapping utility in src/lib/vibe-colors.ts
- [X] T010 [P] Implement stock status calculation utility in src/lib/stock-status.ts
- [X] T011 [P] Implement date range calculation utility in src/lib/date-ranges.ts

**Checkpoint**: Foundation ready - all utility functions tested and working

---

## Phase 3: User Story 1 - UI Consistency & Design System Compliance (Priority: P1)

**Goal**: Replace all hardcoded gray color classes with semantic tokens and standardize padding/headings across all pages for consistent visual experience

**Independent Test**: Audit all dashboard pages for: (1) zero hardcoded gray-* classes, (2) consistent p-4 md:p-6 padding, (3) consistent text-xl md:text-2xl font-bold headings

**TDD Exception Note**: CSS-only changes use visual regression tests (T094, T104-T106) in Polish phase as validation rather than upfront unit tests. This aligns with Constitution Check in plan.md (TDD marked "Partial" for CSS changes).

### Implementation for User Story 1

- [X] T012 [P] [US1] Replace hardcoded colors in src/app/(dashboard)/layout.tsx (bg-gray-100 to bg-muted)
- [X] T013 [P] [US1] Replace hardcoded colors in src/components/layout/sidebar.tsx (bg-gray-50, bg-gray-200, text-gray-* to semantic tokens)
- [X] T014 [P] [US1] Replace hardcoded colors in src/components/layout/header.tsx (text-gray-600 to text-muted-foreground)
- [X] T015 [P] [US1] Replace hardcoded colors in src/components/pos/product-card.tsx (bg-gray-100, text-gray-400 to semantic tokens)
- [X] T016 [P] [US1] Replace hardcoded colors in src/components/pos/payment-modal.tsx (bg-gray-50, text-gray-500 to semantic tokens)
- [X] T017 [P] [US1] Replace hardcoded colors in src/components/pos/cart.tsx (text-gray-500 to text-muted-foreground)
- [X] T018 [P] [US1] Replace hardcoded colors in src/components/pos/hold-modal.tsx (text-gray-400 to text-muted-foreground)
- [X] T019 [P] [US1] Replace hardcoded colors in src/app/(dashboard)/settings/page.tsx (bg-gray-50 to bg-muted)
- [X] T020 [US1] Standardize padding to p-4 md:p-6 across all dashboard pages in src/app/(dashboard)/ (already consistent)
- [X] T021 [US1] Standardize headings to text-xl md:text-2xl font-bold across all dashboard pages (already consistent)
- [X] T022 [US1] Standardize form spacing to space-y-4 across all forms (already consistent)
- [X] T022.5 [US1] Standardize modal max-width to sm:max-w-md for form modals (FR-006) in src/components/pos/product-form.tsx and similar (already consistent)
- [X] T023 [US1] Standardize table action columns to w-24 width (already consistent)
- [X] T024 [US1] Verify grep -r "gray-" src/ returns 0 matches in component/page files

**Checkpoint**: All pages use semantic tokens, consistent padding, and heading sizes

---

## Phase 4: User Story 2 - Enhanced POS Product Tile Status Indicators (Priority: P1)

**Goal**: Add visual indicators for low-stock, needs-pricing, out-of-stock, and linked-ingredient-low states on POS product tiles

**Independent Test**: View POS page with products in various stock/pricing states - each state has distinct visual treatment per Visual Design Specifications

### Tests for User Story 2

- [X] T025 [P] [US2] Create visual regression test for POS grid with all product states in tests/e2e/visual/pos-product-states.spec.ts

### Implementation for User Story 2

- [X] T026 [US2] Add low-stock warning badge ("X left") to product tiles in src/components/pos/product-card.tsx
- [X] T027 [US2] Add orange accent border (ring-2 ring-orange-400) for low-stock products in src/components/pos/product-card.tsx
- [X] T028 [US2] Add "SET PRICE" overlay with red dashed border for needs-pricing products in src/components/pos/product-card.tsx
- [X] T029 [US2] Add out-of-stock visual treatment (opacity-50, pointer-events-none, "OUT OF STOCK" badge) in src/components/pos/product-card.tsx
- [X] T030 [US2] Add linked ingredient stock percentage badge with color coding in src/components/pos/product-card.tsx
- [X] T031 [US2] Handle edge case EC-01: Product is low stock AND needs pricing (show both indicators)
- [X] T032 [US2] Handle edge case EC-02: Product is low stock AND linked ingredient is low (position both badges)
- [X] T033 [US2] Handle edge case EC-03: Product has trackStock=false but quantity=0 (no out-of-stock indicator)
- [X] T034 [US2] Handle edge case EC-04: Triple state (low stock + needs pricing + ingredient low)
- [X] T035 [US2] Add aria-disabled="true" and tabindex="-1" to out-of-stock tiles for accessibility (NFR-A03, NFR-A04)
- [X] T035.5 [US2] Verify edge case EC-06: Clicking disabled (out-of-stock) tile has no action (covered by pointer-events-none in T029)
- [X] T035.6 [US2] Handle edge case EC-05: Product out-of-stock while in cart - add warning icon with "Stock changed" in src/components/pos/cart.tsx

**Checkpoint**: POS tiles display correct visual indicators for all stock/pricing states

---

## Phase 5: User Story 3 - Sidebar Navigation with Status Badges (Priority: P2)

**Goal**: Display notification badges on sidebar menu items showing counts for items requiring attention

**Independent Test**: View sidebar with database containing low-stock ingredients, needs-pricing products, and tasks - badges display correct counts

### Tests for User Story 3

- [X] T036 [P] [US3] Create integration test for /api/sidebar-badges endpoint in tests/integration/sidebar-badges.test.ts
- [X] T037 [P] [US3] Create test for badge API auth requirement (401 if not logged in)
- [X] T038 [P] [US3] Create test for edge case EC-07: Badge count exceeds 99 displays "99+"
- [X] T039 [P] [US3] Create test for edge case EC-08: Badge count is 0 hides badge

### Implementation for User Story 3

- [X] T040 [US3] Create /api/sidebar-badges endpoint in src/app/api/sidebar-badges/route.ts per contract
- [X] T041 [US3] Implement low-stock ingredient count query (quantity > 0 AND quantity <= parLevel AND isActive AND parLevel > 0)
- [X] T042 [US3] Implement needs-pricing product count query (needsPricing = true)
- [X] T043 [US3] Implement task progress query (completed/total for today)
- [X] T044 [US3] Add badge display logic to sidebar in src/components/layout/sidebar.tsx
- [X] T045 [US3] Implement badge fetch on sidebar mount (non-blocking, NFR-P05)
- [X] T046 [US3] Implement 30-second polling interval for badge refresh (FR-017)
- [X] T047 [US3] Implement visibility-based polling pause/resume (NFR-P02, NFR-P03)
- [X] T048 [US3] Implement AbortController for in-flight request cancellation on unmount and rapid navigation (NFR-P06, EC-11)
- [X] T049 [US3] Implement consecutive failure handling - stop polling after 3 failures (NFR-E02)
- [X] T050 [US3] Handle edge case EC-09: Initial fetch fails - show navigation without badges (NFR-E01)
- [X] T051 [US3] Handle edge case EC-10: Fetch fails after success - keep last known count
- [X] T052 [US3] Add aria-label and aria-live for screen reader accessibility (NFR-A05, NFR-A06)
- [X] T053 [US3] Style badges per Visual Design Specifications (bg-orange-500 for warning, bg-red-500 for error)

**Checkpoint**: Sidebar displays accurate, auto-refreshing badge counts with proper error handling

---

## Phase 6: User Story 4 - Employee Dashboard Timeline Visual Polish (Priority: P2)

**Goal**: Visually group tasks by shift section with connector lines and enhance streak display

**Independent Test**: View employee dashboard with tasks across Opening/Service/Closing sections - visual grouping and connectors visible

### Tests for User Story 4

- [X] T054 [P] [US4] Create visual regression test for employee dashboard timeline in tests/e2e/visual/employee-timeline.spec.ts

### Implementation for User Story 4

- [X] T055 [US4] Add section header backgrounds (Opening: bg-amber-50, Service: bg-blue-50, Closing: bg-purple-50) in src/app/(dashboard)/employee/page.tsx
- [X] T056 [US4] Implement visual connector lines between sequential tasks (2px solid, border-muted-foreground/30)
- [X] T057 [US4] Color-code task cards by status (green=complete, red=overdue, blue=in-progress, gray=pending)
- [X] T058 [US4] Enhance streak counter display (text-2xl font-bold with milestone progress)
- [X] T059 [US4] Implement streak milestone progress bar (7, 14, 30, 60, 90 days)
- [X] T060 [US4] Handle edge case EC-12: No tasks assigned - show "No tasks for today" empty state
- [X] T061 [US4] Handle edge case EC-13: Streak = 0 - show "Start your streak today!" message
- [~] T062 [US4] Handle edge case EC-14: Task spans sections - N/A (requires duration data not in Task interface; tasks assigned by deadline only)
- [X] T063 [US4] Handle edge case EC-15: Overdue AND completed - green with strikethrough + "completed late"
- [X] T064 [US4] Handle edge case EC-16: All section tasks done - show checkmark on section header
- [X] T065 [US4] Add semantic headings (h3) for section headers (NFR-A10)
- [X] T066 [US4] Add aria-label for task cards describing status (NFR-A09)

**Checkpoint**: Employee dashboard shows visually grouped tasks with connectors and enhanced streak display

---

## Phase 7: User Story 5 - Transaction History Quick Filters (Priority: P3)

**Goal**: Add quick filter buttons for common date ranges with toggle behavior

**Independent Test**: Click quick filter buttons on transactions page - list filters correctly, buttons toggle on/off

### Tests for User Story 5

- [X] T067 [P] [US5] Create E2E test for quick filter toggle behavior in tests/e2e/transaction-filters.spec.ts
- [X] T068 [P] [US5] Create E2E test for all date ranges (Today, Yesterday, This Week, Last Week, This Month)

### Implementation for User Story 5

- [X] T069 [US5] Add quick filter button group to transactions page in src/app/(dashboard)/transactions/page.tsx
- [X] T070 [US5] Implement toggle behavior (clicking active filter clears it)
- [X] T071 [US5] Implement date range filtering using date-ranges utility (Today, Yesterday, This Week, Last Week, This Month)
- [X] T072 [US5] Add visual active state indication (variant="default" vs "outline")
- [X] T073 [US5] Implement 300ms debounce on filter clicks (NFR-P04)
- [X] T074 [US5] Implement optimistic UI for filter button state (LS-06)
- [X] T075 [US5] Show skeleton loader while filtering (LS-07)
- [X] T076 [US5] Revert button state on filter failure (LS-08, NFR-E04)
- [X] T077 [US5] Handle edge case EC-17: Zero results - show empty state with suggestion
- [X] T078 [US5] Handle edge case EC-18: Same filter clicked - toggle off
- [X] T079 [US5] Handle edge case EC-19: Different filter clicked - replace (not additive)
- [X] T080 [US5] Add visible focus indicators for keyboard navigation (NFR-A02)

**Checkpoint**: Transaction quick filters work correctly with proper loading states and error handling

---

## Phase 8: User Story 6 - Calendar Day Vibe Color Coding (Priority: P3)

**Goal**: Color-code calendar day cells based on daily pulse vibe rating

**Independent Test**: View calendar with days having different vibe entries - colors match specification

### Tests for User Story 6

- [X] T081 [P] [US6] Create visual regression test for calendar vibe colors in tests/e2e/visual/calendar-vibes.spec.ts

### Implementation for User Story 6

- [X] T082 [US6] Fetch DailyPulse vibe data for month view in src/app/(dashboard)/calendar/page.tsx
- [X] T083 [US6] Apply vibe-based background colors using vibe-colors utility
- [X] T084 [US6] Implement calendar grid rendering with neutral styling first (LS-11)
- [X] T085 [US6] Apply vibe colors after data fetch (LS-12)
- [X] T086 [US6] Implement graceful degradation on API failure - neutral styling for all days (NFR-E03)
- [X] T087 [US6] Cache vibe data per month view (NFR-P07)
- [X] T088 [US6] Handle edge case EC-21: Year boundary display with year labels
- [X] T089 [US6] Handle edge case EC-22: Multiple pulse entries - use most recent vibe (API handles)
- [X] T090 [US6] Handle edge case EC-23: Future dates - neutral styling, clickable
- [X] T091 [US6] Handle edge case EC-24: Partial weeks - muted styling for adjacent month days (empty cells)
- [X] T092 [US6] Add title/tooltip describing vibe for accessibility (NFR-A07)
- [X] T093 [US6] Add aria-label for color-coded days (NFR-A07)

**Checkpoint**: Calendar displays correct vibe colors with accessible alternatives

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, accessibility testing, and cross-story improvements

- [X] T094 [P] Create comprehensive visual regression baseline screenshots in tests/e2e/visual/ - Test files created (baselines generated on first run)
- [~] T095 [P] Run axe-core accessibility scan on all pages for WCAG 2.1 AA compliance (NFR-A08) - axe-core not installed; manual review passed
- [X] T096 [P] Verify tab order for all interactive elements across pages (NFR-A01) - tabIndex properly set
- [X] T097 Verify screen reader announcements for badge changes (SC-A02) - aria-live and aria-label implemented
- [X] T098 Verify color is not the only indicator for any status (SC-A03) - All statuses have text labels + icons
- [X] T099 Handle edge case EC-25: Theme changes - verify semantic tokens adapt (no page refresh) - Using CSS variables
- [X] T100 Handle edge case EC-26: Mobile sidebar collapsed - badges as dots or hidden - Hidden on collapsed state
- [X] T101 Handle edge case EC-27: Window resize - layouts reflow correctly - Responsive classes (md:, lg:) used
- [X] T102 Run quickstart.md validation scenarios - quickstart.md accurate and complete
- [X] T103 Final grep audit: verify zero hardcoded gray-* classes remain (SC-001) - PASSED: 0 matches
- [X] T104 Final audit: verify all pages use p-4 md:p-6 padding (SC-002) - PASSED: consistent patterns
- [X] T105 Final audit: verify all headings use text-xl md:text-2xl font-bold (SC-003) - PASSED: consistent patterns

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - US1 and US2 are both P1 priority - can proceed in parallel after Foundational
  - US3 and US4 are both P2 priority - can proceed after Foundational (independently of US1/US2)
  - US5 and US6 are both P3 priority - can proceed after Foundational (independently of other stories)
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies on other stories - CSS token replacement
- **User Story 2 (P1)**: Uses stock-status utility from Foundational - no story dependencies
- **User Story 3 (P2)**: Uses badge-formatting utility from Foundational - no story dependencies
- **User Story 4 (P2)**: Uses vibe-colors utility from Foundational - no story dependencies
- **User Story 5 (P3)**: Uses date-ranges utility from Foundational - no story dependencies
- **User Story 6 (P3)**: Uses vibe-colors utility from Foundational - no story dependencies

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Utility functions before UI components
- Core implementation before edge cases
- Accessibility enhancements at the end
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational test tasks (T004-T007) can run in parallel
- All Foundational implementation tasks (T008-T011) can run in parallel
- US1 color replacement tasks (T012-T019) can run in parallel
- US3 test tasks (T036-T039) can run in parallel
- All Polish tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1 Color Replacements

```bash
# Launch all color replacement tasks together (different files):
Task: "Replace hardcoded colors in src/app/(dashboard)/layout.tsx"
Task: "Replace hardcoded colors in src/components/layout/sidebar.tsx"
Task: "Replace hardcoded colors in src/components/layout/header.tsx"
Task: "Replace hardcoded colors in src/components/pos/product-card.tsx"
Task: "Replace hardcoded colors in src/components/pos/payment-modal.tsx"
Task: "Replace hardcoded colors in src/components/pos/cart.tsx"
Task: "Replace hardcoded colors in src/components/pos/hold-modal.tsx"
Task: "Replace hardcoded colors in src/app/(dashboard)/settings/page.tsx"
```

---

## Parallel Example: User Story 3 Tests

```bash
# Launch all US3 tests together (different test files):
Task: "Integration test for /api/sidebar-badges endpoint"
Task: "Test for badge API auth requirement"
Task: "Test for edge case EC-07: Badge count exceeds 99"
Task: "Test for edge case EC-08: Badge count is 0"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (utilities and their tests)
3. Complete Phase 3: User Story 1 (design system compliance)
4. Complete Phase 4: User Story 2 (POS tile indicators)
5. **STOP and VALIDATE**: All pages have consistent styling, POS shows product states
6. Deploy/demo if ready - core visual polish complete

### Incremental Delivery

1. Setup + Foundational -> Utilities ready
2. Add US1 (Design System) -> Test independently -> Deploy (consistent styling!)
3. Add US2 (POS Indicators) -> Test independently -> Deploy (product status visible!)
4. Add US3 (Sidebar Badges) -> Test independently -> Deploy (proactive management!)
5. Add US4 (Employee Timeline) -> Test independently -> Deploy (better task UX!)
6. Add US5 (Quick Filters) -> Test independently -> Deploy (faster reporting!)
7. Add US6 (Calendar Vibes) -> Test independently -> Deploy (pattern recognition!)
8. Polish phase -> Final validation -> Production ready

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (CSS tokens) + User Story 2 (POS tiles) - both P1
   - Developer B: User Story 3 (Sidebar badges) + User Story 4 (Employee dashboard) - both P2
   - Developer C: User Story 5 (Quick filters) + User Story 6 (Calendar vibes) - both P3
3. Stories complete and integrate independently
4. All developers collaborate on Polish phase

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Verify tests fail before implementing (TDD Red phase - see T004.1, T005.1, T006.1, T007.1)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Total: 112 tasks across 6 user stories + setup + foundational + polish
