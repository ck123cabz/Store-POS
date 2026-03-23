"use client"

import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Ban } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { useSettings } from "@/hooks/use-settings"
import { formatCurrency } from "@/lib/format-currency"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getStatusInfo } from "./transaction-utils"
import { TransactionActions } from "./transaction-actions"
import { StatusDot } from "@/components/ui/status-dot"
import type { Transaction } from "@/hooks/use-transactions"

interface TransactionDetailProps {
  transaction: Transaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onActionComplete: () => void
  // GCash actions
  gcashActionLoading: "confirm" | "cancel" | null
  onGcashConfirm: (txId: number) => void
  onGcashCancel: (txId: number) => void
  // Void
  canVoid: boolean
  onVoidClick: () => void
  // Tab actions
  onSettleTab?: (tx: Transaction) => void
  onAddItems?: (tx: Transaction) => void
}

export function TransactionDetail({
  transaction: tx,
  open,
  onOpenChange,
  gcashActionLoading,
  onGcashConfirm,
  onGcashCancel,
  canVoid,
  onVoidClick,
  onSettleTab,
  onAddItems,
}: TransactionDetailProps) {
  const isMobile = useIsMobile()
  const { currencySymbol } = useSettings()
  const fmtCurrency = (value: string | number | null | undefined) =>
    formatCurrency(value, currencySymbol)

  const content = tx ? (
    <DetailContent
      tx={tx}
      fmtCurrency={fmtCurrency}
      gcashActionLoading={gcashActionLoading}
      onGcashConfirm={() => onGcashConfirm(tx.id)}
      onGcashCancel={() => onGcashCancel(tx.id)}
      canVoid={canVoid}
      onVoidClick={onVoidClick}
      onSettleTab={onSettleTab ? () => onSettleTab(tx) : undefined}
      onAddItems={onAddItems ? () => onAddItems(tx) : undefined}
    />
  ) : null

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-full p-0">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="flex items-center gap-2">
              <span>Order #{tx?.orderNumber}</span>
              {tx && (
                <StatusDot
                  variant={getStatusInfo(tx).variant}
                  label={getStatusInfo(tx).label}
                />
              )}
            </SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto flex-1 px-4 py-4">{content}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Order #{tx?.orderNumber}</span>
            {tx && (
              <StatusDot
                variant={getStatusInfo(tx).variant}
                label={getStatusInfo(tx).label}
              />
            )}
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
}

// ─── Detail Content ──────────────────────────────────────────────

interface DetailContentProps {
  tx: Transaction
  fmtCurrency: (value: string | number | null | undefined) => string
  gcashActionLoading: "confirm" | "cancel" | null
  onGcashConfirm: () => void
  onGcashCancel: () => void
  canVoid: boolean
  onVoidClick: () => void
  onSettleTab?: () => void
  onAddItems?: () => void
}

