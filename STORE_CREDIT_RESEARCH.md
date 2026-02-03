# Store Credit & Tab System for POS Applications
## Research & Implementation Guide for Prisma/PostgreSQL

**Research Date:** January 2026
**Focus:** Database patterns, atomic transactions, validation, and tab settlement workflows

---

## Table of Contents
1. [Overview & Use Cases](#overview--use-cases)
2. [Database Schema Patterns](#database-schema-patterns)
3. [Atomic Transaction Handling](#atomic-transaction-handling)
4. [Credit Validation & Manager Overrides](#credit-validation--manager-overrides)
5. [Tab Settlement Workflow](#tab-settlement-workflow)
6. [Customer Deletion Protection](#customer-deletion-protection)
7. [Implementation Examples](#implementation-examples)
8. [Testing Patterns](#testing-patterns)

---

## Overview & Use Cases

### What is a Tab/Store Credit System?

A tab/store credit system allows customers to:
- **Buy now, pay later** (tab): Purchase items and settle payment later
- **Store credit**: Pre-pay for credit that depletes with purchases
- **Balance tracking**: Maintain running balances with credit limits
- **Partial payments**: Split payments between cash/card and store credit

### Business Value

1. **Customer Retention** - Encourages repeat visits through pre-commitment
2. **Cash Flow Flexibility** - Capture deposits upfront for store credit
3. **Loyalty Mechanism** - Issue credit as rewards or promotional incentives
4. **Risk Mitigation** - Credit limits prevent exposure to bad debt
5. **Repeat Rate Optimization** - Complements Lever 7 (Repeat Rate) in Store-POS 10-Lever model

### Industry Patterns

- **Restaurants/Bars**: Tabs during busy service, settled at end of meal
- **Retail**: Store credit from returns, loyalty programs, promotional campaigns
- **Coffee Shops**: Pre-paid cards or digital wallets
- **Golf/Recreation Venues**: Season passes converted to spending credits

---

## Database Schema Patterns

### 1. Core Customer Credit Model

Add to existing `Customer` model:

```prisma
model Customer {
  // ... existing fields ...

  // Store Credit & Tab Management
  creditBalance        Decimal      @default(0) @map("credit_balance") @db.Decimal(10, 2)
  creditLimit          Decimal      @default(0) @map("credit_limit") @db.Decimal(10, 2)
  creditStatus         String       @default("active") @map("credit_status")  // active, suspended, frozen
  creditHoldReason     String?      @map("credit_hold_reason")                // collections, fraud, manual override

  // Audit Trail
  creditCreatedAt      DateTime     @map("credit_created_at")
  creditUpdatedAt      DateTime     @updatedAt @map("credit_updated_at")
  creditUpdatedBy      Int?         @map("credit_updated_by")

  // Tab Tracking
  outstandingTabAmount Decimal      @default(0) @map("outstanding_tab_amount") @db.Decimal(10, 2)
  lastTabDate          DateTime?    @map("last_tab_date")
  totalTabsIssued      Int          @default(0) @map("total_tabs_issued")

  // Relations
  creditTransactions   CreditTransaction[]
  creditAudits         CreditAudit[]
  transactions         Transaction[]
}
```

### 2. Credit Transaction History

```prisma
model CreditTransaction {
  id                   Int          @id @default(autoincrement())
  customerId           Int          @map("customer_id")

  // Transaction Type: PURCHASE, PAYMENT, REFUND, ADJUSTMENT, CREDIT_ISSUANCE
  transactionType      String       @map("transaction_type")

  // Amount: positive for credit increase, negative for depletion
  amount               Decimal      @db.Decimal(10, 2)
  balanceBefore        Decimal      @map("balance_before") @db.Decimal(10, 2)
  balanceAfter         Decimal      @map("balance_after") @db.Decimal(10, 2)

  // Linked to Transaction/Payment
  transactionId        Int?         @unique @map("transaction_id")
  relatedTabId         Int?         @map("related_tab_id")

  // Reason & Audit
  reason               String?      // "Tab payment", "Refund issued", "Promotional credit"
  authorizedBy         Int?         @map("authorized_by")
  notes                String?

  createdAt            DateTime     @default(now()) @map("created_at")

  // Relations
  customer             Customer     @relation(fields: [customerId], references: [id], onDelete: Cascade)
  transaction          Transaction? @relation(fields: [transactionId], references: [id], onDelete: SetNull)
  authorizedByUser     User?        @relation(fields: [authorizedBy], references: [id], onDelete: SetNull)

  @@index([customerId])
  @@index([createdAt])
  @@index([transactionType])
  @@map("credit_transactions")
}
```

### 3. Tab Records

```prisma
model Tab {
  id                   Int          @id @default(autoincrement())
  tabNumber            String       @unique                          // TAB-2026-001
  customerId           Int          @map("customer_id")

  // Tab State: OPEN, PARTIALLY_PAID, CLOSED, CANCELLED
  status               String       @default("OPEN")

  // Amounts
  originalAmount       Decimal      @map("original_amount") @db.Decimal(10, 2)
  paidAmount           Decimal      @default(0) @map("paid_amount") @db.Decimal(10, 2)
  remainingBalance     Decimal      @map("remaining_balance") @db.Decimal(10, 2)

  // Dates
  openedAt             DateTime     @default(now()) @map("opened_at")
  dueDate              DateTime?    @map("due_date")                 // For aged tabs
  closedAt             DateTime?    @map("closed_at")
  daysOverdue          Int          @default(0) @map("days_overdue")

  // Audit
  openedBy             Int          @map("opened_by")
  closedBy             Int?         @map("closed_by")
  notes                String?

  // Relations
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
  paymentType          String       @map("payment_type")            // CASH, CARD, STORE_CREDIT
  paymentInfo          String?      @map("payment_info")
  processedBy          Int          @map("processed_by")
  createdAt            DateTime     @default(now()) @map("created_at")

  tab                  Tab          @relation(fields: [tabId], references: [id], onDelete: Cascade)
  processedByUser      User         @relation(fields: [processedBy], references: [id])

  @@index([tabId])
  @@index([createdAt])
  @@map("tab_payments")
}
```

### 4. Credit Audit Trail

```prisma
model CreditAudit {
  id                   Int          @id @default(autoincrement())
  customerId           Int          @map("customer_id")

  action               String                                        // LIMIT_INCREASED, HOLD_PLACED, HOLD_RELEASED, OVERRIDE_APPLIED
  oldValue             Decimal?     @map("old_value") @db.Decimal(10, 2)
  newValue             Decimal?     @map("new_value") @db.Decimal(10, 2)

  reason               String?
  approvedBy           Int?         @map("approved_by")
  overrideApprovedBy   Int?         @map("override_approved_by")    // For manager overrides

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
```

### 5. Credit Limits Policy

```prisma
model CreditLimitPolicy {
  id                   Int          @id @default(autoincrement())
  name                 String       @unique                          // "Standard", "Premium", "VIP"

  maxCreditLimit       Decimal      @map("max_credit_limit") @db.Decimal(10, 2)
  requiresApproval     Boolean      @map("requires_approval")
  approvalThreshold    Decimal?     @map("approval_threshold") @db.Decimal(10, 2)

  // Tab-specific settings
  maxOutstandingTab    Decimal      @map("max_outstanding_tab") @db.Decimal(10, 2)
  tabPaymentDueDays    Int          @default(30) @map("tab_payment_due_days")
  allowTabOverages     Boolean      @default(false) @map("allow_tab_overages")
  overageLimit         Decimal?     @map("overages_limit") @db.Decimal(10, 2)

  createdAt            DateTime     @default(now()) @map("created_at")
  updatedAt            DateTime     @updatedAt @map("updated_at")

  @@map("credit_limit_policies")
}

model CustomerCreditLimitPolicy {
  id                   Int          @id @default(autoincrement())
  customerId           Int          @unique @map("customer_id")
  policyId             Int          @map("policy_id")

  // Override fields
  customLimit          Decimal?     @map("custom_limit") @db.Decimal(10, 2)
  customMaxTab         Decimal?     @map("custom_max_tab") @db.Decimal(10, 2)

  effectiveFrom        DateTime     @map("effective_from")
  effectiveUntil       DateTime?    @map("effective_until")

  createdAt            DateTime     @default(now()) @map("created_at")

  customer             Customer     @relation(fields: [customerId], references: [id], onDelete: Cascade)
  policy               CreditLimitPolicy @relation(fields: [policyId], references: [id])

  @@map("customer_credit_limit_policies")
}
```

### 6. Migration Pattern

```sql
-- Add credit fields to Customer
ALTER TABLE customers ADD COLUMN credit_balance NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN credit_limit NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN credit_status VARCHAR DEFAULT 'active';
ALTER TABLE customers ADD COLUMN credit_hold_reason VARCHAR;
ALTER TABLE customers ADD COLUMN credit_created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE customers ADD COLUMN credit_updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE customers ADD COLUMN credit_updated_by INT;
ALTER TABLE customers ADD COLUMN outstanding_tab_amount NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN last_tab_date TIMESTAMP;
ALTER TABLE customers ADD COLUMN total_tabs_issued INT DEFAULT 0;

-- Create indexes for performance
CREATE INDEX idx_customers_credit_status ON customers(credit_status);
CREATE INDEX idx_customers_credit_balance ON customers(credit_balance);
```

### Key Design Principles

1. **Decimal Precision**: Use `Decimal(10, 2)` for all monetary values (prevents floating-point errors)
2. **Audit Trail**: Track all credit changes with `CreditAudit` for compliance
3. **Constraint Safety**: Use `onDelete: Restrict` to prevent deletion of customers with active tabs
4. **Status Tracking**: Support multiple states (OPEN, PARTIALLY_PAID, CLOSED) for tabs
5. **Separation of Concerns**: Distinct tables for tabs vs. store credit operations

---

## Atomic Transaction Handling

### Pattern 1: Safe Credit Deduction During Purchase

This pattern ensures that if ANY step fails, ALL changes rollback. The transaction uses Prisma's `$transaction` for atomicity (matching Store-POS patterns).

```typescript
// src/app/api/transactions/route.ts

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    // Generate change ID for audit trail
    const { nanoid } = await import("nanoid")
    const creditChangeId = nanoid(10)

    // ATOMIC TRANSACTION: All or nothing
    const result = await prisma.$transaction(async (tx) => {
      // 1. Validate customer credit (within transaction)
      const customer = await tx.customer.findUnique({
        where: { id: body.customerId },
        select: {
          creditBalance: true,
          creditLimit: true,
          creditStatus: true,
          outstandingTabAmount: true,
        },
      })

      if (!customer) {
        throw new Error("Customer not found")
      }

      if (customer.creditStatus === "suspended") {
        throw new Error("Customer credit is suspended")
      }

      // Calculate payment breakdown
      const totalAmount = new Decimal(body.total)
      const creditToUse = new Decimal(body.creditAmount || 0)

      // 2. Validate credit availability
      if (creditToUse.gt(0)) {
        const availableCredit = new Decimal(customer.creditBalance)
        if (creditToUse.gt(availableCredit)) {
          throw new Error(
            `Insufficient credit: requested ${creditToUse}, available ${availableCredit}`
          )
        }
      }

      // 3. Create transaction with atomicity
      const transaction = await tx.transaction.create({
        data: {
          orderNumber: Math.floor(Date.now() / 1000),
          customerId: body.customerId,
          userId: parseInt(session.user.id),
          status: 1, // Paid
          subtotal: body.subtotal,
          taxAmount: body.taxAmount || 0,
          total: totalAmount.toNumber(),
          paidAmount: totalAmount.toNumber(),
          paymentType: creditToUse.gt(0) ? "MIXED" : "CASH",
          paymentInfo: creditToUse.gt(0) ? `Credit: ${creditToUse}` : "",
          items: {
            create: body.items.map((item: any) => ({
              productId: item.id,
              productName: item.productName,
              price: item.price,
              quantity: item.quantity,
            })),
          },
        },
        include: { items: true },
      })

      // 4. Deduct credit balance atomically
      if (creditToUse.gt(0)) {
        const newBalance = new Decimal(customer.creditBalance)
          .minus(creditToUse)
          .max(0) // Never go negative

        await tx.customer.update({
          where: { id: body.customerId },
          data: {
            creditBalance: newBalance.toNumber(),
            creditUpdatedAt: new Date(),
            creditUpdatedBy: parseInt(session.user.id),
          },
        })

        // 5. Log credit deduction in audit trail
        await tx.creditTransaction.create({
          data: {
            customerId: body.customerId,
            transactionType: "PURCHASE",
            amount: creditToUse.negated().toNumber(),
            balanceBefore: customer.creditBalance as any,
            balanceAfter: newBalance.toNumber(),
            transactionId: transaction.id,
            reason: `Purchase order #${transaction.orderNumber}`,
            authorizedBy: parseInt(session.user.id),
          },
        })

        // 6. Create comprehensive audit record
        await tx.creditAudit.create({
          data: {
            customerId: body.customerId,
            action: "CREDIT_DEDUCTION",
            oldValue: new Decimal(customer.creditBalance),
            newValue: newBalance,
            reason: `Transaction #${transaction.orderNumber}`,
            approvedBy: parseInt(session.user.id),
          },
        })
      }

      // 7. Update inventory (stock decrement if paid)
      for (const item of body.items) {
        const product = await tx.product.findUnique({
          where: { id: item.id },
          include: {
            linkedIngredient: true,
            recipeItems: { include: { ingredient: true } },
          },
        })

        if (product?.trackStock) {
          await tx.product.update({
            where: { id: item.id },
            data: {
              quantity: { decrement: item.quantity },
            },
          })
        }

        // Handle recipe ingredients...
        // (existing code from Store-POS)
      }

      return transaction
    })

    return NextResponse.json(result)
  } catch (error) {
    // Transaction automatically rolls back on any error
    console.error(error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process transaction" },
      { status: 500 }
    )
  }
}
```

### Pattern 2: Tab Payment with Partial Credits

```typescript
// src/app/api/tabs/[tabId]/pay/route.ts

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tabId: string }> }
) {
  const { tabId } = await params
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const paymentAmount = new Decimal(body.paymentAmount)
    const creditAmount = new Decimal(body.creditAmount || 0)
    const cashAmount = new Decimal(body.cashAmount || 0)

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch tab with locking (in real systems, use SELECT FOR UPDATE)
      const tab = await tx.tab.findUnique({
        where: { id: parseInt(tabId) },
        include: {
          customer: {
            select: {
              creditBalance: true,
              creditLimit: true,
              creditStatus: true,
            },
          },
        },
      })

      if (!tab) {
        throw new Error("Tab not found")
      }

      if (tab.status !== "OPEN" && tab.status !== "PARTIALLY_PAID") {
        throw new Error(`Cannot pay on tab with status: ${tab.status}`)
      }

      // 2. Validate payment total equals parts
      const totalPayment = creditAmount.plus(cashAmount)
      if (!totalPayment.equals(paymentAmount)) {
        throw new Error("Payment amount mismatch with payment methods")
      }

      // 3. Validate credit availability
      if (creditAmount.gt(0)) {
        const availableCredit = new Decimal(tab.customer.creditBalance || 0)
        if (creditAmount.gt(availableCredit)) {
          throw new Error(
            `Insufficient credit: requested ${creditAmount}, available ${availableCredit}`
          )
        }
      }

      // 4. Calculate new tab balance
      const previousBalance = new Decimal(tab.remainingBalance)
      const newBalance = previousBalance.minus(paymentAmount).max(0)
      const newTabStatus =
        newBalance.eq(0) ? "CLOSED" : "PARTIALLY_PAID"

      // 5. Update tab atomically
      const updatedTab = await tx.tab.update({
        where: { id: parseInt(tabId) },
        data: {
          paidAmount: {
            increment: paymentAmount.toNumber(),
          },
          remainingBalance: newBalance.toNumber(),
          status: newTabStatus,
          closedAt: newTabStatus === "CLOSED" ? new Date() : undefined,
          closedBy: parseInt(session.user.id),
        },
      })

      // 6. Record payment
      await tx.tabPayment.create({
        data: {
          tabId: parseInt(tabId),
          amount: paymentAmount.toNumber(),
          paymentType: creditAmount.gt(0) && cashAmount.gt(0)
            ? "MIXED"
            : creditAmount.gt(0)
            ? "STORE_CREDIT"
            : "CASH",
          processedBy: parseInt(session.user.id),
        },
      })

      // 7. Deduct credit if used
      if (creditAmount.gt(0)) {
        const customer = tab.customer
        const newCreditBalance = new Decimal(customer.creditBalance || 0)
          .minus(creditAmount)
          .max(0)

        await tx.customer.update({
          where: { id: tab.customerId },
          data: {
            creditBalance: newCreditBalance.toNumber(),
            creditUpdatedAt: new Date(),
            creditUpdatedBy: parseInt(session.user.id),
          },
        })

        // Log credit transaction
        await tx.creditTransaction.create({
          data: {
            customerId: tab.customerId,
            transactionType: "PAYMENT",
            amount: creditAmount.negated().toNumber(),
            balanceBefore: customer.creditBalance as any,
            balanceAfter: newCreditBalance.toNumber(),
            relatedTabId: parseInt(tabId),
            reason: `Tab payment #${tab.tabNumber}`,
            authorizedBy: parseInt(session.user.id),
          },
        })
      }

      return updatedTab
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process payment" },
      { status: 500 }
    )
  }
}
```

### Critical Principles

1. **Decimal Math**: Use `Decimal` type for all calculations to avoid floating-point errors
2. **Single Transaction Block**: All related operations within `prisma.$transaction`
3. **Validation First**: Check conditions BEFORE making changes
4. **Rollback on Error**: Any thrown error automatically rolls back entire transaction
5. **Audit Trail**: Log state changes for compliance and debugging
6. **Idempotency**: Design operations so retries are safe (idempotent keys in real systems)

---

## Credit Validation & Manager Overrides

### Pattern 1: Credit Limit Validation with Overrides

```typescript
// src/lib/credit-validation.ts

