# Store Credit System - Implementation Guide
## Ready-to-Use Code Patterns for Store-POS

This document provides production-ready code snippets for integrating store credit/tab functionality into Store-POS.

---

## Part 1: Prisma Schema Updates

### Migration File Template

```prisma
// prisma/migrations/[timestamp]_add_store_credit/migration.sql

-- 1. Extend Customer model with credit fields
ALTER TABLE customers ADD COLUMN credit_balance NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN credit_limit NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN credit_status VARCHAR DEFAULT 'active';
ALTER TABLE customers ADD COLUMN credit_hold_reason VARCHAR;
ALTER TABLE customers ADD COLUMN credit_created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE customers ADD COLUMN credit_updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE customers ADD COLUMN credit_updated_by INTEGER;
ALTER TABLE customers ADD COLUMN outstanding_tab_amount NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN last_tab_date TIMESTAMP;
ALTER TABLE customers ADD COLUMN total_tabs_issued INTEGER DEFAULT 0;

-- 2. Create credit transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  transaction_type VARCHAR NOT NULL, -- PURCHASE, PAYMENT, REFUND, ADJUSTMENT, CREDIT_ISSUANCE
  amount NUMERIC(10, 2) NOT NULL,
  balance_before NUMERIC(10, 2) NOT NULL,
  balance_after NUMERIC(10, 2) NOT NULL,
  transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
  related_tab_id INTEGER,
  reason VARCHAR,
  authorized_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_credit_transactions_customer_id ON credit_transactions(customer_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(transaction_type);

-- 3. Create tabs table
CREATE TABLE IF NOT EXISTS tabs (
  id SERIAL PRIMARY KEY,
  tab_number VARCHAR NOT NULL UNIQUE,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  status VARCHAR DEFAULT 'OPEN', -- OPEN, PARTIALLY_PAID, CLOSED, CANCELLED
  original_amount NUMERIC(10, 2) NOT NULL,
  paid_amount NUMERIC(10, 2) DEFAULT 0,
  remaining_balance NUMERIC(10, 2) NOT NULL,
  opened_at TIMESTAMP DEFAULT NOW(),
  due_date TIMESTAMP,
  closed_at TIMESTAMP,
  days_overdue INTEGER DEFAULT 0,
  opened_by INTEGER NOT NULL REFERENCES users(id),
  closed_by INTEGER REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tabs_customer_id_status ON tabs(customer_id, status);
CREATE INDEX idx_tabs_due_date ON tabs(due_date DESC);
CREATE INDEX idx_tabs_status ON tabs(status);

-- 4. Create tab items table
CREATE TABLE IF NOT EXISTS tab_items (
  id SERIAL PRIMARY KEY,
  tab_id INTEGER NOT NULL REFERENCES tabs(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL,
  product_name VARCHAR NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  quantity INTEGER NOT NULL,
  added_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tab_items_tab_id ON tab_items(tab_id);

-- 5. Create tab payments table
CREATE TABLE IF NOT EXISTS tab_payments (
  id SERIAL PRIMARY KEY,
  tab_id INTEGER NOT NULL REFERENCES tabs(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  payment_type VARCHAR NOT NULL, -- CASH, CARD, STORE_CREDIT, MIXED
  payment_info VARCHAR,
  processed_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tab_payments_tab_id ON tab_payments(tab_id);
CREATE INDEX idx_tab_payments_created_at ON tab_payments(created_at DESC);

-- 6. Create credit audit table
CREATE TABLE IF NOT EXISTS credit_audits (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  action VARCHAR NOT NULL, -- LIMIT_INCREASED, HOLD_PLACED, OVERRIDE_APPLIED, etc.
  old_value NUMERIC(10, 2),
  new_value NUMERIC(10, 2),
  reason VARCHAR,
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  override_approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ip_address VARCHAR,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_credit_audits_customer_id ON credit_audits(customer_id);
CREATE INDEX idx_credit_audits_action ON credit_audits(action);
CREATE INDEX idx_credit_audits_created_at ON credit_audits(created_at DESC);

-- 7. Add foreign key constraint for credit_updated_by
ALTER TABLE customers ADD CONSTRAINT fk_customers_credit_updated_by
FOREIGN KEY (credit_updated_by) REFERENCES users(id) ON DELETE SET NULL;
```

### Prisma Schema.prisma additions

Add to `/prisma/schema.prisma`:

