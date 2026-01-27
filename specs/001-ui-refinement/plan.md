# Implementation Plan: UI/UX Refinement to Original Vision

**Branch**: `001-ui-refinement` | **Date**: 2026-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-ui-refinement/spec.md`

## Summary

Refine Store-POS UI/UX to match original design vision and fix visual inconsistencies. Primary work is replacing hardcoded color classes with semantic design tokens (e.g., `bg-gray-100` → `bg-muted`), adding status badges to sidebar navigation, enhancing POS product tiles with stock/pricing indicators, and polishing employee dashboard timeline view.

**Scope Expansion (2026-01-27)**: Spec updated to include comprehensive non-functional requirements:
- **Accessibility**: 10 requirements (keyboard nav, ARIA, screen readers, color contrast)
- **Performance**: 7 requirements (visibility API polling, debouncing, AbortController)
- **Error Handling**: 7 requirements (graceful degradation, retry logic, silent failures)
- **Loading States**: 12 requirements (skeleton loaders, optimistic UI)
- **Edge Cases**: 27 documented scenarios with explicit behaviors

Total requirements: **103** (27 FR + 24 NFR + 12 LS + 27 EC + 13 SC)

## Technical Context

**Language/Version**: TypeScript 5.x, React 19.2.3, Next.js 16.1.4
**Primary Dependencies**: Tailwind CSS 4.x, Radix UI, shadcn/ui components, Lucide React icons
**Storage**: PostgreSQL with Prisma ORM 7.2.0 (existing schema, no changes needed)
**Testing**: Vitest (unit), Playwright 1.58.0 (E2E)
**Target Platform**: Web (Chrome, Firefox, Safari - responsive design)
**Project Type**: Web application (Next.js App Router monorepo)
**Performance Goals**: No visual regressions; badge API <500ms (best-effort); polling pauses when tab hidden
**Accessibility Goals**: WCAG 2.1 AA compliance; keyboard navigable; screen reader compatible
**Constraints**: Must use existing shadcn/ui design system; no new npm dependencies
**Scale/Scope**: ~20 pages, ~32 components; 6 user stories + 24 NFRs + 27 edge cases

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies | Compliance Strategy |
|-----------|---------|---------------------|
| I. Test-First Development | ✅ Partial | New badge count API endpoints require TDD. CSS-only changes need visual regression tests (Playwright screenshots) |
| II. Security-First | ⚪ Minimal | No new auth/data exposure. Badge count APIs use existing auth middleware |
| III. Pragmatic Simplicity | ✅ Yes | CSS token replacements are straightforward. Avoid over-engineering badge system |
| IV. Data Integrity | ⚪ N/A | Read-only queries for badge counts; no write operations |
| V. RESTful API Standards | ✅ Yes | Any new endpoints follow `/api/[resource]/[action]` pattern, return consistent JSON |

**GATE STATUS**: ✅ PASS - No violations requiring justification

## Project Structure

### Documentation (this feature)

```text
specs/001-ui-refinement/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (dashboard)/           # Protected dashboard routes (20 pages)
│   │   ├── layout.tsx         # Dashboard layout with sidebar
│   │   ├── pos/page.tsx       # POS interface (P1 changes)
│   │   ├── transactions/page.tsx  # Transaction history (P3 changes)
│   │   ├── employee/page.tsx  # Employee dashboard (P2 changes)
│   │   ├── calendar/page.tsx  # Calendar view (P3 changes)
│   │   └── ...                # Other pages (consistency fixes)
│   └── api/                   # API routes
│       ├── sidebar-badges/    # NEW: Badge counts endpoint
│       └── ...
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx        # Sidebar navigation (P2 changes)
│   │   └── header.tsx         # Header bar (consistency fixes)
│   ├── pos/
│   │   ├── product-card.tsx   # Product tile (P1 changes)
│   │   ├── product-grid.tsx   # Product grid
│   │   └── ...
│   └── ui/                    # shadcn/ui base components (unchanged)

tests/
├── e2e/
│   ├── visual/                # NEW: Visual regression tests
│   │   └── ui-consistency.spec.ts
│   └── ...
└── unit/
    └── ...
