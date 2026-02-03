# System-Level Test Design: Store-POS

**Date:** 2026-01-26
**Author:** S0mebody
**Status:** Draft
**Project:** Store-POS (Brownfield Next.js POS Application)

---

## Executive Summary

This document provides a system-level testability assessment for the Store-POS application, a brownfield Next.js Point of Sale system. The assessment evaluates architecture testability, defines test levels strategy, and recommends test infrastructure for Sprint 0.

**Key Findings:**
- **No existing tests** - Greenfield testing opportunity
- **Good architectural testability** - Next.js App Router + Prisma provide solid testing foundations
- **Some observability gaps** - No health checks, structured logging needs improvement
- **Recommended split:** 30% Unit / 40% Integration / 30% E2E

---

## Technology Stack Analysis

| Layer | Technology | Testability |
|-------|------------|-------------|
| **Framework** | Next.js 16.1.4 (App Router) | Excellent - Built-in API route testing, SSR/CSR separation |
| **Frontend** | React 19 + Radix UI (shadcn) | Excellent - Component testing supported, accessible components |
| **Database** | PostgreSQL + Prisma 7.2 | Excellent - Test database support, migrations, seeding |
| **Auth** | NextAuth 5.0 (beta) | Good - Session mocking available, needs test utilities |
| **Email** | Resend | Good - Can mock in tests |
| **PDF** | @react-pdf/renderer | Good - Output can be snapshot tested |
| **Forms** | react-hook-form + Zod | Excellent - Validation logic is unit testable |
| **State** | React hooks (local state) | Good - No global state complexity |

---

## Testability Assessment

### Controllability: PASS (with recommendations)

**Can we control system state for testing?**

| Aspect | Status | Details |
|--------|--------|---------|
| API seeding | ✅ PASS | 50+ API routes support POST/PUT/DELETE for data setup |
| Database reset | ✅ PASS | Prisma supports `prisma migrate reset` and test seeding |
| External dependencies | ⚠️ CONCERNS | Resend (email) needs mocking; no DI pattern |
| Error injection | ⚠️ CONCERNS | No chaos engineering hooks; can mock via network intercept |

**Recommendations:**
1. Create `prisma/seed-test.ts` for consistent test data
2. Abstract Resend client behind interface for mocking
3. Add test-only API routes for state manipulation (e.g., `/api/test/reset`)

### Observability: CONCERNS

**Can we inspect system state and validate results?**

| Aspect | Status | Details |
|--------|--------|---------|
| API response codes | ✅ PASS | Consistent HTTP status codes (200, 201, 400, 404, 500) |
| Error messages | ✅ PASS | JSON error responses with descriptive messages |
| Health endpoint | ❌ MISSING | No `/api/health` endpoint |
| Structured logging | ❌ MISSING | No Winston/Pino logging; only console.error |
| Trace IDs | ❌ MISSING | No correlation IDs for request tracing |
| Metrics | ❌ MISSING | No Server-Timing headers or APM integration |

**Recommendations:**
1. Add `/api/health` endpoint checking database connectivity
2. Implement structured logging with Pino (JSON format)
3. Add `x-request-id` header for trace correlation
4. Consider Server-Timing headers for performance debugging

### Reliability: CONCERNS

**Are tests isolated and reproducible?**

| Aspect | Status | Details |
|--------|--------|---------|
| Component isolation | ✅ PASS | Client components clearly marked, props-driven |
| API error handling | ✅ PASS | Recent fix prevents crashes on API errors |
| Retry logic | ❌ MISSING | No automatic retries on transient failures |
| Circuit breaker | ❌ MISSING | No fallback for failing external services |
| Offline handling | ❌ MISSING | No offline detection or queuing |
| Race conditions | ⚠️ CONCERNS | Potential in inventory count concurrent updates |

**Recommendations:**
1. Implement retry logic with exponential backoff for API calls
2. Add optimistic locking for inventory updates (version field)
3. Consider offline-first PWA capabilities for POS reliability

---

## Architecturally Significant Requirements (ASRs)

Based on the application's domain (Point of Sale), these quality requirements drive testing strategy:

| ID | Requirement | Risk Score | Testability Challenge |
|----|-------------|------------|----------------------|
| ASR-1 | **Transaction integrity** - Sales must never lose data | 9 (3×3) | Requires database transaction tests |
| ASR-2 | **Concurrent inventory updates** - Multiple terminals counting | 6 (2×3) | Needs optimistic locking validation |
| ASR-3 | **Authentication required** - All routes protected | 6 (2×3) | Session mocking, unauthorized access tests |
| ASR-4 | **Receipt generation** - PDF must be accurate | 4 (2×2) | PDF snapshot testing |
| ASR-5 | **Real-time stock alerts** - Low stock visible | 4 (2×2) | Polling/refresh timing tests |
| ASR-6 | **Analytics accuracy** - 10-Lever metrics correct | 6 (2×3) | Calculation unit tests, data aggregation |

---

## Test Levels Strategy

### Recommended Split: 30% Unit / 40% Integration / 30% E2E

**Rationale:** This is a UI-heavy POS application with significant business logic in both frontend and backend. The higher E2E percentage reflects the critical nature of user journeys (sales, inventory count) that must work end-to-end.

### Unit Tests (30% - ~40 tests initially)

**Target Areas:**
- Price calculations (discount, tax, true cost, margin)
- Inventory calculations (stock levels, par levels, reorder points)
- 10-Lever metrics calculations
- Form validation schemas (Zod)
- Date/time utilities
- Permission checking logic

**Framework:** Vitest (fast, native ESM, excellent TypeScript support)

```typescript
// Example: Unit test for price calculation
// tests/unit/utils/price-calculator.test.ts
import { calculateDiscount, calculateTax, calculateTotal } from '@/lib/calculations';

describe('Price Calculator', () => {
  test('applies percentage discount correctly', () => {
    expect(calculateDiscount(100, 20, 'percentage')).toBe(80);
  });

  test('applies tax correctly', () => {
    expect(calculateTax(100, 12)).toBe(112);
  });
});
```

### Integration Tests (40% - ~50 tests initially)

**Target Areas:**
- API route handlers (all 50+ routes)
- Prisma queries (CRUD operations, complex joins)
- NextAuth session handling
- Transaction workflows (create, hold, complete)
- Inventory count submission
- Recipe cost calculations with ingredients

**Framework:** Vitest + Prisma test utilities (in-memory PostgreSQL or test database)

```typescript
// Example: Integration test for products API
// tests/integration/api/products.test.ts
import { testApiHandler } from 'next-test-api-route-handler';
import { POST, GET } from '@/app/api/products/route';

describe('Products API', () => {
  test('POST /api/products creates product', async () => {
    await testApiHandler({
      appHandler: { POST },
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'POST',
          body: JSON.stringify({ name: 'Test', price: 100, categoryId: 1 })
        });
        expect(res.status).toBe(201);
      }
    });
  });
});
```

### E2E Tests (30% - ~30 tests initially)

**Target Areas:**
- **P0 Critical Paths:**
  - Complete POS sale flow (add to cart → pay → receipt)
  - Inventory count submission
  - Transaction history with filters
  - User authentication flow
- **P1 Important Paths:**
  - Product CRUD workflow
  - Ingredient restock workflow
  - Analytics dashboard data
  - Recipe management

**Framework:** Playwright (best Next.js support, reliable selectors, trace debugging)

```typescript
// Example: E2E test for POS flow
// tests/e2e/pos-flow.spec.ts
import { test, expect } from '@playwright/test';

test('complete sale flow', async ({ page }) => {
  await page.goto('/pos');

  // Add product to cart
  await page.click('[data-testid="product-card-1"]');
  await expect(page.getByText('Cart (1)')).toBeVisible();

  // Complete payment
  await page.click('button:has-text("Pay")');
  await page.fill('[data-testid="amount-tendered"]', '100');
  await page.click('button:has-text("Complete Sale")');

  // Verify success
  await expect(page.getByText('Transaction Complete')).toBeVisible();
});
```

---

## NFR Testing Approach

### Security (Playwright E2E + NextAuth testing)

| Test Type | Tool | Priority |
|-----------|------|----------|
| Unauthenticated access blocked | Playwright | P0 |
| Permission enforcement (permProducts, etc.) | Playwright + API | P0 |
| Session expiry handling | Playwright | P1 |
| SQL injection prevention | API tests | P1 |
| XSS prevention (user inputs) | Playwright | P1 |

**No existing security tests.** NextAuth provides auth, but authorization testing needed.

### Performance (k6 load testing)

