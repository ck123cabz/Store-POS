# Feature Specification: UI/UX Refinement to Original Vision

**Feature Branch**: `001-ui-refinement`
**Created**: 2026-01-26
**Status**: Draft
**Input**: User description: "Refine UI/UX based on original vision from docs/plans + general smoothing and bug fixes"

## Overview

This specification captures UI/UX refinements needed to align the current Store-POS implementation with the original vision documented in `docs/plans/`, plus general UI smoothing to fix bugs, inconsistencies, and things that seem out of place. The system is functionally complete but needs visual polish.

**Reference Documents Analyzed:**
- `docs/plans/2025-01-25-inventory-employee-system-design.md` (ASCII UI mockups)
- `docs/plans/2025-01-26-phase1-foundation.md`
- `docs/plans/2025-01-26-phase4-pos-integration.md`
- `docs/plans/2025-01-26-phase6-reporting-polish.md`
- `docs/plans/2026-01-25-10-lever-financial-system-design.md`

## User Scenarios & Testing *(mandatory)*

### User Story 1 - UI Consistency & Design System Compliance (Priority: P1)

As a user navigating between different pages, I need a consistent visual experience so the app feels polished and professional rather than cobbled together.

**Why this priority**: Inconsistent styling affects every page and creates an unprofessional impression. Fixing this provides the foundation for all other refinements.

**Independent Test**: Can be tested by auditing color classes, spacing, and component variants across all pages for consistency.

**Acceptance Scenarios**:

1. **Given** any dashboard page, **When** viewing the layout, **Then** padding follows the standard pattern (consistent across all pages)
2. **Given** any page with secondary text, **When** viewing the content, **Then** muted text uses semantic tokens (`text-muted-foreground`) not hardcoded grays
3. **Given** any page with containers/cards, **When** viewing backgrounds, **Then** colors use semantic tokens (`bg-muted`, `bg-secondary`) not hardcoded grays
4. **Given** any page heading, **When** viewing the title, **Then** heading sizes follow consistent hierarchy
5. **Given** the sidebar navigation, **When** viewing active/inactive states, **Then** colors use semantic tokens that work with any theme

---

### User Story 2 - Enhanced POS Product Tile Status Indicators (Priority: P1)

As a cashier using the POS during a busy shift, I need to immediately identify product availability and pricing status at a glance so I can serve customers faster and avoid attempting to sell unavailable items.

**Why this priority**: POS is the primary revenue-generating interface used hourly. Clear visual feedback prevents transaction errors and customer delays.

**Independent Test**: Can be tested by viewing POS page with products in various stock states - visual inspection confirms status indicators match design specification.

**Acceptance Scenarios**:

1. **Given** a product is low on stock (below PAR level but not out), **When** viewing the POS grid, **Then** the product tile displays an orange warning badge with remaining quantity text (e.g., "5 left") and has an orange accent border
2. **Given** a product needs pricing (price is $0 or flagged), **When** viewing the POS grid, **Then** the product tile displays a red dashed border and "SET PRICE" label overlay
3. **Given** a product is out of stock (quantity = 0), **When** viewing the POS grid, **Then** the product tile is grayed out (opacity), disabled from clicking, and shows "OUT OF STOCK" badge
4. **Given** a product with linked ingredient is running low, **When** viewing the POS grid, **Then** the tile shows ingredient stock percentage badge with appropriate color coding

---

### User Story 3 - Sidebar Navigation with Status Badges (Priority: P2)

As a store manager, I need the sidebar navigation to show me counts/alerts at a glance so I can immediately know which areas need attention without navigating to each page.

**Why this priority**: Navigation is visible on every page; status badges enable proactive management without extra clicks.

**Independent Test**: Can be tested by viewing sidebar while database has items requiring attention in various categories - badges appear with correct counts.

**Acceptance Scenarios**:

1. **Given** there are 3 low-stock ingredients, **When** viewing the sidebar, **Then** the Ingredients menu item shows a warning badge with count "3"
2. **Given** there are 2 products needing pricing, **When** viewing the sidebar, **Then** the Pricing menu item shows a warning badge with count "2"
3. **Given** the user has 4 tasks total with 2 completed, **When** viewing the sidebar, **Then** the My Tasks menu item shows progress indicator "2/4"
4. **Given** no items require attention, **When** viewing the sidebar, **Then** no badges are displayed (clean navigation)

