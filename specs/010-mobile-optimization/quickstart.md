# Quickstart: Mobile Optimization Testing

**Feature**: 010-mobile-optimization
**Date**: 2026-03-22

## Prerequisites

- Node.js 18+
- PostgreSQL running with seeded database
- Development dependencies installed (`npm install`)

## Local Development

```bash
# Start the dev server
npm run dev

# Open in browser at
http://localhost:3000
```

## Testing Mobile Layouts

### Chrome DevTools (fastest iteration)

1. Open http://localhost:3000 in Chrome
2. Open DevTools (F12 / ⌘⇧I)
3. Toggle Device Toolbar (⌘⇧M)
4. Select "iPhone 12 Mini" from device dropdown (or set custom: 375×812)
5. Navigate through all pages checking for:
   - No horizontal scrollbar
   - All content readable
   - Touch targets visually large enough (44×44px)
   - Modals/sheets fit within viewport

### Playwright E2E Tests

```bash
# Run all E2E tests at mobile viewport
npm run test:e2e

# Run mobile-specific smoke tests
npx playwright test --project=mobile tests/e2e/smoke.spec.ts

# Run with headed browser for visual debugging
npm run test:e2e:headed
```

### Dynamic Type Testing (iOS Safari)

1. On a real iOS device or Simulator:
   - Settings → Accessibility → Display & Text Size → Larger Text
   - Drag slider to maximum
2. Open http://localhost:3000 in Safari
3. Verify all workflows remain completable
4. Key things to check:
   - Buttons grow to accommodate larger text (min-height, not fixed height)
   - Text wraps gracefully, never clips
   - Modals scroll when content overflows

### Key Pages to Test

| Priority | Page | What to verify |
|----------|------|---------------|
| P1 | `/pos` | Product grid 2-col, cart drawer, payment modal, inline search |
| P2 | `/transactions` | DataTable card view, date range picker single-month, row tap detail |
| P2 | Navigation | Sidebar drawer overlay, header compact, close on navigate |
| P3 | `/menu` | Categories horizontal scroll, product detail full-screen sheet |
| P3 | `/ingredients` | List/detail toggle, restock dialog, inventory count |
| P4 | `/analytics` | Summary cards stacked, charts responsive, toggle group |
| P4 | `/settings` | Tab bar scrollable, form inputs full-width, save accessible |
| P4 | `/users`, `/employees` | Table card view, detail sheet |
| P4 | `/orders` | Order board tabs (one column at a time) |
| P4 | `/calendar` | Day list view (not grid), day tap detail |
| P4 | `/waste` | DataTable card view, waste form |
| P4 | `/audit-log` | Timeline/table mobile layout |
| P4 | `/customers` | Table card view, customer detail page |

### Safe Area Testing

To test notch/home-indicator handling:
1. Use Chrome DevTools → Device Toolbar → select an iPhone with notch
2. Check that fixed bottom elements (MobileCartBar, modal footers) don't overlap the home indicator
3. Verify the sidebar drawer doesn't clip behind the notch

## Default Credentials

- Username: `admin`
- Password: `admin`
