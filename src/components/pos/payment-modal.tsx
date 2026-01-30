"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  CheckCircle2,
  Download,
  Mail,
  Loader2,
  Banknote,
  Smartphone,
  CreditCard,
  Split,
  Receipt,
  Delete,
  ArrowRight,
  AlertTriangle,
  CloudOff,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  validateGCashReference,
  type PaymentType,
} from "@/lib/payment-validation"
import { useNetworkStatus } from "@/hooks/use-network-status"
import { useOfflineQueue } from "@/hooks/use-offline-queue"
import { SplitPayment, type SplitPaymentData } from "./split-payment"

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface Customer {
  id: number
  name: string
  tabBalance: number
  creditLimit: number
  tabStatus: string
}

export interface PaymentResult {
  paidAmount: number
  changeAmount: number
  paymentType: string
  paymentInfo: string
  paymentStatus?: string
  customerId?: number
  overrideCreditLimit?: boolean
}

/** Cart item structure for offline queueing */
export interface CartItem {
  id: number
  productName: string
  sku?: string
  price: number
  quantity: number
}

interface PaymentModalProps {
  open: boolean
  onClose: () => void
  total: number
  currencySymbol: string
  /** Current customer if selected */
  customer?: Customer | null
  /** Callback when payment is confirmed */
  onConfirm: (data: PaymentResult) => Promise<number | null>
  /** Whether user can override credit limit (manager/admin) */
  canOverrideCreditLimit?: boolean
  /** Cart items for offline queueing */
  cartItems?: CartItem[]
  /** Subtotal before discount/tax */
  subtotal?: number
  /** Discount amount */
  discount?: number
  /** Tax amount */
  taxAmount?: number
  /** User ID for transaction */
  userId?: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function PaymentModal({
  open,
  onClose,
  total,
  currencySymbol,
  customer,
  onConfirm,
  canOverrideCreditLimit = false,
  cartItems = [],
  subtotal = 0,
  discount = 0,
  taxAmount = 0,
  userId = 1,
}: PaymentModalProps) {
  // Network and offline queue hooks
  const { isOffline } = useNetworkStatus()
  const { queue, isAvailable: isOfflineAvailable, pendingCount } = useOfflineQueue()

  // Payment type state
  const [paymentType, setPaymentType] = useState<PaymentType>("Cash")
  // Track if transaction was queued offline
  const [wasQueuedOffline, setWasQueuedOffline] = useState(false)

  // Cash payment state
  const [paidAmount, setPaidAmount] = useState("")

  // GCash payment state
  const [gcashReference, setGcashReference] = useState("")

  // Tab payment state
  const [overrideCreditLimit, setOverrideCreditLimit] = useState(false)

  // Split payment state (Phase 8 implementation)
  const [splitPaymentData, setSplitPaymentData] = useState<SplitPaymentData | null>(null)

  // UI state
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentComplete, setPaymentComplete] = useState(false)
  const [lastTransactionId, setLastTransactionId] = useState<number | null>(null)
  const [showEmailInput, setShowEmailInput] = useState(false)
  const [emailAddress, setEmailAddress] = useState("")
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  // Calculated values
  const paid = parseFloat(paidAmount) || 0
  const change = paid - total