```

**Structure Decision**: Existing Next.js App Router structure. New API endpoint at `src/app/api/sidebar-badges/route.ts`. Visual regression tests added to `tests/e2e/visual/`.

## Complexity Tracking

> No violations requiring justification. All work follows existing patterns.

---

## Phase 0: Research Summary

See [research.md](./research.md) for detailed findings.

### Key Decisions

1. **Semantic Token Strategy**: Use Tailwind CSS variables via `bg-muted`, `text-muted-foreground`, `bg-secondary` etc. Already defined in existing shadcn/ui setup.

2. **Badge Count API**: Single endpoint `/api/sidebar-badges` returns all counts in one request to minimize network calls. Counts fetched on layout mount AND polled every 30 seconds while page is open to keep badges fresh.

3. **Visual Regression Testing**: Use Playwright's screenshot comparison (`toHaveScreenshot()`) for key pages rather than implementing full visual regression framework.

4. **Status Indicator Colors**: Stick with existing Tailwind color palette:
   - Green: `text-green-600`, `bg-green-100`
   - Orange/Warning: `text-orange-600`, `bg-orange-100`, `ring-orange-300`
   - Red/Error: `text-red-600`, `bg-red-100`, `ring-red-300`
   - Gray/Muted: `text-muted-foreground`, `bg-muted`

---

## Phase 1: Design Artifacts

### Files Modified (by user story)

#### US1: UI Consistency & Design System (P1)
| File | Changes |
|------|---------|
| `src/app/(dashboard)/layout.tsx` | `bg-gray-100` → `bg-muted` |
| `src/components/layout/sidebar.tsx` | Replace all `gray-*` with semantic tokens |
| `src/components/layout/header.tsx` | `text-gray-600` → `text-muted-foreground` |
| `src/components/pos/product-card.tsx` | `bg-gray-100`, `text-gray-400` → semantic tokens |
| `src/components/pos/payment-modal.tsx` | Replace hardcoded grays |
| `src/components/pos/cart.tsx` | `text-gray-500` → `text-muted-foreground` |
| `src/components/pos/hold-modal.tsx` | `text-gray-400` → `text-muted-foreground` |
| `src/app/(dashboard)/settings/page.tsx` | `bg-gray-50` → `bg-muted` |
| Multiple pages | Standardize padding to `p-4 md:p-6` |
| Multiple pages | Standardize headings to `text-xl md:text-2xl font-bold` |

#### US2: POS Product Tile Status Indicators (P1)
| File | Changes |
|------|---------|
| `src/components/pos/product-card.tsx` | Add low-stock "X left" badge, "SET PRICE" overlay, out-of-stock grayout |

#### US3: Sidebar Navigation with Status Badges (P2)
| File | Changes |
|------|---------|
| `src/app/api/sidebar-badges/route.ts` | NEW: Badge counts endpoint |
| `src/components/layout/sidebar.tsx` | Add badge display logic, fetch on mount + poll every 30s |

#### US4: Employee Dashboard Timeline Polish (P2)
| File | Changes |
|------|---------|
| `src/app/(dashboard)/employee/page.tsx` | Section grouping, visual connectors, streak display |

#### US5: Transaction Quick Filters (P3)
| File | Changes |
|------|---------|
| `src/app/(dashboard)/transactions/page.tsx` | Add quick filter buttons (Today, Yesterday, This Week) |

#### US6: Calendar Day Vibe Colors (P3)
| File | Changes |
|------|---------|
| `src/app/(dashboard)/calendar/page.tsx` | Color-code days based on DailyPulse vibe |

### New API Endpoint

**GET /api/sidebar-badges**

Returns counts for sidebar notification badges.

```typescript
// Response
{
  lowStockIngredients: number,    // Ingredients where quantity <= parLevel
  needsPricingProducts: number,   // Products where needsPricing = true
  taskProgress: {
    completed: number,
    total: number
  }
}
```

See [contracts/sidebar-badges.yaml](./contracts/sidebar-badges.yaml) for OpenAPI spec.

---

## Implementation Notes

### TDD Requirements (Constitution Principle I)

1. **Badge Count API** - Write integration tests first:
   - Test endpoint returns correct counts (FR-015, SC-005)
   - Test auth required (401 if not logged in)
   - Test edge cases: zero counts (EC-08), large counts >99 (EC-07)
   - Test consecutive failure handling (NFR-E02)

2. **Visual Regression** - Add Playwright screenshot tests for:
   - Sidebar in light/dark mode (if applicable)
   - POS page with products in various states (low stock, needs pricing, out of stock, compound)
   - Employee dashboard timeline with section grouping
   - Calendar with various vibe colors

3. **Accessibility Tests** - Add automated a11y checks:
   - axe-core integration for WCAG 2.1 AA compliance (NFR-A08)
   - Tab order verification for all interactive elements (NFR-A01)
   - ARIA label presence on badges and status indicators (NFR-A05, NFR-A09)

4. **Unit Tests** - Business logic:
   - Stock status calculation (low stock, out of stock, trackStock=false) (EC-03)
   - Badge count formatting (99+ display) (EC-07)
   - Vibe → color mapping (FR-026)
   - Date range calculations for filters (EC-20, Clarifications)

### CSS Token Mapping Reference

| Hardcoded | Semantic Token |
|-----------|----------------|
| `bg-gray-50` | `bg-muted/50` or `bg-muted` |
| `bg-gray-100` | `bg-muted` |
| `bg-gray-200` | `bg-accent` |
| `text-gray-400` | `text-muted-foreground` |
| `text-gray-500` | `text-muted-foreground` |
| `text-gray-600` | `text-muted-foreground` |
| `text-gray-900` | `text-foreground` |
| `hover:bg-gray-100` | `hover:bg-accent` |

### Sidebar Badge Polling (NFR-P02, NFR-P03, NFR-P05, NFR-P06)

Requirements from spec:
- Fetch badge counts on sidebar mount (initial load) - non-blocking
- Poll `/api/sidebar-badges` every 30 seconds using `setInterval`
- **Pause polling when tab is hidden** (use `document.visibilityState`)
- **Resume polling when tab becomes visible**
- **Use AbortController** to cancel in-flight requests on unmount
- Clear interval on component unmount to prevent memory leaks

```typescript
useEffect(() => {
  const abortController = new AbortController();
  let intervalId: NodeJS.Timeout | null = null;
  let consecutiveFailures = 0;

  const fetchBadges = async () => {
    // NFR-E02: Stop after 3 consecutive failures
    if (consecutiveFailures >= 3) return;

    try {
      const res = await fetch('/api/sidebar-badges', {
        signal: abortController.signal
      });
      if (res.ok) {
        const data = await res.json();
        setBadges(data);
        consecutiveFailures = 0; // Reset on success
      } else {
        consecutiveFailures++;
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        consecutiveFailures++;
      }
    }
  };

  // NFR-P02, NFR-P03: Visibility-based polling
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      fetchBadges(); // Fetch immediately when tab becomes visible
      intervalId = setInterval(fetchBadges, 30000);
    } else {
      if (intervalId) clearInterval(intervalId);
    }
  };

  // Initial setup
  fetchBadges();
  if (document.visibilityState === 'visible') {
    intervalId = setInterval(fetchBadges, 30000);
  }
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    abortController.abort(); // Cancel in-flight requests
    if (intervalId) clearInterval(intervalId);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, []);