import { Decimal } from "@prisma/client/runtime/library"
import { prisma } from "@/lib/prisma"

interface CreditValidationResult {
  isValid: boolean
  reason?: string
  requiresApproval?: boolean
  approvingManagerId?: number
  currentBalance?: Decimal
  availableCredit?: Decimal
}

export async function validateCustomerCredit(
  customerId: number,
  requestedAmount: Decimal,
  transactionType: "PURCHASE" | "TAB" = "PURCHASE"
): Promise<CreditValidationResult> {
  try {
    // Fetch customer with credit policy
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        creditLimitPolicy: {
          include: { policy: true },
        },
      },
    })

    if (!customer) {
      return {
        isValid: false,
        reason: "Customer not found",
      }
    }

    // 1. Check credit status
    if (customer.creditStatus === "suspended") {
      return {
        isValid: false,
        reason: `Credit suspended: ${customer.creditHoldReason || "No reason provided"}`,
      }
    }

    if (customer.creditStatus === "frozen") {
      return {
        isValid: false,
        reason: "Customer credit is frozen - contact manager",
      }
    }

    // 2. Check available balance
    const currentBalance = new Decimal(customer.creditBalance || 0)
    const currentLimit = new Decimal(customer.creditLimit || 0)
    const availableCredit = currentBalance.min(currentLimit)

    if (requestedAmount.gt(availableCredit)) {
      return {
        isValid: false,
        reason: `Insufficient credit: requested ${requestedAmount}, available ${availableCredit}`,
        currentBalance,
        availableCredit,
      }
    }

    // 3. Get applicable policy
    const policy = customer.creditLimitPolicy?.policy || null
    const maxTab = customer.creditLimitPolicy?.customMaxTab ||
      policy?.maxOutstandingTab ||
      new Decimal(1000) // Default fallback

    // 4. Check tab limits if applicable
    if (transactionType === "TAB") {
      const outstandingTab = new Decimal(customer.outstandingTabAmount || 0)
      const newTabTotal = outstandingTab.plus(requestedAmount)

      if (newTabTotal.gt(maxTab)) {
        // Check if overages are allowed
        const allowOverages = policy?.allowTabOverages || false
        const overageLimit = policy?.overageLimit || new Decimal(0)

        if (!allowOverages || newTabTotal.gt(maxTab.plus(overageLimit))) {
          return {
            isValid: false,
            reason: `Tab limit exceeded: ${newTabTotal} > ${maxTab}`,
            requiresApproval: true,
          }
        }
      }
    }

    return {
      isValid: true,
      currentBalance,
      availableCredit,
    }
  } catch (error) {
    console.error("Credit validation error:", error)
    return {
      isValid: false,
      reason: "Internal validation error",
    }
  }
}

