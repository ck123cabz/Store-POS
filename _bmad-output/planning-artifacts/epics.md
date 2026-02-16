---
stepsCompleted: [1, 2, 3]
epicStatus:
  1: complete
  2: complete
  3: complete
  4: pending
  5: pending
  6: pending
  7: pending
  8: pending
inputDocuments:
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/ux-design-directions.html
  - CLAUDE.md
---

# Store-POS - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Store-POS's Linear-inspired UI redesign, decomposing the UX Design Specification into implementable stories organized by the 7-phase component implementation roadmap. This is a UI redesign of an existing working system — all functionality is preserved, the visual language and interaction patterns are upgraded.

## Requirements Inventory

### Functional Requirements

FR1: Product grid displays all products with image, name, price, and stock status — filterable by category
FR2: Cart sidebar shows current order with add, remove (swipe), quantity edit, subtotal/tax/total
FR3: Cash payment with denomination buttons, numpad, change calculation, and success animation
FR4: GCash payment with optional photo capture of receipt via camera or file upload
FR5: Split payment with auto-calculated Cash + GCash amounts and sequential processing
FR6: Pay Later flow with customer search/create and tab assignment
FR7: Hold Order with save and recall functionality
FR8: Kitchen order board with 3-column kanban (NEW/COOKING/READY) and urgency escalation
FR9: Sound notification on new kitchen orders (configurable)
FR10: Data tables for Transactions, Ingredients, Customers, Users, Audit Log, Waste with sorting, filtering, pagination
FR11: Detail panels slide in from right for all entity types (products, customers, ingredients, transactions)
FR12: Cross-entity navigation — tap entity name anywhere to open its detail panel
FR13: Cascading panels (max 2 deep on tablet) with breadcrumb trail
FR14: Product form with inline recipe builder and live cost/margin calculation
FR15: Restock dialog accessible from any context with smart defaults (last cost, last vendor)
FR16: Inventory count flow with category sections, quick confirm, discrepancy modal, draft system
FR17: Universal search across all entity types with grouped results
FR18: Analytics dashboard with summary cards, trend indicators, and charts
FR19: Calendar view with daily activity summaries
FR20: Sidebar navigation with grouped sections, badge counts, and dark mode toggle
FR21: Offline indicator with queued transaction count
FR22: Tab settlement flow from customer panel with payment method selection

### NonFunctional Requirements

NFR1: Cash sale completes in < 10 seconds (3 taps minimum)
NFR2: GCash payment completes in < 20 seconds
NFR3: Split payment completes in < 25 seconds
NFR4: Pay Later completes in < 12 seconds
NFR5: Kitchen status change in < 3 seconds per action
NFR6: Optimistic UI updates — no spinner for actions < 200ms
NFR7: WCAG 2.1 Level AA accessibility compliance
NFR8: Touch targets ≥ 44×44px on touch devices, ≥ 48px for POS actions
NFR9: All animations respect prefers-reduced-motion
NFR10: Dark mode support with proper contrast ratios
NFR11: Tablet-first responsive design (768px primary breakpoint)
NFR12: Phone-compatible layouts for all screens
NFR13: Offline transaction queue with silent sync
NFR14: 5-second polling for kitchen orders
NFR15: Progressive loading with skeleton placeholders (no spinners for page content)
NFR16: All design tokens in OKLCH color space
NFR17: Font loading via next/font — no FOUT/FOUC
NFR18: Maximum 2 cascading panels on tablet
NFR19: Filter state persists in URL query params
NFR20: Auto-save inventory count drafts every 30 seconds

### Additional Requirements

From UX Design Specification:
- Inter (primary) + JetBrains Mono (numeric/code) font system
- 4px base / 8px primary spacing grid — strict adherence
- Two-level shadow system: shadow-none (default) + shadow-float (overlays only)
- Border radius: 6px buttons, 8px cards, 12px modals
- Monochromatic UI (95% grays, 4 semantic status colors only)
- 4 semantic status colors: ok (green), warning (amber), critical (red), info (blue)
- Typography hierarchy: weight first → size → color as last resort
- StatusDot replaces all hardcoded colored badges
- EntityLink component for "everything connects" pattern
- Undo toast (5s window) for non-destructive actions instead of confirmation dialogs
- Confirmation dialogs reserved for irreversible actions only (void, delete, submit count)
- Toast notifications: bottom-right tablet, bottom-center phone, max 3 stacked
- Form validation: on-blur for fields, on-submit for all, clear on change after error
- Button hierarchy: Primary (one per context), Secondary, Ghost, Destructive
- Smart defaults: Cash default payment, last cost/vendor for restock, most-used category

From Existing Architecture:
- Next.js 16 App Router
- React 19 with Tailwind CSS 4
- shadcn/ui components (clean reinstall with new tokens)
- Prisma ORM with PostgreSQL
- NextAuth.js v5 authentication
- Existing E2E tests (Playwright) must continue passing
- Existing API routes unchanged — this is a frontend-only redesign

