"use client"

import { useState, useEffect } from "react"
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
  CreditCard,
  Receipt,
  Delete,
  ArrowRight,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface PaymentModalProps {
  open: boolean
  onClose: () => void
  total: number
  currencySymbol: string
  onConfirm: (data: {
    paidAmount: number
    changeAmount: number
    paymentType: string
    paymentInfo: string
  }) => Promise<number | null>
}

export function PaymentModal({
  open,
  onClose,
  total,
  currencySymbol,
  onConfirm,
}: PaymentModalProps) {
  const [paymentType, setPaymentType] = useState("Cash")
  const [paidAmount, setPaidAmount] = useState("")
  const [paymentInfo, setPaymentInfo] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentComplete, setPaymentComplete] = useState(false)
  const [lastTransactionId, setLastTransactionId] = useState<number | null>(null)
  const [showEmailInput, setShowEmailInput] = useState(false)
  const [emailAddress, setEmailAddress] = useState("")
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  const paid = parseFloat(paidAmount) || 0
  const change = paid - total

  // Quick amount buttons
  const quickAmounts = [
    { label: "Exact", value: total },
    { label: `${currencySymbol}50`, value: 50 },
    { label: `${currencySymbol}100`, value: 100 },
    { label: `${currencySymbol}200`, value: 200 },
    { label: `${currencySymbol}500`, value: 500 },
    { label: `${currencySymbol}1000`, value: 1000 },
  ]

  useEffect(() => {
    if (open) {
      setPaidAmount("")
      setPaymentInfo("")
      setPaymentType("Cash")
      setIsProcessing(false)
      setPaymentComplete(false)
      setLastTransactionId(null)
      setShowEmailInput(false)
      setEmailAddress("")
      setIsSendingEmail(false)
    }
  }, [open])

  const handleNumpadInput = (value: string) => {
    if (value === "clear") {
      setPaidAmount("")
    } else if (value === "backspace") {
      setPaidAmount((prev) => prev.slice(0, -1))
    } else if (value === ".") {
      if (!paidAmount.includes(".")) {
        setPaidAmount((prev) => prev + ".")
      }
    } else {
      setPaidAmount((prev) => prev + value)
    }
  }

  const handleConfirm = async () => {
    if (paid < total || isProcessing) return

    setIsProcessing(true)
    try {
      const transactionId = await onConfirm({
        paidAmount: paid,
        changeAmount: change,
        paymentType,
        paymentInfo,
      })

      if (transactionId) {
        setLastTransactionId(transactionId)
        setPaymentComplete(true)
      }
    } catch {
      // Error handling is done in parent
    } finally {
      setIsProcessing(false)
    }
  }

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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
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

        {paymentComplete && lastTransactionId ? (
          <div className="p-6 space-y-6">
            {/* Success Message */}
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
                {change > 0 && (
                  <p className="text-blue-600 font-medium">
                    Change: {currencySymbol}{change.toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            {/* Receipt Options */}
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full h-12"
                onClick={handleDownloadReceipt}
              >
                <Download className="h-5 w-5 mr-2" />
                Download Receipt
              </Button>

              {!showEmailInput ? (
                <Button
                  variant="outline"
                  className="w-full h-12"
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
                      className="h-12 px-6"
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

            <Button className="w-full h-14 text-lg font-bold" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
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
            <Tabs value={paymentType} onValueChange={setPaymentType} className="px-6">
              <TabsList className="grid w-full grid-cols-3 h-12">
                <TabsTrigger value="Cash" className="gap-2 text-sm">
                  <Banknote className="h-4 w-4" />
                  Cash
                </TabsTrigger>
                <TabsTrigger value="Card" className="gap-2 text-sm">
                  <CreditCard className="h-4 w-4" />
                  Card
                </TabsTrigger>
                <TabsTrigger value="Cheque" className="gap-2 text-sm">
                  <Receipt className="h-4 w-4" />
                  Cheque
                </TabsTrigger>
              </TabsList>

              <TabsContent value="Cash" className="mt-4 space-y-4">
                {/* Amount input */}
                <div>
                  <Label className="text-sm text-muted-foreground">Amount Received</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="text-2xl font-bold h-14 text-center mt-1"
                    autoFocus
                  />
                </div>

                {/* Quick amount buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {quickAmounts.map((item) => (
                    <Button
                      key={item.label}
                      variant="outline"
                      className="h-11"
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
                          "h-12 text-lg font-medium",
                          key === "backspace" && "text-destructive"
                        )}
                        onClick={() => handleNumpadInput(key)}
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

              <TabsContent value="Card" className="mt-4 space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Amount</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="text-xl font-bold h-12 text-center mt-1"
                  />
                </div>
                <Button
                  variant="outline"
                  className="w-full h-11"
                  onClick={() => setPaidAmount(total.toString())}
                >
                  Use exact amount
                </Button>
                <div>
                  <Label className="text-sm text-muted-foreground">Reference (optional)</Label>
                  <Input
                    placeholder="Card reference or last 4 digits..."
                    value={paymentInfo}
                    onChange={(e) => setPaymentInfo(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </TabsContent>

              <TabsContent value="Cheque" className="mt-4 space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Amount</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="text-xl font-bold h-12 text-center mt-1"
                  />
                </div>
                <Button
                  variant="outline"
                  className="w-full h-11"
                  onClick={() => setPaidAmount(total.toString())}
                >
                  Use exact amount
                </Button>
                <div>
                  <Label className="text-sm text-muted-foreground">Cheque Number</Label>
                  <Input
                    placeholder="Enter cheque number..."
                    value={paymentInfo}
                    onChange={(e) => setPaymentInfo(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Change display */}
            {paid > 0 && (
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
              <Button variant="outline" className="flex-1 h-12" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                className="flex-1 h-12 text-lg font-bold gap-2"
                onClick={handleConfirm}
                disabled={paid < total || isProcessing}
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
