# Feature Specification: Transaction Fixes - Currency, Void, and Display

**Feature Branch**: `003-transaction-fixes`
**Created**: 2026-01-30
**Status**: Draft
**Input**: User description: "Transaction fixes: currency symbol from settings (PHP instead of USD), add void transaction capability, fix rendering issues"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Transactions with Correct Currency (Priority: P1)

A store owner in the Philippines views their transaction history. All monetary values (totals, subtotals, change, etc.) display with the Philippine Peso symbol (₱) as configured in their store settings, instead of the hardcoded dollar sign ($).

**Why this priority**: Currency display is fundamental to the usability of the system. Displaying the wrong currency symbol causes confusion and makes the system appear unprofessional for non-US markets.

**Independent Test**: Can be fully tested by configuring the currency symbol in Settings to "₱" and verifying all transaction displays use that symbol.

**Acceptance Scenarios**:

1. **Given** the store settings have currencySymbol set to "₱", **When** viewing the transactions list, **Then** all monetary values display with "₱" prefix (e.g., ₱500.00)
2. **Given** the store settings have currencySymbol set to "₱", **When** viewing a transaction detail dialog, **Then** subtotal, discount, tax, total, paid, and change amounts all display with "₱"
3. **Given** the store settings have currencySymbol set to "₱", **When** viewing the today's summary cards, **Then** revenue, average ticket, and daypart totals display with "₱"
4. **Given** the store settings have currencySymbol set to "$", **When** viewing transactions, **Then** all amounts display with "$" (backwards compatible)
5. **Given** no currencySymbol is configured (default), **When** viewing transactions, **Then** amounts display with "$" as the fallback

---

### User Story 2 - Void a Completed Transaction (Priority: P1)

A manager needs to void a transaction that was made in error (wrong items, test transaction, customer dispute, etc.). They select the transaction, click a "Void" button, provide a reason, and the transaction is marked as voided. Voided transactions are clearly distinguished in the list and excluded from revenue calculations.

**Why this priority**: Voiding transactions is essential for correcting mistakes and maintaining accurate financial records. Without this, stores cannot properly handle errors or disputes.

**Independent Test**: Can be fully tested by voiding a transaction and verifying it's marked as voided, excluded from totals, and the reason is recorded.

**Acceptance Scenarios**:

1. **Given** a completed transaction exists within 7 days, **When** a user with void permission clicks "Void", **Then** they see a confirmation dialog asking for a void reason
2. **Given** the void dialog is open, **When** the user selects a reason and confirms, **Then** the transaction is marked as voided with timestamp and user info
3. **Given** a transaction is voided, **When** viewing the transactions list, **Then** the voided transaction shows a "Voided" badge and appears visually distinct (muted/strikethrough)
4. **Given** voided transactions exist, **When** viewing today's summary, **Then** revenue totals exclude voided transactions
5. **Given** a user without void permission, **When** viewing a transaction, **Then** the void button is not visible or is disabled
6. **Given** a transaction is already voided, **When** viewing it, **Then** the void button is disabled with "Already voided" tooltip
7. **Given** a transaction is older than 7 days, **When** viewing it, **Then** the void button is disabled with "Transaction too old to void" message

---

### User Story 3 - View Void History and Audit Trail (Priority: P2)

A store owner reviews voided transactions to monitor for patterns or potential misuse. They can filter transactions to show only voided ones and see who voided them and why.

**Why this priority**: Accountability and fraud prevention are important but secondary to the core void functionality.

**Independent Test**: Can be fully tested by filtering for voided transactions and verifying all void details are visible.

**Acceptance Scenarios**:

1. **Given** voided transactions exist, **When** filtering by status "Voided", **Then** only voided transactions are displayed
2. **Given** a voided transaction is viewed, **When** opening the detail dialog, **Then** void reason, voided by, and voided at are displayed
3. **Given** multiple transactions were voided, **When** viewing the list, **Then** each shows who voided it and when

---

### Edge Cases

