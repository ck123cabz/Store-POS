# Feature Specification: Full Mobile Optimization

**Feature Branch**: `010-mobile-optimization`
**Created**: 2026-03-22
**Status**: Draft
**Input**: User description: "I want to fully mobile optimize this app. Let's set the smallest possible screen as iPhone 12 Mini."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - POS Operator Takes Orders on a Phone (Priority: P1)

A cashier or barista uses the POS screen on an iPhone 12 Mini to browse products, add them to a cart, and complete a payment. The product grid, cart interactions, and payment flow must be fully usable with touch on a 375×812 viewport without requiring zoom, horizontal scrolling, or squinting at undersized text.

**Why this priority**: The POS page is the revenue-critical workflow. If a staff member can't take orders on a phone, the entire mobile story fails. This page already has partial mobile support (MobileCartBar, CartDrawer) but needs refinement at the minimum viewport.

**Independent Test**: Can be fully tested by opening the POS page on an iPhone 12 Mini (or 375px viewport emulator), adding 3+ products to the cart, applying a discount, selecting a customer, and completing a cash payment — all without horizontal scrolling or unreachable UI elements.

**Acceptance Scenarios**:

1. **Given** the user opens the POS page on a 375px-wide screen, **When** they view the product grid, **Then** all product cards are fully visible without horizontal overflow and touch targets are at least 44×44 points.
2. **Given** the cart has items, **When** the user taps the mobile cart bar, **Then** the cart drawer slides up from the bottom and all cart actions (quantity adjust, remove, discount, pay, hold, clear) are reachable without scrolling past the fold.
3. **Given** the user taps "Pay", **When** the payment modal opens, **Then** the numpad, payment type selector, and confirm button all fit within the viewport and are operable with one thumb.
4. **Given** a product card shows availability status (low, critical), **When** viewed on mobile, **Then** the status badge is visible and the card is not clipped or overlapping.

---

### User Story 2 - Manager Reviews Transactions on a Phone (Priority: P2)

A store manager opens the Transactions page on a phone to review recent sales, check void status, or look up a specific order. The data table must be scannable and individual transaction details accessible without frustration.

**Why this priority**: Transaction lookup is the second most-used workflow on-the-go for managers who aren't at a desktop.

**Independent Test**: Can be tested by navigating to the Transactions page on a 375px viewport, filtering by date range, scrolling through the list, tapping a row to see transaction detail — all without horizontal scrolling blocking the view.

**Acceptance Scenarios**:

1. **Given** the user opens the Transactions page on mobile, **When** the table loads, **Then** only essential columns (order number, total, status, date) are visible and low-priority columns are hidden per the DataTable priority system.
2. **Given** the user taps a transaction row, **When** the detail view opens, **Then** all transaction details (items, payment info, void status) are readable in a full-screen sheet or stacked layout.
3. **Given** the user taps the date range filter on mobile, **When** the picker opens, **Then** it shows a single calendar month (not dual) and preset options are easily tappable.
4. **Given** the user opens the Orders page on mobile, **When** the order list loads, **Then** orders display in a scannable stacked card or list layout with status, total, and date visible at a glance.

---

### User Story 3 - Staff Navigates the App on a Phone (Priority: P2)

A staff member uses the sidebar navigation and header to move between pages on a phone. Navigation must feel native-app-like: the sidebar opens as a drawer overlay, the header is compact, and page transitions feel snappy.

**Why this priority**: Navigation is the backbone of the entire mobile experience. If moving between pages is clunky, every other mobile workflow suffers.

**Independent Test**: Can be tested by opening the app on a 375px viewport, toggling the sidebar, navigating to 5 different pages, and verifying the sidebar closes after selection and no content is hidden behind it.

**Acceptance Scenarios**:

1. **Given** the user is on any page on mobile, **When** they tap the sidebar trigger, **Then** the sidebar opens as an overlay drawer (not pushing content) and closes on outside tap or navigation.
2. **Given** the user navigates between pages, **When** each page loads, **Then** the page title/header is visible and does not overlap with the sidebar trigger or user menu.
3. **Given** the header is displayed on mobile, **When** the user views it, **Then** the header height does not consume more than 56px of vertical space and all actions (user menu, offline indicator) remain accessible.

