# Tasks: Ingredient Unit System Redesign

**Input**: Design documents from `/specs/004-ingredient-unit-system/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ingredients-api.md

**Tests**: Optional - not explicitly requested in spec. Tasks focus on implementation.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create foundational utilities and types used by all user stories

- [X] T001 [P] Create TypeScript type definitions for ingredient unit system in src/types/ingredient.ts
- [X] T002 [P] Create cost calculation utilities with Zod validation in src/lib/ingredient-utils.ts
- [X] T003 Create unit test file for cost calculations in tests/unit/ingredient-calculations.test.ts

**Checkpoint**: Core utilities available for all subsequent phases

---

## Phase 1.5: Test Infrastructure (TDD Foundation)

**Purpose**: Write failing tests before implementation per Constitution Principle I

- [ ] T003.1 [P] Write failing unit tests for cost calculation utilities in tests/unit/ingredient-calculations.test.ts
- [ ] T003.2 [P] Write failing integration tests for POST/GET /api/ingredients with unit fields in tests/integration/ingredients-api.test.ts
- [ ] T003.3 Write failing E2E test for "add ingredient with package conversion" workflow in tests/e2e/ingredient-unit-system.spec.ts

**Checkpoint**: Red phase complete - tests fail because implementation doesn't exist yet

---

## Phase 2: Foundational (Database Migration)

**Purpose**: Add new schema fields required for P3 user stories (overhead, count mode)

**⚠️ CRITICAL**: Must complete before Phase 5+ (P2 stories) that use new fields

- [X] T004 Add Prisma migration for Ingredient fields: baseUnit, packageSize, packageUnit, costPerPackage, sellPrice, countByBaseUnit, isOverhead, overheadPerTransaction in prisma/schema.prisma and run migration
- [X] T005 Run `npx prisma generate` to update Prisma client types
- [ ] T006 Update database seed file if needed for new fields in prisma/seed.ts
- [ ] T006.1 Write and run integration test verifying new Prisma fields are accessible in tests/integration/ingredient-schema.test.ts

**Checkpoint**: Database schema ready and verified for all user stories

---

## Phase 3: User Story 1 - Add Ingredient with Package Conversion (Priority: P1) 🎯 MVP

**Depends on**: Phase 1.5 tests written (TDD Red phase)
**Goal**: Make Phase 1.5 tests pass (TDD Green phase) - Users can add ingredients with package-to-base-unit conversions and see real-time cost calculations

**Independent Test**: Add one ingredient with package conversion, verify costPerBaseUnit displays correctly

### Implementation for User Story 1

- [X] T007 [US1] Update POST /api/ingredients to accept and validate new unit system fields in src/app/api/ingredients/route.ts
- [X] T008 [US1] Update GET /api/ingredients to return computed fields (costPerBaseUnit, totalBaseUnits, stockStatus) in src/app/api/ingredients/route.ts
- [X] T009 [US1] Redesign Add Ingredient form with dual-unit inputs (purchase unit + usage unit sections) in src/app/(dashboard)/ingredients/page.tsx
- [X] T010 [US1] Implement real-time cost-per-base-unit calculation display in ingredient form in src/app/(dashboard)/ingredients/page.tsx
- [X] T011 [US1] Add form simplification logic when purchase and usage units are the same in src/app/(dashboard)/ingredients/page.tsx
- [X] T012 [US1] Add Zod validation schema for ingredient form (prevent packageSize = 0) in src/lib/ingredient-utils.ts

**Checkpoint**: User Story 1 complete - can add ingredients with package conversion and see calculated cost

---

## Phase 4: User Story 2 - View Stock in Context (Priority: P1)

**Goal**: Users see stock displayed in dual format (packages + base units) in the ingredients list

**Independent Test**: View ingredients list, verify dual-unit display like "3.5 packs (28 pcs)"

### Implementation for User Story 2

- [X] T013 [US2] Update ingredient table columns to show dual-unit stock display in src/app/(dashboard)/ingredients/page.tsx
- [X] T014 [US2] Add helper function for formatting dual-unit display in src/lib/ingredient-utils.ts
- [X] T015 [US2] Update ingredient list to hide conversion display when units are identical in src/app/(dashboard)/ingredients/page.tsx
- [ ] T016 [P] [US2] Update low stock alert popover to show dual-unit quantities in src/components/ingredients/low-stock-alert.tsx
- [ ] T017 [P] [US2] Update GET /api/ingredients/low-stock to include totalBaseUnits in response in src/app/api/ingredients/low-stock/route.ts

**Checkpoint**: User Story 2 complete - stock levels visible in meaningful dual-unit format

---

## Phase 5: User Story 3 - Restock with Updated Pricing (Priority: P2)

**Goal**: Users can restock ingredients and update pricing/pack size with accurate cost recalculation

**Independent Test**: Restock an ingredient with new price, verify costPerBaseUnit updates correctly

### Implementation for User Story 3

- [X] T018 [US3] Update POST /api/ingredients/:id/restock to accept costPerPackage and packageSize updates in src/app/api/ingredients/[id]/restock/route.ts
- [X] T019 [US3] Add audit trail logging for price changes during restock in src/app/api/ingredients/[id]/restock/route.ts
- [X] T020 [US3] Update restock dialog UI to show optional price/size update fields in src/app/(dashboard)/ingredients/page.tsx
- [X] T021 [US3] Display cost change confirmation in restock dialog (old vs new costPerBaseUnit) in src/app/(dashboard)/ingredients/page.tsx

**Checkpoint**: User Story 3 complete - restocking handles price changes with audit trail

---

## Phase 6: User Story 4 - Use Ingredient in Recipe (Priority: P2)

**Goal**: Recipe builder uses base units for quantities and shows accurate cost per ingredient line

**Independent Test**: Add ingredient to recipe, verify line cost uses correct costPerBaseUnit

### Implementation for User Story 4

- [ ] T022 [US4] Update recipe ingredient quantity input to clearly indicate base units in src/app/(dashboard)/recipes/[productId]/page.tsx
- [ ] T023 [US4] Display cost per base unit next to each recipe ingredient line in src/app/(dashboard)/recipes/[productId]/page.tsx
- [ ] T024 [US4] Add helper text showing package equivalent for entered quantity in src/app/(dashboard)/recipes/[productId]/page.tsx
- [ ] T025 [US4] Ensure recipe cost totals use costPerBaseUnit for accurate food cost in src/app/(dashboard)/recipes/[productId]/page.tsx

**Checkpoint**: User Story 4 complete - recipes accurately cost ingredients using base units

---

## Phase 7: User Story 5 - Count Inventory (Priority: P2)

**Goal**: Inventory count supports counting by packages OR base units per ingredient preference

**Independent Test**: Perform inventory count, verify can enter count in either packages or pieces

### Implementation for User Story 5

- [ ] T026 [US5] Update PUT /api/ingredients/:id to handle countByBaseUnit preference in src/app/api/ingredients/[id]/route.ts
- [ ] T027 [US5] Update inventory count page to respect countByBaseUnit setting in src/app/(dashboard)/ingredients/count/page.tsx
- [ ] T028 [US5] Update count item row component to show expected quantity in configured unit in src/components/inventory-count/count-item-row.tsx
- [ ] T029 [US5] Add conversion helper for count input (accept packs OR pieces, convert appropriately) in src/app/(dashboard)/ingredients/count/page.tsx
- [ ] T030 [US5] Add count preference toggle in ingredient form in src/app/(dashboard)/ingredients/page.tsx

**Checkpoint**: User Story 5 complete - inventory counts flexible by package or base unit

---

## Phase 8: User Story 6 - Manage Sellable Inventory Items (Priority: P3)

**Goal**: Ingredients can be marked sellable and appear in POS with synced stock

**Independent Test**: Mark ingredient sellable with price, verify it appears in POS product list

### Implementation for User Story 6

- [ ] T031 [US6] Add sellPrice field to Prisma schema if not present, run migration in prisma/schema.prisma
- [ ] T032 [US6] Add sellable/sellPrice fields to ingredient form UI in src/app/(dashboard)/ingredients/page.tsx
- [ ] T033 [US6] Implement product sync logic when ingredient marked sellable in src/app/api/ingredients/route.ts
- [ ] T034 [US6] Update transaction processing to deduct from ingredient stock for sellable items in src/app/api/transactions/route.ts
- [ ] T035 [US6] Add sync status indicator in ingredient list for sellable items in src/app/(dashboard)/ingredients/page.tsx

**Checkpoint**: User Story 6 complete - sellable ingredients sync to POS and stock updates on sale

---

## Phase 9: User Story 7 - Handle Overhead/Supply Items (Priority: P3)

**Goal**: Per-transaction items (gloves, containers) automatically deduct on transaction completion

**Independent Test**: Mark item as overhead with usage rate, complete transaction, verify deduction

### Implementation for User Story 7

- [ ] T036 [US7] Add isOverhead and overheadPerTransaction fields to ingredient form UI in src/app/(dashboard)/ingredients/page.tsx
- [ ] T037 [US7] Implement overhead deduction hook in transaction completion in src/app/api/transactions/route.ts
- [ ] T038 [US7] Add audit trail entry for overhead deductions with source="transaction" in src/app/api/transactions/route.ts
- [ ] T039 [US7] Show overhead indicator badge in ingredient list in src/app/(dashboard)/ingredients/page.tsx

**Checkpoint**: User Story 7 complete - overhead items auto-deduct per transaction

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories and final validation

- [X] T040 [P] Add backward compatibility layer for legacy unit/costPerUnit fields in src/lib/ingredient-utils.ts
- [X] T041 [P] Update ingredient edit form (PUT flow) to use same dual-unit UI as create in src/app/(dashboard)/ingredients/page.tsx
- [ ] T042 Validate all edge cases from spec (zero packageSize prevention, fractional packages, large conversions)
- [ ] T043 Run quickstart.md validation with sample data (Burger Patties, Chicken Wings, Cooking Oil)
- [ ] T044 Verify existing ingredients continue working (backward compatibility test)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Test Infrastructure (Phase 1.5)**: Depends on Setup - TDD Red phase, write failing tests
- **Foundational (Phase 2)**: Depends on Setup - adds ALL new schema fields via migration
- **User Story 1 (Phase 3)**: Depends on Phase 1.5 + Phase 2 - TDD Green phase, P1 priority, MVP core
- **User Story 2 (Phase 4)**: Depends on Phase 2 - P1 priority, builds on US1 display
- **User Story 3 (Phase 5)**: Depends on Phase 2 - P2 priority
- **User Story 4 (Phase 6)**: Depends on Phase 2 - P2 priority
- **User Story 5 (Phase 7)**: Depends on Phase 2 (countByBaseUnit field) - P2 priority
- **User Story 6 (Phase 8)**: Depends on Phase 2 (sellPrice field) - P3 priority
- **User Story 7 (Phase 9)**: Depends on Phase 2 (isOverhead fields) - P3 priority
- **Polish (Phase 10)**: Depends on all user stories

### User Story Dependencies

- **US1 (P1)**: Core ingredient form - no dependencies on other stories
- **US2 (P1)**: List display - can build in parallel with US1
- **US3 (P2)**: Restock - uses same cost calculation as US1
- **US4 (P2)**: Recipe - uses ingredient data from US1
- **US5 (P2)**: Count - requires countByBaseUnit migration
- **US6 (P3)**: Sellable - requires sellPrice field
- **US7 (P3)**: Overhead - requires isOverhead fields migration

### Parallel Opportunities

**Setup Phase (T001-T003)**:
```bash
# Run in parallel:
Task T001: "Create TypeScript types in src/types/ingredient.ts"
Task T002: "Create cost utilities in src/lib/ingredient-utils.ts"
```

**Test Infrastructure Phase (T003.1-T003.3)**:
```bash
# Run in parallel after Setup:
Task T003.1: "Write failing unit tests for cost calculations"
Task T003.2: "Write failing integration tests for API"
# T003.3 runs after T003.1/T003.2 (E2E depends on understanding unit/integration patterns)
```

**User Story 1 & 2 (after Setup)**:
```bash
# Can start simultaneously since they touch different aspects:
# US1 focuses on form/create flow
# US2 focuses on list/display flow
Task T009: "Redesign Add Ingredient form..."
Task T013: "Update ingredient table columns..."
```

**User Story 2 Internal**:
```bash
# Run in parallel:
Task T016: "Update low stock alert popover..."
Task T017: "Update GET /api/ingredients/low-stock..."
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 3: User Story 1 (T007-T012)
3. Complete Phase 4: User Story 2 (T013-T017)
4. **STOP and VALIDATE**: Test adding ingredients and viewing dual-unit stock
5. Deploy/demo - core value delivered

### Incremental Delivery

1. Setup + US1 + US2 → MVP (dual-unit ingredient management) ✅
2. Add Foundational (T004-T006) → Database ready for remaining stories
3. Add US3 (Restock) → Enhanced inventory management
4. Add US4 (Recipe) → Accurate recipe costing
5. Add US5 (Count) → Flexible inventory counts
6. Add US6 (Sellable) → Direct ingredient sales
7. Add US7 (Overhead) → Complete cost tracking

### Suggested MVP Scope

**MVP = User Story 1 + User Story 2 (both P1 priority)**

This delivers:
- ✅ Add ingredients with package conversion
- ✅ Real-time cost-per-base-unit calculation
- ✅ Dual-unit stock display
- ✅ Core value proposition complete

Can ship without: Restock updates, recipe integration, count modes, sellable, overhead

---

## Notes

- All monetary values use ₱ (Philippine Peso)
- Decimal precision: 2 places for currency display, full precision stored internally
- Existing ingredients with legacy `unit`/`costPerUnit` continue working via fallback logic
- The database schema already has most fields - this is primarily UI/API work
- Avoid: Breaking existing ingredient functionality during migration