---

### User Story 4 - Employee Dashboard Timeline Visual Polish (Priority: P2)

As an employee checking my daily tasks, I need the timeline view to visually group tasks by shift section (Opening/Service/Closing) and show connected task flow so I can understand my workday structure at a glance.

**Why this priority**: Employee dashboard is used daily by all staff; improved visual hierarchy reduces confusion and increases task completion rates.

**Independent Test**: Can be tested by viewing employee dashboard with tasks across different shift sections - visual grouping and connectors are visible.

**Acceptance Scenarios**:

1. **Given** tasks exist for Opening, Service, and Closing sections, **When** viewing Timeline view, **Then** tasks are visually grouped with section headers (color-coded backgrounds)
2. **Given** multiple sequential tasks in a section, **When** viewing Timeline view, **Then** a visual connector line links task cards vertically
3. **Given** a task is overdue, **When** viewing Timeline view, **Then** the task card has prominent red accent and overdue indicator
4. **Given** employee has an active streak, **When** viewing the dashboard, **Then** streak count is prominently displayed in the stats area with milestone progress

---

### User Story 5 - Transaction History Quick Filters (Priority: P3)

As a store manager reviewing daily sales, I need quick date filter buttons (Today, Yesterday, This Week) so I can rapidly switch between common time ranges without using the date picker.

**Why this priority**: Speeds up common reporting workflows; reduces friction in daily operations review.

**Independent Test**: Can be tested by clicking quick filter buttons and verifying transaction list updates correctly.

**Acceptance Scenarios**:

1. **Given** I'm viewing the Transactions page, **When** I click "Today" quick filter, **Then** the transaction list filters to show only today's transactions
2. **Given** I'm viewing transactions, **When** I click "Yesterday" quick filter, **Then** the list updates to show only yesterday's transactions
3. **Given** I'm viewing transactions, **When** I click "This Week" quick filter, **Then** the list shows transactions from the current week
4. **Given** a quick filter is active, **When** I click it again, **Then** the filter is cleared (toggle behavior)

---

### User Story 6 - Calendar Day Vibe Color Coding (Priority: P3)

As a store owner reviewing business patterns, I need calendar days to be color-coded by business performance (vibe) so I can visually identify good and challenging days at a glance across the month view.

**Why this priority**: Enables quick pattern recognition without drilling into each day; supports strategic planning.

**Independent Test**: Can be tested by viewing calendar with days that have daily pulse entries with different vibe ratings.

**Acceptance Scenarios**:

1. **Given** a day has vibe "Crushed it", **When** viewing calendar month view, **Then** the day cell has green background/border
2. **Given** a day has vibe "Good", **When** viewing calendar month view, **Then** the day cell has light green/neutral background
3. **Given** a day has vibe "Rough", **When** viewing calendar month view, **Then** the day cell has orange/amber background
4. **Given** a day has no daily pulse entry, **When** viewing calendar month view, **Then** the day cell shows neutral styling

---

### Edge Cases

#### POS Product Tiles
- **EC-01**: Product is both low stock AND needs pricing → Show both indicators; pricing border takes precedence (red dashed), low-stock badge still displays *(subset of EC-04)*
- **EC-02**: Product is low stock AND linked ingredient is low → Show both badges; ingredient % badge takes precedence position (top-right), "X left" badge moves to bottom-right *(subset of EC-04)*
- **EC-03**: Product has `trackStock=false` but `quantity=0` → Do NOT show out-of-stock indicator (stock tracking disabled means ignore quantity)
- **EC-04**: Product has all three states (low stock + needs pricing + ingredient low) → Show pricing border + ingredient badge (top-right) + low-stock badge (bottom-right) *(superset: combines EC-01 + EC-02)*
- **EC-05**: Product becomes out-of-stock while in user's cart → Show warning icon on cart line item with message "Stock changed"; allow checkout but warn
- **EC-06**: Clicking disabled (out-of-stock) tile → No action, no error message (tile is non-interactive)