interface ManagerOverrideRequest {
  customerId: number
  requestedAmount: Decimal
  reason: string
  overrideType: "CREDIT_LIMIT" | "SUSPENDED_ACCOUNT" | "TAB_OVERAGE"
  approvingManagerId: number
  notes?: string
}

export async function applyManagerOverride(
  override: ManagerOverrideRequest
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify manager has permission
    const manager = await prisma.user.findUnique({
      where: { id: override.approvingManagerId },
    })

    if (!manager?.permSettings) {
      return {
        success: false,
        error: "Manager does not have override permission",
      }
    }

    // Apply override within transaction
    await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { id: override.customerId },
      })

      if (!customer) {
        throw new Error("Customer not found")
      }

      // Handle different override types
      if (override.overrideType === "SUSPENDED_ACCOUNT") {
        await tx.customer.update({
          where: { id: override.customerId },
          data: {
            creditStatus: "active",
            creditHoldReason: null,
            creditUpdatedBy: override.approvingManagerId,
          },
        })
      } else if (override.overrideType === "CREDIT_LIMIT") {
        const newLimit = new Decimal(customer.creditLimit || 0).plus(
          override.requestedAmount
        )

        await tx.customer.update({
          where: { id: override.customerId },
          data: {
            creditLimit: newLimit.toNumber(),
            creditUpdatedBy: override.approvingManagerId,
          },
        })
      }

      // Always audit overrides
      await tx.creditAudit.create({
        data: {
          customerId: override.customerId,
          action: `OVERRIDE_${override.overrideType}`,
          reason: override.reason,
          overrideApprovedBy: override.approvingManagerId,
          ipAddress: override.notes,
        },
      })
    })

    return { success: true }
  } catch (error) {
    console.error("Override error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Override failed",
    }
  }
}
```

### Pattern 2: API Endpoint with Override Flow

```typescript
// src/app/api/transactions/create-with-credit/route.ts

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const creditAmount = new Decimal(body.creditAmount || 0)
    const managerOverrideId = body.managerOverrideId

    // 1. Validate credit without override first
    const validation = await validateCustomerCredit(
      body.customerId,
      creditAmount
    )

    // 2. If valid, proceed normally
    if (validation.isValid) {
      // ... proceed with transaction creation (from Pattern 1)
    }

    // 3. If invalid but override requested, check manager approval
    if (!validation.isValid && managerOverrideId) {
      // Verify override is legitimate
      const manager = await prisma.user.findUnique({
        where: { id: managerOverrideId },
      })

      if (!manager?.permSettings) {
        return NextResponse.json(
          {
            error: "Manager lacks override permission",
            requiresApproval: true,
          },
          { status: 403 }
        )
      }

      // Apply override and process transaction
      const overrideResult = await applyManagerOverride({
        customerId: body.customerId,
        requestedAmount: creditAmount,
        reason: body.overrideReason || "Transaction override",
        overrideType: "CREDIT_LIMIT",
        approvingManagerId: managerOverrideId,
      })

      if (!overrideResult.success) {
        return NextResponse.json(
          { error: overrideResult.error },
          { status: 400 }
        )
      }

      // Proceed with transaction...
    }

    // 4. If still invalid, request approval
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: validation.reason,
          requiresApproval: true,
          currentBalance: validation.currentBalance,
          availableCredit: validation.availableCredit,
        },
        { status: 402 }
      )
    }
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Failed to process transaction" },
      { status: 500 }
    )
  }
}
```

### Override Audit Trail

All overrides are logged with:
- **Who**: Manager ID and name
- **What**: Specific override type and amount
- **When**: Timestamp
- **Why**: Reason provided
- **Where**: IP address/user agent
- **Reversibility**: Can be reviewed and reversed

---

## Tab Settlement Workflow

### Pattern 1: Complete Tab Settlement Process

```typescript
// src/app/api/tabs/settle/route.ts

