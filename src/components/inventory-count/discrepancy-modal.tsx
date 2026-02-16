"use client"

import { useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

/**
 * Computes the variance color class based on how negative the variance is
 * relative to the expected value.
 *   - >= 0: status-ok (green)
 *   - slightly negative (within 5%): status-warning (amber)
 *   - significantly negative (> 5%): status-critical (red)
 */
function getVarianceColor(variance: number, expected: number): string {
  if (variance >= 0) return "text-status-ok"
  if (expected === 0) return "text-status-critical"
  const pct = Math.abs(variance / expected) * 100
  if (pct <= 5) return "text-status-warning"
  return "text-status-critical"
}

function getVarianceBgColor(variance: number, expected: number): string {
  if (variance >= 0) return "bg-status-ok/10"
  if (expected === 0) return "bg-status-critical/10"
  const pct = Math.abs(variance / expected) * 100
  if (pct <= 5) return "bg-status-warning/10"
  return "bg-status-critical/10"
}

// Inner form component that resets state when key changes
function DiscrepancyForm({
  onConfirm,
  onClose,
  expected,
  unit,
  initialActual,
  initialReason,
  initialNote,
}: {
  onConfirm: (actual: number, reason: string, reasonNote?: string) => void
  onClose: () => void
  expected: number
  unit: string
  initialActual: string
  initialReason: string
  initialNote: string
}) {
  const [actual, setActual] = useState<string>(initialActual)
  const [reason, setReason] = useState<string>(initialReason)
  const [reasonNote, setReasonNote] = useState<string>(initialNote)

  const selectedReason = DISCREPANCY_REASONS.find((r) => r.value === reason)
  const requiresNote = selectedReason?.requiresNote || false

  const canSubmit =
    actual !== "" &&
    reason !== "" &&
    (!requiresNote || reasonNote.trim() !== "")

  const parsedActual = actual !== "" ? parseFloat(actual) : null
  const variance = parsedActual !== null ? parsedActual - expected : null
  const variancePct =
    variance !== null && expected !== 0
      ? (variance / expected) * 100
      : variance !== null && expected === 0
        ? (parsedActual! > 0 ? 100 : 0)
        : null

  function handleSubmit() {
    if (!canSubmit) return
    onConfirm(parseFloat(actual), reason, reasonNote.trim() || undefined)
  }

  return (
    <>
      <div className="space-y-4">
        {/* Actual count input */}
        <div className="space-y-2">
          <Label htmlFor="actual" className="text-sm font-medium">
            Actual Count ({unit})
          </Label>
          <Input
            id="actual"
            type="number"
            step="0.01"
            min="0"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            placeholder="0"
            autoFocus
            className="h-14 text-2xl font-mono tabular-nums text-center"
          />

          {/* Variance display */}
          {variance !== null && (
            <div
              className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 ${getVarianceBgColor(variance, expected)}`}
            >
              <span
                className={`text-sm font-medium font-mono tabular-nums ${getVarianceColor(variance, expected)}`}
              >
                {variance >= 0 ? "+" : ""}
                {Number.isInteger(variance) ? variance : variance.toFixed(2)}{" "}
                {unit}
                {variancePct !== null && (
                  <span className="ml-1 opacity-80">
                    ({variancePct >= 0 ? "+" : ""}
                    {variancePct.toFixed(1)}%)
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Reason pill grid */}
        <div className="space-y-2">
          <Label id="discrepancy-reason-label" className="text-sm font-medium">
            Reason
          </Label>
          <div
            className="grid grid-cols-2 gap-2"
            role="group"
            aria-labelledby="discrepancy-reason-label"
          >
            {DISCREPANCY_REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                className={`inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  reason === r.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background text-foreground hover:bg-muted"
                }`}
                onClick={() => setReason(r.value)}
              >
                <span className="text-base leading-none">{r.icon}</span>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Note field (always visible when reason selected, required for some) */}
        {reason !== "" && (
          <div className="space-y-2">
            <Label htmlFor="note" className="text-sm font-medium">
              Note{requiresNote ? "" : " (optional)"}
            </Label>
            <Textarea
              id="note"
              value={reasonNote}
              onChange={(e) => setReasonNote(e.target.value)}
              placeholder="Add details about this discrepancy..."
              rows={2}
              className="resize-none"
            />
            {requiresNote && reasonNote.trim() === "" && (
              <p className="text-xs text-muted-foreground">
                A note is required for this reason
              </p>
            )}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          Confirm Count
        </Button>
      </DialogFooter>
    </>
  )
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
  // Compute a stable key that changes when modal opens with new data
  // This forces the inner form to remount with fresh state
  const formKey = useMemo(() => {
    if (!open) return "closed"
    return `${ingredientName}-${currentActual}-${currentReason}-${currentNote}`
  }, [open, ingredientName, currentActual, currentReason, currentNote])

  const initialActual =
    currentActual !== null && currentActual !== undefined
      ? String(currentActual)
      : ""
  const initialReason = currentReason || ""
  const initialNote = currentNote || ""

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{ingredientName}</DialogTitle>
          <DialogDescription>
            Expected:{" "}
            <span className="font-mono tabular-nums font-medium">
              {expected}
            </span>{" "}
            {unit}
          </DialogDescription>
        </DialogHeader>

        {open && (
          <DiscrepancyForm
            key={formKey}
            onConfirm={onConfirm}
            onClose={onClose}
            expected={expected}
            unit={unit}
            initialActual={initialActual}
            initialReason={initialReason}
            initialNote={initialNote}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