| Test Type | Tool | Threshold |
|-----------|------|-----------|
| API response time | k6 | p95 < 500ms |
| POS page load | Lighthouse | LCP < 2.5s |
| Transaction throughput | k6 | 50 tx/min sustained |
| Concurrent users | k6 | 10 terminals |

**No existing performance tests.** Recommend k6 for load testing, Lighthouse for Core Web Vitals.

### Reliability (Playwright + API tests)

| Test Type | Tool | Priority |
|-----------|------|----------|
| API error handling | Playwright (mock 500s) | P0 |
| Database connection failure | API tests | P1 |
| Network disconnection | Playwright offline mode | P2 |
| Concurrent inventory updates | API tests | P1 |

**Partial coverage.** Recent fix improved API error handling in POS page.

### Maintainability (CI tools)

| Metric | Target | Tool |
|--------|--------|------|
| Test coverage | ≥70% | Vitest coverage |
| Code duplication | <5% | jscpd |
| Vulnerability scan | No critical/high | npm audit |
| Type coverage | 100% (strict mode enabled) | TypeScript |

---

## Test Environment Requirements

### Local Development
- PostgreSQL database (existing)
- `.env.test` with test database URL
- Prisma test seeding script

### CI/CD (GitHub Actions recommended)
- PostgreSQL service container
- Playwright browsers (Chromium for speed)
- Parallel test execution (3-4 shards)

### Test Data Strategy
- **Factories:** Create test data programmatically (faker.js)
- **Fixtures:** Pre-defined scenarios (empty store, populated store, mid-transaction)
- **Cleanup:** Database reset between test suites (not individual tests for speed)

---

## Testability Concerns

### Concerns (Addressable)

| Concern | Impact | Mitigation |
|---------|--------|------------|
| No health endpoint | Can't verify system health in tests | Add `/api/health` |
| No structured logging | Hard to debug test failures | Add Pino logging |
| External email service | Can't verify email sending | Mock Resend client |
| No retry logic | Flaky tests on transient failures | Add retry utilities |

### Non-Blockers (Monitor)

| Concern | Impact | Notes |
|---------|--------|-------|
| NextAuth beta version | May have breaking changes | Pin version, test auth flows |
| React 19 (new) | Component testing patterns may evolve | Use stable Playwright CT |
| No offline handling | Can't test offline scenarios | P2 priority |

---

## Recommendations for Sprint 0

### Phase 1: Framework Setup (testarch-framework workflow)

1. **Install test framework:**
   ```bash
   npm install -D vitest @vitest/coverage-v8 @playwright/test
   ```

2. **Configure Vitest** for unit/integration tests
3. **Configure Playwright** for E2E tests
4. **Create test database** and seeding scripts
5. **Add test scripts** to package.json

### Phase 2: Foundation Tests (testarch-atdd workflow)

1. **P0 smoke tests** (5 tests):
   - App loads without errors
   - Authentication works
   - POS page displays products
   - Transaction can be created
   - Inventory count page loads

2. **P0 critical path tests** (10 tests):
   - Complete sale flow
   - Hold/recall order flow
   - Inventory count submission
   - User permissions enforcement
   - Transaction history filtering

### Phase 3: CI Integration (testarch-ci workflow)

1. **GitHub Actions workflow** with:
   - Unit tests on every push
   - Integration tests on every push
   - E2E tests on PR to main
   - Coverage reports
   - Playwright artifacts on failure

---

## Quality Gate Criteria

### Before Production Release

- [ ] All P0 tests pass (100%)
- [ ] P1 tests pass rate ≥95%
- [ ] Test coverage ≥70%
- [ ] No critical security vulnerabilities
- [ ] Performance targets met (p95 < 500ms)
- [ ] Health endpoint responds correctly

### Before Sprint Completion

- [ ] All new features have tests
- [ ] No regression in existing tests
- [ ] Coverage maintained or improved

---

## Next Steps

1. **Run `testarch-framework` workflow** to scaffold Playwright + Vitest
2. **Run `testarch-atdd` workflow** to generate initial failing tests
3. **Run `testarch-ci` workflow** to set up GitHub Actions pipeline

---

**Generated by:** BMad TEA Agent - Test Architect Module
**Workflow:** `_bmad/bmm/workflows/testarch/test-design` (System-Level Mode)
**Version:** 4.0 (BMad v6)