  // Quick amount buttons for cash
  const quickAmounts = [
    { label: "Exact", value: total },
    { label: `${currencySymbol}50`, value: 50 },
    { label: `${currencySymbol}100`, value: 100 },
    { label: `${currencySymbol}200`, value: 200 },
    { label: `${currencySymbol}500`, value: 500 },
    { label: `${currencySymbol}1000`, value: 1000 },
  ]

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setPaidAmount("")
      setGcashReference("")
      setOverrideCreditLimit(false)
      setSplitPaymentData(null)
      setPaymentType("Cash")
      setIsProcessing(false)
      setPaymentComplete(false)
      setLastTransactionId(null)
      setShowEmailInput(false)
      setEmailAddress("")
      setIsSendingEmail(false)
      setWasQueuedOffline(false)
    }
  }, [open])

  // Numpad handler
  const handleNumpadInput = useCallback((value: string, setter: (fn: (prev: string) => string) => void) => {
    if (value === "clear") {
      setter(() => "")
    } else if (value === "backspace") {
      setter((prev) => prev.slice(0, -1))
    } else if (value === ".") {
      setter((prev) => (prev.includes(".") ? prev : prev + "."))
    } else {
      setter((prev) => prev + value)
    }
  }, [])

  // Check if payment can be confirmed
  const canConfirm = useCallback((): boolean => {
    if (isProcessing) return false

    switch (paymentType) {
      case "Cash":
        return paid >= total

      case "GCash":
        return validateGCashReference(gcashReference).valid

      case "Tab":
        if (!customer) return false
        if (customer.tabStatus === "frozen") return false
        const newBalance = customer.tabBalance + total
        if (newBalance > customer.creditLimit && !overrideCreditLimit) return false
        return true

      case "Split":
        // Use the validated split payment data from the SplitPayment component
        return splitPaymentData?.isValid ?? false

      default:
        return false
    }
  }, [paymentType, paid, total, gcashReference, customer, overrideCreditLimit, isProcessing, splitPaymentData])

  // Handle payment confirmation
  const handleConfirm = async () => {
    if (!canConfirm()) return

    setIsProcessing(true)
    try {
      let result: PaymentResult

      switch (paymentType) {
        case "Cash":
          result = {
            paidAmount: paid,
            changeAmount: change,
            paymentType: "Cash",
            paymentInfo: "",
          }
          break

        case "GCash":
          result = {
            paidAmount: total,
            changeAmount: 0,
            paymentType: "GCash",
            paymentInfo: gcashReference,
            paymentStatus: "pending", // GCash starts as pending
          }
          break

        case "Tab":
          result = {
            paidAmount: total,
            changeAmount: 0,
            paymentType: "Tab",
            paymentInfo: "",
            customerId: customer?.id,
            overrideCreditLimit,
          }
          break

        case "Split":
          if (!splitPaymentData) throw new Error("Split payment data missing")
          result = {
            paidAmount: splitPaymentData.totalPaid,
            changeAmount: splitPaymentData.cashChange,
            paymentType: "Split",
            paymentInfo: JSON.stringify({
              components: [
                ...(splitPaymentData.cashAmount > 0 ? [{
                  method: "Cash",
                  amount: splitPaymentData.cashAmount,
                  tendered: splitPaymentData.cashTendered,
                  change: splitPaymentData.cashChange
                }] : []),
                ...(splitPaymentData.gcashAmount > 0 ? [{
                  method: "GCash",
                  amount: splitPaymentData.gcashAmount,
                  reference: splitPaymentData.gcashReference
                }] : []),
              ],
              cashAmount: splitPaymentData.cashAmount,
              cashTendered: splitPaymentData.cashTendered,
              cashChange: splitPaymentData.cashChange,
              gcashAmount: splitPaymentData.gcashAmount,
              gcashReference: splitPaymentData.gcashReference,
              totalPaid: splitPaymentData.totalPaid,
              changeGiven: splitPaymentData.cashChange,
            }),
            paymentStatus: splitPaymentData.gcashAmount > 0 ? "pending" : undefined,
          }
          break

        default:
          throw new Error("Invalid payment type")
      }

      // T066: Offline queue integration
      // If offline and offline queue is available, queue the transaction locally
      if (isOffline && isOfflineAvailable && cartItems.length > 0) {
        // Tab payments require online connectivity for credit check
        if (paymentType === "Tab") {
          toast.error("Tab payments require network connectivity")
          setIsProcessing(false)
          return
        }

        // Queue the transaction for later sync
        const queuedTransaction = await queue({
          items: cartItems.map((item) => ({
            productId: item.id,
            productName: item.productName,
            sku: item.sku,
            price: item.price,
            quantity: item.quantity,
          })),
          subtotal: subtotal || total,
          discount: discount,
          taxAmount: taxAmount,
          total: total,
          paymentType: result.paymentType,
          paymentInfo: result.paymentInfo || "",
          amountTendered: result.paidAmount,
          customerId: customer?.id,
          userId: userId,
        })

        if (queuedTransaction) {
          setWasQueuedOffline(true)
          setPaymentComplete(true)
          toast.success("Transaction queued for sync when online")
          return
        } else {
          toast.error("Failed to queue transaction offline")
          setIsProcessing(false)
          return
        }
      }

      // Online: process normally
      const transactionId = await onConfirm(result)
      if (transactionId) {
        setLastTransactionId(transactionId)
        setPaymentComplete(true)
      }
    } catch (error) {
      // Error handling done in parent
      console.error("Payment failed:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  // Receipt handlers
  const handleDownloadReceipt = () => {
    if (lastTransactionId) {
      window.open(`/api/receipts/${lastTransactionId}`, "_blank")
    }
  }

  const handleEmailReceipt = async () => {
    if (!lastTransactionId || !emailAddress) return

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailAddress)) {
      toast.error("Please enter a valid email address")
      return
    }

    setIsSendingEmail(true)
    try {
      const response = await fetch(`/api/receipts/${lastTransactionId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailAddress }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to send email")
      }

      toast.success(`Receipt sent to ${emailAddress}`)
      setShowEmailInput(false)
      setEmailAddress("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send email")
    } finally {
      setIsSendingEmail(false)
    }
  }

  const handleClose = () => {
    if (paymentComplete) {
      setPaymentComplete(false)
      setLastTransactionId(null)
    }
    onClose()
  }

  // Tab payment calculations
  const tabNewBalance = customer ? customer.tabBalance + total : 0
  const tabCreditUsage = customer && customer.creditLimit > 0
    ? (tabNewBalance / customer.creditLimit) * 100
    : 0
  const isOverCreditLimit = customer && customer.creditLimit > 0 && tabNewBalance > customer.creditLimit
  const isNearCreditLimit = customer && customer.creditLimit > 0 && tabCreditUsage >= 80

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            {paymentComplete ? (
              <>
                <CheckCircle2 className="h-6 w-6 text-green-500" />
                Payment Complete
              </>
            ) : (
              <>
                <Receipt className="h-6 w-6" />
                Payment
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* ═══════════════════════════════════════════════════════════════════════════════
            PAYMENT COMPLETE VIEW
        ═══════════════════════════════════════════════════════════════════════════════ */}
        {paymentComplete && (lastTransactionId || wasQueuedOffline) ? (
          <div className="p-6 space-y-6">
            {/* Success Message - Different for offline queued transactions */}
            {wasQueuedOffline ? (
              <div className="text-center py-6 bg-amber-50 rounded-xl" data-testid="offline-queued-message">
                <CloudOff className="h-16 w-16 text-amber-500 mx-auto mb-4" />
                <p className="text-xl font-bold text-amber-700 mb-1">
                  Transaction Queued
                </p>
                <p className="text-muted-foreground text-sm">
                  Will sync when connection is restored
                </p>
                <div className="mt-4 space-y-1">
                  <p className="text-3xl font-bold">
                    {currencySymbol}{total.toFixed(2)}
                  </p>
                  {change > 0 && paymentType === "Cash" && (
                    <p className="text-blue-600 font-medium">
                      Change: {currencySymbol}{change.toFixed(2)}
                    </p>
                  )}
                  <p className="text-amber-600 text-sm mt-2">
                    {pendingCount} transaction{pendingCount !== 1 ? "s" : ""} pending sync
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 bg-green-50 rounded-xl">
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <p className="text-xl font-bold text-green-700 mb-1">
                  Payment Successful!
                </p>
                <p className="text-muted-foreground text-sm">
                  Order #{lastTransactionId} completed
                </p>
                <div className="mt-4 space-y-1">
                  <p className="text-3xl font-bold">
                    {currencySymbol}{total.toFixed(2)}
                  </p>
                  {change > 0 && paymentType === "Cash" && (
                    <p className="text-blue-600 font-medium">
                      Change: {currencySymbol}{change.toFixed(2)}
                    </p>
                  )}
                  {paymentType === "GCash" && (
                    <p className="text-amber-600 text-sm">
                      Awaiting GCash confirmation
                    </p>
                  )}
                  {paymentType === "Split" && splitPaymentData && (
                    <>
                      {splitPaymentData.cashChange > 0 && (
                        <p className="text-blue-600 font-medium">
                          Change: {currencySymbol}{splitPaymentData.cashChange.toFixed(2)}
                        </p>
                      )}
                      {splitPaymentData.gcashAmount > 0 && (
                        <p className="text-amber-600 text-sm">
                          GCash portion awaiting confirmation
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Receipt Options - only show for online transactions */}
            {!wasQueuedOffline && (
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full h-12 min-h-11"
                  onClick={handleDownloadReceipt}
                >
                  <Download className="h-5 w-5 mr-2" />
                  Download Receipt
                </Button>

                {!showEmailInput ? (
                  <Button
                    variant="outline"
                    className="w-full h-12 min-h-11"
                    onClick={() => setShowEmailInput(true)}
                  >
                    <Mail className="h-5 w-5 mr-2" />
                    Email Receipt
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="customer@email.com"
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        disabled={isSendingEmail}
                        className="h-12"
                      />
                      <Button
                        onClick={handleEmailReceipt}
                        disabled={!emailAddress || isSendingEmail}
                        className="h-12 px-6 min-h-11"
                      >
                        {isSendingEmail ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          "Send"
                        )}
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setShowEmailInput(false)
                        setEmailAddress("")
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            )}

            <Button className="w-full h-14 min-h-11 text-lg font-bold" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          /* ═══════════════════════════════════════════════════════════════════════════════
              PAYMENT ENTRY VIEW
          ═══════════════════════════════════════════════════════════════════════════════ */
          <div className="space-y-0">
            {/* Total display */}
            <div className="px-6 pb-4">
              <div className="text-center py-4 bg-muted rounded-xl">
                <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
                <p className="text-4xl font-bold text-primary">
                  {currencySymbol}{total.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Payment type tabs */}
            <Tabs value={paymentType} onValueChange={(v) => setPaymentType(v as PaymentType)} className="px-6">
              <TabsList className="grid w-full grid-cols-4 h-12 min-h-11">
                <TabsTrigger value="Cash" className="gap-1.5 text-xs sm:text-sm min-h-11">
                  <Banknote className="h-4 w-4" />
                  <span className="hidden sm:inline">Cash</span>
                </TabsTrigger>
                <TabsTrigger value="GCash" className="gap-1.5 text-xs sm:text-sm min-h-11">
                  <Smartphone className="h-4 w-4" />
                  <span className="hidden sm:inline">GCash</span>
                </TabsTrigger>
                <TabsTrigger value="Tab" className="gap-1.5 text-xs sm:text-sm min-h-11" disabled={!customer}>
                  <CreditCard className="h-4 w-4" />
                  <span className="hidden sm:inline">Tab</span>
                </TabsTrigger>
                <TabsTrigger value="Split" className="gap-1.5 text-xs sm:text-sm min-h-11">
                  <Split className="h-4 w-4" />
                  <span className="hidden sm:inline">Split</span>
                </TabsTrigger>
              </TabsList>

              {/* ═══════════════════════════════════════════════════════════════════════
                  CASH TAB
              ═══════════════════════════════════════════════════════════════════════ */}
              <TabsContent value="Cash" className="mt-4 space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Amount Received</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="text-2xl font-bold h-14 min-h-11 text-center mt-1"
                    autoFocus
                  />
                </div>

                {/* Quick amount buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {quickAmounts.map((item) => (
                    <Button
                      key={item.label}
                      variant="outline"
                      className="h-11 min-h-11"
                      onClick={() => setPaidAmount(item.value.toString())}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>

                {/* Numpad */}
                <div className="grid grid-cols-3 gap-2">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "backspace"].map(
                    (key) => (
                      <Button
                        key={key}
                        variant="outline"
                        className={cn(
                          "h-12 min-h-11 text-lg font-medium",
                          key === "backspace" && "text-destructive"
                        )}
                        onClick={() => handleNumpadInput(key, setPaidAmount)}
                      >
                        {key === "backspace" ? (
                          <Delete className="h-5 w-5" />
                        ) : (
                          key
                        )}
                      </Button>
                    )
                  )}
                </div>
              </TabsContent>

              {/* ═══════════════════════════════════════════════════════════════════════
                  GCASH TAB
              ═══════════════════════════════════════════════════════════════════════ */}
              <TabsContent value="GCash" className="mt-4 space-y-4">
                <div className="text-center py-4 bg-blue-50 rounded-xl">
                  <Smartphone className="h-12 w-12 text-blue-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Customer pays via GCash
                  </p>
                  <p className="text-xl font-bold text-blue-600">
                    {currencySymbol}{total.toFixed(2)}
                  </p>
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground">
                    GCash Reference Number
                  </Label>
                  <Input
                    placeholder="Enter reference number (min 10 characters)"
                    value={gcashReference}
                    onChange={(e) => setGcashReference(e.target.value)}
                    className="mt-1 h-12 min-h-11"
                    autoFocus
                  />
                  {gcashReference && !validateGCashReference(gcashReference).valid && (
                    <p className="text-xs text-destructive mt-1">
                      {validateGCashReference(gcashReference).error}
                    </p>
                  )}
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Transaction will be marked as pending until payment is confirmed
                </p>
              </TabsContent>

              {/* ═══════════════════════════════════════════════════════════════════════
                  TAB TAB
              ═══════════════════════════════════════════════════════════════════════ */}
              <TabsContent value="Tab" className="mt-4 space-y-4">
                {!customer ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Select a customer to use Tab payment</p>
                  </div>
                ) : customer.tabStatus === "frozen" ? (
                  <div className="text-center py-6 bg-red-50 rounded-xl">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                    <p className="font-medium text-red-700">Tab Frozen</p>
                    <p className="text-sm text-red-600">
                      This customer&apos;s tab is frozen. Balance payment only.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Customer info */}
                    <div className="bg-muted rounded-xl p-4">
                      <p className="font-medium">{customer.name}</p>
                      <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Current Balance</p>
                          <p className="font-bold text-lg">
                            {currencySymbol}{customer.tabBalance.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Credit Limit</p>
                          <p className="font-bold text-lg">
                            {currencySymbol}{customer.creditLimit.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* New balance preview */}
                    <div className={cn(
                      "rounded-xl p-4",
                      isOverCreditLimit ? "bg-red-50" : isNearCreditLimit ? "bg-amber-50" : "bg-green-50"
                    )}>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">New Balance</span>
                        <span className={cn(
                          "font-bold text-lg",
                          isOverCreditLimit ? "text-red-600" : isNearCreditLimit ? "text-amber-600" : "text-green-600"
                        )}>
                          {currencySymbol}{tabNewBalance.toFixed(2)}
                        </span>
                      </div>
                      {customer.creditLimit > 0 && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Credit Usage</span>
                            <span>{tabCreditUsage.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={cn(
                                "h-2 rounded-full transition-all",
                                isOverCreditLimit ? "bg-red-500" : isNearCreditLimit ? "bg-amber-500" : "bg-green-500"
                              )}
                              style={{ width: `${Math.min(100, tabCreditUsage)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Credit limit warning/override */}
                    {isOverCreditLimit && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium text-red-700">Credit Limit Exceeded</p>
                            <p className="text-sm text-red-600 mt-1">
                              This transaction exceeds the customer&apos;s credit limit by{" "}
                              {currencySymbol}{(tabNewBalance - customer.creditLimit).toFixed(2)}
                            </p>
                            {canOverrideCreditLimit && (
                              <label className="flex items-center gap-2 mt-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={overrideCreditLimit}
                                  onChange={(e) => setOverrideCreditLimit(e.target.checked)}
                                  className="rounded"
                                />
                                <span className="text-sm text-red-700">
                                  Override credit limit (manager approval)
                                </span>
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              {/* ═══════════════════════════════════════════════════════════════════════
                  SPLIT TAB (Phase 8 implementation)
              ═══════════════════════════════════════════════════════════════════════ */}
              <TabsContent value="Split" className="mt-4">
                <SplitPayment
                  total={total}
                  currencySymbol={currencySymbol}
                  onPaymentDataChange={setSplitPaymentData}
                />
              </TabsContent>
            </Tabs>

            {/* Change display (for Cash payments) */}
            {paymentType === "Cash" && paid > 0 && (
              <div className="px-6 py-4">
                <div
                  className={cn(
                    "text-center py-3 rounded-xl",
                    change >= 0 ? "bg-blue-50" : "bg-red-50"
                  )}
                >
                  <p className="text-sm text-muted-foreground">
                    {change >= 0 ? "Change" : "Amount Due"}
                  </p>
                  <p
                    className={cn(
                      "text-2xl font-bold",
                      change >= 0 ? "text-blue-600" : "text-red-600"
                    )}
                  >
                    {currencySymbol}{Math.abs(change).toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            <Separator />

            {/* Action buttons */}
            <div className="p-6 pt-4 flex gap-3">
              <Button variant="outline" className="flex-1 h-12 min-h-11" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                className="flex-1 h-12 min-h-11 text-lg font-bold gap-2"
                onClick={handleConfirm}
                disabled={!canConfirm()}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Confirm
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
