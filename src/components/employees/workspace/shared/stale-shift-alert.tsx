"use client"

import { AlertTriangle } from "lucide-react"
import { AlertBanner } from "@/components/ui/alert-banner"
import { Button } from "@/components/ui/button"

interface StaleShiftAlertProps {
  employeeName: string
  clockInTime: string
  onResolve: () => void
}

function StaleShiftAlert({ employeeName, clockInTime, onResolve }: StaleShiftAlertProps) {
  return (
    <AlertBanner variant="warning" icon={<AlertTriangle className="size-4" />}>
      <div className="flex items-center justify-between gap-2">
        <span>
          <strong>{employeeName}</strong> has an open shift from{" "}
          <span className="font-mono tabular-nums">{clockInTime}</span> that was never clocked out.
        </span>
        <Button size="sm" variant="outline" onClick={onResolve} className="shrink-0">
          Resolve
        </Button>
      </div>
    </AlertBanner>
  )
}

export { StaleShiftAlert }
export type { StaleShiftAlertProps }
