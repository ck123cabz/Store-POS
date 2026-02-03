# Feature Specification: Ingredient Unit System Redesign

**Feature Branch**: `004-ingredient-unit-system`
**Created**: 2026-01-30
**Status**: Draft
**Input**: Redesign ingredient management UI to support intuitive package-to-base-unit conversions, allowing users to specify how they purchase items (by pack, bundle, etc.) separately from how they use them in recipes (by piece, gram, etc.), with automatic cost-per-unit calculations and comprehensive edge case handling.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add Ingredient with Package Conversion (Priority: P1)

A store owner needs to add "Burger Patties" to their inventory. They purchase these in packs of 8 pieces at ₱420 per pack, but their recipes use individual patties. The system should let them enter this naturally and automatically calculate the cost per piece (₱52.50).

**Why this priority**: This is the core value proposition - enabling accurate recipe costing by bridging the gap between how items are purchased versus how they're used.

**Independent Test**: Can be fully tested by adding one ingredient with package-to-piece conversion and verifying the calculated cost per base unit is correct.

**Acceptance Scenarios**:

1. **Given** I am on the Add Ingredient form, **When** I enter "Burger Patties", select "pack" as purchase unit, enter ₱420 as cost, select "pieces" as usage unit, and enter 8 pieces per pack, **Then** the system displays "Cost per piece: ₱52.50" in real-time.

2. **Given** I have entered all required fields with valid data, **When** I save the ingredient, **Then** the system stores the package cost, package size, and base unit, and displays the ingredient in the list with both representations.

3. **Given** I am adding an ingredient, **When** I select "kg" as both purchase and usage unit, **Then** the system simplifies the form to show only cost per kg (no conversion section).

---

### User Story 2 - View Stock in Context (Priority: P1)

A store manager checking inventory wants to understand stock levels in meaningful terms. When they have "3.5 packs" of burger patties, they should also see this means "28 pieces available" to understand actual recipe capacity.

**Why this priority**: Stock visibility is essential for daily operations - users need to know both "how many to reorder" (packs) and "how many can we make" (pieces).

**Independent Test**: Can be tested by viewing the ingredient list and verifying dual-unit stock display.

**Acceptance Scenarios**:

1. **Given** an ingredient with 3.5 packs in stock (8 pieces per pack), **When** I view the ingredients list, **Then** I see "3.5 packs (28 pcs)" or similar dual representation.

2. **Given** an ingredient with simple units (same purchase and usage unit), **When** I view the ingredients list, **Then** I see only one quantity display without redundant conversion.

---

### User Story 3 - Restock with Updated Pricing (Priority: P2)

A store owner receives a new shipment of ingredients. The vendor changed their pack size or price. The system should allow updating these values during restock while maintaining accurate cost tracking.

**Why this priority**: Price and pack size changes are common in food service; the system must handle these gracefully to maintain accurate costing.

**Independent Test**: Can be tested by restocking an ingredient with a new price and verifying the cost per base unit updates correctly.

**Acceptance Scenarios**:

1. **Given** Burger Patties currently cost ₱420/pack (8 pcs), **When** I restock with a new cost of ₱450/pack, **Then** the system updates the cost per piece to ₱56.25 and records the price change in history.

2. **Given** I'm restocking an ingredient, **When** the vendor changed pack size from 8 to 10 pieces, **Then** I can update the package size and the cost per base unit recalculates accordingly.

3. **Given** I'm restocking an ingredient, **When** I only add quantity without changing price, **Then** the existing cost per package is preserved.

---

### User Story 4 - Use Ingredient in Recipe (Priority: P2)

A store owner is building a recipe for "Burger Meal" and needs to add burger patties. The recipe form should ask for quantity in base units (pieces) and show the cost contribution clearly.

**Why this priority**: Recipe costing is the primary consumer of the unit conversion data; recipes must work seamlessly with the new system.

**Independent Test**: Can be tested by adding an ingredient to a recipe and verifying the cost calculation uses the correct per-base-unit cost.

