"use client"

import { Button } from "@/components/ui/button"
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Ban,
  Wallet,
  Plus,
} from "lucide-react"
import { useSettings } from "@/hooks/use-settings"
import { formatCurrency } from "@/lib/format-currency"
import type { Transaction } from "@/hooks/use-transactions"

interface TransactionActionsProps {
  transaction: Transaction
  onConfirmGCash: () => void
  onCancelGCash: () => void
  onVoid: () => void
  onSettleTab: () => void
  onAddItems: () => void
  isConfirming: boolean
  isCancelling: boolean
  canVoid: boolean
}

export function TransactionActions({
  transaction: tx,
  onConfirmGCash,
  onCancelGCash,
  onVoid,
  onSettleTab,
  onAddItems,
  isConfirming,
  isCancelling,
  canVoid,
}: TransactionActionsProps) {
  const { currencySymbol } = useSettings()
  const isActionLoading = isConfirming || isCancelling

  // GCash Pending: Confirm + Cancel buttons
  if (tx.paymentType === "GCash" && tx.paymentStatus === "pending" && !tx.isVoided) {
    return (
      <div className="space-y-2 pt-2 border-t">
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 min-h-[44px]"
            disabled={isActionLoading}
            onClick={onConfirmGCash}
          >
            {isConfirming ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Confirm Payment
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 min-h-[44px] text-status-critical hover:text-status-critical"
            disabled={isActionLoading}
            onClick={onCancelGCash}
          >
            {isCancelling ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            Cancel Payment
          </Button>
        </div>
        {canVoid && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground hover:text-destructive"
            onClick={onVoid}
          >
            <Ban className="h-3.5 w-3.5 mr-1.5" />
            Void Transaction
          </Button>
        )}
      </div>
    )
  }

  // On Tab: Settle + Add Items + Void
  if (tx.paymentType === "Tab" && !tx.isVoided) {
    return (
      <div className="space-y-2 pt-2 border-t">
        <Button
          size="sm"
          className="w-full min-h-[44px]"
          onClick={onSettleTab}
        >
          <Wallet className="h-4 w-4 mr-2" />
          Settle Tab — {formatCurrency(tx.total, currencySymbol)}
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 min-h-[44px]"
            onClick={onAddItems}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Items
          </Button>
          {canVoid && (
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={onVoid}
            >
              <Ban className="h-4 w-4 mr-2" />
              Void
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Completed (non-voided): Void button only
  if (!tx.isVoided && canVoid) {
    return (
      <div className="pt-2 border-t">
        <Button
          variant="destructive"
          size="sm"
          className="min-h-[44px]"
          data-testid="void-button"
          onClick={onVoid}
        >
          <Ban className="h-4 w-4 mr-2" />
          Void Transaction
        </Button>
      </div>
    )
  }

  // Voided or no permissions: no actions
  return null
}