```prisma
// ═══════════════════════════════════════════════════════════════════════════════
// STORE CREDIT & TAB SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

model CreditTransaction {
  id                   Int          @id @default(autoincrement())
  customerId           Int          @map("customer_id")
  transactionType      String       @map("transaction_type")  // PURCHASE, PAYMENT, REFUND, ADJUSTMENT, CREDIT_ISSUANCE
  amount               Decimal      @db.Decimal(10, 2)
  balanceBefore        Decimal      @map("balance_before") @db.Decimal(10, 2)
  balanceAfter         Decimal      @map("balance_after") @db.Decimal(10, 2)
  transactionId        Int?         @unique @map("transaction_id")
  relatedTabId         Int?         @map("related_tab_id")
  reason               String?
  authorizedBy         Int?         @map("authorized_by")
  notes                String?
  createdAt            DateTime     @default(now()) @map("created_at")

  customer             Customer     @relation(fields: [customerId], references: [id], onDelete: Cascade)
  transaction          Transaction? @relation(fields: [transactionId], references: [id], onDelete: SetNull)
  authorizedByUser     User?        @relation("CreditTransactionAuthorized", fields: [authorizedBy], references: [id], onDelete: SetNull)

  @@index([customerId])
  @@index([createdAt])
  @@index([transactionType])
  @@map("credit_transactions")
}

model Tab {
  id                   Int          @id @default(autoincrement())
  tabNumber            String       @unique @map("tab_number")
  customerId           Int          @map("customer_id")
  status               String       @default("OPEN")  // OPEN, PARTIALLY_PAID, CLOSED, CANCELLED
  originalAmount       Decimal      @map("original_amount") @db.Decimal(10, 2)
  paidAmount           Decimal      @default(0) @map("paid_amount") @db.Decimal(10, 2)
  remainingBalance     Decimal      @map("remaining_balance") @db.Decimal(10, 2)
  openedAt             DateTime     @default(now()) @map("opened_at")
  dueDate              DateTime?    @map("due_date")
  closedAt             DateTime?    @map("closed_at")
  daysOverdue          Int          @default(0) @map("days_overdue")
  openedBy             Int          @map("opened_by")
  closedBy             Int?         @map("closed_by")
  notes                String?
  createdAt            DateTime     @default(now()) @map("created_at")
  updatedAt            DateTime     @updatedAt @map("updated_at")

  customer             Customer     @relation(fields: [customerId], references: [id], onDelete: Restrict)
  items                TabItem[]
  payments             TabPayment[]
  openedByUser         User         @relation("TabOpenedBy", fields: [openedBy], references: [id])
  closedByUser         User?        @relation("TabClosedBy", fields: [closedBy], references: [id])

  @@index([customerId])
  @@index([status])
  @@index([dueDate])
  @@map("tabs")
}

model TabItem {
  id                   Int          @id @default(autoincrement())
  tabId                Int          @map("tab_id")
  productId            Int          @map("product_id")
  productName          String       @map("product_name")
  price                Decimal      @db.Decimal(10, 2)
  quantity             Int
  addedAt              DateTime     @default(now()) @map("added_at")

  tab                  Tab          @relation(fields: [tabId], references: [id], onDelete: Cascade)

  @@index([tabId])
  @@map("tab_items")
}

model TabPayment {
  id                   Int          @id @default(autoincrement())
  tabId                Int          @map("tab_id")
  amount               Decimal      @db.Decimal(10, 2)
  paymentType          String       @map("payment_type")  // CASH, CARD, STORE_CREDIT, MIXED
  paymentInfo          String?      @map("payment_info")
  processedBy          Int          @map("processed_by")
  createdAt            DateTime     @default(now()) @map("created_at")

  tab                  Tab          @relation(fields: [tabId], references: [id], onDelete: Cascade)
  processedByUser      User         @relation("TabPaymentProcessed", fields: [processedBy], references: [id])

  @@index([tabId])
  @@index([createdAt])
  @@map("tab_payments")
}

model CreditAudit {
  id                   Int          @id @default(autoincrement())
  customerId           Int          @map("customer_id")
  action               String       // LIMIT_INCREASED, HOLD_PLACED, HOLD_RELEASED, OVERRIDE_APPLIED, ACCOUNT_DEACTIVATED
  oldValue             Decimal?     @map("old_value") @db.Decimal(10, 2)
  newValue             Decimal?     @map("new_value") @db.Decimal(10, 2)
  reason               String?
  approvedBy           Int?         @map("approved_by")
  overrideApprovedBy   Int?         @map("override_approved_by")
  ipAddress            String?      @map("ip_address")
  userAgent            String?      @map("user_agent")
  createdAt            DateTime     @default(now()) @map("created_at")

  customer             Customer     @relation(fields: [customerId], references: [id], onDelete: Cascade)
  approvedByUser       User?        @relation("CreditAuditApproved", fields: [approvedBy], references: [id])
  overrideApprovedUser User?        @relation("CreditAuditOverride", fields: [overrideApprovedBy], references: [id])

  @@index([customerId])
  @@index([action])
  @@index([createdAt])
  @@map("credit_audits")
}

// Extend Customer model (update existing model)
model Customer {
  // ... existing fields ...

  // Store Credit & Tab Management
  creditBalance        Decimal      @default(0) @map("credit_balance") @db.Decimal(10, 2)
  creditLimit          Decimal      @default(0) @map("credit_limit") @db.Decimal(10, 2)
  creditStatus         String       @default("active") @map("credit_status")
  creditHoldReason     String?      @map("credit_hold_reason")
  creditCreatedAt      DateTime     @map("credit_created_at") @default(now())
  creditUpdatedAt      DateTime     @updatedAt @map("credit_updated_at")
  creditUpdatedBy      Int?         @map("credit_updated_by")
  outstandingTabAmount Decimal      @default(0) @map("outstanding_tab_amount") @db.Decimal(10, 2)
  lastTabDate          DateTime?    @map("last_tab_date")
  totalTabsIssued      Int          @default(0) @map("total_tabs_issued")

  // Relations
  creditTransactions   CreditTransaction[]
  creditAudits         CreditAudit[]
  tabs                 Tab[]
  creditUpdatedByUser  User?        @relation("CustomerCreditUpdatedBy", fields: [creditUpdatedBy], references: [id], onDelete: SetNull)
}

// Extend User model (add relations)
model User {
  // ... existing fields ...

  creditTransactions   CreditTransaction[] @relation("CreditTransactionAuthorized")
  tabsOpenedBy         Tab[]               @relation("TabOpenedBy")
  tabsClosedBy         Tab[]               @relation("TabClosedBy")
  tabPaymentsProcessed TabPayment[]        @relation("TabPaymentProcessed")
  creditAuditsApproved CreditAudit[]       @relation("CreditAuditApproved")
  creditAuditsOverride CreditAudit[]       @relation("CreditAuditOverride")
  customersUpdated     Customer[]          @relation("CustomerCreditUpdatedBy")
}

// Extend Transaction model (add relation)
model Transaction {
  // ... existing fields ...

  creditTransaction    CreditTransaction?
}
```

