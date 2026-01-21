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
import { CheckCircle2, Download, Mail, Loader2 } from "lucide-react"
import { toast } from "sonner"

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

    // Validate email
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
      // Reset state when closing after successful payment
      setPaymentComplete(false)
      setLastTransactionId(null)
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {paymentComplete ? "Payment Complete" : "Payment"}
          </DialogTitle>
        </DialogHeader>

        {paymentComplete && lastTransactionId ? (
          <div className="space-y-6">
            {/* Success Message */}
            <div className="text-center py-6">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <p className="text-xl font-bold text-green-600 mb-2">
                Payment Successful!
              </p>
              <p className="text-gray-500">
                Order #{lastTransactionId} completed
              </p>
              <p className="text-2xl font-bold mt-2">
                {currencySymbol}{total.toFixed(2)}
              </p>
              {change > 0 && (
                <p className="text-blue-600 mt-1">
                  Change: {currencySymbol}{change.toFixed(2)}
                </p>
              )}
            </div>

            {/* Receipt Options */}
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleDownloadReceipt}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Receipt
              </Button>

              {!showEmailInput ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowEmailInput(true)}
                >
                  <Mail className="h-4 w-4 mr-2" />
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
                    />
                    <Button
                      onClick={handleEmailReceipt}
                      disabled={!emailAddress || isSendingEmail}
                    >
                      {isSendingEmail ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
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

            {/* Done Button */}
            <Button className="w-full" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="text-3xl font-bold text-green-600">
                {currencySymbol}{total.toFixed(2)}
              </p>
            </div>

            <Tabs value={paymentType} onValueChange={setPaymentType}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="Cash">Cash</TabsTrigger>
                <TabsTrigger value="Card">Card</TabsTrigger>
                <TabsTrigger value="Cheque">Cheque</TabsTrigger>
              </TabsList>

              <TabsContent value="Cash" className="space-y-4">
                <div>
                  <Label>Amount Received</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="text-lg"
                    autoFocus
                  />
                </div>
              </TabsContent>

              <TabsContent value="Card" className="space-y-4">
                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="text-lg"
                  />
                </div>
                <div>
                  <Label>Reference (optional)</Label>
                  <Input
                    placeholder="Card reference..."
                    value={paymentInfo}
                    onChange={(e) => setPaymentInfo(e.target.value)}
                  />
                </div>
              </TabsContent>

              <TabsContent value="Cheque" className="space-y-4">
                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="text-lg"
                  />
                </div>
                <div>
                  <Label>Cheque Number</Label>
                  <Input
                    placeholder="Cheque number..."
                    value={paymentInfo}
                    onChange={(e) => setPaymentInfo(e.target.value)}
                  />
                </div>
              </TabsContent>
            </Tabs>

            {paid > 0 && (
              <div className="text-center py-2 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-500">Change</p>
                <p className={`text-2xl font-bold ${change >= 0 ? "text-blue-600" : "text-red-600"}`}>
                  {currencySymbol}{Math.abs(change).toFixed(2)}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirm}
                disabled={paid < total || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Confirm Payment"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
