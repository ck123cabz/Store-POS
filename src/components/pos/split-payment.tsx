"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  CheckCircle2,
  AlertTriangle,
  Banknote,
  Smartphone,
  Split,
  Delete,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { validateGCashReference, GCASH_REF_MIN_LENGTH } from "@/lib/payment-validation"

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SplitPaymentData {
  cashAmount: number
  cashTendered: number
  cashChange: number
  gcashAmount: number
  gcashReference: string
  totalPaid: number
  isValid: boolean
}

interface SplitPaymentProps {
  total: number
  currencySymbol?: string
  onPaymentDataChange: (data: SplitPaymentData | null) => void
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function SplitPayment({
  total,
  currencySymbol = "₱",
  onPaymentDataChange,
}: SplitPaymentProps) {
  // Cash payment state
  const [cashAmount, setCashAmount] = useState("")
  const [cashTendered, setCashTendered] = useState("")

  // GCash payment state
  const [gcashAmount, setGcashAmount] = useState("")
  const [gcashReference, setGcashReference] = useState("")

  // Parsed numeric values
  const cashAmountNum = useMemo(() => parseFloat(cashAmount) || 0, [cashAmount])
  const cashTenderedNum = useMemo(() => parseFloat(cashTendered) || 0, [cashTendered])
  const gcashAmountNum = useMemo(() => parseFloat(gcashAmount) || 0, [gcashAmount])

  // Calculated values
  const totalSplit = useMemo(
    () => Math.round((cashAmountNum + gcashAmountNum) * 100) / 100,
    [cashAmountNum, gcashAmountNum]
  )
  const shortfall = useMemo(
    () => Math.max(0, Math.round((total - totalSplit) * 100) / 100),
    [total, totalSplit]
  )
  const isTotalCovered = totalSplit >= total

  // Cash change calculation
  const cashChange = useMemo(() => {
    if (cashAmountNum <= 0 || cashTenderedNum < cashAmountNum) return 0
    return Math.round((cashTenderedNum - cashAmountNum) * 100) / 100
  }, [cashAmountNum, cashTenderedNum])

  // Validation
  const gcashRefValidation = useMemo(
    () => validateGCashReference(gcashReference),
    [gcashReference]
  )

  const isValid = useMemo(() => {
    // Must have at least one payment method with positive amount
    if (cashAmountNum <= 0 && gcashAmountNum <= 0) return false
    // Total must cover transaction
    if (!isTotalCovered) return false
    // If cash is used, tendered must cover the cash amount
    if (cashAmountNum > 0 && cashTenderedNum < cashAmountNum) return false
    // If GCash is used, reference must be valid
    if (gcashAmountNum > 0 && !gcashRefValidation.valid) return false
    return true
  }, [cashAmountNum, gcashAmountNum, isTotalCovered, cashTenderedNum, gcashRefValidation.valid])

  // Update parent with payment data
  useEffect(() => {
    const data: SplitPaymentData = {
      cashAmount: cashAmountNum,
      cashTendered: cashTenderedNum,
      cashChange,
      gcashAmount: gcashAmountNum,
      gcashReference: gcashReference.trim(),
      totalPaid: cashTenderedNum + gcashAmountNum,
      isValid,
    }
    onPaymentDataChange(data)
  }, [
    cashAmountNum,
    cashTenderedNum,
    cashChange,
    gcashAmountNum,
    gcashReference,
    isValid,
    onPaymentDataChange,
  ])

  // Numpad handler
  const handleNumpadInput = useCallback(
    (value: string, setter: (fn: (prev: string) => string) => void) => {
      if (value === "clear") {
        setter(() => "")
      } else if (value === "backspace") {
        setter((prev) => prev.slice(0, -1))
      } else if (value === ".") {
        setter((prev) => (prev.includes(".") ? prev : prev + "."))
      } else {
        setter((prev) => prev + value)
      }
    },
    []
  )

  // Quick split actions
  const handleFiftyFifty = useCallback(() => {
    const half = Math.ceil((total / 2) * 100) / 100
    setCashAmount(half.toFixed(2))
    setGcashAmount(half.toFixed(2))
    setCashTendered(half.toFixed(2))
  }, [total])

  const handleCashFirst = useCallback(() => {
    // Default to 100 cash or total if less
    const cashPortion = Math.min(100, total)
    const gcashPortion = Math.max(0, total - cashPortion)
    setCashAmount(cashPortion.toFixed(2))
    setGcashAmount(gcashPortion.toFixed(2))
    setCashTendered(cashPortion.toFixed(2))
  }, [total])

  const handleGcashFirst = useCallback(() => {
    // Default to 100 gcash or total if less
    const gcashPortion = Math.min(100, total)
    const cashPortion = Math.max(0, total - gcashPortion)
    setCashAmount(cashPortion.toFixed(2))
    setGcashAmount(gcashPortion.toFixed(2))
    if (cashPortion > 0) {
      setCashTendered(cashPortion.toFixed(2))
    }
  }, [total])

  // Auto-calculate remaining when one amount is set
  const handleCashAmountChange = useCallback(
    (value: string) => {
      setCashAmount(value)
      const cashVal = parseFloat(value) || 0
      if (cashVal > 0 && cashVal < total) {
        const remaining = Math.round((total - cashVal) * 100) / 100
        setGcashAmount(remaining.toFixed(2))
      }
    },
    [total]
  )

  const handleGcashAmountChange = useCallback(
    (value: string) => {
      setGcashAmount(value)
      const gcashVal = parseFloat(value) || 0
      if (gcashVal > 0 && gcashVal < total) {
        const remaining = Math.round((total - gcashVal) * 100) / 100
        setCashAmount(remaining.toFixed(2))
        setCashTendered(remaining.toFixed(2))
      }
    },
    [total]
  )

  return (
    <div className="space-y-4">
      {/* Header with total */}
      <div className="text-center py-3 bg-muted rounded-xl">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Split className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Split Payment</p>
        </div>
        <p className="text-2xl font-bold text-primary">
          {currencySymbol}{total.toFixed(2)}
        </p>
      </div>

      {/* Quick split buttons */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-11 min-h-11 text-xs sm:text-sm"
          onClick={handleFiftyFifty}
        >
          50/50 Split
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 min-h-11 text-xs sm:text-sm"
          onClick={handleCashFirst}
        >
          <Banknote className="h-4 w-4 mr-1" />
          Cash First
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 min-h-11 text-xs sm:text-sm"
          onClick={handleGcashFirst}
        >
          <Smartphone className="h-4 w-4 mr-1" />
          GCash First
        </Button>
      </div>

      <Separator />

      {/* Cash Section */}
      <div className="space-y-3 p-4 bg-green-50/50 rounded-xl border border-green-200/50">
        <div className="flex items-center gap-2 text-green-700">
          <Banknote className="h-5 w-5" />
          <span className="font-medium">Cash Payment</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Cash Amount */}
          <div>
            <Label className="text-xs text-muted-foreground">Cash Amount</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {currencySymbol}
              </span>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={cashAmount}
                onChange={(e) => handleCashAmountChange(e.target.value)}
                className="pl-7 h-12 min-h-11 text-center font-bold text-lg"
              />
            </div>
          </div>

          {/* Cash Tendered (only when cash amount > 0) */}
          <div className={cn(cashAmountNum <= 0 && "opacity-50")}>
            <Label className="text-xs text-muted-foreground">Cash Tendered</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {currencySymbol}
              </span>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={cashTendered}
                onChange={(e) => setCashTendered(e.target.value)}
                disabled={cashAmountNum <= 0}
                className="pl-7 h-12 min-h-11 text-center font-bold text-lg"
              />
            </div>
          </div>
        </div>

        {/* Cash Change Display */}
        {cashAmountNum > 0 && cashTenderedNum > 0 && (
          <div
            className={cn(
              "text-center py-2 rounded-lg",
              cashTenderedNum >= cashAmountNum ? "bg-blue-100" : "bg-red-100"
            )}
          >
            <p className="text-xs text-muted-foreground">
              {cashTenderedNum >= cashAmountNum ? "Change" : "Need More"}
            </p>
            <p
              className={cn(
                "text-lg font-bold",
                cashTenderedNum >= cashAmountNum ? "text-blue-600" : "text-red-600"
              )}
            >
              {currencySymbol}
              {cashTenderedNum >= cashAmountNum
                ? cashChange.toFixed(2)
                : (cashAmountNum - cashTenderedNum).toFixed(2)}
            </p>
          </div>
        )}

        {/* Cash Numpad */}
        {cashAmountNum > 0 && (
          <div className="grid grid-cols-4 gap-1.5">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "backspace"].map((key) => (
              <Button
                key={key}
                type="button"
                variant="outline"
                className={cn(
                  "h-10 min-h-10 text-base font-medium",
                  key === "backspace" && "text-destructive"
                )}
                onClick={() => handleNumpadInput(key, setCashTendered)}
              >
                {key === "backspace" ? <Delete className="h-4 w-4" /> : key}
              </Button>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* GCash Section */}
      <div className="space-y-3 p-4 bg-blue-50/50 rounded-xl border border-blue-200/50">
        <div className="flex items-center gap-2 text-blue-700">
          <Smartphone className="h-5 w-5" />
          <span className="font-medium">GCash Payment</span>
        </div>

        {/* GCash Amount */}
        <div>
          <Label className="text-xs text-muted-foreground">GCash Amount</Label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {currencySymbol}
            </span>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={gcashAmount}
              onChange={(e) => handleGcashAmountChange(e.target.value)}
              className="pl-7 h-12 min-h-11 text-center font-bold text-lg"
            />
          </div>
        </div>

        {/* GCash Reference (only when gcash amount > 0) */}
        {gcashAmountNum > 0 && (
          <div>
            <Label className="text-xs text-muted-foreground">
              GCash Reference Number <span className="text-destructive">*</span>
            </Label>
            <Input
              type="text"
              placeholder={`Enter reference (min ${GCASH_REF_MIN_LENGTH} chars)`}
              value={gcashReference}
              onChange={(e) => setGcashReference(e.target.value)}
              className={cn(
                "mt-1 h-12 min-h-11",
                gcashReference && !gcashRefValidation.valid && "border-destructive"
              )}
            />
            {gcashReference && !gcashRefValidation.valid && (
              <p className="text-xs text-destructive mt-1">{gcashRefValidation.error}</p>
            )}
          </div>
        )}
      </div>

      <Separator />

      {/* Payment Summary */}
      <div
        className={cn(
          "p-4 rounded-xl border-2 transition-colors",
          isValid
            ? "bg-green-50 border-green-300"
            : shortfall > 0
              ? "bg-amber-50 border-amber-300"
              : "bg-gray-50 border-gray-200"
        )}
      >
        <div className="space-y-2">
          {/* Breakdown */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            {cashAmountNum > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cash:</span>
                <span className="font-medium">
                  {currencySymbol}{cashAmountNum.toFixed(2)}
                </span>
              </div>
            )}
            {gcashAmountNum > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">GCash:</span>
                <span className="font-medium">
                  {currencySymbol}{gcashAmountNum.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          <Separator />

          {/* Total and Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isValid ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : shortfall > 0 ? (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              ) : null}
              <span
                className={cn(
                  "font-medium",
                  isValid ? "text-green-700" : shortfall > 0 ? "text-amber-700" : "text-gray-600"
                )}
              >
                {isValid
                  ? "Total Covered"
                  : shortfall > 0
                    ? `Need ${currencySymbol}${shortfall.toFixed(2)} more`
                    : "Enter payment amounts"}
              </span>
            </div>
            <span className="text-xl font-bold">
              {currencySymbol}{totalSplit.toFixed(2)}
            </span>
          </div>

          {/* Change from cash tendered (if applicable) */}
          {isValid && cashChange > 0 && (
            <div className="text-center pt-2 border-t">
              <p className="text-sm text-muted-foreground">Cash Change to Return</p>
              <p className="text-lg font-bold text-blue-600">
                {currencySymbol}{cashChange.toFixed(2)}
              </p>
            </div>
          )}

          {/* Validation warnings */}
          {!isValid && totalSplit >= total && (
            <div className="text-xs text-amber-600 mt-2">
              {cashAmountNum > 0 && cashTenderedNum < cashAmountNum && (
                <p>Cash tendered must be at least {currencySymbol}{cashAmountNum.toFixed(2)}</p>
              )}
              {gcashAmountNum > 0 && !gcashRefValidation.valid && (
                <p>GCash reference number is required</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