**Acceptance Scenarios**:

1. **Given** Burger Patties cost ₱52.50 per piece, **When** I add 1 patty to a recipe, **Then** the line cost shows ₱52.50 and the form clearly indicates "1 piece".

2. **Given** I'm adding an ingredient to a recipe, **When** I enter the quantity, **Then** I see a helper showing the equivalent in packages (e.g., "= 0.125 packs").

---

### User Story 5 - Count Inventory (Priority: P2)

During inventory count, staff need to count physical items. Some prefer counting full packs plus loose items; others prefer counting all individual pieces. The system should support both approaches.

**Why this priority**: Inventory accuracy depends on staff being able to count in the way that makes sense for each item.

**Independent Test**: Can be tested by performing an inventory count and verifying the count can be entered in either packages or base units.

**Acceptance Scenarios**:

1. **Given** I'm counting Burger Patties (8 pcs/pack), **When** I count 3 full packs and 4 loose patties, **Then** I can enter this as "3.5 packs" or "28 pieces" and both are accepted.

2. **Given** an ingredient is configured to "count by pieces", **When** I open inventory count, **Then** the expected quantity shows in pieces and the input accepts piece counts.

---

### User Story 6 - Manage Sellable Inventory Items (Priority: P3)

Beverages like bottled water are both inventory items (purchased in cases) and POS products (sold individually). The system should allow marking ingredients as sellable and syncing them to the product catalog.

**Why this priority**: Many businesses sell raw inventory items directly; this eliminates duplicate data entry and keeps stock synchronized.

**Independent Test**: Can be tested by marking an ingredient as sellable and verifying it appears in POS with correct pricing.

**Acceptance Scenarios**:

1. **Given** Water bottles purchased at ₱14.50 each, **When** I mark it as "sellable" and set sell price to ₱20, **Then** it appears in the POS product list at ₱20.

2. **Given** a sellable ingredient, **When** it's sold through POS, **Then** inventory stock decreases by the quantity sold.

---

### User Story 7 - Handle Overhead/Supply Items (Priority: P3)

Items like plastic gloves or meal containers are used per transaction rather than per recipe. Staff uses approximately 2 gloves per order regardless of what's ordered.

**Why this priority**: Overhead costs significantly impact profitability but aren't recipe-based; tracking them improves cost accuracy.

**Independent Test**: Can be tested by marking an item as overhead and verifying usage deducts per transaction.

**Acceptance Scenarios**:

1. **Given** Plastic Gloves marked as "overhead item" with usage of 2 per transaction, **When** a transaction is completed, **Then** 2 gloves are deducted from inventory.

2. **Given** Meal Containers marked as "per-order overhead", **When** I configure usage rate, **Then** the system tracks and deducts usage automatically.

---

### Edge Cases

- **Zero package size**: System prevents saving an ingredient with packageSize of 0 (division by zero)
- **Cross-type unit conversion**: System accepts any unit combination (e.g., buy by "kg", use by "pieces") with user-defined conversion factor in packageSize field
- **Fractional packages on restock**: User can enter partial packs (e.g., received 2.5 packs because one was damaged)
- **Very small base units**: System handles ingredients where 1 package = 1000+ base units (e.g., sugar: 1kg bag = 1000g)
- **Legacy data migration**: Existing ingredients with old unit field continue to work and can be gradually migrated
- **Rounding in recipes**: When recipe uses 0.33 pieces, cost calculation handles decimals appropriately

## Requirements *(mandatory)*

### Functional Requirements

**Form & Input**

- **FR-001**: System MUST provide separate input fields for "purchase unit" (how you buy) and "usage unit" (how you use in recipes)
- **FR-002**: System MUST allow entering "package size" (how many base units per package)
- **FR-003**: System MUST calculate and display cost per base unit in real-time as user enters data
- **FR-004**: System MUST simplify the form when purchase and usage units are the same (no conversion section)
- **FR-005**: System MUST allow any combination of purchase and usage units; the packageSize field serves as the user-defined conversion factor (e.g., 1 kg = 10 pieces for chicken wings)