interface SettleTabRequest {
  tabId: number
  paymentBreakdown: {
    cash?: Decimal
    card?: Decimal
    credit?: Decimal
    check?: Decimal
  }
  tip?: Decimal
  notes?: string
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body: SettleTabRequest = await request.json()
    const tabId = body.tabId

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch complete tab information
      const tab = await tx.tab.findUnique({
        where: { id: tabId },
        include: {
          items: true,
          customer: {
            select: {
              id: true,
              name: true,
              creditBalance: true,
              outstandingTabAmount: true,
            },
          },
          payments: true,
        },
      })

      if (!tab) throw new Error("Tab not found")
      if (tab.status === "CLOSED") throw new Error("Tab already closed")

      // 2. Calculate total owed
      const totalOwed = new Decimal(tab.remainingBalance)
      const breakdown = {
        cash: new Decimal(body.paymentBreakdown.cash || 0),
        card: new Decimal(body.paymentBreakdown.card || 0),
        credit: new Decimal(body.paymentBreakdown.credit || 0),
        check: new Decimal(body.paymentBreakdown.check || 0),
      }

      const totalPayment = Object.values(breakdown).reduce(
        (sum, amount) => sum.plus(amount),
        new Decimal(0)
      )

      // 3. Validate payment equals amount due
      if (!totalPayment.equals(totalOwed)) {
        throw new Error(
          `Payment ${totalPayment} does not match balance ${totalOwed}`
        )
      }