- **Partial refund vs void**: Void is for full transaction cancellation only; partial refunds are out of scope for this feature
- **Void time window**: System allows voiding within 7 days of transaction; after 7 days, void button is disabled with "Transaction too old to void" message
- **Stock restoration**: Voiding a transaction that decremented stock should not automatically restore stock (separate inventory adjustment required)
- **Void already-synced transactions**: If a voided transaction was already synced to external systems, the system records the void but cannot unsync
- **Currency symbol edge cases**: Very long currency symbols (3+ characters) should still display correctly without breaking layout

## Requirements *(mandatory)*

### Functional Requirements

**Currency Display**
- **FR-001**: System MUST read the currency symbol from Settings when displaying monetary values
- **FR-002**: System MUST apply the configured currency symbol to all transaction displays (list, detail, summary cards)
- **FR-003**: System MUST default to "$" if no currency symbol is configured
- **FR-004**: System MUST support common currency symbols including but not limited to: $, ₱, €, £, ¥

**Transaction Void - Core**
- **FR-005**: System MUST allow authorized users to void completed transactions within 7 days of the transaction date
- **FR-006**: System MUST require a void reason when voiding a transaction
- **FR-007**: System MUST record void metadata: voidedAt (timestamp), voidedById (user ID), voidedByName (user name), voidReason
- **FR-008**: System MUST mark voided transactions with an isVoided flag
- **FR-009**: System MUST NOT allow voiding a transaction that is already voided
- **FR-017**: System MUST prevent voiding transactions older than 7 days with clear error message

**Transaction Void - Display**
- **FR-010**: System MUST visually distinguish voided transactions in the transaction list (badge + muted appearance)
- **FR-011**: System MUST show void details (reason, who, when) in the transaction detail dialog for voided transactions
- **FR-012**: System MUST exclude voided transactions from revenue calculations in summary displays

**Transaction Void - Permissions**
- **FR-013**: System MUST restrict void capability to users with the new `permVoid` permission
- **FR-014**: System MUST hide or disable the void button for users without `permVoid` permission

**Transaction Filtering**
- **FR-015**: System MUST add "Voided" as a status filter option in the transactions list
- **FR-016**: System MUST support filtering to show: All, Completed, Pending, Voided, or On Hold transactions

### Key Entities

- **Transaction**: Extended to include void tracking fields:
  - `isVoided` (boolean) - whether the transaction has been voided
  - `voidedAt` (datetime) - when the void occurred
  - `voidedById` (user ID) - who performed the void
  - `voidedByName` (string) - name of user who voided (denormalized for audit)
  - `voidReason` (string) - reason for voiding (selected from predefined list or custom)

- **User**: Extended to include new permission:
  - `permVoid` (boolean) - whether user can void transactions

- **Settings**: Already has `currencySymbol` field that needs to be utilized

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All monetary values in the transactions page display with the currency symbol from Settings
- **SC-002**: Authorized users can void any non-voided transaction in under 15 seconds (3 clicks: View → Void → Confirm)
- **SC-003**: 100% of voided transactions have recorded reason, user, and timestamp
- **SC-004**: Revenue summary cards accurately exclude voided transactions (verified by comparing sum of non-voided vs displayed total)
- **SC-005**: Users without void permission cannot access the void functionality
- **SC-006**: Voided transactions are visually distinguishable from active transactions at a glance

## Clarifications

### Session 2026-01-30

- Q: Should void require a separate permission from `permTransactions`? → A: Create new `permVoid` permission for stricter control
- Q: Should there be a time limit on voiding transactions? → A: Within 7 days of transaction

## Assumptions

- A new `permVoid` permission will be added for void authorization (separate from `permTransactions`)
- Void reasons can be predefined options (Wrong Items, Test Transaction, Customer Dispute, Duplicate Entry, Other) plus optional custom text
- Stock is not automatically restored when voiding - this requires a separate inventory adjustment (keeps void simple and auditable)
- The void is a soft delete - voided transactions remain in the database for audit purposes
- Currency symbol change in Settings takes effect immediately without requiring page refresh (or acceptable with refresh)
