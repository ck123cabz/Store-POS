# Implementation Plan: POS Mobile Optimization & Payment Methods

**Branch**: `002-pos-mobile-payments` | **Date**: 2026-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-pos-mobile-payments/spec.md`

## Summary

Extend the existing POS system with three payment methods (Cash enhancements, GCash with photo verification, Tab store credit), split payment support, offline transaction queuing, and mobile-optimized responsive UI. The feature builds on the existing transaction infrastructure while adding customer credit management and offline-first capabilities.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19, Next.js 16
**Primary Dependencies**: Prisma ORM, NextAuth.js v5, Radix UI, Tailwind CSS, Zod
**Storage**: PostgreSQL with Prisma; local storage for offline queue
**Testing**: Vitest (unit tests), Playwright (E2E tests)
**Target Platform**: Web (desktop & mobile browsers, Chrome/Safari past 2 years)
**Project Type**: Web application (Next.js monorepo structure)
**Performance Goals**: Complete payment selection to confirmation in <30 seconds (SC-001)
**Constraints**: Offline-capable, minimum 44x44px touch targets, 320px minimum width
**Scale/Scope**: Single-store POS, existing customer base ~100s, transactions ~100s/day

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Test-First Development (NON-NEGOTIABLE)
- [ ] All new payment method logic requires unit tests BEFORE implementation
- [ ] Split payment calculations require dedicated test coverage
- [ ] Tab balance updates require integration tests for atomicity
- [ ] Offline queue sync requires E2E tests for idempotency
- [ ] Camera/photo upload requires E2E tests

### Principle II: Security-First
- [ ] GCash reference numbers validated and sanitized
- [ ] Credit limit override requires manager/admin role check
- [ ] All payment operations logged to audit trail
- [ ] Photo uploads validated for type/size, stored securely
- [ ] Offline transactions signed/validated before sync

### Principle III: Pragmatic Simplicity
- [ ] Extend existing Transaction model vs. creating new payment tables
- [ ] Reuse existing customer selector component for Tab payments
- [ ] Single PaymentModal component with tabs for all payment types
- [ ] Use browser localStorage/IndexedDB for offline queue (no new dependencies)

### Principle IV: Data Integrity
- [ ] Tab balance updates atomic with transaction completion
- [ ] Split payment totals validated to match transaction total
- [ ] Offline transactions use idempotency keys to prevent duplicates
- [ ] Customer deletion blocked if tabBalance > 0

### Principle V: RESTful API Standards
- [ ] New endpoints follow existing patterns (/api/customers, /api/transactions)
- [ ] Consistent error format: `{ error: true, message: string }`
- [ ] Tab settlement recorded as separate transaction type
- [ ] Offline sync uses existing POST /api/transactions with idempotency header

**Gate Status**: ✅ PASS - No violations; design aligns with all principles

## Project Structure

### Documentation (this feature)

```text
specs/002-pos-mobile-payments/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/
│   │   ├── transactions/route.ts        # Extend for payment methods, split payments
│   │   ├── customers/[id]/route.ts      # Extend for tab balance, credit limit
│   │   ├── customers/[id]/tab/route.ts  # NEW: Tab settlement endpoint
│   │   └── uploads/gcash/route.ts       # NEW: GCash photo upload
│   └── (dashboard)/
│       └── pos/page.tsx                 # Mobile responsive enhancements
├── components/
│   └── pos/
│       ├── payment-modal.tsx            # Extend with Cash/GCash/Tab/Split tabs
│       ├── cart.tsx                     # Mobile-optimized layout
│       ├── product-grid.tsx             # Responsive grid adjustments
│       ├── gcash-camera.tsx             # NEW: Camera capture component
│       ├── split-payment.tsx            # NEW: Split payment flow
│       └── offline-indicator.tsx        # NEW: Network status + queue count
├── hooks/
│   ├── use-cart.ts                      # Extend for split payments
│   └── use-offline-queue.ts             # NEW: Offline transaction queue
└── lib/
    ├── offline-storage.ts               # NEW: IndexedDB wrapper
    └── payment-validation.ts            # NEW: Payment calculation utilities

tests/
├── unit/
│   ├── payment-calculations.test.ts     # NEW: Split payment math, change calc
│   └── credit-limit.test.ts             # NEW: Credit limit validation
├── integration/
│   └── tab-settlement.test.ts           # NEW: Tab payment flows
└── e2e/
    ├── cash-payment.spec.ts             # NEW: Cash payment E2E
    ├── gcash-payment.spec.ts            # NEW: GCash with photo capture E2E
    ├── tab-payment.spec.ts              # NEW: Tab payment E2E
    ├── tab-settlement.spec.ts           # NEW: Tab settlement E2E
    ├── split-payment.spec.ts            # NEW: Split payment E2E
    ├── mobile-pos.spec.ts               # NEW: Mobile viewport tests
    └── offline-sync.spec.ts             # NEW: Offline queue tests
```

**Structure Decision**: Extending existing Next.js App Router structure. New components added to `/src/components/pos/`, new hooks for offline support, API routes extended or added in existing `/api/` folder. No new top-level directories needed.

## Complexity Tracking

> No violations requiring justification. Design uses existing patterns and minimal new abstractions.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | - | - |
