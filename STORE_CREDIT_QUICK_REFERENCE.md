# Store Credit System - Quick Reference Guide

**For:** Store-POS Development Team
**Size:** 51KB research + 26KB implementation docs
**Time to implement:** 3-5 days for core features

---

## What's Included

### 1. STORE_CREDIT_RESEARCH.md (51KB)
Comprehensive guide covering:
- Database schema patterns (6 model definitions)
- Atomic transaction patterns with `prisma.$transaction()`
- Credit validation with manager override flows
- Tab settlement workflows
- Customer deletion protection
- PostgreSQL indexes and views
- Testing patterns with Vitest

**Key takeaway:** Complete understanding of how to design a safe, audit-friendly credit system

### 2. STORE_CREDIT_IMPLEMENTATION.md (26KB)
Production-ready code:
- Prisma migration SQL (ready to run)
- Updated `schema.prisma` definitions
- 3 complete API endpoint implementations
- Utility functions for credit checking
- Integration test examples
- Database views for reporting

**Key takeaway:** Copy-paste ready code to start building

---

## Critical Design Patterns

### Pattern 1: Atomic Credit Deduction (Principle IV: Data Integrity)

```typescript
const result = await prisma.$transaction(async (tx) => {
  // 1. Validate BEFORE changes
  const customer = await tx.customer.findUnique(...)
  if (customer.creditBalance < requestedAmount) throw new Error(...)

  // 2. Update balance
  await tx.customer.update(...)

  // 3. Log transaction
  await tx.creditTransaction.create(...)

  // 4. Audit trail
  await tx.creditAudit.create(...)

  // ALL or NOTHING - if any step fails, entire transaction rolls back
})
```

**Why this matters:** If a network error occurs between customer balance update and transaction logging, the entire operation automatically reverts. No orphaned records.

### Pattern 2: Manager Override with Audit Trail

```typescript
// Check permission FIRST
if (!manager?.permSettings) throw new Error("Permission denied")

// Apply override
await applyManagerOverride({
  customerId,
  overrideType: "CREDIT_LIMIT",
  approvingManagerId,
  reason: "VIP customer"
})

// Automatically logged with WHO, WHAT, WHEN, WHY
// Enables compliance audits and fraud detection
```

**Why this matters:** Every override is tracked with the manager's ID, timestamp, and reason. Critical for compliance and fraud prevention.

### Pattern 3: Prevent Customer Deletion with Outstanding Balance

```typescript
// In DELETE endpoint:
if (customer.creditBalance > 0) {
  return { error: "Cannot delete with credit balance" }
}
if (customer._count.tabs > 0 && tabs.some(t => t.status === "OPEN")) {
  return { error: "Cannot delete with active tabs" }
}
```

**Why this matters:** Uses database constraints + application logic to prevent data integrity issues. Database constraint alone (`onDelete: Restrict`) would confuse users; clear error messages + soft delete option educates them.

---

## Database Schema at a Glance

```
Customer (existing, add 9 new fields)
├── creditBalance (Decimal)
├── creditLimit (Decimal)
├── creditStatus (active|suspended|frozen)
└── outstandingTabAmount (Decimal)

CreditTransaction (new)
├── amount (can be positive/negative)
├── balanceBefore & balanceAfter (for audit)
└── authorizedBy (who made the change)

Tab (new)
├── status (OPEN, PARTIALLY_PAID, CLOSED)
├── remainingBalance (automatic calculation)
└── dueDate (for aged receivables)

TabPayment (new)
├── paymentType (CASH, CARD, STORE_CREDIT, MIXED)
├── amount (per-method tracking)
└── processedBy (audit trail)

CreditAudit (new)
├── action (LIMIT_INCREASED, HOLD_PLACED, etc.)
├── approvedBy & overrideApprovedBy (dual approval)
└── ipAddress & userAgent (fraud detection)
```

**Total: 4 new tables + 9 new customer fields**

