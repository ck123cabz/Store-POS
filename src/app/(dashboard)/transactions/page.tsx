"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { SlidersHorizontal } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { useSession } from "next-auth/react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

import {
  useTransactions,
  QUICK_FILTER_OPTIONS,
  type QuickFilter,
} from "@/hooks/use-transactions"
import {
  TransactionSummaryCards,
  TransactionFilterBar,
  TransactionFilterSheet,
  TransactionTable,
  TransactionCardList,
  TransactionDetail,
} from "@/components/transactions"
import { TransactionVoidModal } from "@/components/transactions/transaction-void-modal"
import { TransactionExport } from "@/components/transactions/transaction-export"

export default function TransactionsPage() {
  const tx = useTransactions()
  const isMobile = useIsMobile()
  const { data: session } = useSession()

  // Mobile filter sheet
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  // Handle void confirmation
  async function onVoidConfirm(reason: string, customReason?: string) {
    if (!tx.viewTransaction) return
    await tx.handleVoidTransaction(tx.viewTransaction.id, reason, customReason)
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Transactions</h1>
        {!isMobile && (
          <TransactionExport
            transactions={tx.transactions}
            filters={tx.filters}
            activeQuickFilter={tx.activeQuickFilter}
          />
        )}
      </div>

      {/* Summary Cards */}
      <TransactionSummaryCards todayData={tx.todayData} isLoading={tx.isLoading} />

      {/* Filters: Desktop bar vs Mobile pills + sheet */}
      {isMobile ? (
        <div className="space-y-3">
          <div className="overflow-x-auto -mx-4 px-4">
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={tx.activeQuickFilter || ""}
              onValueChange={(v) => tx.setActiveQuickFilter((v as QuickFilter) || null)}
              aria-label="Quick date filters"
              className="min-h-[44px]"
            >
              {QUICK_FILTER_OPTIONS.map((o) => (
                <ToggleGroupItem key={o.value} value={o.value} className="min-h-[44px]">
                  {o.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px]"
            onClick={() => setFilterSheetOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <TransactionFilterSheet
            open={filterSheetOpen}
            onOpenChange={setFilterSheetOpen}
            filters={tx.filters}
            onApply={tx.setFilters}
            users={tx.users}
          />
        </div>
      ) : (
        <TransactionFilterBar
          activeQuickFilter={tx.activeQuickFilter}
          onQuickFilterChange={tx.setActiveQuickFilter}
          filters={tx.filters}
          onFiltersChange={tx.setFilters}
          users={tx.users}
        />
      )}

      {/* Transaction List: Desktop table vs Mobile cards */}
      {isMobile ? (
        <TransactionCardList
          transactions={tx.transactions}
          onSelect={tx.setViewTransaction}
          isLoading={tx.isLoading}
        />
      ) : (
        <TransactionTable
          transactions={tx.transactions}
          onSelect={tx.setViewTransaction}
          isLoading={tx.isLoading}
          activeQuickFilter={tx.activeQuickFilter}
          filters={tx.filters}
          onClearFilters={tx.clearFilters}
        />
      )}

      {/* Transaction Detail View */}
      <TransactionDetail
        transaction={tx.viewTransaction}
        open={!!tx.viewTransaction}
        onOpenChange={() => tx.setViewTransaction(null)}
        onActionComplete={tx.refreshTransactions}
        gcashActionLoading={tx.gcashActionLoading}
        onGcashConfirm={tx.handleGcashConfirm}
        onGcashCancel={tx.handleGcashCancel}
        canVoid={!!session?.user?.permVoid}
        onVoidClick={() => tx.setShowVoidModal(true)}
      />

      {/* Void Modal */}
      <TransactionVoidModal
        open={tx.showVoidModal}
        onOpenChange={(open) => {
          tx.setShowVoidModal(open)
          if (!open) tx.setVoidError(null)
        }}
        onConfirm={onVoidConfirm}
        isLoading={tx.voidLoading}
        error={tx.voidError}
        orderNumber={tx.viewTransaction?.orderNumber}
      />
    </div>
  )
}
