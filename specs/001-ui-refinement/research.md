# Research: UI/UX Refinement

**Feature**: 001-ui-refinement | **Date**: 2026-01-27

## Research Questions & Findings

### 1. Semantic Color Token Strategy

**Question**: What is the best approach for replacing hardcoded Tailwind gray colors with semantic tokens in a shadcn/ui project?

**Decision**: Use existing shadcn/ui CSS variables mapped to Tailwind classes.

**Rationale**:
- shadcn/ui already provides semantic tokens via CSS variables (defined in `globals.css` or similar)
- Standard tokens include: `--background`, `--foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--secondary`, `--secondary-foreground`
- These are already integrated with Tailwind via the `@layer base` directive
- Dark mode support comes automatically when using semantic tokens

**Alternatives Considered**:
1. Create new CSS variables - Rejected: duplicates existing infrastructure
2. Use Tailwind's `dark:` variants with hardcoded colors - Rejected: more verbose, harder to maintain

**Mapping**:
| Hardcoded Class | Semantic Replacement | Use Case |
|----------------|---------------------|----------|
| `bg-gray-50` | `bg-muted` or `bg-background` | Card/section backgrounds |
| `bg-gray-100` | `bg-muted` | Container backgrounds |
| `bg-gray-200` | `bg-accent` | Hover/selected states |
| `text-gray-400` | `text-muted-foreground` | Placeholder/disabled text |
| `text-gray-500` | `text-muted-foreground` | Secondary text |
| `text-gray-600` | `text-muted-foreground` | Subdued text |
| `text-gray-900` | `text-foreground` | Primary text |
| `hover:bg-gray-100` | `hover:bg-accent` | Interactive hover states |

---

### 2. Badge Count API Design

**Question**: Should badge counts be fetched individually per item or aggregated in a single endpoint?

**Decision**: Single aggregated endpoint at `/api/sidebar-badges`

**Rationale**:
- Reduces HTTP requests from 3+ to 1
- Simplifies client-side code (single fetch, single state object)
- Badge counts are lightweight queries (COUNT aggregations)
- All badges render at the same time (sidebar mount)

**Alternatives Considered**:
1. Individual endpoints (`/api/ingredients/low-stock-count`, etc.) - Rejected: more network overhead
2. WebSocket real-time updates - Rejected: overkill for UI polish feature; polling or fetch-on-nav sufficient

**Implementation**:
```typescript
// GET /api/sidebar-badges
// Response
{
  lowStockIngredients: number,      // COUNT of ingredients WHERE quantity <= parLevel AND isActive
  needsPricingProducts: number,     // COUNT of products WHERE needsPricing = true
  taskProgress: { completed: number, total: number }  // Today's tasks for current user
}
```

**Refresh Strategy** (per clarification session 2026-01-27):
- Fetch on sidebar mount (initial load)
- Poll every 30 seconds using `setInterval` while page is open
- No server-side caching needed (queries are fast, data should be fresh)
- Best-effort performance (no strict latency SLA)

---

### 3. Visual Regression Testing Approach

**Question**: What level of visual regression testing is appropriate for a UI polish feature?

**Decision**: Use Playwright's built-in screenshot comparison (`toHaveScreenshot()`) for key pages.

**Rationale**:
- Playwright already in the project (no new dependencies)
- Screenshot tests catch unintended visual changes
- Focused on high-impact pages (POS, sidebar, employee dashboard)
- Lightweight: only 3-5 screenshot tests needed

**Alternatives Considered**:
1. Full visual regression suite (Percy, Chromatic) - Rejected: overkill for scope, adds cost
2. Manual visual QA only - Rejected: no regression protection
3. Component-level screenshot tests - Rejected: too granular, high maintenance

**Test Coverage**:
```typescript
// tests/e2e/visual/ui-consistency.spec.ts
test('sidebar renders with semantic tokens', async ({ page }) => {
  await page.goto('/pos');
  await expect(page.locator('.sidebar')).toHaveScreenshot('sidebar.png');
});

test('POS grid with product states', async ({ page }) => {
  // Setup: ensure products with various states exist
  await page.goto('/pos');
  await expect(page.locator('.product-grid')).toHaveScreenshot('pos-grid-states.png');
});
```

---

### 4. POS Product Tile Status Indicator Design

**Question**: How should multiple status indicators (low stock, needs pricing, out of stock) be displayed on a single product tile?

**Decision**: Layer indicators with visual hierarchy:
1. Out of stock: Entire tile grayed out, disabled, "OUT OF STOCK" badge
2. Needs pricing: Red dashed border, "SET PRICE" label overlay
3. Low stock: Orange accent border, "X left" badge in corner

**Rationale**:
- Out of stock is highest priority (prevents sale attempt)
- Needs pricing is critical business action
- Low stock is warning/informational
- Each has distinct visual treatment for quick recognition

