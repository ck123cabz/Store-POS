# Research: Ingredient Unit System Redesign

**Feature**: 004-ingredient-unit-system
**Date**: 2026-01-30

## Research Summary

This feature extends the existing ingredient management system to use the standardized unit fields already present in the database schema. No new technologies or major architectural changes required.

---

## 1. Existing Schema Analysis

### Decision: Use existing Prisma schema fields

**Rationale**: The database already has the required fields for the new unit system:
- `baseUnit` (String) - fundamental measurement for recipes (kg, g, L, ml, pcs)
- `packageSize` (Decimal) - base units per package
- `packageUnit` (String) - how you purchase (pack, box, bottle, bundle, etc.)
- `costPerPackage` (Decimal) - cost to buy one package

**Alternatives Considered**:
- Add new fields: Rejected - fields already exist, just need UI to use them
- Create separate UnitConversion table: Rejected - over-engineering for current needs

**Current Legacy Fields** (to maintain backward compatibility):
- `unit` (String) - deprecated, kept for migration
- `costPerUnit` (Decimal) - deprecated, kept for migration

---

## 2. Cost Calculation Strategy

### Decision: Calculate cost-per-base-unit on-the-fly, store full precision

**Rationale**:
- Formula: `costPerBaseUnit = costPerPackage / packageSize`
- Store Prisma Decimal with full precision
- Round to 2 decimal places for display only
- Recalculate when costPerPackage or packageSize changes

**Alternatives Considered**:
- Store calculated costPerBaseUnit: Rejected - would need to keep in sync with source values
- Round at calculation time: Rejected - loses precision for recipe costing

**Implementation**:
```typescript
// lib/ingredient-utils.ts
export function calculateCostPerBaseUnit(
  costPerPackage: Decimal,
  packageSize: Decimal
): Decimal {
  if (packageSize.isZero()) {
    throw new Error("Package size cannot be zero");
  }
  return costPerPackage.dividedBy(packageSize);
}

export function formatCurrency(value: Decimal): string {
  return `₱${value.toDecimalPlaces(2).toFixed(2)}`;
}
```

---

## 3. Form UX Pattern

### Decision: Two-section form with real-time preview

**Rationale**: Users think in terms of "how I buy" vs "how I use" - the form should reflect this mental model.

**Form Structure**:
```
┌─────────────────────────────────────────────────┐
│ BASIC INFO                                      │
│ Name, Category, Vendor                          │
├─────────────────────────────────────────────────┤
│ PURCHASING                                      │
│ "I buy this as:" [pack ▼]  "at ₱" [420]        │
├─────────────────────────────────────────────────┤
│ USAGE (show only if different from purchase)    │
│ "Each [pack] contains:" [8] [pieces ▼]         │
│                                                 │
│ 💡 Cost per piece: ₱52.50                      │
├─────────────────────────────────────────────────┤
│ STOCK                                           │
│ Current: [3.5] packs   PAR: [2] packs          │
└─────────────────────────────────────────────────┘
```

**Alternatives Considered**:
- Single "Unit" dropdown (current): Rejected - confusing, doesn't capture conversion
- Advanced mode toggle: Rejected - adds complexity without benefit

---

## 4. Dual Display Format

### Decision: "X packages (Y base units)" format

**Rationale**: Primary display is packages (for reordering), secondary is base units (for recipe capacity).

**Examples**:
- `3.5 packs (28 pcs)` - standard conversion
- `2 kg` - no conversion needed (same unit)
- `1.5 bottles (750 mL)` - volume conversion

**Alternatives Considered**:
- Base units only: Rejected - users need to know how many packages to reorder
- Toggle between views: Rejected - both values useful simultaneously

---

## 5. Backward Compatibility Strategy

### Decision: Graceful migration with computed fallback

**Rationale**: Existing ingredients using legacy `unit`/`costPerUnit` fields should continue working.

**Migration Logic**:
```typescript
function getEffectiveCostPerBaseUnit(ingredient: Ingredient): Decimal {
  // New system takes precedence
  if (ingredient.costPerPackage && ingredient.packageSize) {
    return ingredient.costPerPackage.dividedBy(ingredient.packageSize);
  }
  // Fall back to legacy
  return ingredient.costPerUnit ?? new Decimal(0);
}

function getEffectiveUnit(ingredient: Ingredient): string {
  return ingredient.baseUnit || ingredient.unit || "pcs";
}
```

**Alternatives Considered**:
- Force migration on deploy: Rejected - risky, could lose data
- Dual-write both old and new: Rejected - complexity, sync issues

---

## 6. Unit Type Categories

### Decision: Allow any unit combination with user-defined conversion

**Rationale**: Food service has valid cross-type conversions (1 kg chicken = 10 pieces).

**Unit Categories** (for form organization, not validation):
```typescript
const UNIT_CATEGORIES = {
  weight: ["kg", "g"],
  volume: ["L", "mL"],
  count: ["pcs", "each"],
  package: ["pack", "box", "bottle", "bundle", "sack", "bag", "container", "can", "gallon", "tank"]
};

const PURCHASE_UNITS = [...UNIT_CATEGORIES.package, ...UNIT_CATEGORIES.weight, ...UNIT_CATEGORIES.volume];
const BASE_UNITS = [...UNIT_CATEGORIES.count, ...UNIT_CATEGORIES.weight, ...UNIT_CATEGORIES.volume];
```

**Alternatives Considered**:
- Strict type matching: Rejected - doesn't match real-world use cases
- Free-form text input: Rejected - would cause inconsistency

---

## 7. Overhead Item Deduction

### Decision: Deduct at transaction completion via transaction hook

**Rationale**: Overhead items (gloves, containers) should deduct when sale is finalized, not when items are added to cart.

**Implementation Approach**:
- Add hook in transaction POST handler
- Query ingredients where `isOverhead = true`
- Deduct `overheadPerTransaction` from stock for each
- Record in IngredientHistory with source = "transaction"

**Alternatives Considered**:
- Deduct per item in cart: Rejected - would over-deduct if transaction cancelled
- Nightly batch: Rejected - stock would be inaccurate during day

---

## 8. Sellable Ingredient Sync

### Decision: Immediate sync on save, bidirectional stock updates

**Rationale**: Existing `sellable` flag and `linkedProductId` fields support this pattern.

**Sync Logic**:
1. When ingredient marked sellable → create/update linked Product
2. When POS sells linked product → deduct from ingredient stock
3. Product price = ingredient sellPrice (separate from cost)

**Existing Fields**:
- `sellable` (Boolean)
- `linkedProductId` (Int, FK to Product)
- `syncStatus` (String: synced, pending, error)

**Alternatives Considered**:
- Manual product creation: Rejected - duplicate data entry
- Batch sync: Rejected - delay would cause stock inconsistency

---

## Open Items

None - all research questions resolved.

## Dependencies

- Existing Prisma schema (no changes needed)
- Existing ingredient API routes (updates only)
- Existing UI components (updates only)