---

### User Story 4 - Manager Manages Products/Menu on a Phone (Priority: P3)

A manager uses the Menu page on a phone to review products, check availability, or quickly update a price. The three-panel layout (sidebar + list + detail) must adapt to a single-panel stacked view.

**Why this priority**: Product management is done less frequently on mobile than POS or transactions, but must still be functional.

**Independent Test**: Can be tested by navigating to the Menu page on a 375px viewport, browsing categories, selecting a product, viewing its detail, and closing the panel — all in a stacked single-column flow.

**Acceptance Scenarios**:

1. **Given** the user opens the Menu page on mobile, **When** categories load, **Then** they display in a horizontal scrollable list or dropdown instead of a fixed sidebar.
2. **Given** the user selects a product, **When** the product detail opens, **Then** it appears as a full-screen panel or sheet with a back button to return to the list.
3. **Given** the user switches between grid and list view, **When** on mobile, **Then** the grid shows a maximum of 2 columns and list rows are touch-friendly.

---

### User Story 5 - Staff Manages Ingredients/Inventory on a Phone (Priority: P3)

A staff member checks ingredient stock levels, performs a quick restock, or runs an inventory count from a phone while physically in the storage area.

**Why this priority**: Inventory operations are a natural mobile use case (walking around the storage area), but the existing page already has partial mobile support with list/detail toggling.

**Independent Test**: Can be tested by navigating to the Ingredients page on a 375px viewport, scrolling through the ingredient list, tapping an ingredient to see its detail, and completing a restock action.

**Acceptance Scenarios**:

1. **Given** the user opens the Ingredients page on mobile, **When** the page loads, **Then** the list view fills the screen and the detail panel is hidden until an ingredient is tapped.
2. **Given** the user taps an ingredient, **When** the detail view shows, **Then** there is a clear back button and all detail information (stock level, par level, cost, history) is readable.
3. **Given** the user starts a restock dialog on mobile, **When** the form opens, **Then** inputs are full-width and the keyboard does not obscure the submit button.
4. **Given** the user opens the Inventory Count page on mobile, **When** the counting interface loads, **Then** the ingredient list and quantity inputs are full-width with large touch-friendly stepper controls.
5. **Given** the user opens the Waste page on mobile, **When** waste entries load, **Then** they display in a stacked list layout with touch-friendly actions for recording new waste.

---

### User Story 6 - Manager Views Analytics on a Phone (Priority: P4)

A manager checks the analytics dashboard on a phone to see today's revenue, transaction count, and top items.

**Why this priority**: Analytics viewing is useful on-the-go but is read-only and less time-sensitive.

**Independent Test**: Can be tested by opening the Analytics page on a 375px viewport and verifying summary cards stack vertically, charts resize to fit, and top items list is scrollable.

**Acceptance Scenarios**:

1. **Given** the user opens Analytics on mobile, **When** summary cards load, **Then** they stack in a single column with readable text and trend indicators.
2. **Given** a bar chart is displayed, **When** viewed on mobile, **Then** the chart resizes to fill the available width and axis labels are readable (rotated or abbreviated if needed).
3. **Given** the period toggle group is shown, **When** on mobile, **Then** all options (Today, Week, Month, Quarter) are visible and tappable without horizontal overflow.
4. **Given** the user opens the Daily Pulse or Weekly analytics sub-page on mobile, **When** the page loads, **Then** all charts, tables, and summary data stack vertically and are fully readable without horizontal scrolling.

---

### User Story 7 - Manager Configures Settings on a Phone (Priority: P4)

A manager accesses the Settings page on a phone to update store info, toggle tax, or adjust business rules.

**Why this priority**: Settings changes are infrequent and can usually wait for desktop, but should still be functional on mobile.

**Independent Test**: Can be tested by navigating to Settings on a 375px viewport, switching between tabs, editing a field, and saving — all without inputs being cut off or buttons unreachable.

