# Tasks: Transaction Fixes - Currency, Void, and Display

**Input**: Design documents from `/specs/003-transaction-fixes/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/void-api.yaml

**Tests**: Included per plan.md Constitution Check (Test-First Development is mandatory for this project)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema changes and shared utilities that all stories depend on

- [X] T001 Add void fields to Transaction model in prisma/schema.prisma (isVoided, voidedAt, voidedById, voidedByName, voidReason)
- [X] T002 Add permVoid permission to User model in prisma/schema.prisma
- [X] T003 Add VoidedTransactions relation between User and Transaction in prisma/schema.prisma
- [X] T004 Run Prisma migration: `npx prisma migrate dev --name add-void-fields`
- [X] T005 [P] Create formatCurrency utility in src/lib/format-currency.ts
- [X] T006 [P] Create useSettings hook in src/hooks/use-settings.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core API changes that MUST be complete before user story UI work can begin

**⚠️ CRITICAL**: No user story UI work can begin until this phase is complete

- [X] T007 Add permVoid to user select/create/update in src/app/api/users/route.ts
- [X] T008 Update NextAuth session to include permVoid in src/lib/auth.ts
- [X] T009 [P] Create void constants (VALID_VOID_REASONS, VOID_WINDOW_DAYS) in src/lib/void-constants.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Transactions with Correct Currency (Priority: P1) 🎯 MVP

**Goal**: All monetary values in transactions UI display with the currency symbol from Settings (e.g., ₱ for PHP instead of hardcoded $)

**Independent Test**: Configure currencySymbol to "₱" in Settings, verify all transaction displays use that symbol

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T010 [P] [US1] Unit test for formatCurrency with various symbols in tests/unit/format-currency.test.ts
- [X] T011 [P] [US1] E2E test for currency display in transaction list in tests/e2e/transactions-currency.spec.ts

### Implementation for User Story 1

- [X] T012 [US1] Implement formatCurrency function with configurable symbol in src/lib/format-currency.ts
- [X] T013 [US1] Implement useSettings hook to fetch and cache currencySymbol in src/hooks/use-settings.ts
- [X] T014 [US1] Replace hardcoded "$" with formatCurrency in transaction list table in src/app/(dashboard)/transactions/page.tsx
- [X] T015 [US1] Replace hardcoded "$" with formatCurrency in transaction detail dialog in src/app/(dashboard)/transactions/page.tsx
- [X] T016 [US1] Replace hardcoded "$" with formatCurrency in today's summary cards in src/app/(dashboard)/transactions/page.tsx

**Checkpoint**: Currency display working with configurable symbol - User Story 1 complete

---

## Phase 4: User Story 2 - Void a Completed Transaction (Priority: P1)

**Goal**: Authorized users can void completed transactions within 7 days, with reason tracking and visual distinction

**Independent Test**: Void a transaction, verify it's marked as voided, excluded from revenue totals, and reason is recorded

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T017 [P] [US2] Unit test for void validation (7-day window, already voided) in tests/unit/void-validation.test.ts
- [X] T018 [P] [US2] Contract test for PATCH /api/transactions/[id]/void in tests/unit/void-api.test.ts
- [X] T019 [P] [US2] E2E test for full void workflow in tests/e2e/transactions-void.spec.ts

### Implementation for User Story 2

#### API Layer

- [X] T020 [US2] Create void validation functions in src/lib/void-validation.ts (validateVoidReason, validateVoidWindow, validateNotAlreadyVoided)
- [X] T021 [US2] Create PATCH endpoint in src/app/api/transactions/[id]/void/route.ts
- [X] T022 [US2] Add isVoided: false filter to revenue calculations in src/app/api/transactions/today/route.ts

#### UI Layer

- [X] T023 [US2] Add Void button to transaction detail dialog in src/app/(dashboard)/transactions/page.tsx
- [X] T024 [US2] Create VoidTransactionDialog component with reason selection in src/app/(dashboard)/transactions/page.tsx
- [X] T025 [US2] Add voided badge and muted styling to transaction list rows in src/app/(dashboard)/transactions/page.tsx
- [X] T026 [US2] Add strikethrough styling to voided transaction totals in src/app/(dashboard)/transactions/page.tsx
- [X] T027 [US2] Disable void button for users without permVoid permission in src/app/(dashboard)/transactions/page.tsx
- [X] T028 [US2] Disable void button for transactions older than 7 days with tooltip in src/app/(dashboard)/transactions/page.tsx
- [X] T029 [US2] Disable void button for already voided transactions in src/app/(dashboard)/transactions/page.tsx

**Checkpoint**: Void workflow complete - authorized users can void transactions with full validation

---

## Phase 5: User Story 3 - View Void History and Audit Trail (Priority: P2)

**Goal**: Users can filter for voided transactions and see who voided them and why

**Independent Test**: Filter for voided transactions, verify void details (who, when, why) are visible

### Tests for User Story 3 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T030 [P] [US3] E2E test for void filter and audit display in tests/e2e/transactions-void.spec.ts (extend existing)

### Implementation for User Story 3

- [X] T031 [US3] Add isVoided filter parameter support to GET /api/transactions in src/app/api/transactions/route.ts
- [X] T032 [US3] Add "Voided" option to status filter dropdown in src/app/(dashboard)/transactions/page.tsx
- [X] T033 [US3] Display void details (voidedByName, voidedAt, voidReason) in transaction detail dialog in src/app/(dashboard)/transactions/page.tsx
- [X] T034 [US3] Show void timestamp and user in transaction list for voided rows in src/app/(dashboard)/transactions/page.tsx

**Checkpoint**: Void audit trail complete - full visibility into who voided what and why

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and improvements across all user stories

- [X] T035 Add permVoid checkbox to user management UI in src/app/(dashboard)/users/page.tsx
- [X] T036 [P] Run all unit tests: npm run test:unit (286 tests passed)
- [X] T037 [P] Run all E2E tests: npm run test:smoke (6 tests passed)
- [ ] T038 Run quickstart.md manual testing checklist
- [X] T039 Verify migration grants permVoid to existing admin users (seed script or migration)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - US1 (Currency) and US2 (Void Core) can proceed in parallel
  - US3 (Void History) can proceed after US2 void API is complete
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P2)**: Depends on US2 void API (T021) being complete - builds on void functionality

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Validation/utility functions before API endpoints
- API endpoints before UI components
- Core functionality before error handling/edge cases
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**:
- T005 (formatCurrency) and T006 (useSettings) can run in parallel

**Phase 2 (Foundational)**:
- T009 (void constants) can run parallel to T007/T008

**Phase 3 (US1 - Currency)**:
- T010 and T011 (tests) can run in parallel
- T014, T015, T016 (UI replacements) can run in parallel after T012/T013

**Phase 4 (US2 - Void Core)**:
- T017, T018, T019 (tests) can run in parallel
- T023-T029 (UI tasks) can run after T020-T022 (API tasks)

**Phase 6 (Polish)**:
- T036 and T037 (test runs) can run in parallel

---

## Parallel Example: User Story 2

```bash
# Launch all tests for User Story 2 together:
Task: "Unit test for void validation in tests/unit/void-validation.test.ts"
Task: "Contract test for PATCH /api/transactions/[id]/void in tests/unit/void-api.test.ts"
Task: "E2E test for full void workflow in tests/e2e/transactions-void.spec.ts"

# After tests written, launch API implementation:
Task: "Create void validation functions in src/lib/void-validation.ts"
Task: "Create PATCH endpoint in src/app/api/transactions/[id]/void/route.ts"
Task: "Add isVoided filter to revenue calculations in src/app/api/transactions/today/route.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (schema changes)
2. Complete Phase 2: Foundational (API prep)
3. Complete Phase 3: User Story 1 (Currency Display)
4. **STOP and VALIDATE**: Test currency display with ₱ symbol
5. Deploy/demo if ready - system now supports configurable currency

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (Currency) → Test independently → Deploy (MVP!)
3. Add User Story 2 (Void Core) → Test independently → Deploy (Full void capability)
4. Add User Story 3 (Void History) → Test independently → Deploy (Complete audit trail)
5. Each story adds value without breaking previous stories

### Recommended Execution Order

For a single developer, execute in this order:
1. T001-T004 (Schema) → T005-T006 (Utilities) → T007-T009 (Foundation)
2. T010-T016 (US1 complete)
3. T017-T029 (US2 complete)
4. T030-T034 (US3 complete)
5. T035-T039 (Polish)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- The plan.md specifies TDD is mandatory (Constitution Principle I)
