# Quickstart: POS Mobile Optimization & Payment Methods

**Branch**: `002-pos-mobile-payments` | **Date**: 2026-01-27

## Overview

This feature adds three payment methods (Cash, GCash, Tab), split payments, offline support, and mobile-optimized UI to the Store-POS application.

## Prerequisites

- Node.js 18+
- PostgreSQL running
- Store-POS development environment set up
- `npm install` completed

## Quick Setup

### 1. Install Dependencies

```bash
npm install
```

The `idb` dependency (3KB gzipped IndexedDB wrapper) is already included in package.json.

### 2. Run Database Migration

```bash
npx prisma migrate dev
```

This applies any pending migrations. The schema includes:
- `tabBalance`, `creditLimit`, `tabStatus` on Customer
- `paymentStatus`, `gcashPhotoPath`, `idempotencyKey` on Transaction
- New `TabSettlement` table

### 3. Start Development Server

```bash
npm run dev
```

## Feature Verification

### Test Cash Payment

1. Navigate to http://localhost:3000/pos
2. Add items to cart
3. Click "Pay"
4. Select "Cash" tab
5. Enter amount tendered
6. Verify change calculation
7. Complete sale

### Test GCash Payment

1. Add items to cart
2. Click "Pay"
3. Select "GCash" tab
4. Transaction shows "Pending"
5. Enter reference number (min 10 chars)
6. Capture/upload confirmation photo
7. Confirm payment

### Test Tab Payment

1. Add items to cart
2. Select a customer from dropdown
3. Click "Pay"
4. Select "Tab" tab
5. Verify credit limit check
6. Complete sale
7. Check customer's tab balance increased

### Test Split Payment

1. Add items to cart
2. Click "Pay"
3. Select "Split" tab
4. Enter Cash amount
5. Enter GCash amount + reference
6. Verify total covers order amount
7. Complete sale

### Test Mobile Responsiveness

1. Open Chrome DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select "iPhone 12 Pro" or similar
4. Navigate through POS workflow
5. Verify touch targets are accessible

### Test Offline Mode

1. Open Network tab in DevTools
2. Check "Offline"
3. Complete a transaction
4. Verify "Pending sync" indicator appears
5. Uncheck "Offline"
6. Verify transaction syncs automatically

## Key Files

### Components

| File | Purpose |
|------|---------|
| `src/components/pos/payment-modal.tsx` | Payment method tabs (Cash/GCash/Tab/Split) |
| `src/components/pos/gcash-camera.tsx` | Camera capture for GCash verification |
| `src/components/pos/split-payment.tsx` | Split payment flow |
| `src/components/pos/offline-indicator.tsx` | Network status + queue count |

### Hooks

| File | Purpose |
|------|---------|
| `src/hooks/use-offline-queue.ts` | IndexedDB queue management |
| `src/hooks/use-network-status.ts` | Online/offline detection |
| `src/hooks/use-orientation.ts` | Screen orientation changes |

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/transactions` | POST | Create transaction (extended) |
| `/api/transactions/[id]/confirm` | POST | Confirm GCash payment |
| `/api/transactions/[id]/cancel` | POST | Cancel pending GCash |
| `/api/customers/[id]/tab` | GET/POST | Tab history / settlement |
| `/api/uploads/gcash` | POST | GCash photo upload |
| `/api/health` | HEAD | Connectivity check |

### Utilities

| File | Purpose |
|------|---------|
| `src/lib/offline-storage.ts` | IndexedDB wrapper |
| `src/lib/payment-validation.ts` | Payment calculation utilities |

## Database Schema

### Customer (extended)

```sql
tab_balance DECIMAL(10,2) DEFAULT 0
credit_limit DECIMAL(10,2) DEFAULT 0
tab_status VARCHAR(20) DEFAULT 'active'
```

### Transaction (extended)

```sql
payment_status VARCHAR(20)  -- pending, confirmed
gcash_photo_path VARCHAR(255)
idempotency_key VARCHAR(100) UNIQUE
```

### TabSettlement (new)

```sql
id SERIAL PRIMARY KEY
customer_id INTEGER REFERENCES customers(id)
amount DECIMAL(10,2)
payment_type VARCHAR(20)
payment_info VARCHAR(255)
previous_balance DECIMAL(10,2)
new_balance DECIMAL(10,2)
user_id INTEGER REFERENCES users(id)
created_at TIMESTAMP
```

## Running Tests

```bash
# Unit tests
npm run test:unit

# E2E tests
npm run test:e2e

# Specific test files
npm run test:unit -- tests/unit/payment-calculations.test.ts
npx playwright test tests/e2e/cash-payment.spec.ts
```

## Troubleshooting

### Camera not working

1. Ensure HTTPS or localhost
2. Grant camera permissions when prompted
3. If blocked, use file upload fallback

### Offline queue not syncing

1. Check IndexedDB in Application tab
2. Verify `/api/health` endpoint accessible
3. Check idempotency key conflicts

### Credit limit override not working

1. Verify logged-in user has `permSettings` permission
2. Check audit log for override attempts

### Touch targets too small

1. Ensure viewport meta is correct
2. Check Tailwind `min-h-11` classes applied
3. Test on actual device (not just emulator)

## Architecture Decisions

1. **IndexedDB over localStorage**: Better for structured data queuing
2. **Idempotency keys**: Prevent duplicate transactions during sync
3. **Atomic Prisma transactions**: Ensure data integrity for tab balance
4. **Camera with fallback**: MediaDevices API + file input
5. **Tailwind responsive**: Mobile-first breakpoints

## Next Steps

After verifying basic functionality:

1. Run full test suite
2. Test on actual mobile devices
3. Load test offline sync with many queued transactions
4. Security review for photo uploads