#### Sidebar Badges
- **EC-07**: Badge count exceeds 99 → Display "99+" to prevent layout overflow
- **EC-08**: Badge count is exactly 0 → Hide badge entirely (clean navigation)
- **EC-09**: Badge fetch fails during initial load → Show navigation without badges (no error state)
- **EC-10**: Badge fetch fails after successful display → Keep showing last known count until next successful fetch
- **EC-11**: User rapidly navigates between pages → Cancel in-flight badge requests, fetch fresh on new page

#### Employee Dashboard
- **EC-12**: Employee has no tasks assigned → Show empty state: "No tasks for today" with muted text, centered
- **EC-13**: Employee has streak of 0 (broken/new) → Show streak counter as "0" with message "Start your streak today!"
- **EC-14**: Task spans multiple shift sections (rare) → Display in earliest section (Opening > Service > Closing), add note "(continues in [section])"
- **EC-15**: Task is both overdue AND completed → Show as completed (green) with strikethrough text and small "completed late" indicator
- **EC-16**: All tasks in a section are completed → Section header shows checkmark icon, connector lines remain visible

#### Transaction Quick Filters
- **EC-17**: Quick filter returns 0 results → Show empty state: "No transactions found for [filter]" with suggestion to try different filter
- **EC-18**: User clicks same filter twice → Toggle off filter, show all transactions
- **EC-19**: User clicks different filter while one is active → Replace active filter (not additive)
- **EC-20**: Timezone handling → All date filters use browser's local timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone` (store timezone setting not available in current schema)

#### Calendar
- **EC-21**: Calendar spans year boundary (December-January) → Display correctly with year labels on month headers
- **EC-22**: Day has multiple daily pulse entries (rare edge case) → Use most recent entry's vibe for color
- **EC-23**: Future dates → Show neutral styling, clickable for planning (opens daily pulse form)
- **EC-24**: Partial week at month start/end → Show days from adjacent months in muted styling

#### Theme & Responsiveness
- **EC-25**: Theme changes (light/dark toggle) → All semantic tokens adapt immediately; no page refresh needed
- **EC-26**: Mobile sidebar collapsed → Badges appear as dots (no numbers) or hide entirely if space constrained
- **EC-27**: Window resized during use → All layouts reflow correctly; badges maintain positioning

## Requirements *(mandatory)*

### Visual Design Specifications

This section provides exact values for all visual elements to eliminate ambiguity during implementation.

#### Color Palette (Tailwind Classes)

| State/Purpose | Background | Border | Text |
|---------------|------------|--------|------|
| Low Stock Warning | `bg-orange-100` | `ring-2 ring-orange-400` | `text-orange-700` |
| Needs Pricing Error | `bg-red-50` | `border-2 border-dashed border-red-400` | `text-red-600` |
| Out of Stock Disabled | `bg-muted opacity-50` | none | `text-muted-foreground` |
| Complete/Success | `bg-green-100` | `ring-green-400` | `text-green-700` |
| In Progress | `bg-blue-100` | `ring-blue-400` | `text-blue-700` |
| Overdue | `bg-red-100` | `ring-2 ring-red-500` | `text-red-700` |
| Pending/Neutral | `bg-muted` | none | `text-muted-foreground` |

#### Calendar Vibe Colors

| Vibe | Background | Border | Distinguishing Feature |
|------|------------|--------|------------------------|
| Crushed it | `bg-green-200` | `ring-1 ring-green-400` | Darkest green, most saturated |
| Good | `bg-green-100` | none | Light green, no border |
| Meh | `bg-amber-100` | none | Amber/yellow tone |
| Rough | `bg-orange-200` | `ring-1 ring-orange-400` | Orange, visible border |
| No entry | `bg-background` | `border border-border` | Default styling, no color |

#### Opacity & Sizing Values