### FR Coverage Map

| FR | Epic | Stories |
|----|------|---------|
| FR1 | Epic 3 | 3.1, 3.2 |
| FR2 | Epic 3 | 3.3 |
| FR3 | Epic 3 | 3.4 |
| FR4 | Epic 3 | 3.5 |
| FR5 | Epic 3 | 3.6 |
| FR6 | Epic 3 | 3.7 |
| FR7 | Epic 3 | 3.8 |
| FR8 | Epic 5 | 5.1, 5.2 |
| FR9 | Epic 5 | 5.2, 5.3 |
| FR10 | Epic 4 | 4.4, 4.7, 4.8 |
| FR11 | Epic 4 | 4.3 |
| FR12 | Epic 4 | 4.2 |
| FR13 | Epic 4 | 4.3 |
| FR14 | Epic 6 | 6.2 |
| FR15 | Epic 6 | 6.1 |
| FR16 | Epic 6 | 6.3 |
| FR17 | Epic 2 | 2.2 |
| FR18 | Epic 7 | 7.1 |
| FR19 | Epic 7 | 7.2 |
| FR20 | Epic 2 | 2.1, 2.4 |
| FR21 | Epic 2 | 2.3 |
| FR22 | Epic 4 | 4.3, 4.8 |

## Epic List

| Epic | Title | Stories | Dependencies | Status |
|------|-------|---------|-------------|--------|
| 1 | Design Token Foundation | 4 | None | Complete |
| 2 | App Shell & Navigation | 4 | Epic 1 | Complete |
| 3 | POS Terminal Redesign | 8 | Epic 1, 2 | Complete |
| 4 | Data Tables, Panels & Shared Components | 8 | Epic 1, 2 | Pending |
| 5 | Kitchen Order Board | 3 | Epic 1, 4 (StatusDot) | Pending |
| 6 | Forms & Dialogs Redesign | 4 | Epic 1, 4 (DetailPanel) | Pending |
| 7 | Analytics & Calendar Redesign | 2 | Epic 1, 4 (SummaryCard) | Pending |
| 8 | Polish, Empty States & Dark Mode Validation | 5 | Epics 1-7 | Pending |

## Epic 1: Design Token Foundation

**Status:** Complete

**Goal:** Establish the complete design token system (colors, typography, spacing, shadows, radii) in globals.css and Tailwind config before any component work begins. This is the foundation that every subsequent epic inherits.

**Dependencies:** None — this is the first epic.

### Story 1.1: Implement OKLCH Color Token System

As a developer,
I want all CSS custom properties defined in OKLCH color space with light and dark mode variants,
So that every component inherits the correct colors automatically through Tailwind's theme system.

**Acceptance Criteria:**

**Given** the globals.css file exists
**When** I define the `:root` and `.dark` CSS custom property blocks
**Then** all 16 neutral tokens are defined in OKLCH (--background, --foreground, --card, --card-foreground, --muted, --muted-foreground, --border, --input, --ring, --primary, --primary-foreground, --secondary, --secondary-foreground, --accent, --accent-foreground, --destructive, --destructive-foreground)
**And** all 4 semantic status tokens are defined (--status-ok: oklch(0.52 0.14 155), --status-warning: oklch(0.68 0.16 70), --status-critical: oklch(0.577 0.245 27), --status-info: oklch(0.55 0.12 250))
**And** all 5 sidebar tokens are defined for both light and dark mode
**And** dark mode values are defined under `.dark` class
**And** foreground-on-background contrast ratio meets WCAG 2.1 AA (≥4.5:1 for body text, ≥3:1 for large text)
**And** muted-foreground on background achieves ≥4.5:1 contrast

### Story 1.2: Configure Typography System with Inter and JetBrains Mono

As a developer,
I want Inter as the primary typeface and JetBrains Mono for numeric/code content with a strict type scale,
So that typography-driven hierarchy replaces color-based emphasis across the app.

**Acceptance Criteria:**

**Given** the app layout.tsx and Tailwind config exist
**When** I configure the font system
**Then** Inter variable font is loaded via next/font/google with weights 400, 500, 600, 700
**And** JetBrains Mono is loaded for monospace with weights 400, 500
**And** the type scale is defined: text-xs (12px/16px), text-sm (13px/18px), text-base (14px/20px), text-lg (16px/24px), text-xl (20px/28px), text-2xl (24px/32px)
**And** on tablet (≥768px), text-base bumps to 15px via media query or Tailwind config
**And** CSS variable --font-sans maps to Inter, --font-mono maps to JetBrains Mono
**And** previous font references (Plus Jakarta Sans) are fully replaced

### Story 1.3: Define Spacing, Radius, and Shadow System

