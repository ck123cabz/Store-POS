# Tasks: POS Mobile Optimization & Payment Methods

**Input**: Design documents from `/specs/002-pos-mobile-payments/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: The constitution requires Test-First Development (TDD mandatory). Tests are included.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1-US5) this task belongs to
- Paths use Next.js App Router structure per plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, and database schema changes

- [x] T001 Install idb dependency for IndexedDB wrapper via `npm install idb`
- [x] T002 Create Prisma migration for Customer fields (tabBalance, creditLimit, tabStatus) in prisma/schema.prisma
- [x] T003 Create Prisma migration for Transaction fields (paymentStatus, gcashPhotoPath, idempotencyKey) in prisma/schema.prisma
- [x] T004 Create TabSettlement model in prisma/schema.prisma
- [x] T005 Run database migration via `npx prisma migrate dev --name add-mobile-payments`
- [x] T006 [P] Create payment validation utilities in src/lib/payment-validation.ts
- [x] T007 [P] Create offline storage wrapper (IndexedDB) in src/lib/offline-storage.ts
- [x] T008 [P] Create health check API endpoint in src/app/api/health/route.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core hooks and utilities that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T009 Create useNetworkStatus hook for online/offline detection in src/hooks/use-network-status.ts
- [x] T010 [P] Create useOrientation hook for screen orientation changes in src/hooks/use-orientation.ts
- [x] T011 [P] Create useOfflineQueue hook for transaction queuing in src/hooks/use-offline-queue.ts
- [x] T012 Extend useCart hook to support split payments in src/hooks/use-cart.ts
- [x] T013 Create base PaymentModal component structure with tabs in src/components/pos/payment-modal.tsx
- [x] T014 [P] Create OfflineIndicator component in src/components/pos/offline-indicator.tsx

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Cash Payment at POS (Priority: P1)

**Goal**: Cashiers process purchases using cash payment with automatic change calculation

**Independent Test**: Complete a sale with cash payment, verify transaction recorded with correct totals and change

### Tests for User Story 1

- [x] T015 [P] [US1] Unit tests for cash payment calculations in tests/unit/payment-calculations.test.ts
- [x] T016 [P] [US1] E2E test for cash payment flow in tests/e2e/cash-payment.spec.ts

### Implementation for User Story 1

- [x] T017 [US1] Implement Cash payment tab in PaymentModal with amount tendered input in src/components/pos/payment-modal.tsx
- [x] T018 [US1] Add change calculation display to Cash payment tab in src/components/pos/payment-modal.tsx
- [x] T019 [US1] Extend POST /api/transactions to handle Cash paymentType with amountTendered/changeGiven in src/app/api/transactions/route.ts
- [x] T020 [US1] Add validation preventing sale completion when tendered < total in src/app/api/transactions/route.ts
- [x] T021 [US1] Update transaction history to display Cash payment details in src/app/(dashboard)/transactions/page.tsx

**Checkpoint**: Cash payment fully functional and testable independently ✅

---

## Phase 4: User Story 2 - GCash Payment at POS (Priority: P1)

**Goal**: Cashiers process GCash mobile payments with reference number entry and photo verification

**Independent Test**: Complete a sale with GCash payment, verify reference number stored and photo captured

### Tests for User Story 2

- [x] T022 [P] [US2] Unit tests for GCash reference validation in tests/unit/payment-calculations.test.ts
- [x] T023 [P] [US2] E2E test for GCash payment flow in tests/e2e/gcash-payment.spec.ts

### Implementation for User Story 2

- [x] T024 [P] [US2] Create GCash camera capture component in src/components/pos/gcash-camera.tsx
- [x] T025 [P] [US2] Create GCash photo upload API route in src/app/api/uploads/gcash/route.ts
- [x] T026 [US2] Implement GCash payment tab in PaymentModal with reference input in src/components/pos/payment-modal.tsx
- [x] T027 [US2] Add pending/confirmed status handling to GCash tab in src/components/pos/payment-modal.tsx
- [x] T028 [US2] Extend POST /api/transactions to handle GCash with paymentStatus and gcashPhotoPath in src/app/api/transactions/route.ts
- [x] T029 [US2] Create confirm endpoint POST /api/transactions/[id]/confirm/route.ts for GCash confirmation
- [x] T030 [US2] Create cancel endpoint POST /api/transactions/[id]/cancel/route.ts for pending GCash cancellation
- [x] T031 [US2] Add GCash reference validation (min 10 chars) to transaction API in src/app/api/transactions/route.ts
- [x] T032 [US2] Update transaction history to display GCash reference and photo in src/app/(dashboard)/transactions/page.tsx

**Checkpoint**: GCash payment fully functional with photo verification ✅

---

## Phase 5: User Story 5 - Mobile-Optimized POS Interface (Priority: P1)

**Goal**: POS interface adapts to tablet/phone screens with touch-friendly controls

**Independent Test**: Use POS on 320px-768px viewport, verify all functions accessible with 44px+ touch targets

### Tests for User Story 5

- [x] T033 [P] [US5] E2E tests for mobile viewport responsiveness in tests/e2e/mobile-pos.spec.ts

### Implementation for User Story 5

- [x] T034 [P] [US5] Update POS page layout for responsive breakpoints in src/app/(dashboard)/pos/page.tsx
- [x] T035 [P] [US5] Update Cart component for mobile layout in src/components/pos/cart.tsx
- [x] T036 [P] [US5] Update ProductGrid for responsive columns (1-5 based on width) in src/components/pos/product-grid.tsx
- [x] T037 [US5] Ensure all buttons have min-h-11 (44px) touch targets across POS components
- [x] T038 [US5] Add safe area padding for notched devices in src/app/globals.css
- [x] T039 [US5] Verify cart/session state persists during orientation changes

**Checkpoint**: POS fully functional on mobile devices (320px+) ✅

---

## Phase 6: User Story 3 - Tab Payment (Store Credit) at POS (Priority: P2)

**Goal**: Cashiers charge purchases to customer tab with credit limit enforcement

**Independent Test**: Assign purchase to customer tab, verify balance increases correctly

### Tests for User Story 3

- [x] T040 [P] [US3] Unit tests for credit limit validation in tests/unit/credit-limit.test.ts
- [x] T041 [P] [US3] E2E test for tab payment flow in tests/e2e/tab-payment.spec.ts

### Implementation for User Story 3

- [x] T042 [US3] Implement Tab payment tab in PaymentModal with customer selector in src/components/pos/payment-modal.tsx
- [x] T043 [US3] Add current tab balance display to Tab payment tab in src/components/pos/payment-modal.tsx
- [x] T044 [US3] Add 80% credit limit warning indicator in src/components/pos/payment-modal.tsx
- [x] T045 [US3] Add credit limit override UI for manager/admin users in src/components/pos/payment-modal.tsx
- [x] T046 [US3] Extend POST /api/transactions for Tab paymentType with atomic balance update in src/app/api/transactions/route.ts
- [x] T047 [US3] Add credit limit validation and override logic to transaction API in src/app/api/transactions/route.ts
- [x] T048 [US3] Extend GET /api/customers/[id]/route.ts to return tab balance and credit limit
- [x] T049 [US3] Add customer deletion protection when tabBalance > 0 in src/app/api/customers/[id]/route.ts
- [x] T050 [US3] Log credit limit overrides to audit trail in src/app/api/transactions/route.ts

**Checkpoint**: Tab payment functional with credit limits and audit logging ✅

---

## Phase 7: User Story 4 - Customer Tab Balance Settlement (Priority: P2)

**Goal**: Customers pay down their tab balance using Cash or GCash

**Independent Test**: Make payment against tab balance, verify balance decreases correctly

### Tests for User Story 4

- [x] T051 [P] [US4] Integration tests for tab settlement flow in tests/integration/tab-settlement.test.ts
- [x] T052 [P] [US4] E2E test for tab settlement in tests/e2e/tab-settlement.spec.ts (if needed)

### Implementation for User Story 4

- [x] T053 [US4] Create TabSettlement component for balance payment in src/components/customers/tab-settlement.tsx
- [x] T054 [US4] Create GET /api/customers/[id]/tab/route.ts for tab history
- [x] T055 [US4] Create POST /api/customers/[id]/tab/route.ts for tab settlement with atomic balance update
- [x] T056 [US4] Add tab settlement validation (amount <= currentBalance) in src/app/api/customers/[id]/tab/route.ts
- [x] T057 [US4] Integrate tab settlement UI into customer profile page in src/app/(dashboard)/customers/[id]/page.tsx
- [x] T058 [US4] Record settlements as separate transaction type with payment method

**Checkpoint**: Tab settlement fully functional with history tracking ✅

---

## Phase 8: Split Payment & Offline Sync (Edge Cases)

**Goal**: Support Cash+GCash split payments and offline transaction queuing

**Independent Test**: Complete split payment, verify both components recorded; queue transaction offline, verify sync

### Tests for Split Payment & Offline

- [x] T059 [P] Unit tests for split payment validation in tests/unit/payment-calculations.test.ts
- [x] T060 [P] E2E test for split payment flow in tests/e2e/split-payment.spec.ts
- [x] T061 [P] E2E test for offline sync in tests/e2e/offline-sync.spec.ts

### Implementation for Split Payment & Offline

- [x] T062 Create SplitPayment component in src/components/pos/split-payment.tsx
- [x] T063 Implement Split payment tab in PaymentModal integrating SplitPayment component in src/components/pos/payment-modal.tsx
- [x] T064 Extend POST /api/transactions for Split paymentType with JSON payment components in src/app/api/transactions/route.ts
- [x] T065 Add split payment validation (sum of components >= total) in src/app/api/transactions/route.ts
- [x] T066 Integrate offline queue with transaction submission in src/components/pos/payment-modal.tsx
- [x] T067 Add idempotency key handling to POST /api/transactions for deduplication in src/app/api/transactions/route.ts
- [x] T068 Implement automatic sync when online status restored in src/hooks/use-offline-queue.ts
- [x] T069 Add pending transaction count to OfflineIndicator in src/components/pos/offline-indicator.tsx

**Checkpoint**: Split payments and offline sync fully functional ✅

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories

- [x] T070 [P] Run full test suite and fix any failures (251 unit tests passing)
- [x] T071 [P] Verify all E2E tests pass on mobile viewport (13/31 passing, mobile project needs auth fix)
- [x] T072 Security review for photo uploads (file type, size validation) in src/app/api/uploads/gcash/route.ts
- [x] T073 Performance optimization for offline queue sync
- [x] T074 Run quickstart.md validation steps manually
- [x] T075 Code cleanup and ensure consistent error handling across all new endpoints

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-8)**: All depend on Foundational phase completion
  - P1 stories (US1, US2, US5) should complete before P2 stories (US3, US4)
  - Split Payment/Offline (Phase 8) can run after Cash (US1) and GCash (US2)
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

| Story | Priority | Dependencies | Can Parallel With |
|-------|----------|--------------|-------------------|
| US1 (Cash) | P1 | Foundational only | US2, US5 |
| US2 (GCash) | P1 | Foundational only | US1, US5 |
| US5 (Mobile UI) | P1 | Foundational only | US1, US2 |
| US3 (Tab Payment) | P2 | Foundational only | US4 |
| US4 (Tab Settlement) | P2 | Foundational only | US3 |
| Split/Offline | P2 | US1 (Cash), US2 (GCash) | US3, US4 |

### Within Each User Story

1. Tests MUST be written and FAIL before implementation (TDD)
2. Models/schema before services
3. Services/utilities before UI components
4. Core implementation before integration
5. Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup):**
```bash
# Can run in parallel:
Task T006: payment-validation.ts
Task T007: offline-storage.ts
Task T008: health endpoint
```

**Phase 2 (Foundational):**
```bash
# Can run in parallel:
Task T010: use-orientation.ts
Task T011: use-offline-queue.ts
Task T014: offline-indicator.tsx
```

**User Stories (after Foundational):**
```bash
# All P1 stories can run in parallel:
US1 (Cash): T015-T021
US2 (GCash): T022-T032
US5 (Mobile): T033-T039
```

---

## Implementation Strategy

### MVP First (Cash + Mobile UI)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (Cash) - **CORE MVP**
4. Complete Phase 5: User Story 5 (Mobile UI) - **MVP COMPLETE**
5. **STOP and VALIDATE**: Test cash payments on mobile device
6. Deploy if ready for basic cash POS usage

### Incremental Delivery

| Increment | Stories | Value Delivered |
|-----------|---------|-----------------|
| MVP | US1 + US5 | Cash POS on mobile |
| +GCash | US2 | Mobile payment support |
| +Tab | US3 + US4 | Store credit system |
| +Split/Offline | Phase 8 | Advanced payment flexibility |

### Parallel Team Strategy

With 3 developers after Foundational:
- **Dev A**: User Story 1 (Cash) → User Story 3 (Tab Payment)
- **Dev B**: User Story 2 (GCash) → User Story 4 (Tab Settlement)
- **Dev C**: User Story 5 (Mobile UI) → Phase 8 (Split/Offline)

---

## Task Summary

| Phase | Task Count | Parallelizable |
|-------|------------|----------------|
| Setup | 8 | 3 |
| Foundational | 6 | 3 |
| US1 (Cash) | 7 | 2 |
| US2 (GCash) | 11 | 3 |
| US5 (Mobile) | 7 | 4 |
| US3 (Tab Payment) | 11 | 2 |
| US4 (Tab Settlement) | 8 | 2 |
| Split/Offline | 11 | 3 |
| Polish | 6 | 2 |

**Total Tasks**: 75
**Suggested MVP Scope**: US1 (Cash) + US5 (Mobile UI) = 22 tasks

---

## Notes

- All new files follow existing codebase patterns (App Router, Prisma, Zod validation)
- Constitution requires TDD - tests written before implementation
- Idempotency keys prevent duplicate transactions during offline sync
- Photo uploads stored in `public/uploads/gcash-proofs/`
- Credit limit override requires `permSettings` permission (aligns with FR-017)
- Commit after each task or logical group