      // 4. Handle store credit deduction
      if (breakdown.credit.gt(0)) {
        const customer = tab.customer
        const availableCredit = new Decimal(customer.creditBalance || 0)

        if (breakdown.credit.gt(availableCredit)) {
          throw new Error(
            `Insufficient credit: ${breakdown.credit} > ${availableCredit}`
          )
        }

        const newCreditBalance = availableCredit.minus(breakdown.credit)

        await tx.customer.update({
          where: { id: customer.id },
          data: {
            creditBalance: newCreditBalance.toNumber(),
          },
        })

        await tx.creditTransaction.create({
          data: {
            customerId: customer.id,
            transactionType: "PAYMENT",
            amount: breakdown.credit.negated().toNumber(),
            balanceBefore: availableCredit.toNumber(),
            balanceAfter: newCreditBalance.toNumber(),
            relatedTabId: tabId,
            reason: `Settlement of tab ${tab.tabNumber}`,
            authorizedBy: parseInt(session.user.id),
          },
        })
      }

      // 5. Record multi-method payment
      if (breakdown.cash.gt(0)) {
        await tx.tabPayment.create({
          data: {
            tabId,
            amount: breakdown.cash.toNumber(),
            paymentType: "CASH",
            processedBy: parseInt(session.user.id),
          },
        })
      }

      if (breakdown.card.gt(0)) {
        await tx.tabPayment.create({
          data: {
            tabId,
            amount: breakdown.card.toNumber(),
            paymentType: "CARD",
            paymentInfo: body.paymentBreakdown.card ? "Card payment" : undefined,
            processedBy: parseInt(session.user.id),
          },
        })
      }