As a developer,
I want a strict 4px-based spacing grid, tight border radius scale, and two-level shadow system,
So that mathematical spacing consistency creates the "everything feels right" sensation.

**Acceptance Criteria:**

**Given** globals.css and Tailwind config exist
**When** I configure spacing, radii, and shadows
**Then** spacing uses Tailwind's default 4px grid (no custom overrides needed — just enforce discipline)
**And** border radius scale is defined: --radius-sm (4px), --radius (6px), --radius-md (8px), --radius-lg (12px), --radius-full (9999px)
**And** shadow system has exactly two levels: shadow-none (default for everything) and shadow-float for overlays only
**And** previous shadow variables (--shadow-xs through --shadow-2xl) are removed
**And** the --radius CSS variable is set to 0.375rem (6px) as the base for shadcn components

### Story 1.4: Validate Design Tokens Against HTML Mockup

As a developer,
I want to visually verify the implemented tokens match the validated HTML mockup,
So that the design direction approved in the UX spec is faithfully reproduced.

**Acceptance Criteria:**

**Given** all tokens from Stories 1.1-1.3 are implemented
**When** I render the login page and any basic page with the new tokens
**Then** background color matches mockup (near-white, barely warm in light mode)
**And** text hierarchy shows clear weight differentiation (400 → 500 → 600 → 700)
**And** borders are hairline and barely visible (1px, low opacity)
**And** dark mode inverts cleanly with no contrast issues
**And** no hardcoded color values remain in globals.css outside the token system
**And** Inter font renders correctly at all scale sizes
**And** npm run build completes without errors
**And** existing E2E smoke tests pass

## Epic 2: App Shell & Navigation

**Status:** Complete

**Goal:** Rebuild the app shell (sidebar, header, navigation structure) with the new design tokens, establishing the persistent navigation framework that all screens live inside.

**Dependencies:** Epic 1 (Design Token Foundation) must be complete.

### Story 2.1: Redesign Sidebar with Linear-Inspired Styling

As a user,
I want a clean, persistent sidebar navigation with grouped sections, subtle active states, and badge counts,
So that I can navigate the entire system without visual clutter or confusion.

**Acceptance Criteria:**

**Given** the AppSidebar component exists at src/components/layout/sidebar.tsx
**When** I redesign it with the new design tokens
**Then** sidebar width is 240px on tablet (≥768px) and collapses on phone (<768px)
**And** navigation items use stroke-only Lucide icons at 20px + text labels
**And** active state uses bg-sidebar-accent fill + font-medium text (no colored highlight)
**And** badge counts appear right-aligned as pills with real-time updates
**And** sections are logically grouped (Sales, Inventory, Management) with separators between groups
**And** sidebar background uses --sidebar token, border uses --sidebar-border
**And** collapsed sidebar on phone opens as a Sheet overlay
**And** existing E2E tests using getByRole('link', { name: '...' }) continue to pass
**And** SidebarMenuButton uses asChild to preserve Link rendering

### Story 2.2: Redesign Page Header with Breadcrumb and Search

As a user,
I want a clean page header with the page title, breadcrumb trail, and search bar,
So that I always know where I am and can find anything quickly.

**Acceptance Criteria:**

**Given** the Header component exists at src/components/layout/header.tsx
**When** I redesign it with the new design tokens
**Then** page title uses text-2xl font-bold tracking-tight
**And** breadcrumb appears below the title when deeper than top-level navigation
**And** search bar is persistent on tablet (input field in header area)
**And** search bar collapses to a search icon on phone
**And** header has no shadow — separated from content by hairline border only
**And** mobile hamburger menu trigger appears on phone (<768px) to open sidebar Sheet

### Story 2.3: Build OfflineIndicator Component

As a user,
I want a subtle visual indicator when the system is operating offline with queued transaction count,
So that I know my work is saved but not yet synced without feeling alarmed.

**Acceptance Criteria:**

**Given** the app detects network connectivity changes
**When** the connection is lost
**Then** a small indicator appears in the header: cloud-off icon + "Offline · N queued"
**And** the indicator uses amber/warning tint (not red — offline is handled, not an error)
**And** when syncing, the indicator pulses subtly
**And** when back online, it briefly shows "Back online ✓" for 2 seconds then hides
**And** the indicator uses aria-live="polite" for screen reader announcement
**And** prefers-reduced-motion disables the pulse animation

### Story 2.4: Implement Dark Mode Toggle

As a user,
I want to toggle between light and dark mode,
So that I can use dark mode for kitchen/late-night operations with reduced eye strain.

**Acceptance Criteria:**

**Given** the design tokens include complete dark mode values
**When** I tap the dark mode toggle in the sidebar header
**Then** the entire app switches to dark mode using the .dark class on the html element
**And** the toggle uses a sun/moon icon that transitions smoothly
**And** the preference is persisted in localStorage
**And** system preference (prefers-color-scheme) is respected on first load
**And** all semantic status colors remain readable in dark mode
**And** no flash of unstyled content on page load (FOUC prevention)