```

### Quick Filter Debouncing (NFR-P04)

```typescript
import { useMemo } from 'react';
import debounce from 'lodash/debounce'; // Or implement inline

const debouncedFilter = useMemo(
  () => debounce((filter: string) => {
    setActiveFilter(filter);
    fetchTransactions(filter);
  }, 300),
  []
);
```

### Edge Case Handling

#### POS Product Tiles (EC-01 to EC-06)
| Scenario | Behavior |
|----------|----------|
| Low stock + needs pricing | Pricing border (red dashed) + low-stock badge |
| Low stock + ingredient low | Both badges; ingredient % top-right, "X left" bottom-right |
| `trackStock=false` + `quantity=0` | No out-of-stock indicator (tracking disabled) |
| Triple state (all indicators) | Pricing border + ingredient badge (top-right) + low-stock badge (bottom-right) |
| Out-of-stock while in cart | Warning icon on cart item: "Stock changed" |
| Click disabled tile | No action, no error (non-interactive) |

#### Sidebar Badges (EC-07 to EC-11)
| Scenario | Behavior |
|----------|----------|
| Count > 99 | Display "99+" |
| Count = 0 | Hide badge entirely |
| Fetch fails (initial) | Show navigation without badges |
| Fetch fails (after success) | Keep last known count |
| Rapid navigation | Cancel in-flight, fetch fresh |

#### Employee Dashboard (EC-12 to EC-16)
| Scenario | Behavior |
|----------|----------|
| No tasks | Empty state: "No tasks for today" |
| Streak = 0 | Show "0" with "Start your streak today!" |
| Task spans sections | Show in primary section with "(continues in [section])" |
| Overdue + completed | Green with strikethrough + "completed late" indicator |
| All section tasks done | Section header shows checkmark |

#### Quick Filters (EC-17 to EC-20)
| Scenario | Behavior |
|----------|----------|
| Zero results | Empty state with suggestion |
| Same filter clicked | Toggle off, show all |
| Different filter clicked | Replace (not additive) |
| Timezone | Use store's local timezone from Settings |

#### Calendar (EC-21 to EC-24)
| Scenario | Behavior |
|----------|----------|
| Year boundary | Display with year labels |
| Multiple pulse entries | Use most recent vibe |
| Future dates | Neutral styling, clickable |
| Partial weeks | Adjacent month days muted |

---

## Accessibility Implementation (NFR-A01 to NFR-A10)

### Keyboard Navigation (NFR-A01, NFR-A02)

All interactive elements must be keyboard accessible:

```tsx
// Quick filter buttons with focus indicators
<Button
  variant={isActive ? "default" : "outline"}
  onClick={() => handleFilter(filter)}
  className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