---

## Part 2: API Endpoints

### 1. Issue Store Credit

```typescript
// src/app/api/customers/[id]/credit/issue/route.ts

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { Decimal } from "@prisma/client/runtime/library"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { amount, reason } = body

    if (!amount || !reason) {
      return NextResponse.json(
        { error: "Amount and reason required" },
        { status: 400 }
      )
    }

    const creditAmount = new Decimal(amount)

    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { id: parseInt(id) },
        select: {
          creditBalance: true,
          creditLimit: true,
        },
      })

      if (!customer) {
        throw new Error("Customer not found")
      }

      const oldBalance = new Decimal(customer.creditBalance || 0)
      const newBalance = oldBalance.plus(creditAmount)

      // Update balance
      await tx.customer.update({
        where: { id: parseInt(id) },
        data: {
          creditBalance: newBalance.toNumber(),
          creditUpdatedAt: new Date(),
          creditUpdatedBy: parseInt(session.user.id),
        },
      })

      // Log transaction
      await tx.creditTransaction.create({
        data: {
          customerId: parseInt(id),
          transactionType: "CREDIT_ISSUANCE",
          amount: creditAmount.toNumber(),
          balanceBefore: oldBalance.toNumber(),
          balanceAfter: newBalance.toNumber(),
          reason,
          authorizedBy: parseInt(session.user.id),
        },
      })

      // Audit
      await tx.creditAudit.create({
        data: {
          customerId: parseInt(id),
          action: "CREDIT_ISSUED",
          oldValue: oldBalance,
          newValue: newBalance,
          reason,
          approvedBy: parseInt(session.user.id),
        },
      })

      return { oldBalance: oldBalance.toNumber(), newBalance: newBalance.toNumber() }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to issue credit" },
      { status: 500 }
    )
  }
}
```

### 2. Open a Tab

