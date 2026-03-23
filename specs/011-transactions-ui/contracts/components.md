# Component Interface Contracts

**Date**: 2026-03-23 | **Branch**: `011-transactions-ui`

> Defines the props interface for each extracted component. No API changes — all contracts are internal component boundaries.

## Hook: useTransactions

```typescript
interface UseTransactionsReturn {
  // Data
  transactions: Transaction[]
  todayData: TodaySummary | null
  users: User[]
  totalCount: number

  // Filter state
  filters: TransactionFilters
  setFilters: (filters: Partial<TransactionFilters>) => void
  activeQuickFilter: QuickFilter
  setActiveQuickFilter: (filter: QuickFilter) => void

  // Pagination
  page: number
  setPage: (page: number) => void
  pageSize: number

  // Loading/error
  isLoading: boolean
  error: string | null

  // Actions
  refreshTransactions: () => Promise<void>
  refreshTodayData: () => Promise<void>
}

type QuickFilter = "today" | "yesterday" | "week" | "month" | "all"

interface TransactionFilters {
  status: "all" | "1" | "0"
  userId: "all" | string
  searchQuery: string
  includeVoided: boolean
  dateFrom: Date | null
  dateTo: Date | null
  tillNumber: string
}
```

## TransactionSummaryCards

```typescript
interface TransactionSummaryCardsProps {
  todayData: TodaySummary | null
  isLoading: boolean
}
// Renders: 4-card grid on desktop, 3-metric strip on mobile
// Uses: useIsMobile() internally for layout switch
```

## TransactionFilterBar (Desktop)

```typescript
interface TransactionFilterBarProps {
  activeQuickFilter: QuickFilter
  onQuickFilterChange: (filter: QuickFilter) => void
  filters: TransactionFilters
  onFiltersChange: (filters: Partial<TransactionFilters>) => void
  users: User[]
}
// Renders: segmented time control + status/cashier/search dropdowns + voided checkbox
```

## TransactionFilterSheet (Mobile)

```typescript
interface TransactionFilterSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: TransactionFilters
  onApply: (filters: Partial<TransactionFilters>) => void
  users: User[]
}
// Renders: bottom Sheet with filter controls + Apply button
```

## TransactionTable (Desktop)

```typescript
interface TransactionTableProps {
  transactions: Transaction[]
  onSelect: (transaction: Transaction) => void
  isLoading: boolean
}
// Renders: sortable DataTable with columns: Order, Time, Customer, Items, Payment, Total, Status
```

## TransactionCardList (Mobile)

```typescript
interface TransactionCardListProps {
  transactions: Transaction[]
  onSelect: (transaction: Transaction) => void
  isLoading: boolean
}
// Renders: vertical list of TransactionCard components
```

## TransactionCard (Mobile)

```typescript
interface TransactionCardProps {
  transaction: Transaction
  onSelect: (transaction: Transaction) => void
}
// Renders: card with row1 (order# + badge + total), row2 (payment icon + items + customer + time)
// Border: amber for pending, default for others; reduced opacity for voided
```

## TransactionDetail

```typescript
interface TransactionDetailProps {
  transaction: Transaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onActionComplete: () => void  // refresh after confirm/cancel/void/settle
  session: Session | null       // for permission checks
}
// Renders: Dialog on desktop, Sheet on mobile
// Layout: header + items + totals + payment info + action bar
```

## TransactionActions

```typescript
interface TransactionActionsProps {
  transaction: Transaction
  onConfirmGCash: () => Promise<void>
  onCancelGCash: () => Promise<void>
  onVoid: () => void              // opens void modal
  onSettleTab: () => void         // navigates to POS payment
  onAddItems: () => void          // navigates to POS grid
  isConfirming: boolean
  isCancelling: boolean
  canVoid: boolean                // from session.user.permVoid
}
// Renders: state-specific button layout based on transaction type/status
```

## TransactionVoidModal

```typescript
interface TransactionVoidModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (reason: string) => Promise<void>
  isLoading: boolean
  error: string | null
}
// Renders: reason select + custom textarea + confirm/cancel buttons
```

## TransactionExport

```typescript
interface TransactionExportProps {
  transactions: Transaction[]
  filters: TransactionFilters
  activeQuickFilter: QuickFilter
}
// Renders: Export button in page header
// Action: generates CSV and triggers browser download
```

## Utility: exportTransactionsToCSV

```typescript
function exportTransactionsToCSV(
  transactions: Transaction[],
  currencySymbol: string
): string
// Returns: CSV string with headers: Order #, Date, Time, Customer, Items, Payment, Total, Status
// Voided transactions marked with "VOIDED" in Status column
```
