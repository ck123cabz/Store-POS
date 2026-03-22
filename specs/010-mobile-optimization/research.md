# Research: Full Mobile Optimization

**Feature**: 010-mobile-optimization
**Date**: 2026-03-22

## R1: Dynamic Type Support in Tailwind CSS 4.x Web Apps

**Decision**: Use `rem`-based sizing throughout and convert fixed `h-*` button/element sizes to `min-h-*` for Dynamic Type compliance.

**Rationale**: Tailwind 4's default text utilities (`text-sm`, `text-base`, etc.) already use `rem` units, which scale with the root font size. iOS Dynamic Type works by increasing the root font size in Safari. The main issue is fixed-height elements (e.g., `h-9`, `h-12` buttons) that use pixel values and won't grow. Converting critical touch targets to `min-h-*` allows them to expand with larger text while maintaining baseline size at default.

**Alternatives considered**:
- **CSS `font: -apple-system-body`**: Uses system fonts that respect Dynamic Type, but would break the Inter + JetBrains Mono design system.
- **JavaScript-based text scaling**: Over-engineered; the browser handles `rem` scaling natively.
- **`text-size-adjust` CSS property**: Only prevents auto-scaling, doesn't enable Dynamic Type — opposite of what we need.

**Implementation notes**:
- Audit all `h-[number]` classes on interactive elements (buttons, inputs, list rows) and replace with `min-h-[number]` where text content could overflow.
- Ensure no `overflow-hidden` + fixed height combinations on text containers.
- Tailwind 4 has no `tailwind.config.js` — all customization via `@theme` in `globals.css`.
- Test with iOS Settings → Accessibility → Larger Text → maximum slider.

## R2: iOS Safe Area Inset Patterns

**Decision**: Use `env(safe-area-inset-*)` CSS variables on all fixed/sticky bottom elements, with Tailwind's `pb-safe` utility where available.

**Rationale**: The root layout already has `viewportFit: "cover"` which enables safe area CSS variables. The existing `MobileCartBar` already uses `pb-safe`. The pattern needs to be extended to all fixed-position mobile elements: bottom navigation bars, floating action buttons, modal footers that dock to the bottom.

**Alternatives considered**:
- **`viewportFit: "auto"`**: Simpler but wastes screen space behind the notch/home indicator area.
- **JavaScript-based safe area detection**: Unreliable cross-browser; CSS `env()` is the standard.

**Implementation notes**:
- Add `pb-safe` (or `padding-bottom: env(safe-area-inset-bottom)`) to: CartDrawer footer, PaymentModal bottom actions, any new sticky footer elements.
- Top safe area already handled by the header's sticky positioning.
- Side safe areas (landscape rotation) are low priority per spec (portrait-first).

## R3: Inline Search Bar Pattern for Mobile POS

**Decision**: Add a collapsible inline search input at the top of the POS product grid on mobile, replacing the hidden `⌘K` command palette button.

**Rationale**: The current desktop search trigger (`hidden sm:flex`) hides the search entirely on mobile. The command palette (CommandDialog) requires keyboard shortcuts. On mobile, an always-visible search icon that expands to a full-width input inline (not a modal) provides the fastest product lookup.

**Alternatives considered**:
- **Keep CommandDialog with a visible mobile trigger button**: Works but command palette occupies the full screen as a modal — heavier UX for simple product search.
- **Floating search FAB**: Competes visually with the MobileCartBar at the bottom.
- **Search in the cart drawer**: Wrong context — user searches before adding to cart.

**Implementation notes**:
- On mobile (`< md`): Show a search icon button in the POS header bar. Tapping it expands a full-width `Input` with auto-focus. Typing filters the product grid in real-time (same search logic as CommandDialog).
- On desktop (`≥ md`): Keep the existing `⌘K` command palette button.
- The `ProductGrid` component already receives products and categories — add a `searchQuery` prop to filter.
- Consider debouncing the input (150ms) for performance with large product lists.

## R4: Playwright Mobile Viewport Testing

**Decision**: Add a Playwright mobile test suite that runs at 375×812 viewport with touch emulation.

**Rationale**: SC-007 requires all E2E smoke tests to pass at 375×812. The existing Playwright config likely uses a default desktop viewport. Adding a mobile project/config ensures regression protection.