## Epic 3: POS Terminal Redesign

**Status:** Complete (deferred: swipe-to-remove gesture, numpad popover → Epic 8)

**Goal:** Rebuild the entire POS terminal — product grid, cart sidebar, and all payment flows — with the new design system while preserving all existing functionality and E2E test compatibility.

**Dependencies:** Epic 1 (Design Tokens), Epic 2 (App Shell) must be complete.

### Story 3.1: Redesign ProductCard Component

As a cashier,
I want clean, touch-friendly product cards with clear name, price, and stock status,
So that I can quickly identify and tap products during a rush without confusion.

**Acceptance Criteria:**

**Given** the ProductCard component exists at src/components/pos/product-card.tsx
**When** I redesign it with the new design tokens
**Then** card has image area with 4:3 aspect ratio and muted background placeholder
**And** product name uses text-sm font-medium with text truncation
**And** price uses text-sm font-semibold font-mono (JetBrains Mono)
**And** stock status displays as a StatusDot component (ok/warning/critical)
**And** card has hover state: bg-accent background
**And** card has pressed state: scale(0.98) with 100ms transition
**And** out-of-stock cards show opacity-0.5 and aria-disabled="true" with no interaction
**And** entire card is tappable with minimum 80px height
**And** card uses role="button" with aria-label="Add [ProductName], ₱[Price], [StockStatus]"
**And** data-testid="product-card" attribute is preserved for E2E tests
**And** card has flat appearance (no shadow, hairline border only)

### Story 3.2: Redesign Product Grid with Category FilterPills

As a cashier,
I want a responsive product grid with category filter pills for quick filtering,
So that I can find products fast by browsing or filtering by category.

**Acceptance Criteria:**

**Given** the product-grid.tsx component exists
**When** I redesign it with the new design system
**Then** product grid displays in responsive columns: 2-col phone, 3-4 col tablet, more on desktop
**And** category FilterPills appear above the grid as horizontal scrollable pills
**And** active pill uses primary bg + white text, inactive uses secondary bg
**And** pills are 28-32px height with radius-full
**And** tapping active pill deselects it (shows all products)
**And** grid filters instantly on pill tap (no loading state for client-side filter)
**And** search input above grid filters products by name in real-time (200ms debounce)
**And** empty state shows EmptyState component when no products match filter

### Story 3.3: Redesign Cart Sidebar

As a cashier,
I want a clean cart panel showing my current order with item management and clear totals,
So that I can review and modify orders efficiently before payment.

**Acceptance Criteria:**

**Given** the cart component exists at src/components/pos/cart.tsx
**When** I redesign it with the new design tokens
**Then** cart sidebar is 380px wide on tablet, full-width bottom sheet toggle on phone
**And** header shows "Cart" with item count badge (right-aligned pill)
**And** cart items are in a ScrollArea with each item showing: name, quantity, price (mono)
**And** swipe-left on cart item reveals remove action (with 5s undo toast)
**And** tapping quantity in cart opens numpad popover for exact quantity edit
**And** summary section shows subtotal, tax, and total with hairline separators
**And** footer has "Hold Order" (secondary) + "Pay Later" (secondary) + "Pay ₱XXX" (primary, 48px height)
**And** empty cart shows EmptyState: "Add products to start an order"
**And** all currency values use font-mono
**And** cart badge count animates with scale bump (scale 1.2 → 1, 150ms) on increment

### Story 3.4: Redesign Payment Modal — Cash Flow

As a cashier,
I want a clean payment modal with Cash as default tab, denomination buttons, and instant change calculation,
So that I can complete cash payments in under 10 seconds.

**Acceptance Criteria:**

**Given** the payment-modal.tsx component exists
**When** I redesign the Cash payment flow
**Then** payment modal opens with 250ms slide-up animation (or Drawer on phone)
**And** modal header shows total amount in text-xl font-bold font-mono
**And** Cash tab is selected by default
**And** denomination buttons display in grid with 44px minimum height
**And** "Exact Amount" button fills the exact total
**And** numpad appears for custom amount entry (3×4 grid, each key 56×48px min)
**And** change is calculated instantly as amount is entered
**And** "Complete Payment" button activates only when amount ≥ total
**And** success state: checkmark SVG draw animation (200ms) + total/paid/change display
**And** auto-dismiss after 2 seconds, modal slides down, cart clears
**And** all amount labels use { exact: true } to avoid matching "GCash Amount"
**And** numpad buttons are scoped within the dialog for E2E test compatibility

### Story 3.5: Redesign Payment Modal — GCash Flow

As a cashier,
I want to process GCash payments with optional photo capture of the receipt,
So that I can handle digital payments quickly with an optional audit trail.

**Acceptance Criteria:**

