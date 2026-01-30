"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Banknote,
  Smartphone,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { validateGCashReference } from "@/lib/payment-validation"

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface TabSettlementProps {
  customerId: number
  currentBalance: number
  currencySymbol?: string
  onSettlementComplete?: () => void
}

type PaymentMethod = "Cash" | "GCash"

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function TabSettlement({
  customerId,
  currentBalance,
  currencySymbol = "₱",
  onSettlementComplete,
}: TabSettlementProps) {
  // Form state
  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash")
  const [gcashReference, setGcashReference] = useState("")

  // UI state
  const [isProcessing, setIsProcessing] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [lastSettlement, setLastSettlement] = useState<{
    amount: number
    newBalance: number
  } | null>(null)

  // Calculated values
  const parsedAmount = parseFloat(amount) || 0
  const isValidAmount = parsedAmount > 0 && parsedAmount <= currentBalance

  // Validate GCash reference if GCash is selected
  const gcashValidation = validateGCashReference(gcashReference)
  const isGcashValid = paymentMethod === "Cash" || gcashValidation.valid

  // Overall form validity
  const canSubmit = isValidAmount && isGcashValid && !isProcessing

  // Handle amount input
  const handleAmountChange = useCallback((value: string) => {
    // Allow only numbers and one decimal point
    const sanitized = value.replace(/[^0-9.]/g, "")
    const parts = sanitized.split(".")
    if (parts.length > 2) return
    if (parts[1] && parts[1].length > 2) return
    setAmount(sanitized)
  }, [])

  // Handle "Pay Full Balance" button
  const handlePayFullBalance = useCallback(() => {
    setAmount(currentBalance.toFixed(2))
  }, [currentBalance])

  // Handle payment method change
  const handlePaymentMethodChange = useCallback((method: PaymentMethod) => {
    setPaymentMethod(method)
    if (method === "Cash") {
      setGcashReference("")
    }
  }, [])

  // Reset form
  const resetForm = useCallback(() => {
    setAmount("")
    setPaymentMethod("Cash")
    setGcashReference("")
    setShowSuccess(false)
    setLastSettlement(null)
  }, [])

  // Handle form submission
  const handleSubmit = async () => {
    if (!canSubmit) return

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/customers/${customerId}/tab`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsedAmount,
          paymentMethod: paymentMethod,
          paymentInfo: paymentMethod === "GCash" ? gcashReference : undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to process settlement")
      }

      const result = await response.json()

      // Show success state
      setLastSettlement({
        amount: parsedAmount,
        newBalance: result.newBalance,
      })
      setShowSuccess(true)

      toast.success(`Payment of ${currencySymbol}${parsedAmount.toFixed(2)} recorded`)

      // Notify parent component
      onSettlementComplete?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to process settlement")
    } finally {
      setIsProcessing(false)
    }
  }

  // If no balance, show empty state
  if (currentBalance <= 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-4">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-medium text-green-700">No Outstanding Balance</p>
            <p className="text-sm text-muted-foreground mt-1">
              This customer has a zero balance.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Success state after settlement
  if (showSuccess && lastSettlement) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-6 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <p className="text-xl font-bold text-green-700">Payment Successful!</p>
              <p className="text-3xl font-bold mt-2">
                {currencySymbol}{lastSettlement.amount.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                New Balance: {currencySymbol}{lastSettlement.newBalance.toFixed(2)}
              </p>
            </div>
            <Button onClick={resetForm} variant="outline" className="min-h-11">
              Make Another Payment
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Make Payment</CardTitle>
        <CardDescription>
          Pay down the outstanding tab balance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Balance Display */}
        <div className="bg-amber-50 rounded-xl p-4 text-center">
          <p className="text-sm text-amber-700 mb-1">Current Balance</p>
          <p className="text-3xl font-bold text-amber-900">
            {currencySymbol}{currentBalance.toFixed(2)}
          </p>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="settlement-amount">Payment Amount</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {currencySymbol}
              </span>
              <Input
                id="settlement-amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="pl-8 h-12 min-h-11 text-lg font-medium"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={handlePayFullBalance}
              className="min-h-11 whitespace-nowrap"
            >
              Pay Full
            </Button>
          </div>
          {parsedAmount > currentBalance && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Amount exceeds current balance
            </p>
          )}
        </div>

        <Separator />

        {/* Payment Method Selection */}
        <div className="space-y-3">
          <Label>Payment Method</Label>
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={paymentMethod === "Cash" ? "default" : "outline"}
              className={cn(
                "h-14 min-h-11 flex-col gap-1",
                paymentMethod === "Cash" && "ring-2 ring-primary ring-offset-2"
              )}
              onClick={() => handlePaymentMethodChange("Cash")}
            >
              <Banknote className="h-5 w-5" />
              <span>Cash</span>
            </Button>
            <Button
              type="button"
              variant={paymentMethod === "GCash" ? "default" : "outline"}
              className={cn(
                "h-14 min-h-11 flex-col gap-1",
                paymentMethod === "GCash" && "ring-2 ring-primary ring-offset-2"
              )}
              onClick={() => handlePaymentMethodChange("GCash")}
            >
              <Smartphone className="h-5 w-5" />
              <span>GCash</span>
            </Button>
          </div>
        </div>

        {/* GCash Reference Input */}
        {paymentMethod === "GCash" && (
          <div className="space-y-2">
            <Label htmlFor="gcash-reference">GCash Reference Number</Label>
            <Input
              id="gcash-reference"
              placeholder="Enter reference number (min 10 characters)"
              value={gcashReference}
              onChange={(e) => setGcashReference(e.target.value)}
              className="h-12 min-h-11"
            />
            {gcashReference && !gcashValidation.valid && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {gcashValidation.error}
              </p>
            )}
          </div>
        )}

        {/* Preview New Balance */}
        {parsedAmount > 0 && parsedAmount <= currentBalance && (
          <div className="bg-green-50 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-green-700">New Balance After Payment</span>
              <span className="text-lg font-bold text-green-800">
                {currencySymbol}{(currentBalance - parsedAmount).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full h-12 min-h-11 text-lg font-bold"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>Make Payment</>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