function DetailContent({
  tx,
  fmtCurrency,
  gcashActionLoading,
  onGcashConfirm,
  onGcashCancel,
  canVoid,
  onVoidClick,
  onSettleTab,
  onAddItems,
}: DetailContentProps) {
  return (
    <div className="space-y-4">
      {/* Tab customer banner */}
      {tx.paymentType === "Tab" && tx.customer && !tx.isVoided && (
        <div className="bg-status-info/10 border border-status-info/30 rounded-md p-3 text-sm">
          <span className="font-medium">{tx.customer.name}&apos;s Tab</span>
        </div>
      )}

      {/* Metadata grid */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="text-muted-foreground">Date:</div>
        <div>{format(new Date(tx.createdAt), "MMM d, yyyy h:mm a")}</div>

        <div className="text-muted-foreground">Customer:</div>
        <div>{tx.customer?.name || "Walk-in"}</div>

        <div className="text-muted-foreground">Cashier:</div>
        <div className="flex items-center gap-2">
          {tx.user?.fullname && (
            <Avatar size="sm">
              <AvatarFallback>
                {tx.user.fullname
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          )}
          <span>{tx.user?.fullname || "Unknown"}</span>
        </div>

        <div className="text-muted-foreground">Till:</div>
        <div>{tx.tillNumber}</div>

        <div className="text-muted-foreground">Payment:</div>
        <div className="flex items-center gap-2">
          <span>{tx.paymentType || "-"}</span>
          {tx.paymentStatus === "pending" && (
            <Badge variant="outline" className="text-status-warning border-status-warning/30 text-xs">
              Pending
            </Badge>
          )}
          {tx.paymentStatus === "confirmed" && (
            <Badge variant="outline" className="text-status-ok border-status-ok/30 text-xs">
              Confirmed
            </Badge>
          )}
          {tx.paymentStatus === "cancelled" && (
            <Badge variant="outline" className="text-status-critical border-status-critical/30 text-xs">
              Cancelled
            </Badge>
          )}
        </div>

        {/* GCash proof photo */}
        {tx.paymentType === "GCash" && tx.gcashPhotoPath && (
          <>
            <div className="text-muted-foreground">Proof:</div>
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tx.gcashPhotoPath}
                alt="GCash payment proof"
                className="rounded border max-h-32 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => window.open(tx.gcashPhotoPath!, "_blank")}
              />
            </div>
          </>
        )}

        {/* GCash reference (legacy) */}
        {tx.paymentType === "GCash" && tx.paymentInfo && !tx.paymentInfo.startsWith("photo:") && (
          <>
            <div className="text-muted-foreground">Ref:</div>
            <div className="font-mono text-xs truncate max-w-48">{tx.paymentInfo}</div>
          </>
        )}

        {/* Split payment breakdown */}
        {tx.paymentType === "Split" && tx.paymentInfo && (
          <>
            <div className="text-muted-foreground">Split:</div>
            <div className="text-xs">
              {(() => {
                try {
                  const split = JSON.parse(tx.paymentInfo)
                  return split.components?.map(
                    (c: { method: string; amount: number; reference?: string }, i: number) => (
                      <div key={i}>
                        {c.method}: {fmtCurrency(c.amount)}
                        {c.reference && (
                          <span className="text-muted-foreground ml-1">({c.reference})</span>
                        )}
                      </div>
                    )
                  )
                } catch {
                  return tx.paymentInfo
                }
              })()}
            </div>
          </>
        )}

        {tx.refNumber && (
          <>
            <div className="text-muted-foreground">Ref #:</div>
            <div>{tx.refNumber}</div>
          </>
        )}
      </div>

      {/* Items section */}
      <div className="border rounded p-3 space-y-2">
        <div className="font-medium">Items</div>
        {tx.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span>
              {item.quantity}x {item.productName}
            </span>
            <span className="font-mono tabular-nums">{fmtCurrency(item.price)}</span>
          </div>
        ))}
      </div>

      {/* Totals section */}
      <div className="border-t pt-2 space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="font-mono tabular-nums">{fmtCurrency(tx.subtotal)}</span>
        </div>
        {tx.discount && parseFloat(tx.discount) > 0 && (
          <div className="flex justify-between text-status-critical">
            <span>Discount</span>
            <span className="font-mono tabular-nums">-{fmtCurrency(tx.discount)}</span>
          </div>
        )}
        {tx.taxAmount && parseFloat(tx.taxAmount) > 0 && (
          <div className="flex justify-between">
            <span>Tax</span>
            <span className="font-mono tabular-nums">{fmtCurrency(tx.taxAmount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base pt-1">
          <span>Total</span>
          <span className="font-mono tabular-nums">{fmtCurrency(tx.total)}</span>
        </div>
        {tx.paidAmount && (
          <div className="flex justify-between">
            <span>Paid</span>
            <span className="font-mono tabular-nums">{fmtCurrency(tx.paidAmount)}</span>
          </div>
        )}
        {tx.changeAmount && (
          <div className="flex justify-between">
            <span>Change</span>
            <span className="font-mono tabular-nums">{fmtCurrency(tx.changeAmount)}</span>
          </div>
        )}
      </div>

      {/* Void info section */}
      {tx.isVoided && (
        <Alert variant="destructive">
          <Ban className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium">Transaction Voided</p>
            <p>Reason: {tx.voidReason}</p>
            <p>By: {tx.voidedByName}</p>
            {tx.voidedAt && (
              <p>On: {format(new Date(tx.voidedAt), "MMM d, yyyy h:mm a")}</p>
            )}
            <p className="text-xs mt-1 opacity-75">Stock and ingredients were restored.</p>
          </AlertDescription>
        </Alert>
      )}

      {/* Action bar */}
      <TransactionActions
        transaction={tx}
        onConfirmGCash={onGcashConfirm}
        onCancelGCash={onGcashCancel}
        onVoid={onVoidClick}
        onSettleTab={onSettleTab || (() => {})}
        onAddItems={onAddItems || (() => {})}
        isConfirming={gcashActionLoading === "confirm"}
        isCancelling={gcashActionLoading === "cancel"}
        canVoid={canVoid}
      />
    </div>
  )
}