**Alternatives considered**:
- **Chrome DevTools manual testing only**: Doesn't catch regressions automatically.
- **Separate mobile test files**: Duplicates test logic — better to run the same tests at multiple viewports.
- **BrowserStack/real device**: Useful for final QA but too slow for CI; emulation covers 95% of issues.

**Implementation notes**:
- Add a `mobile` project to `playwright.config.ts` with `viewport: { width: 375, height: 812 }`, `isMobile: true`, `hasTouch: true`.
- Run existing smoke tests at this viewport. Some selectors may need adjustment (e.g., mobile-specific elements like MobileCartBar).
- Add mobile-specific test for the POS flow: product grid → cart drawer → payment.
- Consider adding `@mobile` tag for tests that only run in mobile viewport.

## R5: DataTable Mobile Card View Pattern

**Decision**: For mobile viewports, enhance the DataTable with a "card view" render mode that stacks each row as a compact card, showing all columns vertically.

**Rationale**: The existing priority-based column hiding works well for tablets (hiding 1-2 columns) but at 375px, tables with many columns still feel cramped even with only priority-0 columns. A card-based mobile layout provides better readability and larger touch targets for row interaction.

**Alternatives considered**:
- **Horizontal scroll on tables**: Common pattern but frustrating on small screens — users can't see full context.
- **Priority hiding only (current system)**: Sufficient for pages with 3-4 columns but insufficient for pages with 6+ columns like Transactions and Audit Log.
- **Accordion/expandable rows**: More complex to implement, harder to scan.

**Implementation notes**:
- Add an optional `mobileCardRender?: (row: T) => React.ReactNode` prop to DataTable.
- When `useIsMobile()` is true and `mobileCardRender` is provided, render cards instead of table rows.
- Each page provides its own card renderer, keeping DataTable generic.
- If `mobileCardRender` is not provided, fall back to the existing priority-based table.
- Pagination should remain as-is (works for both views).

## R6: Multi-Panel Layout Collapse Strategy

**Decision**: Use a state-driven single-panel navigation pattern on mobile, with URL-independent view state managed by React state + the `useIsMobile` hook.

**Rationale**: The Menu page has 3 panels (sidebar, list, detail) and the Ingredients page has 2 panels (list, detail). On mobile, only one panel should be visible at a time, with navigation affordances (back buttons) to switch. The Ingredients page already implements this pattern with `mobileView` state — extend the same pattern to Menu.

**Alternatives considered**:
- **URL-based routing** (e.g., `/menu/[id]`): Would require new routes and break the current SPA-like feel of the menu page.
- **Drawer/sheet for detail**: Works for quick peeks but not for full editing workflows.
- **Tabs for panels**: Doesn't map well to the sidebar → list → detail hierarchy.

**Implementation notes**:
- Menu page: On mobile, show categories as horizontal scroll chips → product list fills screen → product detail as full-screen overlay with back button.
- Ingredients page: Already has `mobileView` state (`"list"` | `"detail"`). Verify it works at 375px and refine.
- Order Board: On mobile, show column tabs (New/Cooking/Ready) with one column visible at a time — the `columnTabs` array suggests this is partially implemented.
- Add smooth transitions between panels (e.g., slide left/right) for native-app feel.

## R7: Calendar Page Mobile Adaptation

**Decision**: Convert the calendar grid to a vertical day-list view on mobile.

**Rationale**: A 7-column calendar grid at 375px yields ~48px per cell, which is too narrow for readable revenue/transaction data. A vertical list of days (showing date, revenue, transaction count, vibe) with expandable detail is more usable on phones.

**Alternatives considered**:
- **Compressed calendar grid with minimal data**: Still too cramped; data becomes illegible.
- **Horizontal scroll calendar**: Disorienting; users lose month context.
- **Week-at-a-time view**: Better than full month but still 7 columns.

**Implementation notes**:
- On mobile: Show month header with prev/next nav → vertical list of days with key metrics → tap day to open detail dialog (existing `DayDetail` dialog).
- Keep the desktop calendar grid unchanged.
- Summary cards above the calendar should stack to single column on mobile.
