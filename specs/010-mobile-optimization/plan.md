# Implementation Plan: Full Mobile Optimization

**Branch**: `010-mobile-optimization` | **Date**: 2026-03-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-mobile-optimization/spec.md`

## Summary

Fully optimize all 19 dashboard pages for mobile viewports down to iPhone 12 Mini (375×812 CSS pixels). This is a pure frontend/responsive adaptation — no API routes, database models, or backend logic changes. The approach leverages existing responsive infrastructure (useIsMobile hook, DataTable priority system, MobileCartBar, CartDrawer, ResponsiveDialog) and extends it systematically across every page. Key additions include an inline mobile search bar for POS, a mobile card view for DataTables, collapsed multi-panel layouts, and full iOS Dynamic Type support.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: React 19, Next.js 16 (App Router), Tailwind CSS 4.x, Radix UI, shadcn/ui, Recharts, Lucide React icons
**Storage**: N/A (no data changes — PostgreSQL with Prisma ORM unchanged)
**Testing**: Vitest (unit), Playwright (E2E — adding mobile viewport project)
**Target Platform**: Web — mobile Safari (iOS 15+), mobile Chrome (Android). Minimum viewport: 375×812px (iPhone 12 Mini portrait)
**Project Type**: Web application (Next.js monolith — frontend + API in same project)
**Performance Goals**: No more than 10% increase in page load time on mobile; POS 3-item checkout in <30 seconds on phone
**Constraints**: No horizontal scrollbar on any page at 375px; all touch targets ≥44×44px; all form inputs ≥16px font; full iOS Dynamic Type support
**Scale/Scope**: 19 dashboard pages, ~30-40 component files modified, 0 new API routes, 0 database migrations

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Test-First Development | ✅ PASS | Playwright E2E tests at 375×812 viewport will be written first (mobile smoke tests, POS flow, navigation). TDD applies to the Playwright test suite and any new utility functions. |
| II. Security-First | ✅ PASS (N/A) | No new API routes, no new data handling, no new auth flows. No expanded attack surface. |
| III. Pragmatic Simplicity | ✅ PASS | Leverages existing patterns (useIsMobile, DataTable priority, MobileCartBar, CartDrawer, ResponsiveDialog). New additions are minimal: mobileCardRender prop on DataTable, inline search component, mobile view state on Menu page. No new abstraction layers. |
| IV. Data Integrity | ✅ PASS (N/A) | No database operations, no data mutations. Pure UI/layout changes. |
| V. RESTful API Standards | ✅ PASS (N/A) | No API changes. |

**Post-Phase 1 re-check**: All gates still pass. No new dependencies, no new abstraction layers, no backend changes.

## Project Structure

### Documentation (this feature)

```text
specs/010-mobile-optimization/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 research findings
├── data-model.md        # N/A (no data changes)
├── quickstart.md        # Local testing guide
├── contracts/           # N/A (no API changes)
│   └── README.md
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── layout.tsx                          # Root layout (viewport meta — already configured)
│   ├── globals.css                         # Tailwind theme, safe area utilities, Dynamic Type helpers
│   └── (dashboard)/
│       ├── layout.tsx                      # Dashboard layout (sidebar + header + main)
│       ├── pos/page.tsx                    # P1: POS page (inline search, product grid, cart)
│       ├── transactions/page.tsx           # P2: Transactions (mobile card view, detail sheet)
│       ├── orders/page.tsx                 # P4: Kitchen orders (mobile tab view)
│       ├── menu/page.tsx                   # P3: Menu (collapsed multi-panel)
│       ├── ingredients/page.tsx            # P3: Ingredients (already has mobile toggle — refine)
│       ├── ingredients/count/page.tsx      # P3: Inventory count (touch-friendly steppers)
│       ├── analytics/page.tsx              # P4: Analytics dashboard (stacked cards, responsive charts)
│       ├── analytics/daily-pulse/page.tsx  # P4: Daily pulse (form stacking)
│       ├── analytics/weekly/page.tsx       # P4: Weekly analytics (chart stacking)
│       ├── customers/page.tsx              # P4: Customers list (mobile card view)
│       ├── customers/[id]/page.tsx         # P4: Customer detail (vertical stacking)
│       ├── employees/page.tsx              # P4: Employees list (mobile card view)
│       ├── employees/[id]/page.tsx         # P4: Employee detail (vertical stacking)
│       ├── users/page.tsx                  # P4: Users (mobile card view)
│       ├── settings/page.tsx               # P4: Settings (scrollable tabs, stacked cards)
│       ├── calendar/page.tsx               # P4: Calendar (mobile day-list view)
│       ├── waste/page.tsx                  # P4: Waste (mobile card view)
│       └── audit-log/page.tsx              # P4: Audit log (mobile timeline/card view)
├── components/
│   ├── layout/
│   │   ├── header.tsx                      # Compact mobile header (≤56px)
│   │   └── sidebar.tsx                     # Already has mobile drawer (verify)
│   ├── pos/
│   │   ├── product-grid.tsx                # Mobile: 2-col grid, adjusted minmax
│   │   ├── mobile-cart-bar.tsx             # Existing (verify safe area)
│   │   ├── cart-drawer.tsx                 # Existing (verify safe area, all actions)
│   │   ├── cart.tsx                        # Cart component (shared desktop/drawer)
│   │   ├── payment-modal.tsx               # Mobile payment flow (already uses useIsMobile)
│   │   └── mobile-search-bar.tsx           # NEW: Inline search for mobile POS
│   ├── ui/
│   │   ├── data-table.tsx                  # Add mobileCardRender prop
│   │   ├── date-range-picker.tsx           # Already has single-month mobile (verify)
│   │   ├── responsive-dialog.tsx           # Already Dialog↔Drawer (verify 375px)
│   │   ├── summary-card.tsx                # SummaryCardGrid: 1-col on mobile
│   │   └── sidebar.tsx                     # shadcn sidebar (mobile drawer behavior)
│   ├── kitchen/
│   │   └── order-board.tsx                 # Mobile: single-column tab view
│   └── ingredients/
│       └── ingredient-list.tsx             # Mobile list refinement
├── hooks/
│   └── use-mobile.ts                       # Existing useIsMobile (768px breakpoint)
└── types/                                  # No changes

