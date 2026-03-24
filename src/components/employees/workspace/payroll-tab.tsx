"use client"

import { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { StatCard } from "./shared/stat-card"
import { EmptyState } from "@/components/ui/empty-state"
import { formatCurrency } from "@/lib/format-currency"
import { useSettings } from "@/hooks/use-settings"
import { Wallet } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Employee {
  id: number
  firstName: string
  lastName: string
  position: string
  hourlyRate: number | string
  employmentStatus: string
}

interface PayrollRow {
  employee: Employee
  hours: number
  calculatedPay: number
  paidAmount: number
  status: "Paid" | "Partial" | "Pending"
}

const dateRangePresets = [
  {
    label: "Last 7 days",
    getValue: () => {
      const to = new Date(); const from = new Date()
      from.setDate(from.getDate() - 7); from.setHours(0, 0, 0, 0)
      return { from, to }
    },
  },
  {
    label: "Last 14 days",
    getValue: () => {
      const to = new Date(); const from = new Date()
      from.setDate(from.getDate() - 14); from.setHours(0, 0, 0, 0)
      return { from, to }
    },
  },
  {
    label: "Last 30 days",
    getValue: () => {
      const to = new Date(); const from = new Date()
      from.setDate(from.getDate() - 30); from.setHours(0, 0, 0, 0)
      return { from, to }
    },
  },
  {
    label: "This Month",
    getValue: () => {
      const to = new Date()
      const from = new Date(to.getFullYear(), to.getMonth(), 1)
      return { from, to }
    },
  },
]

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase()
}

function calcHours(clockIn: string, clockOut: string | null, breakMinutes: number) {
  if (!clockOut) return 0
  const ms = new Date(clockOut).getTime() - new Date(clockIn).getTime()
  return Math.max(0, ms / (1000 * 60 * 60) - breakMinutes / 60)
}

