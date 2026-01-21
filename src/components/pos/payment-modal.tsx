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
  }) => void
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

  const paid = parseFloat(paidAmount) || 0
  const change = paid - total

  useEffect(() => {
    if (open) {
      setPaidAmount("")
      setPaymentInfo("")
      setPaymentType("Cash")
    }
  }, [open])

  const handleConfirm = () => {
    if (paid < total) return

    onConfirm({
      paidAmount: paid,
      changeAmount: change,
      paymentType,
      paymentInfo,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Payment</DialogTitle>
        </DialogHeader>

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
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirm}
              disabled={paid < total}
            >
              Confirm Payment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
