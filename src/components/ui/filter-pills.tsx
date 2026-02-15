"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

interface FilterPillOption {
  label: string
  value: string
  count?: number
}

interface FilterPillsProps {
  options: FilterPillOption[]
  value: string | null
  onChange: (value: string | null) => void
  className?: string
  ariaLabel?: string
}

function FilterPills({
  options,
  value,
  onChange,
  className,
  ariaLabel = "Filters",
}: FilterPillsProps) {
  return (
    <div
      data-slot="filter-pills"
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "flex gap-2 overflow-x-auto scrollbar-hide",
        className,
      )}
    >
      {options.map((option) => {
        const isActive = value === option.value

        return (
          <button
            key={option.value}
            type="button"
            role="button"
            aria-pressed={isActive}
            onClick={() => onChange(isActive ? null : option.value)}
            className={cn(
              "inline-flex shrink-0 items-center h-7 rounded-full px-3 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
            )}
          >
            {option.label}
            {option.count != null && (
              <span className="ml-1.5 text-xs opacity-70">
                {option.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export { FilterPills }
export type { FilterPillOption, FilterPillsProps }
