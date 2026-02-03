# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Store-POS is a web-based Point of Sale application built with Next.js 16. It uses PostgreSQL with Prisma ORM for data persistence. The frontend is React 19 with Tailwind CSS and Radix UI components.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Linting
npm run lint

# Testing
npm run test              # Run Vitest unit tests
npm run test:unit         # Run unit tests with verbose output
npm run test:coverage     # Run tests with coverage report
npm run test:e2e          # Run Playwright E2E tests
npm run test:e2e:ui       # Run E2E tests with UI
npm run test:e2e:headed   # Run E2E tests in headed browser
npm run test:smoke        # Run smoke tests only
npm run test:all          # Run all tests (unit + E2E)

# Database
npx prisma migrate dev    # Run migrations in development
npx prisma db seed        # Seed the database
npx prisma studio         # Open Prisma Studio GUI
```

**Default credentials:** admin/admin

**Development server:** http://localhost:3000

## Architecture

### Tech Stack
- **Framework:** Next.js 16 (App Router)
- **Frontend:** React 19, Tailwind CSS, Radix UI, Recharts
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** NextAuth.js v5 (beta) with credentials provider
- **Validation:** Zod
- **Testing:** Vitest (unit), Playwright (E2E)

### Directory Structure
```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # NextAuth endpoints
│   │   ├── products/      # Product CRUD
│   │   ├── transactions/  # Sales operations
│   │   ├── customers/     # Customer management
│   │   ├── ingredients/   # Inventory ingredients
│   │   ├── audit-log/     # Audit trail
│   │   └── ...
│   ├── (dashboard)/       # Protected dashboard routes
│   └── login/             # Login page
├── components/            # Reusable React components
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and configurations
│   ├── auth.ts           # NextAuth configuration
│   ├── prisma.ts         # Prisma client instance
│   └── utils.ts          # Helper functions
└── types/                 # TypeScript type definitions

prisma/
├── schema.prisma         # Database schema
└── seed.ts               # Database seeding

tests/
├── e2e/                  # Playwright E2E tests
├── integration/          # Integration tests
├── unit/                 # Vitest unit tests
└── setup.ts              # Test configuration
```

### Database Schema (Key Models)
- `User` - User accounts with role-based permissions
- `Product` - Products with pricing, stock tracking, recipe costing
- `Category` - Product categories
- `Transaction` - Sales records with items, totals, payment info
- `TransactionItem` - Line items in transactions
- `Customer` - Customer records with visit tracking
- `Ingredient` - Raw ingredients for recipes
- `RecipeItem` - Recipe composition (product → ingredients)
- `IngredientHistory` - Audit trail for inventory changes
- `Settings` - Store configuration (name, tax, benchmarks)

### API Routes
| Route | File | Purpose |
|-------|------|---------|
| `/api/auth/[...nextauth]` | `api/auth/[...nextauth]/route.ts` | Authentication |
| `/api/users` | `api/users/route.ts` | User management |
| `/api/products` | `api/products/route.ts` | Product CRUD |
| `/api/categories` | `api/categories/route.ts` | Category CRUD |
| `/api/transactions` | `api/transactions/route.ts` | Sales operations |
| `/api/customers` | `api/customers/route.ts` | Customer database |
| `/api/ingredients` | `api/ingredients/route.ts` | Ingredient inventory |
| `/api/audit-log` | `api/audit-log/route.ts` | Audit trail |
| `/api/settings` | `api/settings/route.ts` | Store configuration |

### User Permissions System
Users have granular permissions controlled by boolean flags:
- `permProducts` - Manage products
- `permCategories` - Manage categories
- `permTransactions` - View/manage transactions
- `permUsers` - Manage users
- `permSettings` - Manage store settings
- `permReports` - View reports
- `permAuditLog` - View audit logs

## Key Implementation Details

- **IDs**: Auto-incrementing integers via Prisma
- **Image uploads**: Stored in `public/uploads/`, filenames are timestamps
- **Stock tracking**: Per-product toggle; inventory auto-decrements on paid transactions
- **Recipe costing**: Products can have recipes linking to ingredients for true cost calculation
- **Transactions**: Use Prisma interactive transactions for atomicity (all-or-nothing)
- **Audit trail**: `IngredientHistory` tracks all inventory changes with source and reason

## Constitution

This project follows principles defined in `.specify/memory/constitution.md`:

1. **Test-First Development** - TDD mandatory
2. **Security-First** - Input validation, auth checks, audit logging
3. **Pragmatic Simplicity** - YAGNI with reasonable architecture
4. **Data Integrity** - Atomic transactions, inventory consistency
5. **RESTful API Standards** - Consistent HTTP methods and error formats

## Testing

```bash
# Unit tests (Vitest)
npm run test:unit

# E2E tests (Playwright)
npm run test:e2e

# All tests
npm run test:all
```

Test files:
- `tests/unit/calculations.test.ts` - Business logic tests
- `tests/e2e/smoke.spec.ts` - Critical path smoke tests
- `tests/e2e/pos-flow.spec.ts` - POS workflow tests
- `tests/e2e/inventory-count.spec.ts` - Inventory count tests

## Active Technologies
- TypeScript 5.x, React 19.2.3, Next.js 16.1.4 + Tailwind CSS 4.x, Radix UI, shadcn/ui components, Lucide React icons (001-ui-refinement)
- PostgreSQL with Prisma ORM 7.2.0 (existing schema, no changes needed) (001-ui-refinement)
- TypeScript 5.x, React 19, Next.js 16 + Prisma ORM, NextAuth.js v5, Radix UI, Tailwind CSS, Zod (002-pos-mobile-payments)
- PostgreSQL with Prisma; local storage for offline queue (002-pos-mobile-payments)
- TypeScript 5.x, React 19, Next.js 16 + Prisma ORM 7.2.0, NextAuth.js v5, Radix UI, Tailwind CSS 4.x (003-transaction-fixes)
- TypeScript 5.x, React 19, Next.js 16 + Prisma ORM 7.x, Radix UI, Tailwind CSS 4.x, Zod (validation) (004-ingredient-unit-system)
- PostgreSQL (existing schema has baseUnit, packageSize, packageUnit, costPerPackage fields) (004-ingredient-unit-system)

## Recent Changes
- 001-ui-refinement: Added TypeScript 5.x, React 19.2.3, Next.js 16.1.4 + Tailwind CSS 4.x, Radix UI, shadcn/ui components, Lucide React icons
