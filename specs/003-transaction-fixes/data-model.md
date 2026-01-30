# Data Model: Transaction Fixes

**Feature**: 003-transaction-fixes | **Date**: 2026-01-30

## Schema Changes

This feature requires modifications to two existing models: **Transaction** and **User**.

---

## 1. Transaction Model - Void Fields

### New Fields

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| `isVoided` | Boolean | No | `false` | Whether the transaction has been voided |
| `voidedAt` | DateTime | Yes | `null` | Timestamp when the void occurred |
| `voidedById` | Int | Yes | `null` | User ID who performed the void |
| `voidedByName` | String | Yes | `null` | Username who voided (denormalized for audit) |
| `voidReason` | String | Yes | `null` | Reason for voiding |

### Prisma Schema Addition

```prisma
model Transaction {
  // ... existing fields ...

  // Void tracking (003-transaction-fixes)
  isVoided      Boolean   @default(false) @map("is_voided")
  voidedAt      DateTime? @map("voided_at")
  voidedById    Int?      @map("voided_by_id")
  voidedByName  String?   @map("voided_by_name")
  voidReason    String?   @map("void_reason")

  // Relation to user who voided (optional, for referential integrity)
  voidedBy      User?     @relation("VoidedTransactions", fields: [voidedById], references: [id])

  @@map("transactions")
}
```

### Index Recommendations

```prisma
@@index([isVoided])  // For filtering voided/non-voided transactions
@@index([voidedAt])  // For audit queries by void date
```

### Validation Rules

| Rule | Enforcement |
|------|-------------|
| `voidedAt` required if `isVoided=true` | API layer |
| `voidedById` required if `isVoided=true` | API layer |
| `voidReason` required if `isVoided=true` | API layer |
| Cannot void if already voided | API layer |
| Cannot void if transaction older than 7 days | API layer |

---

## 2. User Model - Void Permission

### New Fields

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| `permVoid` | Boolean | No | `false` | Whether user can void transactions |

### Prisma Schema Addition

```prisma
model User {
  // ... existing permission fields ...
  permProducts     Boolean       @default(false) @map("perm_products")
  permCategories   Boolean       @default(false) @map("perm_categories")
  permTransactions Boolean       @default(false) @map("perm_transactions")
  permUsers        Boolean       @default(false) @map("perm_users")
  permSettings     Boolean       @default(false) @map("perm_settings")
  permReports      Boolean       @default(false) @map("perm_reports")
  permAuditLog     Boolean       @default(false) @map("perm_audit_log")
  permVoid         Boolean       @default(false) @map("perm_void")  // NEW

  // ... existing relations ...

  // NEW: Transactions voided by this user
  voidedTransactions Transaction[] @relation("VoidedTransactions")

  @@map("users")
}
```

---

## 3. Migration Strategy

### Migration SQL (approximate)

```sql
-- Add void fields to transactions
ALTER TABLE transactions
ADD COLUMN is_voided BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN voided_at TIMESTAMP NULL,
ADD COLUMN voided_by_id INTEGER NULL REFERENCES users(id),
ADD COLUMN voided_by_name VARCHAR(255) NULL,
ADD COLUMN void_reason TEXT NULL;

-- Add index for filtering
CREATE INDEX idx_transactions_is_voided ON transactions(is_voided);

-- Add permVoid to users
ALTER TABLE users
ADD COLUMN perm_void BOOLEAN NOT NULL DEFAULT FALSE;

-- Grant permVoid to existing admin users (users with permUsers = true)
UPDATE users SET perm_void = TRUE WHERE perm_users = TRUE;
```

### Prisma Migration Command

```bash
npx prisma migrate dev --name add-void-fields
```

---

## 4. Entity Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                         User                                     │
├─────────────────────────────────────────────────────────────────┤
│ id: Int (PK)                                                    │
│ permVoid: Boolean [NEW]                                         │
│ ...other fields...                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ voidedById (FK, optional)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Transaction                                 │
├─────────────────────────────────────────────────────────────────┤
│ id: Int (PK)                                                    │
│ isVoided: Boolean [NEW]                                         │
│ voidedAt: DateTime? [NEW]                                       │
│ voidedById: Int? (FK → User.id) [NEW]                          │
│ voidedByName: String? [NEW]                                     │
│ voidReason: String? [NEW]                                       │
│ ...existing fields...                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. State Transitions

### Transaction Void State Machine

```
                    ┌──────────────────┐
                    │   isVoided=false │ (Initial state for all transactions)
                    └────────┬─────────┘
                             │
                             │ void() action
                             │ [requires: permVoid, within 7 days, not already voided]
                             ▼
                    ┌──────────────────┐
                    │   isVoided=true  │ (Terminal state - cannot be unvoided)
                    │   voidedAt=now   │
                    │   voidedById=X   │
                    │   voidReason=Y   │
                    └──────────────────┘
```

### Notes on State Transitions

- **Void is irreversible** - once voided, a transaction cannot be "unvoided"
- If a void was made in error, the correct process is to create a new transaction
- This simplifies the audit trail and prevents potential abuse

---

## 6. Backwards Compatibility

### Existing Data

- All existing transactions will have `isVoided = false` by default
- No data migration required for transaction history
- Revenue calculations will continue to work correctly (default WHERE includes non-voided)

### API Compatibility

- GET `/api/transactions` default behavior unchanged (excludes voided by default)
- Explicit `includeVoided=true` required to see voided transactions
- New `isVoided` filter parameter for filtering specifically to voided ones