**Given** the GCash tab content exists in the payment modal
**When** I tap the "GCash" tab
**Then** camera component loads in the tab content area (150ms fade transition)
**And** camera viewfinder shows with aspect-ratio 4/3 and border-radius 8px
**And** 56px round capture button is centered below the viewfinder
**And** "Skip photo" link appears as text-sm text-muted-foreground below capture button
**And** after capture, photo preview displays with "Retake" (secondary) and "Complete" (primary) buttons
**And** file upload fallback works for devices without camera API
**And** E2E tests using setInputFiles() with tiny PNG continue to work

### Story 3.6: Redesign Payment Modal — Split Payment Flow

As a cashier,
I want to split payment between Cash and GCash with auto-calculated amounts,
So that I can handle mixed-payment transactions efficiently.

**Acceptance Criteria:**

**Given** the Split tab content exists in the payment modal
**When** I tap the "Split" tab
**Then** two-section layout shows: Cash amount input + GCash amount input
**And** entering cash amount auto-calculates GCash remainder in real-time
**And** split summary always visible: "Cash: ₱300 + GCash: ₱225 = ₱525"
**And** "Process Split" button activates when Cash + GCash ≥ Total
**And** processing is sequential: cash first → then GCash camera loads
**And** success view shows both payment methods with amounts
**And** dialog scrolls to show split summary if below fold

### Story 3.7: Redesign Pay Later Modal

As a cashier,
I want to add the current order to a customer's tab with quick customer search,
So that I can handle tab customers in under 12 seconds.

**Acceptance Criteria:**

**Given** the pay-later-modal.tsx component exists
**When** I tap "Pay Later" in the cart footer
**Then** a separate modal opens (distinct from payment modal)
**And** customer search input with recent customers shown immediately
**And** search filters live as user types
**And** "New Customer" option expands inline form (name required, phone optional)
**And** selected customer shows name + existing tab balance in JetBrains Mono
**And** "Add to Tab" primary button confirms the action
**And** success toast: "Added ₱505 to Maria's tab" with 3s auto-dismiss
**And** cart clears and kitchen order auto-created if applicable

### Story 3.8: Redesign Hold Order Modal

As a cashier,
I want to hold the current order and recall it later,
So that I can serve the next customer while waiting for a previous one.

**Acceptance Criteria:**

**Given** the hold-modal.tsx component exists
**When** I tap "Hold Order" in the cart footer
**Then** a confirmation dialog appears with order summary
**And** optional note field for identifying the held order
**And** "Hold Order" primary button saves the order
**And** held order count badge appears on a sidebar indicator or POS header
**And** held orders are recallable from the POS screen
**And** the dialog follows the modal pattern: centered, 480px max, closable via X/backdrop/Escape

## Epic 4: Data Tables, Panels & Shared Components ✅ COMPLETE

**Goal:** Build the reusable data display infrastructure — DataTable, StatusDot, EntityLink, DetailPanel, SummaryCard, FilterPills — that powers every data page in the app.

**Dependencies:** Epic 1 (Design Tokens), Epic 2 (App Shell) must be complete.

**Status:** All 8 stories complete (4.1-4.8). Committed as f14e5d9.

### Story 4.1: Build StatusDot Component

As a user,
I want a consistent, unified status indicator used across all screens,
So that I can instantly understand stock levels, payment states, and kitchen timing at a glance.

**Acceptance Criteria:**

**Given** no StatusDot component currently exists
**When** I create src/components/ui/status-dot.tsx
**Then** it renders an 8px circle with the appropriate semantic color
**And** variants are: ok (--status-ok), warning (--status-warning), critical (--status-critical), info (--status-info), neutral (--muted-foreground)
**And** optional pulse animation for urgent states (kitchen overdue, critical stock)
**And** pulse animation respects prefers-reduced-motion
**And** the dot has aria-hidden="true" (decorative — adjacent text label carries meaning)
**And** optional label prop renders adjacent text
**And** replaces all hardcoded colored badges across the app (stock-badge.tsx patterns)

### Story 4.2: Build EntityLink Component

As a user,
I want every entity name to be tappable and open its detail panel,
So that I can explore connected data from any screen without navigating away.

**Acceptance Criteria:**

**Given** no EntityLink component currently exists
**When** I create src/components/ui/entity-link.tsx
**Then** it renders as inline text with font-medium weight
**And** hover state shows underline, pressed state shows scale(0.98)
**And** variants: product, customer, ingredient, transaction
**And** role="link" with aria-label="View [EntityName] details"
**And** clicking triggers onEntityClick callback with entity type and ID

### Story 4.3: Build DetailPanel Component

As a user,
I want slide-in contextual panels that show entity details without leaving my current view,
So that I can explore data relationships while preserving my current context.

**Acceptance Criteria:**

