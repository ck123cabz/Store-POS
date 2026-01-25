"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DISCREPANCY_REASONS } from "@/types/inventory-count"

interface DiscrepancyModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (actual: number, reason: string, reasonNote?: string) => void
  ingredientName: string
  expected: number
  unit: string
  currentActual?: number | null
  currentReason?: string
  currentNote?: string
}

export function DiscrepancyModal({
  open,
  onClose,
  onConfirm,
  ingredientName,
  expected,
  unit,
  currentActual,
  currentReason,
  currentNote,
}: DiscrepancyModalProps) {
  const [actual, setActual] = useState<string>("")
  const [reason, setReason] = useState<string>("")
  const [reasonNote, setReasonNote] = useState<string>("")

  // Reset form when modal opens with current values
  useEffect(() => {
    if (open) {
      setActual(currentActual !== null && currentActual !== undefined ? String(currentActual) : "")
      setReason(currentReason || "")
      setReasonNote(currentNote || "")
    }
  }, [open, currentActual, currentReason, currentNote])

  const selectedReason = DISCREPANCY_REASONS.find((r) => r.value === reason)
  const requiresNote = selectedReason?.requiresNote || false

  const canSubmit =
    actual !== "" &&
    reason !== "" &&
    (!requiresNote || reasonNote.trim() !== "")

  function handleSubmit() {
    if (!canSubmit) return
    onConfirm(parseFloat(actual), reason, reasonNote.trim() || undefined)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Count Discrepancy</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Ingredient info */}
          <div className="rounded-lg bg-muted p-3">
            <p className="font-medium">{ingredientName}</p>
            <p className="text-sm text-muted-foreground">
              Expected: {expected} {unit}
            </p>
          </div>

          {/* Actual count input */}
          <div className="space-y-2">
            <Label htmlFor="actual">Actual Count</Label>
            <Input
              id="actual"
              type="number"
              step="0.01"
              min="0"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              placeholder={`Enter count in ${unit}`}
              autoFocus
            />
          </div>

          {/* Reason quick picks */}
          <div className="space-y-2">
            <Label>Reason for Discrepancy</Label>
            <div className="grid grid-cols-2 gap-2">
              {DISCREPANCY_REASONS.map((r) => (
                <Button
                  key={r.value}
                  type="button"
                  variant={reason === r.value ? "default" : "outline"}
                  size="sm"
                  className="justify-start"
                  onClick={() => setReason(r.value)}
                >
                  <span className="mr-2">{r.icon}</span>
                  {r.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Note field (required for some reasons) */}
          {(requiresNote || reasonNote) && (
            <div className="space-y-2">
              <Label htmlFor="note">
                {requiresNote ? "Note (required)" : "Note (optional)"}
              </Label>
              <Textarea
                id="note"
                value={reasonNote}
                onChange={(e) => setReasonNote(e.target.value)}
                placeholder="Add details..."
                rows={2}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            Confirm Count
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
