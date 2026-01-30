# Implementation Plan: Transaction Fixes - Currency, Void, and Display

**Branch**: `003-transaction-fixes` | **Date**: 2026-01-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-transaction-fixes/spec.md`

## Summary

This feature addresses three transaction-related improvements:

1. **Currency Display (FR-001 to FR-004)**: Replace hardcoded "$" with the `currencySymbol` from Settings throughout the transactions UI (list, detail dialog, summary cards).

2. **Transaction Void (FR-005 to FR-017)**: Add ability to void completed transactions within 7 days, with permission control (`permVoid`), reason tracking, and audit trail. Voided transactions are visually distinguished and excluded from revenue calculations.

3. **Void Filtering & Audit (FR-015, FR-016)**: Add "Voided" status filter and display void details (who, when, why) in the transaction detail dialog.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19, Next.js 16
**Primary Dependencies**: Prisma ORM 7.2.0, NextAuth.js v5, Radix UI, Tailwind CSS 4.x
**Storage**: PostgreSQL with Prisma ORM
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Web (modern browsers)
**Project Type**: Web application (monorepo - frontend + backend in Next.js App Router)
**Performance Goals**: <200ms API response times, 60fps UI
**Constraints**: Must maintain backwards compatibility with existing transactions
**Scale/Scope**: Single-store POS, ~100 transactions/day typical

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Test-First Development ✅
- **Requirement**: All new features MUST have tests written before implementation
- **Compliance**: Will write E2E tests for void workflow and unit tests for currency formatting before implementation
- **Testing Plan**:
  - Unit tests: `formatCurrency()` with various currency symbols
  - Unit tests: Void permission checks, 7-day window validation
  - E2E tests: Full void workflow, currency display verification, filter behavior

### Principle II: Security-First ✅
- **Requirement**: Authorization checks, input validation, audit logging
- **Compliance**:
  - New `permVoid` permission enforced on void API endpoint
  - Void reason validation (required, predefined options)
  - Audit trail: `voidedById`, `voidedByName`, `voidedAt`, `voidReason` stored on transaction

### Principle III: Pragmatic Simplicity ✅
- **Requirement**: YAGNI, minimal complexity
- **Compliance**:
  - Currency: Reuse existing Settings fetch, modify single `formatCurrency` function
  - Void: Soft-delete pattern (isVoided flag) - simplest reversible approach
  - No new tables required - void fields added to existing Transaction model

### Principle IV: Data Integrity ✅
- **Requirement**: Atomic transactions, referential integrity
- **Compliance**:
  - Void operation is a single UPDATE (atomic by default)
  - No cascade effects (stock NOT restored - explicit design decision per spec)
  - Void metadata stored on same row for consistency

### Principle V: RESTful API Standards ✅
- **Requirement**: Correct HTTP methods and status codes
- **Compliance**:
  - `PATCH /api/transactions/[id]/void` - appropriate verb for partial update
  - Returns 200 on success, 400 for invalid reason, 403 for no permission, 404 for not found

## Project Structure

### Documentation (this feature)

```text
specs/003-transaction-fixes/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── void-api.yaml    # OpenAPI spec for void endpoint
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/
│   │   ├── transactions/
│   │   │   ├── route.ts                  # Existing - add isVoided filter support
│   │   │   ├── [id]/
│   │   │   │   └── void/
│   │   │   │       └── route.ts          # NEW - void endpoint
│   │   │   └── today/
│   │   │       └── route.ts              # Existing - exclude voided from totals
│   │   ├── users/
│   │   │   └── route.ts                  # Existing - add permVoid field
│   │   └── settings/
│   │       └── route.ts                  # Existing - already returns currencySymbol
│   └── (dashboard)/
│       └── transactions/
│           └── page.tsx                  # Existing - major changes for currency + void UI
├── components/
│   └── ui/                               # Existing Radix/shadcn components
├── hooks/
│   └── use-settings.ts                   # NEW - settings context hook for currency
└── lib/
    └── format-currency.ts                # NEW - extracted currency formatting utility

prisma/
├── schema.prisma                         # Add void fields to Transaction, permVoid to User
└── migrations/                           # New migration for schema changes

tests/
├── e2e/
│   ├── transactions-void.spec.ts         # NEW - void workflow E2E tests
│   └── transactions-currency.spec.ts     # NEW - currency display E2E tests
└── unit/
    ├── format-currency.test.ts           # NEW - currency formatting unit tests
    └── void-validation.test.ts           # NEW - void business logic tests
```

**Structure Decision**: Next.js App Router monorepo pattern. API routes in `src/app/api/`, React components in `src/app/(dashboard)/`, shared utilities in `src/lib/` and `src/hooks/`.

## Complexity Tracking

> No constitution violations identified. Design follows existing patterns.