**Visual Hierarchy**:
```
Priority 1: Out of Stock   → opacity-50, pointer-events-none, badge
Priority 2: Needs Pricing  → border-2 border-dashed border-red-500, overlay label
Priority 3: Low Stock      → ring-2 ring-orange-300, corner badge
```

**Edge Cases**:
- Product is both low stock AND needs pricing: Show both (dashed red border + orange badge)
- Product is out of stock AND needs pricing: Show out of stock only (can't sell anyway)
- Linked ingredient low but product OK: Show ingredient badge below stock badge

---

### 5. Sidebar Badge Rendering

**Question**: Where should badge counts be positioned relative to menu item labels?

**Decision**: Small circular badge to the right of the label text, before any chevron/dropdown indicator.

**Rationale**:
- Follows common UI patterns (Gmail, Slack, VS Code sidebar)
- Doesn't interfere with menu item click target
- Visible at a glance while scanning
- Scales well on mobile (badge wraps below if needed)

**Badge Variants**:
```tsx
// Warning/attention badge (orange background)
<Badge variant="outline" className="ml-auto bg-orange-100 text-orange-800 border-orange-200">
  {count > 99 ? '99+' : count}
</Badge>

// Task progress badge (neutral)
<Badge variant="outline" className="ml-auto">
  {completed}/{total}
</Badge>
```

---

### 6. Employee Dashboard Timeline Grouping

**Question**: How should tasks be visually grouped by shift section (Opening/Service/Closing)?

**Decision**: Use distinct background colors and connector lines.

**Rationale**:
- Visual grouping reduces cognitive load
- Shift sections are natural mental model for restaurant staff
- Connector lines show task sequence/flow
- Matches original vision from design docs

**Implementation**:
```tsx
// Section backgrounds (per spec.md Visual Design Specifications)
Opening:  bg-amber-50 dark:bg-amber-950/20
Service:  bg-blue-50 dark:bg-blue-950/20
Closing:  bg-purple-50 dark:bg-purple-950/20

// Connector line between tasks
<div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
```

**Task Card Status Colors**:
| Status | Background | Border |
|--------|-----------|--------|
| Completed | `bg-green-50` | `border-l-4 border-green-500` |
| In Progress | `bg-blue-50` | `border-l-4 border-blue-500` |
| Pending | `bg-background` | `border-l-4 border-muted` |
| Overdue | `bg-red-50` | `border-l-4 border-red-500` |

---

### 7. Transaction Quick Filter UX

**Question**: Should quick filters be mutually exclusive (radio behavior) or toggleable?

**Decision**: Toggleable with clear active state.

**Rationale**:
- Spec explicitly states "toggle behavior"
- Clicking active filter again clears it (returns to all transactions)
- Visual feedback via `variant="default"` vs `variant="outline"`
- More flexible for users who want to quickly check different ranges

**Implementation**:
```tsx
const filters = ['Today', 'Yesterday', 'This Week', 'Last Week', 'This Month'];
const [activeFilter, setActiveFilter] = useState<string | null>(null);

// Click handler toggles
const handleFilter = (filter: string) => {
  setActiveFilter(activeFilter === filter ? null : filter);
};
```

---

### 8. Calendar Vibe Color Palette

**Question**: What colors should represent each DailyPulse vibe level?

**Decision**: Use intuitive color associations.

| Vibe | Background | Border | Semantic Meaning |
|------|-----------|--------|------------------|
| Crushed it | `bg-green-100` | `border-green-400` | Excellent performance |
| Good | `bg-green-50` | `border-green-200` | Above average |
| Meh | `bg-amber-50` | `border-amber-200` | Average/neutral |
| Rough | `bg-orange-100` | `border-orange-400` | Below expectations |
| (No entry) | `bg-background` | `border-muted` | No data recorded |

**Rationale**:
- Green spectrum for positive → orange/amber for negative
- Matches traffic light mental model (green = good, orange = caution)
- Subtle backgrounds (50/100) don't overwhelm calendar view
- Consistent with existing project color usage

---

## Dependencies Audit

No new npm dependencies required. All functionality uses:
- Existing Tailwind CSS classes
- Existing shadcn/ui components (Badge, Button, Card)
- Existing Prisma client for database queries
- Existing Playwright for testing

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| CSS changes break existing layouts | Medium | High | Visual regression tests catch before merge |
| Badge API slows page load | Low | Medium | Simple COUNT queries; add index if needed |
| Sidebar badges don't update | Low | Low | Graceful degradation; badges are informational |
| Token mapping misses edge cases | Medium | Low | Comprehensive grep search for all `gray-` classes |

---

## Outstanding Questions

None - all research questions resolved.
