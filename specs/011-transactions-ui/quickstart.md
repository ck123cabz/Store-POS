# Quickstart: Transactions Page UI/UX Refactor

**Branch**: `011-transactions-ui`

## Setup

```bash
git checkout 011-transactions-ui
npm install
npm run dev
```

Navigate to http://localhost:3000 → Login (admin/admin) → Sidebar → Transactions

## Key Files

| File | Purpose |
|------|---------|
| `src/app/(dashboard)/transactions/page.tsx` | Main page (REFACTOR TARGET — 1040 lines → ~150) |
| `src/components/transactions/` | NEW directory for extracted components |
| `src/hooks/use-transactions.ts` | NEW hook for filter state + data fetching |
| `src/lib/export-transactions.ts` | NEW CSV generation utility |

## Design Reference

Pencil prototypes in `official-store-pos.pen` (scroll to bottom of canvas):
- **Transactions — Desktop** (1440×900)
- **Transactions — Mobile** (390×844)
- **Transactions — Mobile Detail** (390×844) — GCash Pending variant
- **Transactions — Mobile Detail (On Tab)** (390×844) — Tab variant

## Existing Patterns to Follow

- **Component directory**: See `src/components/pos/` or `src/components/customers/` for precedent
- **Custom hook**: See `src/hooks/use-cart.ts` for state management pattern
- **Mobile detection**: `useIsMobile()` from `src/hooks/use-mobile.ts` (768px breakpoint)
- **Currency formatting**: `formatCurrency()` from `src/lib/format-currency.ts`
- **Date ranges**: `getDateRange()` from `src/lib/date-ranges.ts`
- **Settings/currency**: `useSettings()` from `src/hooks/use-settings.ts`
- **Void constants**: `VALID_VOID_REASONS` from `src/lib/void-constants.ts`

## Testing

```bash
# Run existing transaction E2E tests
npx playwright test transaction-filters transactions-void transactions-currency

# Run unit tests
npm run test:unit

# Run all tests
npm run test:all
```

## Development Order

1. Create `use-transactions.ts` hook (extract state from page.tsx)
2. Create components in `src/components/transactions/` one at a time
3. Refactor `page.tsx` to compose the new components
4. Update existing E2E test selectors
5. Add new E2E tests for mobile cards, detail views, export
6. Add unit tests for CSV export utility