>
  {label}
</Button>
```

### Disabled Tiles (NFR-A03, NFR-A04)

Out-of-stock product tiles must be properly disabled:

```tsx
<div
  role="button"
  aria-disabled={isOutOfStock}
  tabIndex={isOutOfStock ? -1 : 0}
  className={cn(
    "product-tile",
    isOutOfStock && "opacity-50 pointer-events-none"
  )}
>
  {/* ... */}
</div>
```

### Screen Reader Support (NFR-A05, NFR-A06, NFR-A09)

Sidebar badges with ARIA:

```tsx
<nav aria-label="Main navigation">
  <a
    href="/ingredients"
    aria-label={`Ingredients${badgeCount > 0 ? `, ${badgeCount} items need attention` : ''}`}
  >
    <span>Ingredients</span>
    {badgeCount > 0 && (
      <span
        aria-live="polite"
        aria-atomic="true"
        className="badge"
      >
        {badgeCount > 99 ? '99+' : badgeCount}
      </span>
    )}
  </a>
</nav>
```

Task cards with status labels:

```tsx
<div
  role="listitem"
  aria-label={`Task: ${task.name}, Status: ${task.status}`}
>
  {/* ... */}
</div>
```

### Calendar Accessibility (NFR-A07)

Color-coded days must have text alternatives:

```tsx
<div
  className={vibeColorClass}
  title={`${date}: ${vibe || 'No entry'}`}
  aria-label={`${formatDate(date)}, business vibe: ${vibe || 'no entry recorded'}`}
>
  {day}
</div>
```

### Semantic Headings (NFR-A10)

Timeline section headers use proper heading hierarchy:

```tsx
<section aria-labelledby={`section-${section.id}`}>
  <h3 id={`section-${section.id}`} className="section-header">
    {section.name}
  </h3>
  {/* Task cards */}
</section>
```

---

## Loading States Implementation (LS-01 to LS-12)

### Sidebar Badges (LS-01 to LS-03)

```tsx
const [badges, setBadges] = useState<BadgeCounts | null>(null);

// Render nothing while loading (not skeleton)
{badges && badges.lowStockIngredients > 0 && (
  <Badge>{badges.lowStockIngredients}</Badge>
)}
```

### POS Product Tiles (LS-04, LS-05)

```tsx
// Skeleton for entire tile while loading
{isLoading ? (
  <Skeleton className="h-24 w-full rounded-lg" />
) : (
  <ProductCard product={product} />
)}
```

### Quick Filters (LS-06 to LS-08)

```tsx
const [activeFilter, setActiveFilter] = useState<string | null>(null);
const [isFiltering, setIsFiltering] = useState(false);

