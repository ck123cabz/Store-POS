# Data Model Reference: Transactions Page UI/UX Refactor

**Date**: 2026-03-23 | **Branch**: `011-transactions-ui`

> **No schema changes.** This document references existing data models consumed by the frontend.

## Existing Entities (Read-Only Reference)

### Transaction (from API: GET /api/transactions)

| Field | Type | UI Usage |
|-------|------|----------|
| id | number | Internal key for API calls (void, confirm, cancel) |
| orderNumber | number | Display as "#1042" in mono font |
| total | string | Display in Total column/card with currency formatting |
| subtotal | string | Detail view: subtotal row |
| discount | string | Detail view: discount row (if > 0) |
| taxAmount | string | Detail view: tax row |
| status | number | 0=Pending, 1=Completed → mapped to status badges |
| paymentType | string | "Cash", "GCash", "Tab", "Split" → icon + label |
| paidAmount | string | Detail view: payment amount |
| changeAmount | string | Detail view: change (Cash payments) |
| paymentStatus | string\|null | "pending", "confirmed", "cancelled" (GCash only) |
| paymentInfo | string\|null | GCash ref number or Split JSON breakdown |
| gcashPhotoPath | string\|null | Detail view: GCash proof image |
| createdAt | string | Time column + detail view date/time |
| tillNumber | number | Detail view: "Till #1" |
| refNumber | string | On-hold identifier |
| isVoided | boolean | Controls voided styling (opacity, strikethrough) |
| voidedAt | string\|null | Detail view: void timestamp |
| voidedByName | string\|null | Detail view: "Voided by Admin" |
| voidReason | string\|null | Detail view: void reason display |
| customer | {id, name}\|null | null = "Walk-in" (italic); otherwise customer name |
| user | {id, fullname} | Cashier name in detail view |
| items | TransactionItem[] | Detail view: line items list |

### TransactionItem (nested in Transaction)

| Field | Type | UI Usage |
|-------|------|----------|
| productName | string | Detail view: item name |
| price | string | Detail view: unit price |
| quantity | number | Detail view: "2×" quantity prefix |

### Today's Summary (from API: GET /api/transactions/today)

| Field | Type | UI Usage |
|-------|------|----------|
| totalRevenue | number | Summary card: "Today's Revenue" |
| transactions | number | Summary card: "Transactions" count |
| avgTicket | number | Summary card: "Avg Order" |
| peakHour | {hour, label, transactions, revenue} | Summary card: "Peak Hour" |

### User (from API: GET /api/users)

| Field | Type | UI Usage |
|-------|------|----------|
| id | number | Cashier filter dropdown value |
| fullname | string | Cashier filter dropdown label |

## State Transitions (Display Logic)

```
Transaction Status Mapping:
─────────────────────────────────────────
status=0, paymentStatus="pending"     → Badge: "Pending" (amber)
status=0, paymentType="Tab"           → Badge: "On Tab" (blue)
status=1, isVoided=false              → Badge: "Completed" (green)
status=1, isVoided=true               → Badge: "Voided" (red)
paymentStatus="cancelled"             → Badge: "Cancelled" (red)
refNumber exists, status=0            → Badge: "On Hold" (info)
```

## Filter State (Client-Side)

| Filter | Type | Default | Behavior |
|--------|------|---------|----------|
| activeQuickFilter | "today"\|"yesterday"\|"week"\|"month"\|"all" | "today" | Resets other filters when changed |
| statusFilter | "all"\|"1"\|"0" | "all" | Filters by transaction status |
| cashierFilter | "all"\|userId | "all" | Filters by user.id |
| searchQuery | string | "" | Matches orderNumber or customer name |
| includeVoided | boolean | false | Toggles voided transaction visibility |
| dateFrom | Date\|null | null | Advanced: custom date range start |
| dateTo | Date\|null | null | Advanced: custom date range end |
| tillFilter | string | "" | Advanced: filter by till number |
