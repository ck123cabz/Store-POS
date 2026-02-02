# Quickstart: Ingredient Unit System

**Feature**: 004-ingredient-unit-system
**Branch**: `004-ingredient-unit-system`

## Prerequisites

- Node.js 18+
- PostgreSQL running
- Project dependencies installed (`npm install`)

## Getting Started

### 1. Switch to Feature Branch

```bash
git checkout 004-ingredient-unit-system
```

### 2. Run Database Migration

```bash
# Add new fields to Ingredient model
npx prisma migrate dev --name add-ingredient-unit-fields
```

### 3. Start Development Server

```bash
npm run dev
```

### 4. Access the Application

- **Ingredients Page**: http://localhost:3000/ingredients
- **Recipe Builder**: http://localhost:3000/recipes
- **Inventory Count**: http://localhost:3000/ingredients/count

---

## Key Files to Modify

### API Routes (Backend)

| File | Purpose |
|------|---------|
| `src/app/api/ingredients/route.ts` | Update GET/POST to use new fields |
| `src/app/api/ingredients/[id]/route.ts` | Update PUT to handle unit system |
| `src/app/api/ingredients/[id]/restock/route.ts` | Add packageSize update support |
| `src/app/api/ingredients/low-stock/route.ts` | Update to include dual units |

### UI Components (Frontend)

| File | Purpose |
|------|---------|
| `src/app/(dashboard)/ingredients/page.tsx` | Redesign form, update table display |
| `src/app/(dashboard)/ingredients/count/page.tsx` | Support count-by-base-unit |
| `src/app/(dashboard)/recipes/[productId]/page.tsx` | Update recipe cost display |
| `src/components/ingredients/low-stock-alert.tsx` | Dual unit display |

### New Files to Create

| File | Purpose |
|------|---------|
| `src/lib/ingredient-utils.ts` | Cost calculation helpers |
| `src/types/ingredient.ts` | Shared TypeScript types |
| `tests/unit/ingredient-calculations.test.ts` | Unit tests |
| `tests/e2e/ingredient-unit-system.spec.ts` | E2E tests |

---

## Test Commands

```bash
# Run unit tests
npm run test:unit

# Run specific test file
npm run test:unit -- ingredient-calculations

# Run E2E tests
npm run test:e2e

# Run all tests
npm run test:all
```

---

## Development Workflow (TDD)

Following constitution Principle I: Test-First Development

### 1. Write Failing Test

```typescript
// tests/unit/ingredient-calculations.test.ts
import { describe, it, expect } from 'vitest';
import { calculateCostPerBaseUnit } from '@/lib/ingredient-utils';

describe('calculateCostPerBaseUnit', () => {
  it('calculates cost per piece correctly', () => {
    // ₱420 / 8 pieces = ₱52.50
    const result = calculateCostPerBaseUnit(420, 8);
    expect(result).toBe(52.5);
  });

  it('throws error for zero package size', () => {
    expect(() => calculateCostPerBaseUnit(420, 0)).toThrow();
  });
});
```

### 2. Run Test (Red)

```bash
npm run test:unit -- ingredient-calculations
# Should FAIL - function doesn't exist yet
```

### 3. Implement (Green)

```typescript
// src/lib/ingredient-utils.ts
export function calculateCostPerBaseUnit(
  costPerPackage: number,
  packageSize: number
): number {
  if (packageSize === 0) {
    throw new Error("Package size cannot be zero");
  }
  return costPerPackage / packageSize;
}
```

### 4. Run Test (Green)

```bash
npm run test:unit -- ingredient-calculations
# Should PASS
```

### 5. Refactor

Add more edge cases, improve precision handling, etc.

---

## Sample Data for Testing

### Burger Patties (count conversion)
```json
{
  "name": "Burger Patties",
  "category": "Protein",
  "packageUnit": "pack",
  "costPerPackage": 420,
  "baseUnit": "pcs",
  "packageSize": 8,
  "quantity": 3.5
}
// costPerBaseUnit = ₱52.50
// totalBaseUnits = 28 pcs
```

### Chicken Wings (weight to count)
```json
{
  "name": "Chicken Wings",
  "category": "Protein",
  "packageUnit": "kg",
  "costPerPackage": 270,
  "baseUnit": "pcs",
  "packageSize": 10,
  "quantity": 5
}
// costPerBaseUnit = ₱27.00/pc
// totalBaseUnits = 50 pcs
```

### Cooking Oil (same units)
```json
{
  "name": "Cooking Oil",
  "category": "Dry Goods",
  "packageUnit": "L",
  "costPerPackage": 270,
  "baseUnit": "L",
  "packageSize": 2,
  "quantity": 1
}
// costPerBaseUnit = ₱135.00/L
// totalBaseUnits = 2 L
```

---

## Common Issues

### Issue: Legacy ingredients show wrong cost
**Solution**: Check if ingredient has `costPerPackage` set. If using legacy `costPerUnit`, migration needed.

### Issue: Form doesn't show conversion section
**Solution**: Conversion section only shows when `packageUnit !== baseUnit`

### Issue: Recipe costs seem wrong
**Solution**: Verify recipe uses `costPerBaseUnit` (computed), not `costPerPackage`

---

## Useful Prisma Commands

```bash
# View current schema
npx prisma studio

# Reset database (dev only!)
npx prisma migrate reset

# Generate Prisma client after schema changes
npx prisma generate
```
