"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import { SlidersHorizontal } from "lucide-react"
import type { TransactionFilters, User } from "@/hooks/use-transactions"

interface TransactionFilterSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: TransactionFilters
  onApply: (filters: Partial<TransactionFilters>) => void
  users: User[]
}

export function TransactionFilterSheet({
  open,
  onOpenChange,
  filters,
  onApply,
  users,
}: TransactionFilterSheetProps) {
  // Local draft state — only applied on "Apply"
  const [draft, setDraft] = useState<Partial<TransactionFilters>>({})

  // Merge current filters with draft for display
  const current = { ...filters, ...draft }

  function handleApply() {
    onApply(draft)
    setDraft({})
    onOpenChange(false)
  }

  function handleClear() {
    const cleared: Partial<TransactionFilters> = {
      status: "",
      userId: "",
      includeVoided: false,
      tillNumber: "",
    }
    onApply(cleared)
    setDraft({})
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 py-4">
          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={current.status || "all"}
              onValueChange={(v) => setDraft({ ...draft, status: v === "all" ? "" : v })}
            >
              <SelectTrigger aria-label="Filter by status">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="1">Completed</SelectItem>
                <SelectItem value="0">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cashier */}
          <div className="space-y-2">
            <Label>Cashier</Label>
            <Select
              value={current.userId || "all"}
              onValueChange={(v) => setDraft({ ...draft, userId: v === "all" ? "" : v })}
            >
              <SelectTrigger aria-label="Filter by cashier">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id.toString()}>
                    {u.fullname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Include voided */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="mobile-includeVoided"
              checked={current.includeVoided}
              onCheckedChange={(checked) =>
                setDraft({ ...draft, includeVoided: checked === true })
              }
            />
            <Label htmlFor="mobile-includeVoided" className="text-sm cursor-pointer">
              Include voided transactions
            </Label>
          </div>
        </div>

        <SheetFooter className="flex-row gap-2">
          <Button variant="outline" onClick={handleClear} className="flex-1">
            Clear
          </Button>
          <Button onClick={handleApply} className="flex-1">
            Apply
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
