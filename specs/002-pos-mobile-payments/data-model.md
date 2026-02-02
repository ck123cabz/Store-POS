# Data Model: POS Mobile Optimization & Payment Methods

**Branch**: `002-pos-mobile-payments` | **Date**: 2026-01-27

## Entity Overview

This feature extends the existing `Transaction` and `Customer` models and introduces two new models: `TabSettlement` and `OfflineTransaction`.

```
┌─────────────────┐         ┌─────────────────┐
│    Customer     │─────────│   Transaction   │
│  + tabBalance   │    1:N  │  + paymentType  │
│  + creditLimit  │         │  + paymentInfo  │
│  + tabStatus    │         │  + paymentStatus│
└────────┬────────┘         │  + gcashPhoto   │
         │                  │  + splitPayments│
         │ 1:N              └─────────────────┘
         │
┌────────▼────────┐         ┌─────────────────┐
│  TabSettlement  │         │OfflineTransaction│
│  (balance pay)  │         │  (sync queue)   │
└─────────────────┘         └─────────────────┘
```

---

## Entity: Customer (Extended)

Extends existing Customer model with tab/credit fields.

### New Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `tabBalance` | Decimal(10,2) | DEFAULT 0, >= 0 | Outstanding store credit balance |
| `creditLimit` | Decimal(10,2) | DEFAULT 0, >= 0 | Maximum allowed tab balance |
| `tabStatus` | String | ENUM: active, suspended, frozen | Account status |

### Validation Rules

- `tabBalance` must be >= 0 (enforced via Prisma middleware)
- `creditLimit` >= 0, can be updated only by users with `permSettings`
- `tabStatus` changes logged to audit trail
- Customer cannot be deleted if `tabBalance > 0`

### State Transitions

```
active ──► suspended ──► frozen
   ▲            │            │
   └────────────┴────────────┘
        (can restore)
```

- **active**: Normal operations, can make tab purchases
- **suspended**: Warning state at 80% credit limit, can still pay down balance
- **frozen**: No new tab purchases, balance recovery only

---

## Entity: Transaction (Extended)

Extends existing Transaction model with payment method details.

### New/Modified Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `paymentType` | String | ENUM | Cash, GCash, Tab, Split |
| `paymentInfo` | String | JSON or ref | GCash ref number or split payment JSON |
| `paymentStatus` | String | ENUM | pending, confirmed (for GCash) |
| `gcashPhotoPath` | String | Nullable | Path to GCash confirmation photo |
| `amountTendered` | Decimal(10,2) | Nullable | Amount given (cash payments) |
| `changeGiven` | Decimal(10,2) | Nullable | Change returned |
| `idempotencyKey` | String | UNIQUE, Nullable | For offline transaction deduplication |

### Payment Type Enum

```typescript
enum PaymentType {
  Cash = 'Cash',
  GCash = 'GCash',
  Tab = 'Tab',
  Split = 'Split',
}
```

### Payment Status Enum (GCash only)

```typescript
enum PaymentStatus {
  Pending = 'pending',    // Awaiting confirmation
  Confirmed = 'confirmed', // Payment verified
  Cancelled = 'cancelled', // Transaction cancelled
}
```

### Split Payment JSON Schema

When `paymentType = 'Split'`, `paymentInfo` contains:

```typescript
interface SplitPayment {
  components: Array<{
    method: 'Cash' | 'GCash';
    amount: number;
    reference?: string; // GCash reference number
  }>;
  totalPaid: number;
  changeGiven: number;
}
```

### Validation Rules

- **Cash**: `amountTendered >= total`, calculate `changeGiven`
- **GCash**: `paymentInfo` (reference) required, min 10 chars
- **Tab**: `customerId` required, validate credit limit
- **Split**: Sum of components >= total, each GCash needs reference

---

## Entity: TabSettlement (New)

Records when customers pay down their tab balance.

### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Int | PK, AUTO | Primary key |
| `customerId` | Int | FK → Customer | Customer paying down tab |
| `amount` | Decimal(10,2) | > 0 | Settlement amount |
| `paymentType` | String | ENUM: Cash, GCash | How they paid |
| `paymentInfo` | String | Nullable | GCash ref if applicable |
| `previousBalance` | Decimal(10,2) | - | Balance before settlement |
| `newBalance` | Decimal(10,2) | - | Balance after settlement |
| `userId` | Int | FK → User | Cashier processing settlement |
| `createdAt` | DateTime | DEFAULT now() | Settlement timestamp |

### Relationships

- `customer`: Many-to-one with Customer
- `user`: Many-to-one with User (cashier)

