# Feature Specification: POS Mobile Optimization & Payment Methods

**Feature Branch**: `002-pos-mobile-payments`
**Created**: 2026-01-27
**Status**: Draft
**Input**: User description: "POS changes. Mobile optimization UI, payment methods, cash, gcash, tab (connected to customer)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cash Payment at POS (Priority: P1)

A cashier processes a customer's purchase using cash payment. After adding items to the cart, they select "Cash" as the payment method, enter the amount tendered, and the system calculates change due.

**Why this priority**: Cash remains the most common payment method and is essential for any POS system. This establishes the foundation for the multi-payment architecture.

**Independent Test**: Can be fully tested by completing a sale with cash payment and verifying the transaction is recorded with correct totals and change calculation.

**Acceptance Scenarios**:

1. **Given** items are in the cart with a total of $50, **When** cashier selects Cash payment and enters $60 tendered, **Then** system displays $10 change due and allows completing the sale
2. **Given** items are in the cart, **When** cashier selects Cash payment and enters less than the total, **Then** system shows an error indicating insufficient payment
3. **Given** a cash sale is completed, **When** viewing the transaction history, **Then** the payment method shows as "Cash" with the amount tendered and change given

---

### User Story 2 - GCash Payment at POS (Priority: P1)

A cashier processes a customer's purchase using GCash mobile payment. After adding items, they select "GCash" as the payment method, the customer completes payment via their GCash app, and the cashier enters the GCash reference number to complete the transaction.

**Why this priority**: GCash is a dominant mobile payment method in the Philippine market, essential for modern retail operations.

**Independent Test**: Can be fully tested by completing a sale with GCash payment and verifying the reference number is stored with the transaction.

**Acceptance Scenarios**:

1. **Given** items are in the cart, **When** cashier selects GCash payment, **Then** system displays the total amount for the customer to pay via their GCash app
2. **Given** GCash is selected, **When** cashier enters a valid reference number (at least 10 characters), **Then** system accepts the payment and completes the sale
3. **Given** GCash is selected, **When** cashier attempts to complete without a reference number, **Then** system shows an error requiring the reference number
4. **Given** a GCash sale is completed, **When** viewing the transaction history, **Then** the payment method shows as "GCash" with the reference number visible

---

### User Story 3 - Tab Payment (Store Credit) at POS (Priority: P2)

A cashier processes a purchase for a known customer who wants to pay on their tab (store credit). The cashier selects the customer, chooses "Tab" as payment, and the purchase amount is added to the customer's outstanding balance.

**Why this priority**: Tab payments build customer loyalty and enable credit sales for regular customers, but require customer account setup first.

**Independent Test**: Can be fully tested by assigning a purchase to a customer's tab and verifying their balance increases accordingly.

**Acceptance Scenarios**:

1. **Given** items are in the cart, **When** cashier selects Tab payment, **Then** system requires selecting or searching for a customer
2. **Given** a customer is selected with an existing tab balance of $20, **When** adding a $30 purchase to their tab, **Then** their new balance shows as $50
3. **Given** Tab payment is selected, **When** no customer is linked to the transaction, **Then** system prevents completing the sale until a customer is selected
4. **Given** a tab sale is completed, **When** viewing the customer's profile, **Then** the tab balance reflects the added purchase amount
5. **Given** a customer has a $100 credit limit and $80 current balance, **When** attempting a $30 tab purchase, **Then** system warns that purchase would exceed credit limit
6. **Given** a purchase would exceed credit limit, **When** a user with `permSettings` permission overrides the limit, **Then** the transaction is allowed to proceed

---

### User Story 4 - Customer Tab Balance Settlement (Priority: P2)

A customer wants to settle their outstanding tab balance. The cashier opens the customer's profile, views their tab balance, and processes a payment (cash or GCash) to reduce or clear the balance.

**Why this priority**: Essential complement to tab payments - customers need a way to pay down their store credit.

**Independent Test**: Can be fully tested by making a payment against an existing tab balance and verifying the balance decreases.

**Acceptance Scenarios**:

1. **Given** a customer has a tab balance of $100, **When** they pay $50 in cash, **Then** their tab balance reduces to $50
2. **Given** a customer has a tab balance of $75, **When** they pay the full amount via GCash, **Then** their tab balance becomes $0
3. **Given** a tab settlement is processed, **When** viewing transaction history, **Then** the settlement appears as a separate transaction type with payment method recorded

---

### User Story 5 - Mobile-Optimized POS Interface (Priority: P1)

A cashier uses the POS system on a tablet or mobile device. The interface automatically adapts to the screen size, providing touch-friendly buttons, readable text, and efficient workflows suitable for handheld use.

**Why this priority**: Enables staff mobility for tableside ordering or queue-busting during busy periods. Critical for modern retail flexibility.

**Independent Test**: Can be tested by using the POS on a tablet/phone-sized screen and verifying all POS functions are accessible and usable.

**Acceptance Scenarios**:

1. **Given** the POS is accessed on a tablet (768-1024px width), **When** viewing the sales screen, **Then** buttons are touch-friendly (minimum 44px tap targets) and product grid adjusts to fit
2. **Given** the POS is accessed on a phone (<768px width), **When** adding items and processing payment, **Then** the interface remains usable with appropriately sized elements
3. **Given** mobile view is active, **When** selecting payment method, **Then** payment options are clearly visible and easy to tap
4. **Given** any screen size, **When** completing a full sale workflow, **Then** all essential POS functions (add items, adjust quantity, select payment, complete sale) are accessible

---

### Edge Cases