```typescript
// src/app/api/tabs/open/route.ts

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { Decimal } from "@prisma/client/runtime/library"

export async function POST(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { customerId, items, notes, daysUntilDue } = body

    if (!customerId || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Customer and items required" },
        { status: 400 }
      )
    }

    // Calculate tab amount
    const tabAmount = items.reduce(
      (sum: Decimal, item: any) =>
        sum.plus(new Decimal(item.price).times(item.quantity)),
      new Decimal(0)
    )

    const result = await prisma.$transaction(async (tx) => {
      // Verify customer exists
      const customer = await tx.customer.findUnique({
        where: { id: customerId },
      })

      if (!customer) {
        throw new Error("Customer not found")
      }

      // Generate tab number
      const tabCount = await tx.tab.count()
      const tabNumber = `TAB-${new Date().getFullYear()}-${String(tabCount + 1).padStart(4, "0")}`

      // Calculate due date
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + (daysUntilDue || 30))

      // Create tab
      const tab = await tx.tab.create({
        data: {
          tabNumber,
          customerId,
          originalAmount: tabAmount.toNumber(),
          remainingBalance: tabAmount.toNumber(),
          openedBy: parseInt(session.user.id),
          dueDate,
          notes,
          items: {
            create: items.map((item: any) => ({
              productId: item.id,
              productName: item.productName,
              price: item.price,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          items: true,
        },
      })

      // Update customer outstanding tab amount
      const newOutstanding = new Decimal(
        customer.outstandingTabAmount || 0
      ).plus(tabAmount)

      await tx.customer.update({
        where: { id: customerId },
        data: {
          outstandingTabAmount: newOutstanding.toNumber(),
          lastTabDate: new Date(),
        },
      })

      return tab
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to open tab" },
      { status: 500 }
    )
  }
}
```

### 3. Get Customer Credit Status

```typescript
// src/app/api/customers/[id]/credit/status/route.ts

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        name: true,
        creditBalance: true,
        creditLimit: true,
        creditStatus: true,
        creditHoldReason: true,
        outstandingTabAmount: true,
        lastTabDate: true,
        totalTabsIssued: true,
      },
    })

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      )
    }

    // Get active tabs
    const activeTabs = await prisma.tab.findMany({
      where: {
        customerId: parseInt(id),
        status: { in: ["OPEN", "PARTIALLY_PAID"] },
      },
      select: {
        id: true,
        tabNumber: true,
        originalAmount: true,
        remainingBalance: true,
        status: true,
        dueDate: true,
      },
    })

    return NextResponse.json({
      customer,
      activeTabs,
      creditAvailable:
        Math.max(0, Number(customer.creditBalance) - Number(customer.outstandingTabAmount)) ||
        0,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Failed to fetch credit status" },
      { status: 500 }
    )
  }
}
```

---

## Part 3: Utility Functions

```typescript
// src/lib/credit-utils.ts

import { Decimal } from "@prisma/client/runtime/library"
import { prisma } from "@/lib/prisma"

export interface CreditCheckResult {
  isValid: boolean
  reason?: string
  currentBalance?: Decimal
  availableCredit?: Decimal
  activeTabCount?: number
}

export async function checkCustomerCredit(
  customerId: number,
  requestedAmount?: Decimal
): Promise<CreditCheckResult> {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        creditBalance: true,
        creditStatus: true,
        creditHoldReason: true,
        _count: {
          select: {
            tabs: {
              where: { status: { in: ["OPEN", "PARTIALLY_PAID"] } },
            },
          },
        },
      },
    })

    if (!customer) {
      return { isValid: false, reason: "Customer not found" }
    }

    if (customer.creditStatus === "suspended") {
      return {
        isValid: false,
        reason: `Credit suspended: ${customer.creditHoldReason || "No reason"}`,
      }
    }

    if (customer.creditStatus === "frozen") {
      return {
        isValid: false,
        reason: "Account frozen",
      }
    }

    const currentBalance = new Decimal(customer.creditBalance || 0)

    if (requestedAmount && requestedAmount.gt(currentBalance)) {
      return {
        isValid: false,
        reason: `Insufficient credit: ${requestedAmount} > ${currentBalance}`,
        currentBalance,
        availableCredit: currentBalance,
      }
    }

    return {
      isValid: true,
      currentBalance,
      availableCredit: currentBalance,
      activeTabCount: customer._count.tabs,
    }
  } catch (error) {
    return { isValid: false, reason: "Validation error" }
  }
}

export function generateTabNumber(): string {
  const timestamp = Date.now().toString().slice(-8)
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")
  return `TAB-${timestamp}-${random}`
}

export function calculateDaysOverdue(dueDate: Date): number {
  const now = new Date()
  const diff = now.getTime() - dueDate.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}
```

---

## Part 4: Testing Examples

