# Product Lifecycle Management Design

**Date:** 2026-03-04
**Status:** Approved

## Problem

Products in Store-POS can only be created and edited — there is no way to remove, archive, or phase out menu items. The existing hard-delete endpoint fails silently on any product with transaction history due to foreign key constraints. Operators need a way to manage the full lifecycle of their menu items: from initial setup, through active selling, to temporary unavailability and eventual retirement.

## Lifecycle States

```
DRAFT ──→ ACTIVE ──→ UNAVAILABLE ──→ DISCONTINUED
                  ↑                ↓
                  └────────────────┘  (reactivate)
                  ↑                              ↓
                  └──────────────────────────────┘  (reactivate)
```

| Status | Description |
|--------|-------------|
| `DRAFT` | Product being set up, not yet visible on POS |
| `ACTIVE` | Live on POS, available for sale |
| `UNAVAILABLE` | Temporarily pulled (ingredient shortage, supplier issue). Visible on POS but greyed out |
| `DISCONTINUED` | Permanently retired. Hidden from POS entirely. Historical transactions preserved |

### Valid Transitions

| From | Allowed To |
|------|-----------|
| DRAFT | ACTIVE, DISCONTINUED |
| ACTIVE | UNAVAILABLE, DISCONTINUED |
| UNAVAILABLE | ACTIVE, DISCONTINUED |
| DISCONTINUED | ACTIVE (reactivate) |

## Hard Delete Rule

- Products with **zero transaction history** → hard delete allowed (clean up mistakes, drafts)
- Products with **any transaction history** → hard delete blocked (409 Conflict), operator must Discontinue instead

## Data Model Changes

### New Enum

```prisma
enum ProductStatus {
  DRAFT
  ACTIVE
  UNAVAILABLE
  DISCONTINUED
}
```

### Product Model Addition

```prisma
status ProductStatus @default(ACTIVE) @map("status")
```

### Migration

- Backfill all existing products to `ACTIVE`
- Default for new products: `ACTIVE` (preserves current create-and-sell behavior)

## API Changes

### New Endpoint: `PATCH /api/products/[id]/status`

```json
// Request
{ "status": "UNAVAILABLE" }

// Response 200
{ "id": 1, "name": "Chicken Wrap", "status": "UNAVAILABLE" }

// Response 400 (invalid transition)
{ "error": "Cannot transition from DRAFT to UNAVAILABLE" }
```

- Validates transition against allowed transitions table
- Writes to existing audit log
- Returns updated product

### Updated: `GET /api/products`

- Accepts optional `?status=ACTIVE,UNAVAILABLE` query parameter
- Defaults to returning all statuses for admin views
- POS grid fetches with `?status=ACTIVE,UNAVAILABLE`

### Updated: `DELETE /api/products/[id]`

- Checks `TransactionItem` count for the product
- Zero transactions → hard delete proceeds
- Non-zero → returns `409 Conflict` with message: "Product has transaction history. Use status change to discontinue instead."

### Updated: `POST /api/products`

- Preserves current behavior (defaults to `ACTIVE`)
- Optionally accepts `status: "DRAFT"` to stage a product

## UI Changes

### POS Grid (`product-grid.tsx`)

| Status | Behavior |
|--------|----------|
| ACTIVE | Normal product card, fully interactive |
| UNAVAILABLE | Greyed out with "Unavailable" label overlay, click disabled |
| DRAFT | Not fetched, not rendered |
| DISCONTINUED | Not fetched, not rendered |

### Menu Management — Products Tab (`products-tab.tsx`)

- **Status badge** next to each product name:
  - ACTIVE → no badge (or subtle green dot)
  - DRAFT → gray badge
  - UNAVAILABLE → amber badge
  - DISCONTINUED → red badge
- **Filter bar** at the top: toggle pills for Active | Unavailable | Discontinued | Draft | All
  - Default: Active only
  - Each pill shows count (e.g., "Active (24)")

### Product Panel — Contextual Actions (`product-panel.tsx`)

| Current Status | Actions |
|---|---|
| DRAFT | "Go Live" (→ ACTIVE), "Delete" (hard delete) |
| ACTIVE | "Mark Unavailable", "Discontinue" |
| UNAVAILABLE | "Reactivate" (→ ACTIVE), "Discontinue" |
| DISCONTINUED | "Reactivate" (→ ACTIVE) |

- **"Discontinue"** confirmation: "This will remove [Product Name] from the POS. You can reactivate it later."
- **"Delete"** confirmation: "This will permanently delete [Product Name]. This cannot be undone."
- Action buttons in view mode, visually separated from the Edit button

## Audit Logging

Status transitions are logged to the existing audit log system with:
- User who made the change
- Timestamp
- Action description (e.g., "Product 'Chicken Wrap' status changed from ACTIVE to UNAVAILABLE")

## Files Changed

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `ProductStatus` enum + `status` field |
| `src/app/api/products/route.ts` | Add `status` filter to GET |
| `src/app/api/products/[id]/route.ts` | Update DELETE with transaction check |
| `src/app/api/products/[id]/status/route.ts` | New — PATCH status transition endpoint |
| `src/components/pos/product-grid.tsx` | Filter and style by status |
| `src/app/(dashboard)/menu/components/products-tab.tsx` | Status badges + filter bar |
| `src/app/(dashboard)/menu/components/product-panel.tsx` | Contextual action buttons |

## Out of Scope (YAGNI)

- No scheduled auto-unavailable (e.g., "unavailable after date X")
- No reason/notes field on status changes
- No bulk status change operations
- No DRAFT → UNAVAILABLE transition (nonsensical path)