| Element | Property | Value |
|---------|----------|-------|
| Out-of-stock tile | opacity | `opacity-50` (50%) |
| Disabled tile | pointer-events | `pointer-events-none` |
| Badge max display | count threshold | 99 (display "99+" for higher) |
| Timeline connector line | width | `2px` |
| Timeline connector line | style | solid |
| Timeline connector line | color | `border-muted-foreground/30` |
| Streak counter | size | `text-2xl font-bold` |
| Streak milestone progress | display | Progress bar with percentage |
| Section header backgrounds | Opening | `bg-amber-50` |
| Section header backgrounds | Service | `bg-blue-50` |
| Section header backgrounds | Closing | `bg-purple-50` |

#### Badge Styling

| Badge Type | Style |
|------------|-------|
| Warning count (sidebar) | `bg-orange-500 text-white text-xs font-medium px-2 py-0.5 rounded-full` |
| Error count (sidebar) | `bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full` |
| Progress (sidebar) | `text-xs text-muted-foreground` (e.g., "2/4") |
| "X left" (POS tile) | `bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5 rounded` |
| "OUT OF STOCK" (POS tile) | `bg-muted text-muted-foreground text-xs font-medium uppercase` |
| "SET PRICE" (POS tile) | `bg-red-100 text-red-600 text-sm font-medium` |
| Ingredient % (POS tile) | Color varies by percentage (see FR-013 clarification) |

#### Ingredient Stock Percentage Display

| Stock Level | Display | Color |
|-------------|---------|-------|
| > 50% | "75%" | `text-green-600` |
| 25-50% | "35%" | `text-orange-600` |
| < 25% | "10%" | `text-red-600` |

### Functional Requirements

#### UI Consistency (Design System Compliance)
- **FR-001**: All pages MUST use consistent padding pattern (`p-4 md:p-6` standard)
- **FR-002**: All secondary/muted text MUST use `text-muted-foreground` instead of hardcoded `text-gray-*` classes
- **FR-003**: All container backgrounds MUST use semantic tokens (`bg-muted`, `bg-secondary`, `bg-background`) instead of hardcoded `bg-gray-*` classes
- **FR-004**: All page headings MUST use consistent sizing (`text-xl md:text-2xl font-bold`)
- **FR-005**: Sidebar active/inactive states MUST use semantic color tokens
- **FR-006**: All modals MUST use consistent max-width (`sm:max-w-md` for forms, allow exceptions for complex content)
- **FR-007**: All table action columns MUST use consistent width (`w-24`)
- **FR-008**: Form spacing MUST be standardized (`space-y-4` for form fields)
- **FR-009**: Empty state messages MUST use consistent padding (`py-8`) and centering

#### POS Product Tile Refinements
- **FR-010**: System MUST display orange warning border and "X left" badge on products with stock below PAR level
- **FR-011**: System MUST display red dashed border and "SET PRICE" overlay on products with price of 0 or needsPricing flag
- **FR-012**: System MUST gray out and disable product tiles when stock quantity equals 0
- **FR-013**: System MUST show linked ingredient stock percentage as colored badge on tiles

#### Sidebar Navigation
- **FR-014**: System MUST display notification badges on menu items when related items require attention
- **FR-015**: System MUST calculate and display accurate counts for: low-stock ingredients, needs-pricing products, task completion progress
- **FR-016**: System MUST hide badges when counts are zero
- **FR-017**: System MUST update badge counts on page navigation AND poll every 30 seconds while page is open

#### Employee Dashboard
- **FR-018**: System MUST group tasks visually by shift section with distinct header backgrounds
- **FR-019**: System MUST render visual connector lines between sequential tasks within a section
- **FR-020**: System MUST display prominent streak counter with milestone progress indicator
- **FR-021**: System MUST color-code task cards based on status (green=complete, red=overdue, blue=in-progress, gray=pending)

#### Transaction History
- **FR-022**: System MUST provide quick filter buttons for common date ranges (Today, Yesterday, This Week, Last Week, This Month)
- **FR-023**: System MUST allow toggling quick filters on/off
- **FR-024**: Quick filters MUST be visually indicated when active

#### Calendar View
- **FR-025**: System MUST color-code calendar day cells based on daily pulse vibe rating
- **FR-026**: Color coding MUST use consistent palette: green (Crushed it), light-green (Good), amber (Meh), orange (Rough)
- **FR-027**: Days without pulse entries MUST display neutral styling

