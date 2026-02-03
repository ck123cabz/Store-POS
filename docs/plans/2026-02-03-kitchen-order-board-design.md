# Kitchen Order Board Design

**Date:** 2026-02-03
**Status:** Approved
**Author:** Brainstorming session

## Overview

A shared digital display where kitchen and counter staff coordinate on orders. Orders flow through statuses (New → Cooking → Ready → Served) with real-time updates and sound alerts.

### Problem Statement

Currently, there's no system for kitchen visibility. The POS handles transactions, but the kitchen has no way to see incoming orders or their priority. This leads to verbal coordination which is error-prone and doesn't scale.

### Goals

1. Kitchen can see all pending orders in real-time
2. Counter and kitchen can coordinate on order priority
3. Orders auto-send to kitchen when confirmed (Pay Now or Pay Later)
4. Visual and audio alerts for new orders and overdue items

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| View type | Single shared page | Both kitchen and counter see same board, simpler than separate views |
| Order statuses | New → Cooking → Ready → Served | Matches actual kitchen workflow |
| Entry point | Auto-send on order confirmation | Both "Pay Now" and "Pay Later" trigger kitchen order |
| Kitchen items | Hybrid (category default + product override) | Flexible - category sets default, products can override |
| Priority | FIFO + manual reorder + rush flag | Simple default with manual control when needed |
| Batching | Not included | Over-engineering; trust the cook to batch visually |
| Wait alerts | Yellow at 5min, red at 10min | Visual pressure without being annoying |
| Notifications | Visual highlight + sound | Kitchen environments are noisy, need both |
| Completed orders | Archive view | Keep board clean, allow lookup if needed |
| Permissions | Open to all | Start simple, add restrictions if problems arise |
| Notes/instructions | Not included | Verbal communication works for special requests |
| Data model | Separate KitchenOrder | Clean separation from Transaction, more flexible |

## Data Model

### New Models

```prisma
model KitchenOrder {
  id            Int       @id @default(autoincrement())
  transactionId Int       @map("transaction_id")
  orderNumber   Int       @map("order_number")

  // Status: new → cooking → ready → served → cancelled
  status        String    @default("new")

  // Timestamps
  sentAt        DateTime  @default(now()) @map("sent_at")
  cookingAt     DateTime? @map("cooking_at")
  readyAt       DateTime? @map("ready_at")
  servedAt      DateTime? @map("served_at")

  // Priority
  isRush        Boolean   @default(false) @map("is_rush")
  displayOrder  Int       @default(0) @map("display_order")

  // Relations
  transaction   Transaction @relation(fields: [transactionId], references: [id])
  items         KitchenOrderItem[]

  @@index([status])
  @@index([sentAt])
  @@map("kitchen_orders")
}

model KitchenOrderItem {
  id             Int      @id @default(autoincrement())
  kitchenOrderId Int      @map("kitchen_order_id")
  productId      Int      @map("product_id")
  productName    String   @map("product_name")
  quantity       Int

  kitchenOrder   KitchenOrder @relation(fields: [kitchenOrderId], references: [id], onDelete: Cascade)

  @@map("kitchen_order_items")
}
```

### Changes to Existing Models

```prisma
// Add to Category
model Category {
  // ... existing fields
  requiresKitchen  Boolean @default(false) @map("requires_kitchen")
}

// Add to Product
model Product {
  // ... existing fields
  requiresKitchen  Boolean? @map("requires_kitchen")  // null = use category default
}

// Add relation to Transaction
model Transaction {
  // ... existing fields
  kitchenOrders    KitchenOrder[]
}
```

## User Interface

### Order Board (`/orders`)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Order Board                            [Today's Completed] [Sound 🔊]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─ NEW ──────────┐  ┌─ COOKING ──────┐  ┌─ READY ─────────┐       │
│  │                │  │                │  │                 │       │
│  │  #147 ⚡       │  │  #145          │  │  #142           │       │
│  │  2× Burger     │  │  1× Pasta      │  │  1× Burger      │       │
│  │  1× Fries      │  │  3m            │  │  2m             │       │
│  │  Just now      │  │                │  │                 │       │
│  │  [Start]       │  │  [Ready]       │  │  [Served]       │       │
│  │                │  │                │  │                 │       │
│  │  #146          │  │                │  │                 │       │
│  │  3× Burger     │  │                │  │                 │       │
│  │  2m            │  │                │  │                 │       │
│  │  [Start]       │  │                │  │                 │       │
│  │                │  │                │  │                 │       │
│  └────────────────┘  └────────────────┘  └─────────────────┘       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Order Card Contents

| Element | Description |
|---------|-------------|
| Order number | Large, prominent (e.g., `#147`) |
| Rush indicator | ⚡ icon if flagged, card highlighted |
| Items | Product name × quantity (kitchen items only) |
| Time | Duration in current status ("Just now", "2m", "5m") |
| Action button | Single button for next status |

### Time-based Visual Alerts

| Time in status | Visual |
|----------------|--------|
| 0-4 min | Normal |
| 5-9 min | Yellow border/background |
| 10+ min | Red border/background |

### Interactions

- **Click action button** → Progress to next status
- **Click card** → Expand for details + Rush toggle
- **Drag card** → Reorder within column (manual priority)

