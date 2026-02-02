# Implementation Plan: Ingredient Unit System Redesign

**Branch**: `004-ingredient-unit-system` | **Date**: 2026-01-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-ingredient-unit-system/spec.md`

## Summary

Redesign the ingredient management UI to support intuitive package-to-base-unit conversions. Users can specify how they purchase items (pack, bundle, kg) separately from how they use them in recipes (piece, gram), with automatic cost-per-unit calculations. The implementation updates the existing ingredient form, list display, restock dialog, recipe builder, and inventory count interfaces to use the new standardized unit system already present in the database schema.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19, Next.js 16
**Primary Dependencies**: Prisma ORM 7.x, Radix UI, Tailwind CSS 4.x, Zod (validation)
**Storage**: PostgreSQL (existing schema has baseUnit, packageSize, packageUnit, costPerPackage fields)
**Testing**: Vitest (unit tests), Playwright (E2E tests)
**Target Platform**: Web application (desktop-first, mobile-responsive)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Form interactions < 100ms, real-time cost calculation on input change
**Constraints**: Must maintain backward compatibility with existing legacy unit/costPerUnit fields
**Scale/Scope**: ~50 existing ingredients, single-tenant deployment

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Test-First Development | ✅ PASS | Unit tests for cost calculations, E2E tests for form workflows |
| II. Security-First | ✅ PASS | Input validation via Zod, existing auth on ingredient routes |
| III. Pragmatic Simplicity | ✅ PASS | Extends existing UI components, no new abstractions needed |
| IV. Data Integrity | ✅ PASS | Prisma transactions for stock updates, audit via IngredientHistory |
| V. RESTful API Standards | ✅ PASS | Extends existing `/api/ingredients` endpoints |

**Technology Constraints Check:**
- ✅ Next.js 16 with App Router
- ✅ React 19, Tailwind CSS, Radix UI
- ✅ PostgreSQL with Prisma ORM
- ✅ Vitest + Playwright testing

## Project Structure

### Documentation (this feature)

```text
specs/004-ingredient-unit-system/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── ingredients-api.md
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/
│   │   └── ingredients/
│   │       ├── route.ts              # GET/POST - list/create (UPDATE)
│   │       ├── [id]/
│   │       │   ├── route.ts          # GET/PUT/DELETE - CRUD (UPDATE)
│   │       │   └── restock/
│   │       │       └── route.ts      # POST - restock (UPDATE)
│   │       └── low-stock/
│   │           └── route.ts          # GET - alerts (UPDATE)
│   └── (dashboard)/
│       ├── ingredients/
│       │   ├── page.tsx              # Ingredients list & form (UPDATE)
│       │   └── count/
│       │       └── page.tsx          # Inventory count (UPDATE)
│       └── recipes/
│           └── [productId]/
│               └── page.tsx          # Recipe builder (UPDATE)
├── components/
│   ├── ingredients/
│   │   └── low-stock-alert.tsx       # Low stock popover (UPDATE)
│   └── inventory-count/
│       ├── count-item-row.tsx        # Count row display (UPDATE)
│       └── discrepancy-modal.tsx     # Discrepancy dialog (NO CHANGE)
├── lib/
│   └── ingredient-utils.ts           # NEW: cost calculation utilities
└── types/
    └── ingredient.ts                 # NEW: shared type definitions

tests/
├── unit/
│   └── ingredient-calculations.test.ts  # NEW: cost calculation tests
├── e2e/
│   └── ingredient-unit-system.spec.ts   # NEW: E2E workflow tests
└── integration/
    └── ingredients-api.test.ts          # NEW: API integration tests
```

**Structure Decision**: Extends existing Next.js App Router structure. New utility module for cost calculations, updated components for dual-unit display.

## Complexity Tracking

> No constitution violations requiring justification.
