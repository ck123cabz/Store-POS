"use client"

import { ReceiptText } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import { TransactionCard } from "./transaction-card"
import type { Transaction } from "@/hooks/use-transactions"

interface TransactionCardListProps {
  transactions: Transaction[]
  onSelect: (transaction: Transaction) => void
  isLoading: boolean
}

export function TransactionCardList({
  transactions,
  onSelect,
  isLoading,
}: TransactionCardListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-[72px] rounded-lg bg-muted/50 animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={<ReceiptText className="size-10" />}
        title="No transactions"
        description="No transactions match your current filters."
      />
    )
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx) => (
        <TransactionCard key={tx.id} transaction={tx} onSelect={onSelect} />
      ))}
    </div>
  )
}
