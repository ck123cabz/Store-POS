"use client"

import { useState, useEffect } from "react"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Combobox } from "@/components/ui/combobox"

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
  const [customerId, setCustomerId] = useState<number>(
    currentCustomerId || 0
  )

  const customerOptions = [
    { value: 0, label: "Walk in customer" },
    ...customers.map((c) => ({ value: c.id, label: c.name })),
  ]

  // Reset form state when modal opens - intentional synchronous setState
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRefNumber("")
      setCustomerId(currentCustomerId || 0)
    }
  }, [open, currentCustomerId])

  const handleConfirm = () => {
    // Must have either ref number or customer
    if (!refNumber && customerId === 0) {
      return
    }

    const customer = customers.find((c) => c.id === customerId)

    onConfirm({
      refNumber,
      customerId: customerId === 0 ? null : customerId,
      customerName: customer?.name || "Walk in customer",
    })
  }

  const isValid = refNumber || customerId !== 0

  return (
    <ResponsiveDialog open={open} onOpenChange={onClose}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Hold Order</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter a reference number or select a customer to hold this order.
          </p>

          <div>
            <Label htmlFor="hold-ref-number">Reference Number</Label>
            <Input
              id="hold-ref-number"
              placeholder="Enter reference..."
              value={refNumber}
              onChange={(e) => setRefNumber(e.target.value)}
              className="h-11 mt-1.5"
              autoFocus
            />
          </div>

          <div className="text-center text-sm text-muted-foreground">OR</div>

          <div>
            <Label>Customer</Label>
            <div className="mt-1.5">
              <Combobox<number>
                options={customerOptions}
                value={customerId}
                onChange={(v) => setCustomerId(v ?? 0)}
                placeholder="Select customer"
                searchPlaceholder="Search customers..."
                emptyMessage="No customers found."
                className="h-11"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 h-11" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1 h-11"
              onClick={handleConfirm}
              disabled={!isValid}
            >
              Hold Order
            </Button>
          </div>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
