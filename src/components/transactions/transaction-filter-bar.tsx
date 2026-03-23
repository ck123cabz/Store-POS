"use client"

import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Search } from "lucide-react"
import {
  QUICK_FILTER_OPTIONS,
  type QuickFilter,
  type TransactionFilters,
  type User,
} from "@/hooks/use-transactions"

interface TransactionFilterBarProps {
  activeQuickFilter: QuickFilter | null
  onQuickFilterChange: (filter: QuickFilter | null) => void
  filters: TransactionFilters
  onFiltersChange: (filters: Partial<TransactionFilters>) => void
  users: User[]
}

export function TransactionFilterBar({
  activeQuickFilter,
  onQuickFilterChange,
  filters,
  onFiltersChange,
  users,
}: TransactionFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Segmented time control */}
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={activeQuickFilter || ""}
        onValueChange={(v) => onQuickFilterChange((v as QuickFilter) || null)}
        aria-label="Quick date filters"
      >
        {QUICK_FILTER_OPTIONS.map((o) => (
          <ToggleGroupItem key={o.value} value={o.value}>
            {o.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="h-6 w-px bg-border hidden md:block" />

      {/* Status filter */}
      <Select
        value={filters.status || "all"}
        onValueChange={(v) => onFiltersChange({ status: v === "all" ? "" : v })}
      >
        <SelectTrigger className="w-[130px] h-8 text-sm" aria-label="Filter by status">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="1">Completed</SelectItem>
          <SelectItem value="0">Pending</SelectItem>
        </SelectContent>
      </Select>

      {/* Cashier filter */}
      <Select
        value={filters.userId || "all"}
        onValueChange={(v) => onFiltersChange({ userId: v === "all" ? "" : v })}
      >
        <SelectTrigger className="w-[140px] h-8 text-sm" aria-label="Filter by cashier">
          <SelectValue placeholder="Cashier" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Cashiers</SelectItem>
          {users.map((u) => (
            <SelectItem key={u.id} value={u.id.toString()}>
              {u.fullname}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search orders..."
          value={filters.searchQuery}
          onChange={(e) => onFiltersChange({ searchQuery: e.target.value })}
          className="pl-8 h-8 w-[180px] text-sm"
        />
      </div>

      {/* Include voided checkbox */}
      <div className="flex items-center gap-1.5">
        <Checkbox
          id="includeVoided"
          checked={filters.includeVoided}
          onCheckedChange={(checked) => onFiltersChange({ includeVoided: checked === true })}
          className="h-3.5 w-3.5"
        />
        <Label htmlFor="includeVoided" className="text-xs cursor-pointer text-muted-foreground">
          Voided
        </Label>
      </div>
    </div>
  )
}