      if (breakdown.credit.gt(0)) {
        await tx.tabPayment.create({
          data: {
            tabId,
            amount: breakdown.credit.toNumber(),
            paymentType: "STORE_CREDIT",
            processedBy: parseInt(session.user.id),
          },
        })
      }

      // 6. Close tab
      const closedTab = await tx.tab.update({
        where: { id: tabId },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
          closedBy: parseInt(session.user.id),
          paidAmount: {
            increment: totalPayment.toNumber(),
          },
          remainingBalance: 0,
        },
      })

      // 7. Update customer outstanding tab amount
      const customerNewOutstandingTab = new Decimal(
        tab.customer.outstandingTabAmount || 0
      ).minus(totalOwed)

      await tx.customer.update({
        where: { id: tab.customer.id },
        data: {
          outstandingTabAmount: customerNewOutstandingTab.max(0).toNumber(),
          lastTabDate: new Date(),
          totalTabsIssued: {
            increment: 1,
          },
        },
      })

      return closedTab
    })

    return NextResponse.json({
      success: true,
      tab: result,
      message: `Tab ${result.tabNumber} successfully settled`,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Settlement failed" },
      { status: 500 }
    )
  }
}
```

### Pattern 2: Aged Tab Report & Collections

```typescript
// src/app/api/reports/aged-tabs/route.ts

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all overdue tabs
    const agedTabs = await prisma.tab.findMany({
      where: {
        status: { in: ["OPEN", "PARTIALLY_PAID"] },
        dueDate: {
          lt: new Date(), // Overdue
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            creditBalance: true,
            outstandingTabAmount: true,
          },
        },
        items: true,
        payments: true,
      },
      orderBy: {
        dueDate: "asc",
      },
    })

    // Calculate aging brackets
    const now = new Date()
    const aging = agedTabs.map((tab) => {
      const daysOverdue = Math.floor(
        (now.getTime() - (tab.dueDate?.getTime() || now.getTime())) /
          (1000 * 60 * 60 * 24)
      )

      return {
        ...tab,
        daysOverdue,
        bracket:
          daysOverdue <= 30
            ? "Current"
            : daysOverdue <= 60
            ? "30-60 Days"
            : daysOverdue <= 90
            ? "60-90 Days"
            : "90+ Days",
      }
    })

    // Calculate summary metrics
    const summary = {
      totalOverdueTabs: agedTabs.length,
      totalOutstanding: agedTabs.reduce(
        (sum, tab) => sum.plus(tab.remainingBalance),
        new Decimal(0)
      ),
      by_bracket: {
        current: aging.filter((t) => t.bracket === "Current").length,
        "30-60": aging.filter((t) => t.bracket === "30-60 Days").length,
        "60-90": aging.filter((t) => t.bracket === "60-90 Days").length,
        "90+": aging.filter((t) => t.bracket === "90+ Days").length,
      },
    }

    return NextResponse.json({
      summary,
      aging,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Failed to fetch aged tabs" },
      { status: 500 }
    )
  }
}
```

---

## Customer Deletion Protection

### Pattern 1: Prevent Deletion with Outstanding Balance

This pattern extends the existing customer deletion logic:

```typescript
// src/app/api/customers/[id]/route.ts (updated DELETE)

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const customerId = parseInt(id)

    // Check if customer exists and has dependencies
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        _count: {
          select: {
            transactions: true,
            tabs: {
              where: {
                status: { in: ["OPEN", "PARTIALLY_PAID"] },
              },
            },
          },
        },
      },
    })

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      )
    }

    // 1. Check for active tabs
    if (customer._count.tabs > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete customer with active tabs",
          activeTabCount: customer._count.tabs,
          details: "Please settle all outstanding tabs before deleting customer",
        },
        { status: 400 }
      )
    }

    // 2. Check for store credit balance
    const balance = new Decimal(customer.creditBalance || 0)
    if (balance.gt(0)) {
      return NextResponse.json(
        {
          error: "Cannot delete customer with store credit balance",
          remainingCredit: balance.toNumber(),
          details: "Customer must use or refund all store credit before deletion",
        },
        { status: 400 }
      )
    }

    // 3. Check for transaction history (optional: allow deletion if no transactions)
    if (customer._count.transactions > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete customer with transaction history",
          transactionCount: customer._count.transactions,
          details: "Customers with purchase history cannot be deleted (data integrity)",
          suggestion: "Mark customer as inactive instead",
        },
        { status: 400 }
      )
    }

    // 4. All checks passed, delete customer
    await prisma.customer.delete({
      where: { id: customerId },
    })

    return NextResponse.json({ success: true, message: "Customer deleted" })
  } catch (error) {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: "Failed to delete customer" },
      { status: 500 }
    )
  }
}
```

### Pattern 2: Mark Customer Inactive Instead

```typescript
// src/lib/credit-validation.ts

interface InactiveCustomerRequest {
  customerId: number
  reason: "CREDIT_HOLD" | "FRAUD" | "BANKRUPTCY" | "MANUAL_DEACTIVATION"
  notes?: string
  deactivatedBy: number
}

