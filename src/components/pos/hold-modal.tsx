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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Customer {
  id: number
  name: string
}

interface HoldModalProps {
  open: boolean
  onClose: () => void
  customers: Customer[]
  currentCustomerId: number | null
  onConfirm: (data: {
    refNumber: string
    customerId: number | null
    customerName: string
  }) => void
}

export function HoldModal({
  open,
  onClose,
  customers,
  currentCustomerId,
  onConfirm,
}: HoldModalProps) {
  const [refNumber, setRefNumber] = useState("")
  const [customerId, setCustomerId] = useState<string>(
    currentCustomerId?.toString() || "0"
  )

  // Reset form state when modal opens - intentional synchronous setState
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRefNumber("")
      setCustomerId(currentCustomerId?.toString() || "0")
    }
  }, [open, currentCustomerId])

  const handleConfirm = () => {
    // Must have either ref number or customer
    if (!refNumber && customerId === "0") {
      return
    }

    const customer = customers.find((c) => c.id === parseInt(customerId))

    onConfirm({
      refNumber,
      customerId: customerId === "0" ? null : parseInt(customerId),
      customerName: customer?.name || "Walk in customer",
    })
  }

  const isValid = refNumber || customerId !== "0"

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hold Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter a reference number or select a customer to hold this order.
          </p>

          <div>
            <Label>Reference Number</Label>
            <Input
              placeholder="Enter reference..."
              value={refNumber}
              onChange={(e) => setRefNumber(e.target.value)}
              autoFocus
            />
          </div>

          <div className="text-center text-sm text-muted-foreground">OR</div>

          <div>
            <Label>Customer</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Walk in customer</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id.toString()}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirm}
              disabled={!isValid}
            >
              Hold Order
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