- Credit limit reached: System warns at 80% threshold, blocks at limit, manager/admin can override per-transaction (see FR-015, FR-016, FR-017)
- GCash payment verification: Transaction marked "Pending" until cashier confirms payment received; confirmation requires capturing photo of customer's GCash confirmation screen (camera capture or photo upload fallback)
- Network connectivity loss: Queue transactions locally and sync automatically when reconnected (offline-capable POS)
- Split payments: System supports any combination of Cash + GCash to cover the total amount
- Customer deletion: System blocks deletion of customers with outstanding tab balance (balance must be $0)

## Requirements *(mandatory)*

### Functional Requirements

**Payment Methods - Core**
- **FR-001**: System MUST support three payment methods: Cash, GCash, and Tab
- **FR-002**: System MUST allow cashier to select payment method before completing a transaction
- **FR-003**: System MUST record the payment method used for each transaction

**Cash Payments**
- **FR-004**: System MUST allow entry of amount tendered for cash payments
- **FR-005**: System MUST calculate and display change due for cash payments
- **FR-006**: System MUST prevent completing a cash sale if tendered amount is less than total

**GCash Payments**
- **FR-007**: System MUST require a GCash reference number for GCash payments
- **FR-008**: System MUST validate that GCash reference number is at least 10 characters
- **FR-009**: System MUST store the GCash reference number with the transaction record
- **FR-027**: System MUST mark GCash transactions as "Pending" until cashier confirms payment received
- **FR-028**: System MUST provide camera capture option to photograph customer's GCash confirmation screen
- **FR-029**: System MUST provide photo upload fallback if camera capture is unavailable or fails
- **FR-030**: System MUST store the confirmation photo with the transaction as proof of payment
- **FR-031**: System MUST allow canceling a Pending GCash transaction if payment is not confirmed

**Split Payments**
- **FR-022**: System MUST support split payments using any combination of Cash and GCash
- **FR-023**: System MUST track each payment component separately within a single transaction
- **FR-024**: System MUST validate that the sum of all payment components equals or exceeds the transaction total
- **FR-025**: System MUST calculate change only when total payments exceed transaction total (change returned in cash)

**Tab Payments**
- **FR-010**: System MUST require a customer to be linked for Tab payments
- **FR-011**: System MUST add purchase amount to the customer's tab balance
- **FR-012**: System MUST display customer's current tab balance when Tab payment is selected
- **FR-013**: System MUST allow customers to settle their tab balance using Cash or GCash
- **FR-014**: System MUST record tab settlement transactions separately from regular sales
- **FR-015**: System MUST support configurable credit limits per customer, preventing tab purchases that would exceed the customer's individual limit
- **FR-016**: System MUST display a warning when a customer approaches their credit limit (e.g., within 80%)
- **FR-017**: System MUST allow users with `permSettings` permission to override credit limits for individual transactions (typically granted to managers/admins)
- **FR-026**: System MUST prevent deletion of customers with non-zero tab balance

**Mobile Optimization**
- **FR-018**: POS interface MUST be fully functional on screens 320px width and above
- **FR-019**: All interactive elements MUST have minimum touch target size of 44x44 pixels on mobile
- **FR-020**: System MUST maintain session and cart state during screen orientation changes
- **FR-021**: POS layout MUST adapt based on screen width (responsive breakpoints)
- **FR-032**: System MUST detect network connectivity status and display indicator to cashier
- **FR-033**: System MUST queue completed transactions locally when offline
- **FR-034**: System MUST automatically sync queued transactions when connectivity is restored
- **FR-035**: System MUST show count of pending offline transactions awaiting sync
- **FR-036**: System MUST prevent duplicate transactions during sync (idempotent submission)

### Key Entities

- **Transaction**: Extended to include payment method type (cash/gcash/tab), GCash reference number, amount tendered, change given, payment status (pending/confirmed for GCash), and GCash confirmation photo path
- **Customer**: Extended to include tab balance field for tracking outstanding store credit, and credit limit field for per-customer maximum
- **TabSettlement**: Records when customers pay down their tab balance, linked to customer and payment method used

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Cashiers can complete a sale with any of the three payment methods in under 30 seconds (from payment selection to completion)
- **SC-002**: 100% of GCash transactions include a stored reference number
- **SC-003**: Customer tab balances are always accurate and reflect all purchases and settlements
- **SC-004**: POS interface is fully usable on devices as small as 320px wide with no horizontal scrolling required
- **SC-005**: All touch targets on mobile are at least 44x44 pixels, achieving 95%+ first-tap accuracy
- **SC-006**: Zero data loss during screen orientation changes or brief network interruptions
- **SC-007**: Staff can complete the full POS workflow (add items, checkout, payment) on a tablet without needing a desktop computer

## Clarifications

### Session 2026-01-27

- Q: How should split payments be handled? → A: Support split payments with any combination of Cash + GCash
- Q: Which permission controls credit limit override? → A: Require manager or admin role
- Q: What happens when deleting a customer with outstanding tab balance? → A: Block deletion until balance is $0
- Q: How to handle GCash payment if customer's payment fails after reference entered? → A: Mark as "Pending" until cashier confirms; on confirmation, capture photo of customer's GCash confirmation screen (camera or upload fallback) as receipt proof
- Q: What happens if network connectivity is lost mid-transaction? → A: Queue locally and sync when reconnected (offline-capable)

## Assumptions

- GCash integration is manual (reference number entry) rather than API-based automated verification
- Tab payments are for trusted/known customers only - the business accepts the credit risk
- Credit limits are set per-customer by staff with appropriate permissions; new customers may have a default limit of $0 (no tab) until set
- Mobile optimization targets modern mobile browsers (Chrome, Safari) from the past 2 years
- Existing customer management functionality is sufficient for linking customers to tab payments
- Cash drawer management (opening, closing, reconciliation) is out of scope for this feature