const handleFilter = async (filter: string) => {
  // LS-06: Optimistic UI - show active immediately
  const newFilter = activeFilter === filter ? null : filter;
  setActiveFilter(newFilter);
  setIsFiltering(true);

  try {
    await fetchTransactions(newFilter);
  } catch (error) {
    // LS-08: Revert on failure
    setActiveFilter(activeFilter);
    toast.error('Failed to filter transactions');
  } finally {
    setIsFiltering(false);
  }
};

// LS-07: Show skeleton while filtering
{isFiltering ? (
  <TransactionListSkeleton />
) : (
  <TransactionList transactions={transactions} />
)}
```

### Calendar (LS-11, LS-12)

```tsx
// LS-11: Render grid immediately with neutral styling
// LS-12: Apply vibe colors after data fetch
const [vibeData, setVibeData] = useState<Record<string, string>>({});

useEffect(() => {
  fetchVibeData(currentMonth).then(setVibeData);
}, [currentMonth]);

// Days render immediately, colors applied when vibeData loads
<CalendarDay
  date={date}
  vibe={vibeData[formatDate(date)]}
/>
```

---

## Error Handling Implementation (NFR-E01 to NFR-E07)

### Badge API Errors (NFR-E01, NFR-E02, NFR-E06)

```tsx
const [badges, setBadges] = useState<BadgeCounts | null>(null);
const consecutiveFailuresRef = useRef(0);

const fetchBadges = async () => {
  // NFR-E02: Stop after 3 failures
  if (consecutiveFailuresRef.current >= 3) return;

  try {
    const res = await fetch('/api/sidebar-badges');
    if (!res.ok) throw new Error('Failed');

    setBadges(await res.json());
    consecutiveFailuresRef.current = 0;
  } catch {
    consecutiveFailuresRef.current++;
    // NFR-E01: Hide badges silently (keep previous or null)
    // NFR-E06: No error toast for polling failures
  }
};
```

### Calendar Vibe Errors (NFR-E03)

```tsx
const fetchVibeData = async (month: Date) => {
  try {
    const res = await fetch(`/api/calendar/vibes?month=${month.toISOString()}`);
    if (!res.ok) throw new Error('Failed');
    return await res.json();
  } catch {
    // NFR-E03: Graceful degradation - return empty (neutral styling)
    return {};
  }
};
```

### Quick Filter Errors (NFR-E04)

```tsx
const handleFilter = async (filter: string) => {
  const previousFilter = activeFilter;
  setActiveFilter(filter);

  try {
    await fetchTransactions(filter);
  } catch {
    // NFR-E04: Show toast, retain previous state
    setActiveFilter(previousFilter);
    toast.error('Failed to load transactions. Please try again.');
  }
};
```

### Cart Stock Warning (NFR-E07)

```tsx
// When product becomes out-of-stock while in cart
const CartItem = ({ item, currentStock }) => {
  const stockChanged = currentStock < item.quantity;

  return (
    <div className={cn("cart-item", stockChanged && "border-orange-400")}>
      {stockChanged && (
        <div className="flex items-center gap-1 text-orange-600 text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>Stock changed</span>
        </div>
      )}
      {/* ... */}
    </div>
  );
};
```

---

## Test Requirements

### Unit Tests (Vitest)

| Test | Requirements Covered |
|------|---------------------|
| Badge count formatting | EC-07 (99+ display) |
| Vibe → color mapping | FR-026, SC-008 |
| Date range calculations | EC-20, Clarifications |
| Stock status logic | EC-03 (trackStock=false) |

### Integration Tests

| Test | Requirements Covered |
|------|---------------------|
| `/api/sidebar-badges` returns correct counts | FR-015, SC-005 |
| Badge API requires auth | NFR-E01 (401 handling) |
| Badge API handles zero counts | EC-08 |

### E2E Tests (Playwright)

| Test | Requirements Covered |
|------|---------------------|
| Visual regression: POS grid states | SC-004, SC-009 |
| Visual regression: Sidebar badges | SC-005 |
| Quick filter toggle behavior | FR-023, EC-18 |
| Keyboard navigation | NFR-A01, SC-A01 |
| Empty states display | EC-12, EC-17 |

### Accessibility Tests

| Test | Requirements Covered |
|------|---------------------|
| axe-core scan all pages | NFR-A08 (contrast) |
| Tab order verification | NFR-A01, NFR-A04 |
| Screen reader announcements | NFR-A05, NFR-A06, SC-A02 |