```typescript
// tests/unit/credit-operations.test.ts

import { describe, test, expect, beforeEach, vi } from "vitest"
import { Decimal } from "@prisma/client/runtime/library"
import { checkCustomerCredit } from "@/lib/credit-utils"
import { prisma } from "@/lib/prisma"

vi.mock("@/lib/prisma")

describe("Credit Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test("approves credit when balance sufficient", async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      creditBalance: 150,
      creditStatus: "active",
      creditHoldReason: null,
      _count: { tabs: 0 },
    } as any)

    const result = await checkCustomerCredit(1, new Decimal(75))

    expect(result.isValid).toBe(true)
    expect(result.currentBalance).toEqual(new Decimal(150))
  })

  test("denies credit when balance insufficient", async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      creditBalance: 50,
      creditStatus: "active",
      creditHoldReason: null,
      _count: { tabs: 0 },
    } as any)

    const result = await checkCustomerCredit(1, new Decimal(75))

    expect(result.isValid).toBe(false)
    expect(result.reason).toContain("Insufficient")
  })

  test("denies credit when account suspended", async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      creditBalance: 500,
      creditStatus: "suspended",
      creditHoldReason: "FRAUD",
      _count: { tabs: 0 },
    } as any)

    const result = await checkCustomerCredit(1, new Decimal(100))

    expect(result.isValid).toBe(false)
    expect(result.reason).toContain("suspended")
  })
})
```

---

## Part 5: Database Views for Reporting

```sql
-- Create view for customer credit summary
CREATE OR REPLACE VIEW v_customer_credit_summary AS
SELECT
  c.id,
  c.name,
  c.phone,
  c.email,
  c.credit_balance,
  c.credit_limit,
  c.credit_status,
  c.outstanding_tab_amount,
  c.total_tabs_issued,
  COUNT(DISTINCT t.id) as active_tabs,
  COUNT(DISTINCT CASE WHEN t.status = 'OPEN' THEN t.id END) as open_tabs,
  COUNT(DISTINCT CASE WHEN t.status = 'PARTIALLY_PAID' THEN t.id END) as partial_tabs,
  MAX(CASE WHEN t.status IN ('OPEN', 'PARTIALLY_PAID') THEN t.due_date END) as earliest_due_date,
  COALESCE(SUM(CASE WHEN t.status IN ('OPEN', 'PARTIALLY_PAID') THEN t.remaining_balance END), 0) as total_owed
FROM customers c
LEFT JOIN tabs t ON c.id = t.customer_id
GROUP BY c.id, c.name, c.phone, c.email, c.credit_balance, c.credit_limit,
         c.credit_status, c.outstanding_tab_amount, c.total_tabs_issued;

-- Create view for aged tabs
CREATE OR REPLACE VIEW v_aged_tabs AS
SELECT
  t.id,
  t.tab_number,
  c.id as customer_id,
  c.name as customer_name,
  c.phone as customer_phone,
  t.original_amount,
  t.remaining_balance,
  t.opened_at,
  t.due_date,
  CURRENT_DATE - t.due_date::date as days_overdue,
  CASE
    WHEN CURRENT_DATE - t.due_date::date <= 30 THEN 'Current'
    WHEN CURRENT_DATE - t.due_date::date <= 60 THEN '30-60 Days'
    WHEN CURRENT_DATE - t.due_date::date <= 90 THEN '60-90 Days'
    ELSE '90+ Days'
  END as aging_bracket,
  u.fullname as opened_by
FROM tabs t
JOIN customers c ON t.customer_id = c.id
JOIN users u ON t.opened_by = u.id
WHERE t.status IN ('OPEN', 'PARTIALLY_PAID')
  AND t.due_date < CURRENT_DATE
ORDER BY t.due_date ASC;

-- Create view for credit transaction audit
CREATE OR REPLACE VIEW v_credit_audit_trail AS
SELECT
  ct.id,
  ct.created_at,
  c.name as customer_name,
  ct.transaction_type,
  ct.amount,
  ct.balance_before,
  ct.balance_after,
  ct.reason,
  u.fullname as authorized_by,
  t.order_number as related_transaction
FROM credit_transactions ct
JOIN customers c ON ct.customer_id = c.id
LEFT JOIN users u ON ct.authorized_by = u.id
LEFT JOIN transactions t ON ct.transaction_id = t.id
ORDER BY ct.created_at DESC;
```

---

## Implementation Checklist

- [ ] Run Prisma migration to create tables
- [ ] Add API endpoints for credit operations
- [ ] Add utility functions for validation
- [ ] Add test coverage for credit logic
- [ ] Update customer deletion logic (prevent with outstanding credit)
- [ ] Create credit management UI component
- [ ] Add credit display to POS transaction screen
- [ ] Add aged tab reporting view
- [ ] Set up audit logging for compliance
- [ ] Train staff on credit limit procedures

---

**Version:** 1.0
**Updated:** January 27, 2026