---

## Implementation Path

### Phase 1: Database (30 minutes)
```bash
# 1. Add migration
cp STORE_CREDIT_IMPLEMENTATION.md to prisma/migrations/[date]_add_store_credit/migration.sql

# 2. Update schema.prisma
# Add the 4 new models and extend Customer

# 3. Run migration
npx prisma migrate dev

# 4. Generate types
npx prisma generate
```

### Phase 2: API Endpoints (2 hours)
```typescript
// Copy from STORE_CREDIT_IMPLEMENTATION.md:
// - /api/customers/[id]/credit/issue/route.ts
// - /api/tabs/open/route.ts
// - /api/customers/[id]/credit/status/route.ts
// - /api/tabs/settle/route.ts

// Update transaction POST to include credit deduction logic
// (pattern provided in STORE_CREDIT_RESEARCH.md)
```

### Phase 3: Utility Functions (1 hour)
```typescript
// Create /src/lib/credit-utils.ts
// Add validation functions with comprehensive error handling
// Follows existing Decimal pattern from Store-POS
```

### Phase 4: Tests (1.5 hours)
```bash
# Add to tests/unit/credit-operations.test.ts
# Add to tests/integration/credit-transactions.test.ts

npm run test:unit
npm run test:all
```

### Phase 5: Update Customer Deletion (30 minutes)
```typescript
// Modify /api/customers/[id]/route.ts DELETE handler
// Add checks for:
// - Outstanding tabs (status: OPEN|PARTIALLY_PAID)
// - Remaining credit balance
// - Return clear error messages
```

---

## Key Files Affected

### New Files
- `src/lib/credit-utils.ts` - Validation & helper functions
- `src/app/api/customers/[id]/credit/issue/route.ts` - Issue store credit
- `src/app/api/customers/[id]/credit/status/route.ts` - Check balance
- `src/app/api/tabs/open/route.ts` - Create tab
- `src/app/api/tabs/settle/route.ts` - Pay tab
- `tests/unit/credit-operations.test.ts` - Unit tests

### Modified Files
- `src/app/api/customers/[id]/route.ts` - Update DELETE handler
- `src/app/api/transactions/route.ts` - Add credit deduction to POST
- `prisma/schema.prisma` - Add 4 new models, extend Customer/User

---

## Decimal Usage (Critical!)

Store-POS uses `Decimal` for all currency calculations:

```typescript
import { Decimal } from "@prisma/client/runtime/library"

// ✓ CORRECT
const balance = new Decimal(customer.creditBalance || 0)
const newBalance = balance.minus(100).toNumber()
const total = amount.plus(tax)

// ✗ WRONG - floating point errors!
const balance = customer.creditBalance // 99.7 - 0.3 = 99.3999999999
const newBalance = balance - 100
const total = amount + tax // Rounding errors accumulate
```

**All new code must follow Decimal pattern.**

---

## Validation Checklist

Before deploying store credit:

- [ ] All API endpoints return proper error codes (400 for validation, 402 for insufficient credit, 403 for permission denied)
- [ ] Audit trail logs all credit changes with user ID and timestamp
- [ ] Credit deduction is atomic (uses `$transaction`)
- [ ] Manager override requires `permSettings` permission
- [ ] Customer deletion blocked with clear error message
- [ ] Tab status properly managed (OPEN → PARTIALLY_PAID → CLOSED)
- [ ] Decimal used for all monetary calculations
- [ ] Test coverage for: valid operations, insufficient credit, permission denied
- [ ] Database indexes created for performance (see research doc)
- [ ] View `v_aged_tabs` works for collections reporting

---

## Common Questions

**Q: Can a customer delete their account with outstanding credit?**
A: No. API returns: "Cannot delete customer with store credit balance. Customer must use or refund all store credit."

**Q: What if a manager tries to override without permission?**
A: API returns: "Manager lacks override permission" (403). Logged as failed override attempt.

