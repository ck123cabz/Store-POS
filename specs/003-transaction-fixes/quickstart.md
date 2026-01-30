# Quickstart: Transaction Fixes Implementation

**Feature**: 003-transaction-fixes | **Branch**: `003-transaction-fixes`

## Prerequisites

- Node.js 18+
- PostgreSQL database running
- Environment variables configured (`.env`)

## Setup

```bash
# 1. Switch to feature branch
git checkout 003-transaction-fixes

# 2. Install dependencies (if new)
npm install

# 3. Run database migration after schema changes
npx prisma migrate dev --name add-void-fields

# 4. Generate Prisma client
npx prisma generate

# 5. Start development server
npm run dev
```

## Key Files to Modify

### Database Schema
```
prisma/schema.prisma
  - Add isVoided, voidedAt, voidedById, voidedByName, voidReason to Transaction
  - Add permVoid to User
  - Add voidedTransactions relation to User
```

### API Routes
```
src/app/api/transactions/route.ts
  - Add isVoided filter support
  - Ensure voided excluded from default queries

src/app/api/transactions/[id]/void/route.ts (NEW)
  - PATCH handler for voiding transactions
  - Permission check (permVoid)
  - 7-day window validation
  - Void reason validation

src/app/api/transactions/today/route.ts
  - Exclude voided transactions from revenue totals

src/app/api/users/route.ts
  - Add permVoid to user select/create/update
```

### Frontend
```
src/app/(dashboard)/transactions/page.tsx
  - Add currency symbol from settings
  - Add void button and dialog
  - Add voided badge and styling
  - Add "Voided" status filter

src/lib/format-currency.ts (NEW)
  - Extract formatCurrency with configurable symbol

src/hooks/use-settings.ts (NEW)
  - Settings context hook for currency symbol
```

### Tests
```
tests/unit/format-currency.test.ts (NEW)
  - Currency formatting with various symbols

tests/unit/void-validation.test.ts (NEW)
  - Void permission checks
  - 7-day window validation

tests/e2e/transactions-void.spec.ts (NEW)
  - Full void workflow E2E

tests/e2e/transactions-currency.spec.ts (NEW)
  - Currency display verification
```

## Testing Commands

```bash
# Run unit tests
npm run test:unit

# Run E2E tests
npm run test:e2e

# Run specific test file
npx vitest tests/unit/format-currency.test.ts
npx playwright test tests/e2e/transactions-void.spec.ts
```

## Manual Testing Checklist

### Currency Display
- [ ] Change currency symbol in Settings to "₱"
- [ ] Navigate to Transactions page
- [ ] Verify all amounts show "₱" prefix
- [ ] Open transaction detail dialog
- [ ] Verify all amounts show "₱" prefix
- [ ] Check summary cards show "₱" prefix

### Void Transaction
- [ ] Log in as admin (has permVoid)
- [ ] Navigate to Transactions page
- [ ] Click a recent transaction
- [ ] Click "Void" button
- [ ] Select a reason and confirm
- [ ] Verify transaction shows "Voided" badge
- [ ] Verify total has strikethrough
- [ ] Verify revenue totals exclude voided amount

### Void Permissions
- [ ] Log in as user WITHOUT permVoid
- [ ] Navigate to Transactions page
- [ ] Click a transaction
- [ ] Verify "Void" button is hidden/disabled

### Void Time Limit
- [ ] Find a transaction older than 7 days
- [ ] Verify "Void" button is disabled
- [ ] Verify tooltip says "Transaction too old to void"

### Void Filter
- [ ] Select "Voided" from status filter
- [ ] Verify only voided transactions appear
- [ ] Select "All" to see everything

## API Testing

```bash
# Test void endpoint (replace TOKEN and ID)
curl -X PATCH http://localhost:3000/api/transactions/123/void \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -d '{"reason": "Test Transaction"}'

# Expected response (200 OK)
{
  "id": 123,
  "orderNumber": 1234567890,
  "isVoided": true,
  "voidedAt": "2026-01-30T10:00:00.000Z",
  "voidedById": 1,
  "voidedByName": "Admin",
  "voidReason": "Test Transaction",
  ...
}
```

## Troubleshooting

### "Permission denied - void permission required"
- User doesn't have `permVoid` permission
- Solution: Grant permission in User Management or database

### "Transaction is older than 7 days"
- Transaction `createdAt` is more than 7 days ago
- This is by design - cannot void old transactions

### Currency still showing "$"
- Settings may not have loaded yet
- Check Settings page that currencySymbol is set
- Try hard refresh (Ctrl+Shift+R)