export default function PayrollTab() {
  const { currencySymbol } = useSettings()
  const fmtCurrency = (v: string | number | null | undefined) => formatCurrency(v, currencySymbol)

  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - 14)
    from.setHours(0, 0, 0, 0)
    return { from, to }
  })

  const [rows, setRows] = useState<PayrollRow[]>([])
  const [loading, setLoading] = useState(true)

  // Payment dialog
  const [paymentRow, setPaymentRow] = useState<PayrollRow | null>(null)
  const [paymentForm, setPaymentForm] = useState({
    paidAmount: "",
    paymentMethod: "Cash",
    notes: "",
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchPayrollData = useCallback(async () => {
    setLoading(true)
    try {
      const from = dateRange.from.toISOString()
      const to = dateRange.to.toISOString()

      // Fetch employees
      const empRes = await fetch("/api/employees")
      if (!empRes.ok) return
      const employees: Employee[] = await empRes.json()
      const activeEmployees = employees.filter((e) => e.employmentStatus !== "Terminated")

      // Fetch shifts and payments for each employee in parallel
      const payrollData = await Promise.all(
        activeEmployees.map(async (emp) => {
          const [shiftsRes, paymentsRes] = await Promise.all([
            fetch(`/api/employees/${emp.id}/shifts?from=${from}&to=${to}`),
            fetch(`/api/employees/${emp.id}/payments?from=${from}&to=${to}`),
          ])

          const shifts = shiftsRes.ok ? await shiftsRes.json() : []
          const payments = paymentsRes.ok ? await paymentsRes.json() : []

          const hours = shifts.reduce(
            (acc: number, s: { clockIn: string; clockOut: string | null; breakMinutes: number }) =>
              acc + calcHours(s.clockIn, s.clockOut, s.breakMinutes),
            0
          )

          const calculatedPay = hours * Number(emp.hourlyRate || 0)
          const paidAmount = payments.reduce(
            (acc: number, p: { paidAmount: number | string }) => acc + Number(p.paidAmount || 0),
            0
          )

          let status: "Paid" | "Partial" | "Pending" = "Pending"
          if (paidAmount >= calculatedPay && calculatedPay > 0) status = "Paid"
          else if (paidAmount > 0) status = "Partial"

          return { employee: emp, hours, calculatedPay, paidAmount, status }
        })
      )

      // Sort: pending first, then by name
      payrollData.sort((a, b) => {
        const statusOrder = { Pending: 0, Partial: 1, Paid: 2 }
        const diff = statusOrder[a.status] - statusOrder[b.status]
        if (diff !== 0) return diff
        return `${a.employee.firstName} ${a.employee.lastName}`.localeCompare(
          `${b.employee.firstName} ${b.employee.lastName}`
        )
      })

      setRows(payrollData)
    } catch {
      /* non-critical */
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    fetchPayrollData()
  }, [fetchPayrollData])

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!paymentRow) return
    setSubmitting(true)
    try {
      const body = {
        periodStart: dateRange.from.toISOString().split("T")[0],
        periodEnd: dateRange.to.toISOString().split("T")[0],
        paidAmount: parseFloat(paymentForm.paidAmount) || 0,
        paymentMethod: paymentForm.paymentMethod,
        notes: paymentForm.notes,
      }
      const res = await fetch(`/api/employees/${paymentRow.employee.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast.success("Payment recorded")
      setPaymentRow(null)
      fetchPayrollData()
    } catch {
      toast.error("Failed to record payment")
    } finally {
      setSubmitting(false)
    }
  }

  function openPaymentDialog(row: PayrollRow) {
    setPaymentRow(row)
    setPaymentForm({
      paidAmount: (row.calculatedPay - row.paidAmount).toFixed(2),
      paymentMethod: "Cash",
      notes: "",
    })
  }

  // Summary calculations
  const totalHours = rows.reduce((acc, r) => acc + r.hours, 0)
  const totalLaborCost = rows.reduce((acc, r) => acc + r.calculatedPay, 0)
  const totalPaid = rows.reduce((acc, r) => acc + r.paidAmount, 0)
  const totalPending = totalLaborCost - totalPaid

  function getPaymentStatusBadge(status: string) {
    switch (status) {
      case "Paid":
        return <Badge className="border-transparent bg-status-ok/15 text-status-ok">Paid</Badge>
      case "Partial":
        return <Badge className="border-transparent bg-status-warning/15 text-status-warning">Partial</Badge>
      case "Pending":
        return <Badge className="border-transparent bg-status-info/15 text-status-info">Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Date Range */}
      <DateRangePicker
        from={dateRange.from}
        to={dateRange.to}
        onChange={(range) => {
          if (range?.from && range?.to) setDateRange({ from: range.from, to: range.to })
        }}
        presets={dateRangePresets}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Hours" value={loading ? "\u2026" : totalHours.toFixed(1)} />
        <StatCard label="Labor Cost" value={loading ? "\u2026" : fmtCurrency(totalLaborCost)} />
        <StatCard
          label="Paid"
          value={loading ? "\u2026" : fmtCurrency(totalPaid)}
          borderColor="var(--status-ok)"
        />
        <StatCard
          label="Pending"
          value={loading ? "\u2026" : fmtCurrency(Math.max(0, totalPending))}
          borderColor="var(--status-warning)"
        />
      </div>

      {/* Payroll Table */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading payroll data...</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-8 w-8" />}
          title="No payroll data"
          description="No employees with shifts in the selected period."
        />
      ) : (
        <Card className="p-0 shadow-none overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60">
                <th className="text-left p-3 font-medium text-muted-foreground">Employee</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Position</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Hours</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Calculated Pay</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.employee.id}
                  className="border-b border-border/40 hover:bg-muted/40 cursor-pointer transition-colors"
                  onClick={() => openPaymentDialog(row)}
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Avatar size="sm">
                        <AvatarFallback>
                          {getInitials(row.employee.firstName, row.employee.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {row.employee.firstName} {row.employee.lastName}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{row.employee.position || "\u2014"}</td>
                  <td className="p-3 text-right font-mono tabular-nums">{row.hours.toFixed(1)}</td>
                  <td className="p-3 text-right font-mono tabular-nums">{fmtCurrency(row.calculatedPay)}</td>
                  <td className="p-3 text-center">{getPaymentStatusBadge(row.status)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border/60 font-medium">
                <td className="p-3 text-muted-foreground" colSpan={2}>Total</td>
                <td className="p-3 text-right font-mono tabular-nums">{totalHours.toFixed(1)}</td>
                <td className="p-3 text-right font-mono tabular-nums">{fmtCurrency(totalLaborCost)}</td>
                <td className="p-3"></td>
              </tr>
            </tfoot>
          </table>
        </Card>
      )}

      {/* Record Payment Dialog */}
      <Dialog open={!!paymentRow} onOpenChange={() => setPaymentRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Record Payment — {paymentRow?.employee.firstName} {paymentRow?.employee.lastName}
            </DialogTitle>
          </DialogHeader>
          {paymentRow && (
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  Period: {dateRange.from.toLocaleDateString()} &ndash; {dateRange.to.toLocaleDateString()}
                </p>
                <p>
                  Hours: <span className="font-mono tabular-nums">{paymentRow.hours.toFixed(1)}</span>
                  {" \u00B7 "}
                  Calculated: <span className="font-mono tabular-nums">{fmtCurrency(paymentRow.calculatedPay)}</span>
                  {paymentRow.paidAmount > 0 && (
                    <>
                      {" \u00B7 "}
                      Already paid: <span className="font-mono tabular-nums">{fmtCurrency(paymentRow.paidAmount)}</span>
                    </>
                  )}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payrollAmount">Amount</Label>
                  <Input
                    id="payrollAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentForm.paidAmount}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, paidAmount: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payrollMethod">Method</Label>
                  <Select
                    value={paymentForm.paymentMethod}
                    onValueChange={(val) => setPaymentForm((p) => ({ ...p, paymentMethod: val }))}
                  >
                    <SelectTrigger id="payrollMethod"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payrollNotes">Notes</Label>
                <Textarea
                  id="payrollNotes"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setPaymentRow(null)}>Cancel</Button>
                <Button type="submit" disabled={submitting}>{submitting ? "Recording..." : "Record Payment"}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