export async function deactivateCustomer(
  request: InactiveCustomerRequest
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.$transaction(async (tx) => {
      // Check for active tabs
      const activeTabs = await tx.tab.findMany({
        where: {
          customerId: request.customerId,
          status: { in: ["OPEN", "PARTIALLY_PAID"] },
        },
      })

      if (activeTabs.length > 0) {
        throw new Error(
          `Cannot deactivate: ${activeTabs.length} active tabs pending settlement`
        )
      }

      // Deactivate customer
      await tx.customer.update({
        where: { id: request.customerId },
        data: {
          creditStatus: "suspended",
          creditHoldReason: request.reason,
          creditUpdatedBy: request.deactivatedBy,
        },
      })

      // Audit the deactivation
      await tx.creditAudit.create({
        data: {
          customerId: request.customerId,
          action: "ACCOUNT_DEACTIVATED",
          reason: request.reason,
          approvedBy: request.deactivatedBy,
        },
      })
    })

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Deactivation failed",
    }
  }
}
```

### Database Constraints

```sql
-- Add foreign key constraint to prevent orphaned tabs
ALTER TABLE tabs
ADD CONSTRAINT tabs_customer_id_fkey
FOREIGN KEY (customer_id) REFERENCES customers(id)
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- Create trigger to prevent deletion of customers with credit balance
CREATE OR REPLACE FUNCTION prevent_customer_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.credit_balance > 0) THEN
    RAISE EXCEPTION 'Cannot delete customer with outstanding credit balance';
  END IF;

  IF (SELECT COUNT(*) FROM tabs WHERE customer_id = OLD.id AND status IN ('OPEN', 'PARTIALLY_PAID')) > 0 THEN
    RAISE EXCEPTION 'Cannot delete customer with active tabs';
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_customer_deletion_trigger
BEFORE DELETE ON customers
FOR EACH ROW
EXECUTE FUNCTION prevent_customer_deletion();
```

---

## Implementation Examples

### Example 1: Create Store Credit from Deposit

```typescript
export async function issueStoreCredit(
  customerId: number,
  creditAmount: Decimal,
  reason: string,
  issuedBy: number
): Promise<{ success: boolean; newBalance?: Decimal }> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { id: customerId },
      })

      if (!customer) throw new Error("Customer not found")

      const oldBalance = new Decimal(customer.creditBalance || 0)
      const newBalance = oldBalance.plus(creditAmount)

      // Update balance
      await tx.customer.update({
        where: { id: customerId },
        data: {
          creditBalance: newBalance.toNumber(),
          creditUpdatedAt: new Date(),
          creditUpdatedBy: issuedBy,
        },
      })

      // Log transaction
      await tx.creditTransaction.create({
        data: {
          customerId,
          transactionType: "CREDIT_ISSUANCE",
          amount: creditAmount.toNumber(),
          balanceBefore: oldBalance.toNumber(),
          balanceAfter: newBalance.toNumber(),
          reason,
          authorizedBy: issuedBy,
        },
      })

      // Audit
      await tx.creditAudit.create({
        data: {
          customerId,
          action: "CREDIT_ISSUED",
          oldValue: oldBalance,
          newValue: newBalance,
          reason,
          approvedBy: issuedBy,
        },
      })

      return newBalance
    })

    return { success: true, newBalance: result }
  } catch (error) {
    return { success: false }
  }
}
```

### Example 2: Check Aged Tabs & Send Reminders

```typescript
export async function generateAgedTabReminders(daysOverdue: number = 30) {
  try {
    const thresholdDate = new Date()
    thresholdDate.setDate(thresholdDate.getDate() - daysOverdue)

    const overdueCustomers = await prisma.customer.findMany({
      where: {
        tabs: {
          some: {
            status: { in: ["OPEN", "PARTIALLY_PAID"] },
            dueDate: { lt: thresholdDate },
          },
        },
      },
      include: {
        tabs: {
          where: {
            status: { in: ["OPEN", "PARTIALLY_PAID"] },
            dueDate: { lt: thresholdDate },
          },
        },
      },
    })

    // Process reminders
    const reminders = overdueCustomers.map((customer) => {
      const totalOwed = customer.tabs.reduce(
        (sum, tab) => sum.plus(tab.remainingBalance),
        new Decimal(0)
      )

      return {
        customerId: customer.id,
        name: customer.name,
        email: customer.email,
        totalOwed: totalOwed.toNumber(),
        tabCount: customer.tabs.length,
        oldestTabDate: customer.tabs[0]?.openedAt,
      }
    })

    return reminders
  } catch (error) {
    console.error("Failed to generate reminders:", error)
    return []
  }
}
```

---

## Testing Patterns

### Unit Test: Credit Validation

```typescript
// tests/unit/credit-validation.test.ts

import { describe, test, expect, beforeEach, vi } from "vitest"
import { Decimal } from "@prisma/client/runtime/library"
import { validateCustomerCredit } from "@/lib/credit-validation"
import { prisma } from "@/lib/prisma"

vi.mock("@/lib/prisma")

describe("Credit Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test("denies credit when balance is insufficient", async () => {
    // Arrange
    const mockCustomer = {
      id: 1,
      creditBalance: 50,
      creditLimit: 100,
      creditStatus: "active",
      creditHoldReason: null,
      outstandingTabAmount: 0,
      creditLimitPolicy: null,
    }

    vi.mocked(prisma.customer.findUnique).mockResolvedValue(
      mockCustomer as any
    )

    // Act
    const result = await validateCustomerCredit(
      1,
      new Decimal(75) // Requesting $75, only have $50
    )

    // Assert
    expect(result.isValid).toBe(false)
    expect(result.reason).toContain("Insufficient credit")
  })

  test("allows credit when balance is sufficient", async () => {
    // Arrange
    const mockCustomer = {
      id: 1,
      creditBalance: 150,
      creditLimit: 200,
      creditStatus: "active",
      creditHoldReason: null,
      outstandingTabAmount: 0,
      creditLimitPolicy: null,
    }

    vi.mocked(prisma.customer.findUnique).mockResolvedValue(
      mockCustomer as any
    )

    // Act
    const result = await validateCustomerCredit(
      1,
      new Decimal(75)
    )

    // Assert
    expect(result.isValid).toBe(true)
    expect(result.currentBalance).toEqual(new Decimal(150))
  })

  test("denies credit when account is suspended", async () => {
    // Arrange
    const mockCustomer = {
      id: 1,
      creditBalance: 500,
      creditStatus: "suspended",
      creditHoldReason: "FRAUD_SUSPECTED",
      creditLimitPolicy: null,
    }

    vi.mocked(prisma.customer.findUnique).mockResolvedValue(
      mockCustomer as any
    )

    // Act
    const result = await validateCustomerCredit(
      1,
      new Decimal(100)
    )

    // Assert
    expect(result.isValid).toBe(false)
    expect(result.reason).toContain("suspended")
  })
})
```

### Integration Test: Tab Settlement

```typescript
// tests/integration/tab-settlement.test.ts

