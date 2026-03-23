"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertTriangle, AlertCircle } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { VALID_VOID_REASONS } from "@/lib/void-constants"

interface TransactionVoidModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (reason: string, customReason?: string) => Promise<void>
  isLoading: boolean
  error: string | null
  orderNumber?: number
}

export function TransactionVoidModal({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  error,
  orderNumber,
}: TransactionVoidModalProps) {
  const [reason, setReason] = useState("")
  const [customReason, setCustomReason] = useState("")
  const [localError, setLocalError] = useState<string | null>(null)

  const displayError = error || localError

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setReason("")
      setCustomReason("")
      setLocalError(null)
    }
    onOpenChange(nextOpen)
  }

  async function handleConfirm() {
    if (!reason) {
      setLocalError("Please select a reason")
      return
    }
    if (reason === "Other" && !customReason.trim()) {
      setLocalError("Please provide a custom reason")
      return
    }
    setLocalError(null)
    await onConfirm(reason, reason === "Other" ? customReason : undefined)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Void Transaction {orderNumber ? `#${orderNumber}` : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. The transaction will be marked as voided,
            stock and ingredients will be restored, and it will be excluded from revenue calculations.
          </p>

          <div className="space-y-2">
            <Label>Reason for voiding</Label>
            <Select
              value={reason}
              onValueChange={(value) => {
                setReason(value)
                setLocalError(null)
              }}
            >
              <SelectTrigger data-testid="void-reason-select" aria-label="Reason for voiding">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {VALID_VOID_REASONS.map((r) => (
                  <SelectItem
                    key={r}
                    value={r}
                    data-testid={`void-reason-${r.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {reason === "Other" && (
            <div className="space-y-2">
              <Label>Custom reason</Label>
              <Textarea
                placeholder="Please describe the reason..."
                value={customReason}
                onChange={(e) => {
                  setCustomReason(e.target.value)
                  setLocalError(null)
                }}
              />
            </div>
          )}

          {displayError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{displayError}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              data-testid="confirm-void-button"
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? "Voiding..." : "Confirm Void"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