**Stock Display**

- **FR-006**: System MUST display stock quantity in packages with base unit equivalent (e.g., "3.5 packs (28 pcs)")
- **FR-007**: System MUST allow configuring whether to count inventory by packages or base units per ingredient
- **FR-008**: System MUST display PAR levels with both package and base unit representations

**Restock**

- **FR-009**: System MUST allow updating cost per package during restock
- **FR-010**: System MUST allow updating package size during restock (vendor changed pack size)
- **FR-011**: System MUST recalculate cost per base unit when package cost or size changes
- **FR-012**: System MUST record all cost and quantity changes in audit history

**Recipe Integration**

- **FR-013**: Recipe ingredient quantities MUST be specified in base units
- **FR-014**: Recipe form MUST show the cost per base unit and line cost in real-time
- **FR-015**: Recipe form MAY show package equivalent as helper text

**Sellable Items**

- **FR-016**: System MUST allow marking ingredients as "sellable"
- **FR-017**: Sellable ingredients MUST have a separate "sell price" field
- **FR-018**: Sellable ingredients MUST appear in POS product catalog
- **FR-019**: POS sales of sellable ingredients MUST deduct from ingredient stock

**Overhead Items**

- **FR-020**: System MUST allow marking ingredients as "overhead/per-transaction" items
- **FR-021**: Overhead items MUST have a "usage per transaction" field
- **FR-022**: System MUST automatically deduct overhead item usage when transactions complete

**Data Integrity**

- **FR-023**: System MUST prevent saving ingredients with package size of zero
- **FR-024**: System MUST preserve existing ingredient data during migration to new unit system
- **FR-025**: System MUST maintain backward compatibility with legacy unit/costPerUnit fields
- **FR-026**: System MUST store cost-per-base-unit with full decimal precision internally; display values MUST round to 2 decimal places

### Key Entities

- **Ingredient**: Core inventory item with dual-unit tracking (package for purchasing, base for usage)
  - Attributes: name, category, baseUnit, packageSize, packageUnit, costPerPackage, quantity, parLevel, sellable, sellPrice, isOverhead, overheadPerTransaction, countByBaseUnit

- **RecipeItem**: Links ingredients to products with usage quantities
  - Attributes: ingredientId, productId, quantity (in base units), portionNote

- **IngredientHistory**: Audit trail for all stock and cost changes
  - Attributes: ingredientId, field, oldValue, newValue, source, reason, userId

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can add a new ingredient with package conversion in under 60 seconds
- **SC-002**: 100% of cost-per-base-unit calculations are mathematically accurate (cost / packageSize)
- **SC-003**: Users understand their stock levels immediately without mental math (dual display)
- **SC-004**: Recipe food costs reflect actual ingredient costs within 1 cent accuracy
- **SC-005**: Zero data loss when migrating existing ingredients to new unit system
- **SC-006**: Staff can complete inventory count 20% faster with flexible count-by options
- **SC-007**: Overhead costs are tracked automatically, reducing manual reconciliation effort

## Clarifications

### Session 2026-01-30

- Q: How should non-terminating decimals in cost calculations be handled (e.g., ₱100 ÷ 3 = ₱33.333...)? → A: Store full precision internally, round to 2 decimals for display only
- Q: Should cross-type unit conversions (e.g., kg → pieces) be allowed? → A: Yes, any unit combination is valid; packageSize serves as the user-defined conversion factor (e.g., 1 kg chicken wings = 10 pieces)

## Assumptions

- Users understand the difference between how they buy items vs how they use them
- Most ingredients will have straightforward conversions (pack to piece, bottle to mL, bag to kg)
- The unit system fields (baseUnit, packageSize, packageUnit, costPerPackage) will be added via migration; existing `unit`/`costPerUnit` fields preserved for backward compatibility
- Overhead item deduction happens at transaction completion, not at item-add time
- Sellable ingredient sync to products is immediate, not batch-processed