**Acceptance Scenarios**:

1. **Given** the user opens Settings on mobile, **When** tabs load, **Then** the tab bar scrolls horizontally or wraps so all tabs are accessible.
2. **Given** the user edits a form field, **When** the on-screen keyboard appears, **Then** the input scrolls into view and the Save button remains accessible.
3. **Given** settings cards are displayed, **When** on mobile, **Then** cards stack vertically at full width with adequate spacing.

---

### User Story 8 - Admin Manages Users/Employees on a Phone (Priority: P4)

An admin views the user list or employee details on a phone to check permissions or review schedules.

**Why this priority**: User management is an admin-only, infrequent task but should remain accessible.

**Independent Test**: Can be tested by navigating to Users/Employees on a 375px viewport, viewing the list, and tapping to see detail — all without horizontal scrolling.

**Acceptance Scenarios**:

1. **Given** the user opens the Users or Employees page on mobile, **When** the table loads, **Then** only essential columns are shown and row actions are accessible via tap.
2. **Given** the user taps a row, **When** detail opens, **Then** it shows in a full-screen sheet with all fields readable.
3. **Given** the user navigates to an Employee or Customer detail page (`/employees/[id]` or `/customers/[id]`) on mobile, **When** the page loads, **Then** all profile info, stats, and action buttons stack vertically and are fully usable.
4. **Given** the user opens the Audit Log page on mobile, **When** entries load, **Then** audit entries display in a scannable vertical list with timestamps, actors, and actions visible without horizontal overflow.
5. **Given** the user opens the Calendar page on mobile, **When** the calendar view loads, **Then** it adapts to a single-column day/agenda view or a compact month grid that fits within 375px without horizontal scrolling.

---

### Edge Cases

- What happens when the on-screen keyboard opens while a form input is focused inside a modal/dialog?
- How does the app behave when the device rotates from portrait to landscape on a 375px-wide screen?
- When the user has large/accessibility font sizes enabled on iOS (Dynamic Type), all layouts must remain functional — text may wrap and elements may stack, but no content is clipped, overlapping, or unreachable.
- How does the floating MobileCartBar interact with iOS Safari's bottom nav bar and the safe area inset?
- What happens when a data table has zero rows on mobile — does the empty state display correctly?
- On mobile, the command palette (⌘K) is replaced by a sticky inline search bar at the top of the product grid. The ⌘K shortcut remains available on desktop.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST render all pages without horizontal overflow on viewports 375px wide and above (iPhone 12 Mini minimum).
- **FR-002**: All interactive touch targets (buttons, links, checkboxes, list rows) MUST meet a minimum of 44×44 CSS pixels as per Apple HIG.
- **FR-003**: The sidebar navigation MUST function as a full-screen overlay drawer on screens below 768px, closing when a link is tapped or the backdrop is touched.
- **FR-004**: Data tables MUST hide low-priority columns on mobile viewports and provide a way to access hidden data (via row tap to detail view or expandable row).
- **FR-005**: All modal dialogs and sheets MUST be usable on a 375px viewport — form inputs must not be cut off and primary action buttons must be visible without scrolling past the content.
- **FR-006**: Charts and data visualizations MUST resize responsively to fit within the mobile viewport width without horizontal scrolling.
- **FR-007**: The POS product grid MUST adapt its column count to fit the viewport (e.g., 2 columns on 375px) with product cards that are touch-friendly.
- **FR-008**: The POS cart experience on mobile MUST use the existing bottom sheet (CartDrawer) pattern and all cart actions must be accessible within it.
- **FR-009**: Multi-panel layouts (e.g., Menu page with sidebar + list + detail) MUST collapse to a single-panel stacked navigation on mobile with clear back/forward affordances.
- **FR-010**: Form inputs MUST be at least 16px font size on mobile to prevent iOS Safari auto-zoom on focus.
- **FR-011**: The app MUST respect iOS safe area insets (notch, home indicator) on all fixed/sticky elements using existing `viewportFit: cover` and `env(safe-area-inset-*)` values.
- **FR-012**: Page load skeleton screens MUST match the mobile layout (not the desktop layout) when viewed on mobile.
- **FR-013**: The date range picker MUST show a single calendar month on mobile (not dual-month).
- **FR-014**: Text content MUST remain readable at default font sizes — no text smaller than 12px on mobile, with body text at 14px minimum.
- **FR-015**: On mobile viewports, the POS page MUST replace the command palette (⌘K) with a sticky inline search bar at the top of the product grid for searching products, customers, and quick actions. The ⌘K shortcut remains available on desktop/tablet.
- **FR-016**: The app MUST support iOS Dynamic Type at all size settings including the largest accessibility sizes. Layouts MUST remain functional — text may wrap and elements may reflow/stack, but no content may be clipped, overlapping, or unreachable. Font sizes MUST use relative units (rem/em) rather than fixed pixel values.