### Non-Functional Requirements

#### Accessibility (A11y)

- **NFR-A01**: All interactive elements (buttons, tiles, filters) MUST be keyboard navigable using Tab/Shift+Tab
- **NFR-A02**: Quick filter buttons MUST have visible focus indicators (`ring-2 ring-ring ring-offset-2`)
- **NFR-A03**: POS product tiles MUST have `aria-disabled="true"` when out of stock
- **NFR-A04**: Out-of-stock tiles MUST NOT receive keyboard focus (removed from tab order with `tabindex="-1"`)
- **NFR-A05**: Sidebar badge counts MUST be announced to screen readers using `aria-label` (e.g., "Ingredients, 3 items need attention")
- **NFR-A06**: Badge count changes MUST use `aria-live="polite"` for screen reader announcements
- **NFR-A07**: Color-coded calendar days MUST have text labels or tooltips describing the vibe (not color-only information)
- **NFR-A08**: All status indicators MUST meet WCAG 2.1 AA color contrast requirements (4.5:1 for text, 3:1 for UI components)
- **NFR-A09**: Task cards MUST have `aria-label` describing status (e.g., "Task: Restock shelves, Status: Overdue")
- **NFR-A10**: Timeline section headers MUST use semantic heading elements (`<h3>`) for screen reader navigation

#### Performance

- **NFR-P01**: Badge count API response time SHOULD be under 500ms (best-effort, not strict SLA)
- **NFR-P02**: Badge polling MUST pause when browser tab is not visible (use `document.visibilityState`)
- **NFR-P03**: Badge polling MUST resume when tab becomes visible again
- **NFR-P04**: Quick filter clicks MUST be debounced (300ms) to prevent rapid API calls
- **NFR-P05**: Initial badge fetch MUST NOT block sidebar rendering (fetch after mount, show skeleton/nothing while loading)
- **NFR-P06**: Badge fetch requests MUST include `AbortController` to cancel in-flight requests on unmount
- **NFR-P07**: Calendar vibe data SHOULD be fetched once per month view, cached until month changes

#### Error Handling & Graceful Degradation

- **NFR-E01**: If badge count API returns error, system MUST hide badges silently (no error toast/message)
- **NFR-E02**: If badge count API fails 3 consecutive times, system MUST stop polling until next page navigation
- **NFR-E03**: If calendar vibe API fails, system MUST display neutral styling for all days (graceful degradation)
- **NFR-E04**: If quick filter API fails, system MUST show error toast and retain previous filter state
- **NFR-E05**: If POS product data fails to load status indicators, tiles MUST display without status badges (not crash)
- **NFR-E06**: Network errors during polling MUST NOT trigger error toasts (silent retry on next interval)
- **NFR-E07**: If a product becomes out-of-stock while in cart, system MUST show inline warning on cart item (not remove automatically)

### Loading & Transition States

#### Sidebar Badges
- **LS-01**: On initial page load, badge areas MUST show no content (not skeleton loaders) until first fetch completes
- **LS-02**: Badge counts MUST update immediately on successful fetch (no fade animation needed)
- **LS-03**: When transitioning from count to "99+", no special animation required

#### POS Product Tiles
- **LS-04**: Status indicators MUST render immediately with product data (no separate loading state)
- **LS-05**: If product data is loading, entire tile shows skeleton loader (not partial content)

#### Quick Filters
- **LS-06**: When filter is clicked, button MUST show active state immediately (optimistic UI)
- **LS-07**: Transaction list MUST show loading skeleton while fetching filtered results
- **LS-08**: If filter fails, button MUST revert to inactive state

#### Employee Timeline
- **LS-09**: Section headers MUST render immediately; task cards can load progressively
- **LS-10**: Connector lines MUST only render between loaded, adjacent task cards

#### Calendar
- **LS-11**: Calendar grid MUST render immediately with neutral styling
- **LS-12**: Vibe colors MUST be applied after data fetch (can cause visual shift, acceptable)

### Key Entities