**Given** shadcn Sheet component is installed
**When** I create src/components/ui/detail-panel.tsx composing Sheet (side="right")
**Then** panel width is 420px on tablet, full-width on phone
**And** panel opens with 300ms spring animation, closes with 250ms ease-out
**And** header contains: breadcrumb trail + close X button + action buttons area
**And** content area is scrollable with optional sticky footer for edit mode
**And** supports view mode (read-only) and edit mode (form)
**And** cascading panels: second panel stacks beside first on tablet (first shrinks to 200px), replaces on phone
**And** maximum 2 panels deep on tablet
**And** breadcrumb updates with chain, closing restores previous panel
**And** original screen scroll position, filters, and selection preserved on close
**And** focus trapped in panel when open, Escape closes
**And** prefers-reduced-motion disables spring animation

### Story 4.4: Build DataTable Component

As a user,
I want information-dense data tables with responsive columns, row selection, and inline actions,
So that I can view and interact with data efficiently on any screen size.

**Acceptance Criteria:**

**Given** shadcn Table component is installed
**When** I create src/components/ui/data-table.tsx
**Then** table header uses text-xs font-medium text-muted-foreground uppercase tracking-wider
**And** row height is 44px minimum (touch target)
**And** row hover shows bg-accent on the full row
**And** responsive column hiding based on priority: P0 always, P1 at ≥768px, P2 at ≥1024px, P3 at ≥1280px
**And** cell alignment: text left, numbers right, status center
**And** loading state shows 5 skeleton rows, empty state shows EmptyState component
**And** row click triggers onRowClick callback (opens DetailPanel)
**And** pagination footer with page info and navigation
**And** sortable columns have aria-sort attribute

### Story 4.5: Build SummaryCard Component

As a user,
I want standardized metric display cards at the top of data pages,
So that I can see key numbers at a glance before diving into the details.

**Acceptance Criteria:**

**Given** shadcn Card component is installed
**When** I create src/components/ui/summary-card.tsx
**Then** card anatomy: Label (text-xs muted uppercase) + Value (text-xl bold mono) + optional Trend (colored arrow)
**And** trend direction: up (--status-ok + ↑), down (--status-critical + ↓), neutral (muted + →)
**And** card has flat appearance (no shadow, hairline border), padding 16px
**And** works in responsive grid: 1-col phone, 2-col tablet, 4-col desktop

### Story 4.6: Build FilterPills Component

As a user,
I want horizontal scrollable filter chips for quick data filtering,
So that I can rapidly switch between common filter presets.

**Acceptance Criteria:**

**Given** no FilterPills component exists
**When** I create src/components/ui/filter-pills.tsx
**Then** pills are 28-32px height with radius-full, 12px horizontal padding
**And** active: bg-primary text-primary-foreground, inactive: bg-secondary
**And** one active at a time (radio behavior), tapping active deselects
**And** optional count badge on each pill
**And** scrollable on overflow without visible scrollbar

### Story 4.7: Apply DataTable to Transactions Page

As a user,
I want the Transactions page rebuilt with the new DataTable, SummaryCards, and FilterPills,
So that I can view, filter, and drill into transaction data with the new design.

**Acceptance Criteria:**

**Given** all shared components from Stories 4.1-4.6 are built
**When** I redesign src/app/(dashboard)/transactions/page.tsx
**Then** SummaryCards show: Today's Revenue, Transaction Count, Average Order, Pending Tabs
**And** FilterPills show: Today, Yesterday, This Week, This Month, All
**And** DataTable with columns: Order # (mono), Time, Items, Total (mono), Payment Method, Status (StatusDot)
**And** responsive columns: Time and Payment Method hide on phone (P1), Items on small tablet (P2)
**And** tapping row opens transaction DetailPanel
**And** filter persistence in URL query params
**And** empty state and loading skeleton

### Story 4.8: Apply DataTable to Remaining Data Pages

As a developer,
I want all remaining data pages rebuilt with the shared DataTable pattern,
So that every data page has a consistent, high-quality experience.

**Acceptance Criteria:**

**Given** DataTable pattern proven on Transactions page
**When** I apply to remaining pages
**Then** Ingredients page: name, category, quantity (mono), unit, par level, StatusDot, cost. SummaryCards.
**And** Customers page: name, phone, visit count, tab balance (StatusDot), last visit.
**And** Users page: name, role, status (StatusDot), permissions.
**And** Audit Log page: timestamp, user, action, entity (EntityLink). FilterPills.
**And** Waste page: date, ingredient (EntityLink), quantity, reason. FilterPills.
**And** all EntityLinks open the correct DetailPanel

## Epic 5: Kitchen Order Board ✅

**Goal:** Rebuild the kitchen order board as a real-time kanban with urgency-based visual escalation, sound notifications, and optimized touch targets for kitchen staff.

**Dependencies:** Epic 1 (Design Tokens), Epic 4 (StatusDot) must be complete.