**Q: Can a tab be partially paid?**
A: Yes. Tab status = "PARTIALLY_PAID" tracks remaining balance. Customer can make multiple payments until remaining_balance = 0, then status = "CLOSED".

**Q: What if network fails during credit deduction?**
A: Entire transaction (including logging) rolls back automatically. No orphaned records. Retry is safe.

**Q: How do we handle refunds?**
A: CreditTransaction.transactionType = "REFUND". Amount is positive (increases balance). Requires manager approval.

**Q: Can we set different credit limits per customer?**
A: Yes. Create `CustomerCreditLimitPolicy` (optional). Recommended schema in research doc (Section 2.5).

---

## Performance Optimization

### Indexes (already in migration)
```sql
CREATE INDEX idx_tabs_customer_id_status ON tabs(customer_id, status);
CREATE INDEX idx_tabs_due_date ON tabs(due_date DESC);
CREATE INDEX idx_credit_transactions_customer_date ON credit_transactions(customer_id, created_at);
```

### Query Optimization
```typescript
// ✓ GOOD - Uses indexes
const activeTabs = await prisma.tab.findMany({
  where: {
    customerId: 1,
    status: { in: ["OPEN", "PARTIALLY_PAID"] }
  },
  select: { id: true, remaining_balance: true } // Only needed fields
})

// ✗ BAD - No indexes, loads all data
const allTabs = await prisma.tab.findMany({
  include: { items: true, payments: true } // Heavy load
})
```

### Reporting Views
Use PostgreSQL views (provided in research doc) for:
- Aged tabs report
- Customer credit summary
- Audit trail queries

Views are pre-calculated and indexed.

---

## Integration with Existing Store-POS Features

### Lever 2: Traffic Source
- Track if customer found you via "credit promotion"
- Correlate credit uptake with traffic source

### Lever 7: Repeat Rate
- Customers with store credit have higher repeat rates
- Add `creditStatus` to repeat rate calculations

### Audit Log
- All credit changes auto-logged to existing AuditLog
- Leverage existing audit UI for credit history

### Permissions
- Use existing `permSettings` for credit management
- No new permission types needed

---

## Rollback Plan

If issues arise:

1. **Keep migration file**: Don't delete migration
2. **Create reverse migration**:
   ```sql
   ALTER TABLE customers DROP COLUMN credit_balance;
   -- ... drop other columns and tables
   ```
3. **Run**: `npx prisma migrate resolve --rolled-back [migration_name]`
4. **Delete**: New API routes and tests

---

## Next Steps

1. Read `/STORE_CREDIT_RESEARCH.md` - Understand design principles
2. Read `/STORE_CREDIT_IMPLEMENTATION.md` - Review ready-to-use code
3. Create migration file from SQL in Implementation doc
4. Copy API endpoints
5. Write tests
6. Update customer delete logic
7. Test full flow: issue credit → create tab → make payment → close tab

---

## Support Resources

### Inside This Project
- `STORE_CREDIT_RESEARCH.md` - 51KB comprehensive guide
- `STORE_CREDIT_IMPLEMENTATION.md` - 26KB copy-paste code
- Existing transaction logic: `src/app/api/transactions/route.ts` (reference for atomic patterns)

### Testing References
- Existing tests: `tests/integration/transactions-api.test.ts`
- Mock patterns: `tests/utils/api-test-helpers.ts`

### Documentation
- Prisma docs: https://www.prisma.io/docs
- PostgreSQL docs: https://www.postgresql.org/docs
- Decimal arithmetic: `@prisma/client/runtime/library`

---

**Estimated Total Time:** 3-5 days for core implementation + UI

**Complexity:** Medium (requires transaction safety, atomic operations, audit logging)

**Risk Level:** Low (if following atomic transaction patterns exactly)

**ROI:** High (enables tabs, store credit, loyalty programs, repeat rate improvement)

---

Generated: January 27, 2026