tests/
├── e2e/
│   ├── smoke.spec.ts                       # Existing — add mobile viewport project
│   ├── pos-flow.spec.ts                    # Existing — extend for mobile cart drawer
│   ├── mobile-smoke.spec.ts                # NEW: Mobile-specific smoke tests
│   └── mobile-pos.spec.ts                  # NEW: Mobile POS workflow test
├── unit/
│   └── mobile-search.test.ts              # NEW: Search bar filter logic tests
└── playwright.config.ts                    # Add `mobile` project (375×812, touch)
```

**Structure Decision**: Existing Next.js monolith structure is retained. No new directories are created except for new test files. Changes are spread across existing page and component files. One new component (`mobile-search-bar.tsx`) is created for the POS inline search.

## Implementation Approach

### Phase 1: Foundation & Global Patterns (P2 - Navigation + Shared Components)

Establish the mobile baseline that all pages inherit:

1. **Playwright mobile project setup** — Add `mobile` project to playwright.config.ts (375×812, `isMobile: true`, `hasTouch: true`). Write initial mobile smoke test that navigates to each page and asserts no horizontal overflow.
2. **Global CSS updates** — Add safe area padding utilities, Dynamic Type-friendly min-height utilities, and any needed responsive helpers to globals.css.
3. **Header compact mobile mode** — Reduce header height to ≤56px on mobile. Ensure sidebar trigger and user menu are accessible.
4. **Sidebar verification** — Verify shadcn's SidebarProvider mobile drawer behavior. Ensure it closes on navigation and doesn't push content.
5. **DataTable mobileCardRender** — Add the optional `mobileCardRender` prop to DataTable component. When `useIsMobile()` is true and prop is provided, render cards instead of table rows. Pagination preserved.
6. **SummaryCardGrid mobile** — Ensure SummaryCardGrid renders 1 column on mobile (if not already).

### Phase 2: POS Page (P1 - Revenue-Critical Path)

The highest-priority page:

1. **Mobile inline search bar** — Create `MobileSearchBar` component. On mobile: visible search icon in POS header → expands to full-width input → filters product grid. Wire to ProductGrid.
2. **Product grid mobile optimization** — Adjust `minmax` in product grid to show 2 columns at 375px (e.g., `minmax(140px, 1fr)`). Ensure cards have 44px+ touch targets.
3. **Cart drawer refinement** — Verify all cart actions are accessible in CartDrawer at 375px. Ensure safe area padding on footer. Test discount input, customer selector, Pay/Hold/Clear buttons.
4. **Payment modal mobile** — Already uses `useIsMobile`. Verify numpad, payment type tabs, split payment UI all fit at 375px. Ensure confirm button above safe area.
5. **POS skeleton mobile** — Update loading skeleton to match 2-col product grid and hidden cart panel on mobile.
6. **Mobile POS E2E test** — Full workflow: search product → add to cart → view cart drawer → apply discount → pay → confirm.

### Phase 3: Data-Heavy Pages (P2 - Transactions, P3 - Ingredients/Menu, P4 - Others)

Apply mobile patterns to all remaining pages:

**Transactions (P2)**:
- Add `mobileCardRender` to Transactions DataTable showing order#, total, status, date.
- Row tap opens full-screen transaction detail sheet.
- Verify DateRangePicker shows single-month on mobile.
- Mobile E2E: navigate, filter, view detail.

**Menu (P3)**:
- Add `mobileView` state (`"list"` | `"detail"`) similar to Ingredients page.
- Categories: horizontal scroll chips on mobile instead of sidebar panel.
- Product detail: full-screen sheet/panel with back button on mobile.
- Grid: max 2 columns on mobile.

**Ingredients (P3)**:
- Refine existing mobile list/detail toggle at 375px.
- Verify restock dialog form inputs are full-width.
- Inventory Count page: full-width stepper controls with larger touch targets.
- Waste page: add `mobileCardRender` to DataTable.

**Orders/Kitchen (P4)**:
- Mobile: show one column at a time with tab switcher (New/Cooking/Ready).
- Each order card should be full-width with readable text.

**Analytics (P4)**:
- SummaryCardGrid 1-col on mobile.
- Recharts ResponsiveContainer already handles width — verify axis labels are readable.
- Period ToggleGroup: verify it doesn't overflow at 375px.
- Daily Pulse: form cards stack vertically.
- Weekly: charts stack vertically.

**Calendar (P4)**:
- Mobile: convert calendar grid to vertical day-list view.
- Day tap opens existing detail dialog.
- Summary cards stacked above.

**Customers (P4)**:
- Add `mobileCardRender` to DataTable.
- Customer detail page ([id]): verify vertical stacking at 375px.

**Users/Employees (P4)**:
- Add `mobileCardRender` to DataTable.
- Employee detail page ([id]): verify vertical stacking at 375px.

**Settings (P4)**:
- Tab bar: horizontal scroll overflow or wrap on mobile.
- Form cards: full-width stacking.
- Inputs: verify ≥16px font size (prevent auto-zoom).

**Audit Log (P4)**:
- Already has timeline view as alternative — prefer on mobile.
- If DataTable view: add `mobileCardRender`.

### Phase 4: Dynamic Type & Polish

1. **Dynamic Type audit** — Audit all fixed `h-*` classes on buttons, inputs, and interactive elements. Convert to `min-h-*` where text could overflow.
2. **Font size audit** — Ensure no text below 12px on mobile, body text ≥14px, inputs ≥16px.
3. **Touch target audit** — Verify 44×44px minimum on all interactive elements. Add padding where needed.
4. **Safe area audit** — Verify all fixed/sticky bottom elements use `pb-safe` or `env(safe-area-inset-bottom)`.
5. **Skeleton screen audit** — Verify all page skeletons show mobile layout when at mobile viewport.
6. **Cross-page mobile smoke test** — Comprehensive Playwright test visiting all 19 pages at 375×812, asserting no horizontal overflow and key elements visible.

### Phase 5: Final Verification

1. **Run full test suite** — `npm run test:all` including mobile viewport projects.
2. **Lint** — `npm run lint` with no errors.
3. **Build** — `npm run build` succeeds.
4. **Manual QA** — Walk through all 19 pages on 375×812 Chrome DevTools viewport.
5. **Dynamic Type QA** — Test at largest iOS text size on real device or Simulator.

## Complexity Tracking

No constitution violations. No complexity justifications needed.

| Item | Assessment |
|------|-----------|
| New components | 1 (`MobileSearchBar`) — justified by FR-015 |
| New test files | 3 (`mobile-smoke.spec.ts`, `mobile-pos.spec.ts`, `mobile-search.test.ts`) — required by Constitution Principle I |
| Modified components | ~30-40 files across pages and shared components |
| New dependencies | 0 |
| New API routes | 0 |
| Database migrations | 0 |