### Story 5.1: Build KitchenOrderCard Component ✅

As a kitchen staff member,
I want clear order cards showing items, time, and urgency at a glance,
So that I can prioritize cooking and never miss an overdue order.

**Acceptance Criteria:**

**Given** no KitchenOrderCard component exists
**When** I create it composing Card + Badge + Button + StatusDot
**Then** order number displays as text-lg font-bold font-mono
**And** items list shows as text-sm
**And** time-in-status badge shows as text-xs text-muted-foreground, updates every 30s
**And** urgency: 0-4min normal, 5-9min amber left border (3px, --status-warning), 10+min red left border + pulse
**And** rush flag: lightning icon + amber background tint
**And** action button is full-width primary at card bottom ("Start" / "Ready" / "Served")
**And** tap card body expands to show full item list + rush toggle
**And** pulse animation respects prefers-reduced-motion

### Story 5.2: Build Kitchen Board Layout ✅

As a kitchen staff member,
I want a 3-column kanban board showing NEW, COOKING, and READY orders,
So that I can see all order statuses at once and manage the kitchen flow.

**Acceptance Criteria:**

**Given** KitchenOrderCard from Story 5.1 is built
**When** I redesign the Kitchen Orders page
**Then** tablet: 3-column kanban with column headers showing count
**And** phone: single column with horizontal swipe between columns
**And** tapping action button moves card to next column with smooth animation
**And** 5-second polling fetches new orders
**And** new order triggers sound notification (configurable)
**And** page header: "Kitchen Orders" + "Today's Completed" button + sound toggle
**And** works in both light and dark mode

### Story 5.3: Kitchen Board Real-Time Updates ✅

As a kitchen staff member,
I want the board to update in real-time without manual refresh,
So that new orders appear instantly and timing is always accurate.

**Acceptance Criteria:**

**Given** the kitchen board is rendered
**When** a new order is created from POS payment
**Then** order card appears in NEW column within 5 seconds
**And** sound notification plays if enabled
**And** time badges update every 30 seconds
**And** urgency borders transition smoothly
**And** offline toast when connectivity lost, sync on reconnection

## Epic 6: Forms & Dialogs Redesign

**Goal:** Rebuild all form-based flows with consistent form patterns, validation, and the new design tokens.

**Dependencies:** Epic 1 (Design Tokens), Epic 4 (DetailPanel) must be complete.

### Story 6.1: Build RestockDialog Component

As an inventory manager,
I want a quick restock dialog with smart defaults accessible from any context,
So that I can restock ingredients in under 15 seconds from wherever I notice low stock.

**Acceptance Criteria:**

**Given** no dedicated RestockDialog component exists
**When** I create src/components/inventory/restock-dialog.tsx
**Then** dialog header shows ingredient name + current quantity + unit
**And** quantity input has auto-focus, number type, with unit label suffix
**And** cost per unit input is pre-filled with last purchase cost (₱ prefix, font-mono)
**And** vendor select is pre-selected with last vendor for this ingredient
**And** optional note input with placeholder: "Delivery note, invoice #..."
**And** confirm button text is descriptive: "Add 8kg at ₱120/kg" (updates dynamically)
**And** confirm button disabled until quantity > 0
**And** usable from: Ingredients page, product panel recipe section, POS stock badge drill-down

### Story 6.2: Redesign Product Form in Panel

As a manager,
I want to create and edit products in a slide-in panel with inline recipe builder and live cost calculation,
So that I can manage menu items and see margin impact in real-time.

**Acceptance Criteria:**

**Given** the product-form.tsx component exists
**When** I redesign it for use within a DetailPanel
**Then** form sections: Basic Info, Pricing, Recipe Builder, Cost Summary
**And** Recipe Builder: search ingredients → add → set qty + unit → remove
**And** Cost Summary on var(--muted) background: Food Cost, Margin %, vs Target (65%)
**And** margin color: green ≥65%, amber 50-65%, red <50%
**And** cost updates live as recipe or price changes
**And** sticky footer: "Cancel" (ghost) + "Save" (primary)
**And** validation: name required, price > 0

### Story 6.3: Redesign Inventory Count Discrepancy Modal

As an inventory manager,
I want a clear discrepancy modal when actual count doesn't match expected,
So that I can record the variance with a reason for audit purposes.

**Acceptance Criteria:**

**Given** the discrepancy-modal.tsx component exists
**When** I redesign it with the new design system
**Then** modal header shows ingredient name + "Expected: [qty] [unit]"
**And** actual count input is large, font-mono, auto-focused
**And** variance displays automatically with color coding
**And** reason select is required: Waste, Breakage, Theft, Miscount, Testing, Promo, Other
**And** optional note textarea
**And** form follows standard patterns: label above input, 16px field spacing

### Story 6.4: Redesign Menu Management Page