import { describe, test, expect, beforeEach } from "vitest"
import { POST as settleTab } from "@/app/api/tabs/settle/route"
import { createTestRequest, createMockSession } from "../utils/api-test-helpers"
import { Decimal } from "@prisma/client/runtime/library"

describe("Tab Settlement API", () => {
  test("settles tab with mixed payment methods", async () => {
    // This is an integration test that would hit the real database
    // Using proper setup/teardown

    // Arrange
    const session = createMockSession()
    const request = createTestRequest("/api/tabs/settle", {
      method: "POST",
      body: {
        tabId: 1,
        paymentBreakdown: {
          cash: 50,
          card: 30,
          credit: 20,
        },
      },
    })

    // Act
    const response = await settleTab(request as NextRequest)
    const body = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(body.tab.status).toBe("CLOSED")
    expect(body.tab.remainingBalance).toBe(0)
  })

  test("fails to settle tab with insufficient credit", async () => {
    // Tab owes $100, customer has $30 credit
    // Transaction would fail
  })
})
```

---

## Key Takeaways

### Database Design Best Practices

1. **Monetary Precision**: Use `Decimal(10, 2)` for all currency values
2. **Audit Trails**: Track all credit changes with timestamps and actors
3. **Status Tracking**: Support multiple states (OPEN, CLOSED, SUSPENDED)
4. **Foreign Key Constraints**: Use `onDelete: Restrict` to prevent orphaned records
5. **Indexes**: Index frequently queried fields (`creditStatus`, `outstandingTabAmount`, `dueDate`)

### Transaction Safety Patterns

1. **Atomic Operations**: Use `prisma.$transaction()` for all multi-step operations
2. **Validation First**: Check conditions BEFORE making changes
3. **Rollback on Error**: Design for automatic rollback on exceptions
4. **Idempotency**: Design operations to be safely retryable
5. **Decimal Math**: Never use floating-point for currency calculations

### Access Control

1. **Manager Overrides**: Require explicit manager approval for limit increases
2. **Audit Requirements**: Log all overrides with reason and approver
3. **Permission Checks**: Verify `permSettings` for override operations
4. **IP/UserAgent Logging**: Track location and device for fraud detection

### Customer Protection

1. **Prevent Orphaned Data**: Block deletion with `onDelete: Restrict`
2. **Soft Delete Alternative**: Mark inactive instead of hard delete
3. **Credit Hold Reasons**: Always provide reason for account suspension
4. **Release Process**: Define clear process to reinstate credit

---

## PostgreSQL Performance Considerations

```sql
-- Key indexes for production
CREATE INDEX idx_tabs_customer_id_status ON tabs(customer_id, status);
CREATE INDEX idx_tabs_due_date ON tabs(due_date DESC);
CREATE INDEX idx_credit_transactions_customer_date ON credit_transactions(customer_id, created_at DESC);
CREATE INDEX idx_credit_audit_customer_action ON credit_audits(customer_id, action, created_at DESC);
CREATE INDEX idx_customers_credit_balance ON customers(credit_balance DESC, credit_status);

-- Views for reporting
CREATE VIEW overdue_tabs AS
SELECT
  t.*,
  c.name as customer_name,
  (CURRENT_DATE - t.due_date::date) as days_overdue
FROM tabs t
JOIN customers c ON t.customer_id = c.id
WHERE t.status IN ('OPEN', 'PARTIALLY_PAID')
  AND t.due_date < CURRENT_DATE
ORDER BY t.due_date ASC;

CREATE VIEW customer_credit_summary AS
SELECT
  c.id,
  c.name,
  c.credit_balance,
  c.credit_limit,
  c.credit_status,
  COUNT(DISTINCT t.id) as active_tab_count,
  COALESCE(SUM(t.remaining_balance), 0) as total_outstanding,
  MAX(t.opened_at) as last_tab_date
FROM customers c
LEFT JOIN tabs t ON c.id = t.customer_id AND t.status IN ('OPEN', 'PARTIALLY_PAID')
GROUP BY c.id, c.name, c.credit_balance, c.credit_limit, c.credit_status;
```

---

## References & Industry Standards

### POS Best Practices

- **Square** (POS): Supports tabs/split payments with credit allocation
- **Toast** (POS): Advanced tab management with aged receivables reports
- **Shopify** (Retail): Store credit as pre-paid balance with expiration policies
- **NCR** (Enterprise): Comprehensive credit management with manager approval workflows

### Security Standards

- **PCI DSS**: Tokenize payment information, never store card data
- **SOX Compliance**: Audit trails for all financial transactions
- **Fraud Prevention**: Monitoring for unusual credit patterns

---

**Document Version:** 1.0
**Last Updated:** January 27, 2026