### Validation Rules

- `amount` must be > 0 and <= `previousBalance`
- `newBalance` = `previousBalance` - `amount`
- `paymentType` must be Cash or GCash (not Tab)

---

## Entity: OfflineTransaction (Client-side only)

Stores transactions queued for sync when offline. **Not persisted to PostgreSQL** - exists only in browser IndexedDB.

### Fields (IndexedDB Schema)

| Field | Type | Index | Description |
|-------|------|-------|-------------|
| `id` | String | PK | UUID v7 (time-ordered) |
| `idempotencyKey` | String | UNIQUE | Composite key for deduplication |
| `payload` | Object | - | Full transaction data |
| `status` | String | YES | pending, syncing, synced, failed |
| `timestamp` | Number | YES | Queue timestamp |
| `retryCount` | Number | - | Sync attempt count |
| `lastError` | String | - | Last sync error message |

### Status Transitions

```
pending ──► syncing ──► synced
    │           │
    │           ▼
    └────────► failed ──► pending (retry)
```

---

## Prisma Schema Changes

```prisma
// prisma/schema.prisma additions

model Customer {
  // ... existing fields ...

  // Tab/Credit System (NEW)
  tabBalance     Decimal   @default(0) @map("tab_balance") @db.Decimal(10, 2)
  creditLimit    Decimal   @default(0) @map("credit_limit") @db.Decimal(10, 2)
  tabStatus      String    @default("active") @map("tab_status")

  // Relations (NEW)
  tabSettlements TabSettlement[]

  @@map("customers")
}

model Transaction {
  // ... existing fields (paymentType, paymentInfo already exist) ...

  // Payment Enhancements (NEW)
  paymentStatus   String?   @map("payment_status")        // pending, confirmed
  gcashPhotoPath  String?   @map("gcash_photo_path")
  idempotencyKey  String?   @unique @map("idempotency_key")

  @@map("transactions")
}

model TabSettlement {
  id              Int       @id @default(autoincrement())
  customerId      Int       @map("customer_id")
  amount          Decimal   @db.Decimal(10, 2)
  paymentType     String    @map("payment_type")
  paymentInfo     String?   @map("payment_info")
  previousBalance Decimal   @map("previous_balance") @db.Decimal(10, 2)
  newBalance      Decimal   @map("new_balance") @db.Decimal(10, 2)
  userId          Int       @map("user_id")
  createdAt       DateTime  @default(now()) @map("created_at")

  customer        Customer  @relation(fields: [customerId], references: [id])

  @@map("tab_settlements")
}
```

---

## Migration Plan

### Step 1: Add Customer Fields

```sql
ALTER TABLE customers
  ADD COLUMN tab_balance DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN credit_limit DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN tab_status VARCHAR(20) DEFAULT 'active';

ALTER TABLE customers
  ADD CONSTRAINT chk_tab_balance_positive CHECK (tab_balance >= 0),
  ADD CONSTRAINT chk_credit_limit_positive CHECK (credit_limit >= 0);
```

### Step 2: Add Transaction Fields

```sql
ALTER TABLE transactions
  ADD COLUMN payment_status VARCHAR(20),
  ADD COLUMN gcash_photo_path VARCHAR(255),
  ADD COLUMN idempotency_key VARCHAR(100) UNIQUE;

CREATE INDEX idx_transactions_idempotency ON transactions(idempotency_key);
CREATE INDEX idx_transactions_payment_status ON transactions(payment_status);
```

### Step 3: Create TabSettlement Table

```sql
CREATE TABLE tab_settlements (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_type VARCHAR(20) NOT NULL,
  payment_info VARCHAR(255),
  previous_balance DECIMAL(10,2) NOT NULL,
  new_balance DECIMAL(10,2) NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tab_settlements_customer ON tab_settlements(customer_id);
CREATE INDEX idx_tab_settlements_created ON tab_settlements(created_at);
```

---

## Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| `transactions` | `idempotency_key` (unique) | Offline sync deduplication |
| `transactions` | `payment_status` | Query pending GCash |
| `customers` | `tab_status` | Filter active credit accounts |
| `tab_settlements` | `customer_id` | Customer settlement history |
| `tab_settlements` | `created_at` | Settlement date queries |

---

## Relationships Summary

```
Customer (1) ─────────────── (N) Transaction
    │                              │
    │ (1:N)                        │ paymentType = Tab
    │                              │ requires customerId
    ▼                              │
TabSettlement ◄────────────────────┘
    │
    │ records balance reduction
    │ via Cash or GCash
    ▼
(Audit trail for credit activity)
```