As a manager,
I want the Menu page rebuilt with Products table and Categories tab using the new design system,
So that I can manage the menu with the same quality as other data pages.

**Acceptance Criteria:**

**Given** the menu page exists at src/app/(dashboard)/menu/page.tsx
**When** I redesign it using DataTable, DetailPanel, and form components
**Then** Tabs: Products | Categories
**And** Products: DataTable with Image, Name (EntityLink), Category, Price, Cost, Margin, Stock (StatusDot)
**And** tapping row opens DetailPanel in view mode, "Edit" switches to edit mode
**And** "Add Product" opens DetailPanel in edit mode
**And** Categories tab with product counts, edit/delete actions
**And** stock-badge.tsx replaced by StatusDot

## Epic 7: Analytics & Calendar Redesign

**Goal:** Rebuild analytics dashboard and calendar views with the new design system.

**Dependencies:** Epic 1 (Design Tokens), Epic 4 (SummaryCard, DataTable) must be complete.

### Story 7.1: Redesign Analytics Dashboard

As a manager,
I want a clean analytics dashboard with key metrics and trend visualization,
So that I can understand business performance at a glance.

**Acceptance Criteria:**

**Given** the analytics page exists
**When** I redesign it with the new design system
**Then** SummaryCards: Daily Revenue, Transaction Count, Average Order Value, Food Cost %
**And** each card shows trend indicator (up/down arrow with percentage)
**And** charts use Recharts with monochromatic color scheme
**And** chart axes use text-xs text-muted-foreground font-mono
**And** FilterPills: Today, This Week, This Month, This Quarter
**And** responsive charts, skeleton loading states

### Story 7.2: Redesign Calendar Page

As a manager,
I want a calendar view showing daily activity summaries,
So that I can review business patterns over time.

**Acceptance Criteria:**

**Given** the calendar page exists
**When** I redesign it with the new design system
**Then** calendar grid with day cells showing revenue/transaction count in text-xs font-mono
**And** activity days use subtle background tint
**And** tapping day shows SummaryCards for that day
**And** month navigation with "Today" button
**And** responsive: full grid tablet, condensed list phone

## Epic 8: Polish, Empty States & Dark Mode Validation

**Goal:** Final polish pass — EmptyState everywhere, skeleton loading, dark mode validation, accessibility compliance, E2E test verification.

**Dependencies:** All previous epics (1-7) should be substantially complete.

### Story 8.1: Implement EmptyState Across All Pages

As a user,
I want encouraging, action-oriented empty states on every page,
So that blank screens feel helpful and guide me to the right next action.

**Acceptance Criteria:**

**Given** the EmptyState component exists
**When** I verify it's used across all pages
**Then** each page has contextual, encouraging empty state copy
**And** action buttons where there's a clear next step
**And** each includes a Lucide icon (24px, text-muted-foreground)
**And** title: text-lg font-semibold. Description: text-sm text-muted-foreground

### Story 8.2: Implement Skeleton Loading States

As a user,
I want content to load with skeleton placeholders that match the content layout,
So that I know content is coming and the page feels fast.

**Acceptance Criteria:**

**Given** all pages use async data fetching
**When** data is loading
**Then** layout-matching skeletons with bg-muted animate-pulse
**And** no single centered spinner anywhere
**And** quick actions (<200ms) show no loading indicator
**And** progressive loading: content appears as it arrives

### Story 8.3: Dark Mode Validation Pass

As a user,
I want dark mode to work flawlessly across every screen,
So that I can use the app in low-light conditions without contrast issues.

**Acceptance Criteria:**

**Given** all screens are built with the new design tokens
**When** dark mode is enabled
**Then** every screen renders correctly with no hardcoded light-mode colors
**And** all text meets WCAG 2.1 AA contrast ratios
**And** semantic status colors remain distinguishable
**And** no FOUC, preference persists across sessions

### Story 8.4: Accessibility Audit and Compliance

As a user with accessibility needs,
I want the entire app to meet WCAG 2.1 AA standards,
So that I can use the system effectively regardless of ability.

**Acceptance Criteria:**

**Given** all screens are built
**When** I run an accessibility audit
**Then** axe-core scan returns zero AA violations
**And** keyboard-only navigation works on all pages
**And** skip link, form labels, image alt text, focus trapping all correct
**And** all animations suppressed with prefers-reduced-motion
**And** touch targets ≥44×44px on pointer: coarse devices

### Story 8.5: E2E Test Suite Update

As a developer,
I want all existing E2E tests passing with the redesigned UI,
So that we have confidence the redesign didn't break any functionality.

**Acceptance Criteria:**

**Given** all UI components have been redesigned
**When** I run npm run test:e2e
**Then** all existing test files pass: auth, pos-flow, cash, gcash, split, tab, menu
**And** broken selectors updated to match new component structure
**And** data-testid attributes preserved
**And** new accessibility tests added: axe-core scan on critical pages