### Real-time Updates

- Poll every 5 seconds
- New order → highlight animation + sound
- Status change → card animates to new column

## POS Integration

### Payment Flow Changes

**Current flow:** Build order → Pay → Done

**New flow:** Build order → [Pay Now] or [Pay Later] → Kitchen order auto-created

```
┌─────────────────────────────────────────────────────────────────────┐
│  Current Order                                              #147    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   2× Classic Burger ............................ ₱340.00            │
│   1× Fries ...................................... ₱85.00            │
│   1× Iced Tea ................................... ₱65.00            │
│                                                                     │
│   Subtotal                                       ₱490.00            │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [💳 Pay Now]              [📋 Pay Later]                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

| Button | Behavior |
|--------|----------|
| **Pay Now** | Payment modal → complete transaction → auto-send kitchen items to kitchen |
| **Pay Later** | Select/create customer → add to tab → auto-send kitchen items to kitchen |

### Pay Later Flow

1. Click "Pay Later"
2. Modal opens with customer search
3. Select existing customer OR quick-add new customer (name required, phone optional)
4. Order added to customer's tab
5. Kitchen order created automatically

### Kitchen Status Badge

POS shows kitchen status on the order:

```
Current Order                                    #147 🍳 COOKING
```

## API Endpoints

### Kitchen Order Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/kitchen-orders?since=<timestamp>` | Active orders + new order detection |
| `GET` | `/api/kitchen-orders/completed` | Today's completed orders |
| `GET` | `/api/kitchen-orders/[id]` | Single order details |
| `POST` | `/api/kitchen-orders` | Create kitchen order (internal) |
| `PATCH` | `/api/kitchen-orders/[id]` | Update status, rush flag |
| `PATCH` | `/api/kitchen-orders/reorder` | Bulk displayOrder update |

### Request/Response Examples

**GET `/api/kitchen-orders?since=2026-02-03T10:00:00Z`**

```json
{
  "orders": [
    {
      "id": 1,
      "transactionId": 147,
      "orderNumber": 147,
      "status": "new",
      "isRush": true,
      "displayOrder": 0,
      "sentAt": "2026-02-03T10:30:00Z",
      "cookingAt": null,
      "readyAt": null,
      "secondsInStatus": 45,
      "items": [
        { "productId": 12, "productName": "Classic Burger", "quantity": 2 },
        { "productId": 15, "productName": "Fries", "quantity": 1 }
      ]
    }
  ],
  "hasNewSince": true
}
```

**PATCH `/api/kitchen-orders/[id]`**

```json
// Update status
{ "status": "cooking" }

// Toggle rush
{ "isRush": true }
```

**PATCH `/api/kitchen-orders/reorder`**

```json
{
  "orders": [
    { "id": 3, "displayOrder": 0 },
    { "id": 1, "displayOrder": 1 },
    { "id": 2, "displayOrder": 2 }
  ]
}
```

### Transaction Endpoint Changes

`POST /api/transactions` automatically creates kitchen order when:
- Transaction has kitchen items (products with `requiresKitchen`)
- Either payment is completed (Pay Now) or added to tab (Pay Later)

Response includes:
```json
{
  "id": 147,
  "orderNumber": 147,
  "kitchenStatus": "new",
  "kitchenOrderId": 1
}
```

## Component Structure

```
src/
├── app/(dashboard)/orders/
│   └── page.tsx                    # Order Board page
│
├── components/kitchen/
│   ├── order-board.tsx             # Main board with 3 columns
│   ├── order-column.tsx            # Single column (NEW/COOKING/READY)
│   ├── order-card.tsx              # Individual order card
│   ├── order-card-expanded.tsx     # Expanded view with rush toggle
│   ├── completed-orders-modal.tsx  # "Today's Completed" modal
│   └── use-kitchen-orders.ts       # Hook: polling, sound, state
│
├── components/pos/
│   ├── pay-later-modal.tsx         # Customer selection + quick-add
│   └── kitchen-status-badge.tsx    # Small badge showing kitchen status
```

### Hook: `useKitchenOrders`

```typescript
function useKitchenOrders() {
  // Polls /api/kitchen-orders every 5 seconds
  // Plays sound when hasNewSince is true
  // Returns: { orders, isLoading, updateStatus, toggleRush, reorder }
}
```

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No kitchen items in order | No kitchen order created |
| Transaction voided | Kitchen order status → `cancelled`, disappears from board |
| Order modified after sending | Not supported in v1 (would need "add items" flow) |
| Multiple kitchen orders per transaction | Supported by data model but not implemented in v1 |

## Out of Scope (Future)

- Per-item notes/special instructions
- Estimated ready time input
- Role-based permissions
- Ingredient-level batch suggestions
- Printed tickets integration
- Multiple kitchen stations
- Order splitting (apps first, then mains)

## Implementation Notes

1. **Drag-to-reorder:** Use same pattern as existing categories page
2. **Sound notification:** Use Web Audio API, respect browser autoplay policies
3. **Polling vs WebSockets:** Start with polling (simpler), upgrade if needed
4. **Mobile:** Board should work on tablets; POS changes work on existing POS layout