### Key Entities

- **Viewport Breakpoint**: The minimum supported viewport is 375×812 CSS pixels (iPhone 12 Mini portrait). The mobile breakpoint remains 768px (existing `useIsMobile` threshold).
- **Touch Target**: A tappable UI element with minimum 44×44 CSS pixel hit area, with at least 8px spacing between adjacent targets.
- **Mobile Layout**: A single-column, vertically-stacked arrangement of content areas used on viewports below 768px, replacing multi-column desktop layouts.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of application pages render without horizontal scrollbar on a 375px-wide viewport in portrait orientation.
- **SC-002**: All primary user workflows (POS checkout, transaction lookup, ingredient restock) can be completed on a 375px viewport without requiring zoom or landscape rotation.
- **SC-003**: 95% of interactive elements meet the 44×44px minimum touch target size.
- **SC-004**: No form input on mobile triggers iOS Safari auto-zoom (all inputs ≥ 16px font size).
- **SC-005**: Page load time on mobile does not increase by more than 10% compared to the current baseline (no heavy mobile-only assets added).
- **SC-006**: The mobile cart flow (add products → view cart → pay) can be completed in under 30 seconds for a 3-item order.
- **SC-007**: All Playwright E2E smoke tests continue to pass when run at a 375×812 viewport size.
- **SC-008**: All primary workflows remain completable when iOS Dynamic Type is set to the largest accessibility size — no content is clipped or unreachable.

## Clarifications

### Session 2026-03-22

- Q: How should mobile users access search/quick-find on the POS page without ⌘K? → A: Replace command palette with a sticky inline search bar at the top of the product grid on mobile.
- Q: Should uncovered lower-traffic pages (Orders, Calendar, Waste, Audit Log, detail pages, analytics sub-pages) get full mobile optimization? → A: Yes, all 19 dashboard pages get full mobile optimization with explicit layouts, stacked views, and touch-optimized interactions.
- Q: Should the app support iOS Dynamic Type / accessibility font sizes? → A: Full Dynamic Type support — layouts must gracefully handle all iOS text size settings including the largest accessibility sizes.

## Assumptions

- **iPhone 12 Mini viewport**: 375×812 CSS pixels in portrait mode (the minimum target). All smaller devices (e.g., iPhone SE 1st gen at 320px) are out of scope.
- **Portrait-first**: Mobile optimization targets portrait orientation. Landscape will work but is not explicitly optimized.
- **Touch-only on mobile**: Mouse hover states are supplementary — all hover-dependent features must have touch alternatives.
- **Existing component library**: shadcn/ui components, Radix UI primitives, and existing custom components (ResponsiveDialog, MobileCartBar, CartDrawer, DataTable priority system) will be leveraged and extended rather than replaced.
- **PWA/native not in scope**: This feature is about responsive web optimization, not adding PWA capabilities or native app wrappers.
- **All 19 pages optimized**: Every dashboard page receives full mobile optimization — no page is left as "desktop-only" or "best effort". This includes lower-traffic pages like Orders, Calendar, Waste, Audit Log, detail pages, and analytics sub-pages.
- **No new pages or features**: This is a pure responsive adaptation of existing pages and workflows.