This specification refines existing UI/UX; no new data entities are introduced. Existing entities involved:
- **Product**: Uses existing `needsPricing`, `quantity`, `trackStock`, `linkedIngredientId` fields
- **Ingredient**: Uses existing `quantity`, `parLevel` for stock status calculation
- **Task**: Uses existing status and section/category fields
- **DailyPulse**: Uses existing `vibe` field for calendar coloring

## Identified Bugs & Inconsistencies

The following specific issues were identified during codebase review:

### Color Token Issues (High Priority)
| Location | Issue | Fix |
|----------|-------|-----|
| `sidebar.tsx:86,106-107` | Hardcoded `bg-gray-50`, `bg-gray-200`, `text-gray-*` | Use `bg-muted`, `bg-accent`, `text-muted-foreground` |
| `layout.tsx:21` | Hardcoded `bg-gray-100` | Use `bg-muted` or `bg-background` |
| `product-card.tsx:73,82` | Hardcoded `bg-gray-100`, `text-gray-400` | Use `bg-muted`, `text-muted-foreground` |
| `payment-modal.tsx:152,228,229` | Hardcoded `bg-gray-50`, `text-gray-500` | Use semantic tokens |
| `header.tsx:22` | Hardcoded `text-gray-600` | Use `text-muted-foreground` |
| `cart.tsx:85` | Hardcoded `text-gray-500` | Use `text-muted-foreground` |
| `hold-modal.tsx:98` | Hardcoded `text-gray-400` | Use `text-muted-foreground` |
| `settings/page.tsx:284,293` | Hardcoded `bg-gray-50` | Use `bg-muted` |

### Spacing/Padding Issues (High Priority)
| Location | Issue | Fix |
|----------|-------|-----|
| Multiple pages | Mixed `p-4 md:p-6` vs `p-6` | Standardize to `p-4 md:p-6` |
| `settings/page.tsx` | Has `max-w-3xl` others don't | Add content width constraints consistently |
| Form spacing | Mixed `space-y-4` vs `space-y-6` | Standardize to `space-y-4` |

### Heading Size Issues (Medium Priority)
| Location | Issue | Fix |
|----------|-------|-----|
| `customers/page.tsx`, `settings/page.tsx` | Use `text-2xl` always | Use `text-xl md:text-2xl` for responsive |
| Other pages | Use `text-xl md:text-2xl` | Keep as standard |

### Modal/Table Issues (Medium Priority)
| Location | Issue | Fix |
|----------|-------|-----|
| `product-form.tsx` | Uses `sm:max-w-lg` default | Explicitly set `sm:max-w-md` for consistency |
| `product-table.tsx:76` | Actions column `w-28` | Standardize to `w-24` |
| `customers/page.tsx:183` | `colSpan={4}` may not match columns | Verify and fix colSpan values |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero hardcoded gray color classes remain in dashboard pages and components
  - *Verification*: `grep -r "gray-" src/` returns 0 matches in component/page files
- **SC-002**: All pages use identical padding pattern (`p-4 md:p-6`)
  - *Verification*: All dashboard page root containers use `p-4 md:p-6` class
- **SC-003**: All page headings use identical sizing pattern (`text-xl md:text-2xl font-bold`)
  - *Verification*: All `<h1>` elements on dashboard pages match pattern
- **SC-004**: Product availability status is visually distinct and immediately recognizable
  - *Verification*: Each status state (low-stock, needs-pricing, out-of-stock) has unique visual treatment per Visual Design Specifications
  - *Test*: Playwright visual regression test captures POS grid with all states
- **SC-005**: Sidebar badge counts accurately reflect actual database state
  - *Verification*: Integration test compares badge API response to direct database query
- **SC-006**: 100% of task cards in Timeline view are color-coded according to status specification
  - *Verification*: Each task status maps to exactly one color from Visual Design Specifications table
- **SC-007**: Quick filter buttons work correctly for all date ranges
  - *Verification*: E2E tests cover Today, Yesterday, This Week, Last Week, This Month filters
- **SC-008**: Calendar month view displays correct vibe colors for all days with daily pulse entries
  - *Verification*: Visual regression test + unit test mapping vibe→color
