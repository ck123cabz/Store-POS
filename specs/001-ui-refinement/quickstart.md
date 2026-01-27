# Quickstart: UI/UX Refinement Implementation

**Feature**: 001-ui-refinement | **Date**: 2026-01-27

## Prerequisites

- Node.js 18+
- PostgreSQL database running
- Project dependencies installed (`npm install`)
- Database migrated and seeded (`npx prisma migrate dev && npx prisma db seed`)

## Development Setup

```bash
# Start development server
npm run dev

# Open browser
open http://localhost:3000

# Login: admin/admin
```

## Implementation Order

Work should proceed in this order to minimize merge conflicts and enable incremental testing:

### Phase 1: Design System Compliance (US1)

**Files to modify** (in order):
1. `src/app/(dashboard)/layout.tsx` - Main layout background
2. `src/components/layout/sidebar.tsx` - Sidebar colors
3. `src/components/layout/header.tsx` - Header text colors
4. `src/components/pos/product-card.tsx` - Card backgrounds
5. `src/components/pos/payment-modal.tsx` - Modal backgrounds
6. `src/components/pos/cart.tsx` - Cart text colors
7. `src/components/pos/hold-modal.tsx` - Modal text colors
8. `src/app/(dashboard)/settings/page.tsx` - Settings backgrounds
9. All dashboard pages - Padding standardization

**Token replacements** (search & replace):
```
bg-gray-50   → bg-muted
bg-gray-100  → bg-muted
bg-gray-200  → bg-accent
text-gray-400 → text-muted-foreground
text-gray-500 → text-muted-foreground
text-gray-600 → text-muted-foreground
text-gray-900 → text-foreground
hover:bg-gray-100 → hover:bg-accent
```

### Phase 2: POS Product Indicators (US2)

**File**: `src/components/pos/product-card.tsx`

**Changes**:
- Add "X left" badge for low stock
- Add "SET PRICE" overlay for needs pricing
- Enhance out-of-stock visual treatment

**Test manually**:
1. Create/edit product with `trackStock: true`, `quantity: 3`
2. Create/edit product with `needsPricing: true`
3. Create/edit product with `quantity: 0`

### Phase 3: Sidebar Badges (US3)

**Files**:
1. `src/app/api/sidebar-badges/route.ts` - NEW
2. `src/components/layout/sidebar.tsx` - Add badge display

**TDD approach**:
1. Write test for `/api/sidebar-badges` endpoint
2. Implement endpoint
3. Add client-side fetch and display

### Phase 4: Employee Dashboard Polish (US4)

**File**: `src/app/(dashboard)/employee/page.tsx`

**Changes**:
- Group tasks by section (Opening/Service/Closing)
- Add visual connector lines
- Enhance streak display

### Phase 5: Transaction Quick Filters (US5)

**File**: `src/app/(dashboard)/transactions/page.tsx`

**Changes**:
- Add quick filter button group
- Implement toggle behavior
- Wire up date filtering

### Phase 6: Calendar Vibe Colors (US6)

**File**: `src/app/(dashboard)/calendar/page.tsx`

**Changes**:
- Fetch DailyPulse data for month view
- Apply vibe-based background colors to day cells

---

## Testing

### Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run specific test file
npm run test -- tests/integration/sidebar-badges.test.ts
```

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run headed (see browser)
npm run test:e2e:headed

# Run specific test
npx playwright test tests/e2e/visual/ui-consistency.spec.ts
```

### Visual Regression

```bash
# Update baseline screenshots (after intentional changes)
npx playwright test --update-snapshots
```

---

## Key Files Reference

| Purpose | File Path |
|---------|-----------|
| Dashboard layout | `src/app/(dashboard)/layout.tsx` |
| Sidebar navigation | `src/components/layout/sidebar.tsx` |
| POS product card | `src/components/pos/product-card.tsx` |
| Employee dashboard | `src/app/(dashboard)/employee/page.tsx` |
| Transaction history | `src/app/(dashboard)/transactions/page.tsx` |
| Calendar view | `src/app/(dashboard)/calendar/page.tsx` |
| Badge API (NEW) | `src/app/api/sidebar-badges/route.ts` |

---

## Debugging Tips

### Check CSS variable values
```javascript
// In browser console
getComputedStyle(document.documentElement).getPropertyValue('--muted')
```

### Verify badge API response
```bash
curl -X GET http://localhost:3000/api/sidebar-badges \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

### Force refresh after CSS changes
```
Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

---

## Common Issues

### Tailwind classes not applying
- Ensure semantic tokens are defined in `src/app/globals.css`
- Check for typos in class names
- Verify Tailwind is configured for the file path

### Badge counts not updating
- Check browser Network tab for API response
- Verify database has test data (ingredients, products)
- Check console for fetch errors

### Visual regression test failures
- Review screenshot diff in `test-results/` directory
- Update baseline if change is intentional
- Ensure consistent viewport size in test config