- **SC-009**: No visual regressions in existing functionality (all current features remain accessible)
  - *Verification*: Existing Playwright E2E tests pass; new visual regression baseline established
- **SC-010**: UI passes visual consistency audit
  - *Verification*: Checklist audit confirms: (1) consistent padding, (2) consistent headings, (3) semantic tokens used, (4) no hardcoded colors

### Accessibility Success Criteria

- **SC-A01**: All interactive elements are keyboard accessible
  - *Verification*: Tab through all pages; every button/link/input receives focus
- **SC-A02**: Screen reader announces badge changes
  - *Verification*: VoiceOver/NVDA test confirms `aria-live` announcements
- **SC-A03**: Color is not the only indicator for any status
  - *Verification*: Each color-coded element has text label, icon, or tooltip

## Clarifications

### Session 2026-01-27
- Q: What is the badge API latency target? → A: No specific target; best-effort performance acceptable (<500ms preferred)
- Q: Should sidebar badges refresh while user stays on a page? → A: Poll every 30 seconds while page is open
- Q: What defines "PAR level" for low-stock determination? → A: Each ingredient has a `parLevel` field; stock is "low" when `quantity <= parLevel`
- Q: What are streak milestones? → A: Milestones at 7, 14, 30, 60, 90 days. Progress bar shows % toward next milestone.
- Q: How is "below PAR level" calculated for products? → A: Product is low-stock when `quantity > 0 AND quantity <= parLevel` (if parLevel exists, else quantity <= 5)
- Q: What date range is "This Week"? → A: Monday 00:00:00 to current day 23:59:59 (ISO week, Monday start)
- Q: What date range is "Last Week"? → A: Previous Monday 00:00:00 to previous Sunday 23:59:59
- Q: What date range is "This Month"? → A: First day of current month 00:00:00 to current day 23:59:59

### Definitions

| Term | Definition |
|------|------------|
| PAR Level | Periodic Automatic Replenishment level; minimum stock threshold before reorder |
| Low Stock | `quantity > 0 AND quantity <= parLevel` (has stock but needs attention) |
| Out of Stock | `quantity = 0 AND trackStock = true` |
| Needs Pricing | `price = 0 OR needsPricing = true` |
| Streak | Consecutive days with all assigned tasks completed |
| Vibe | Daily pulse mood rating: "Crushed it", "Good", "Meh", "Rough" |
| Semantic Token | Tailwind CSS variable that adapts to theme (e.g., `bg-muted` vs `bg-gray-100`) |

## Assumptions

| Assumption | Validation Status | Notes |
|------------|-------------------|-------|
| The existing color palette and shadcn/ui design system will be enforced (not replaced) | ✅ Validated | Verified shadcn/ui CSS variables exist in `globals.css` |
| Badge counts will be fetched via one new API endpoint (`/api/sidebar-badges`) | ✅ Validated | Single endpoint more efficient than multiple calls |
| Mobile responsiveness will be maintained | ✅ Validated | Existing responsive patterns work; badges use dots on mobile |
| Performance: Badge data fetching uses best-effort (<500ms) | ✅ Validated | Simple DB queries, no complex aggregations needed |
| Changes are CSS/styling focused; no business logic changes required | ✅ Validated | Status calculations use existing fields |
| No new npm dependencies required | ✅ Validated | All features achievable with existing stack |
| `parLevel` field exists on Ingredient model | ✅ Verified | Confirmed in schema.prisma line 270 |
| `needsPricing` field exists on Product model | ✅ Verified | Confirmed in schema.prisma line 97 |
| Store timezone setting exists in Settings model | ❌ Not Present | Use browser timezone as fallback (Intl.DateTimeFormat) |

### Mobile Sidebar Behavior

When sidebar is collapsed on mobile:
- Badge counts hidden (space constraint)
- Visual indicator dot shows if any items need attention (orange dot = has items, no dot = clean)
- Full counts visible when sidebar expanded

## Out of Scope

- New features or functionality (this is polish/refinement only)
- Database schema changes
- Authentication or permission changes
- Third-party integrations
- Real-time WebSocket notifications (polling or fetch-on-navigation is acceptable)
- Complete redesign of any page layouts (only refinement of existing)
