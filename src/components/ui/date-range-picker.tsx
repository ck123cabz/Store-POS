"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useIsMobile } from "@/hooks/use-mobile"

interface DateRangePreset {
  label: string
  getValue: () => { from: Date; to: Date }
}

interface DateRangePickerProps {
  from?: Date
  to?: Date
  onChange?: (range: { from?: Date; to?: Date }) => void
  presets?: DateRangePreset[]
  placeholder?: string
  className?: string
  disabled?: boolean
  align?: "start" | "center" | "end"
}

function DateRangePicker({
  from,
  to,
  onChange,
  presets,
  placeholder = "Pick a date range",
  className,
  disabled,
  align = "start",
}: DateRangePickerProps) {
  const isMobile = useIsMobile()
  const [open, setOpen] = React.useState(false)

  const range: DateRange | undefined =
    from || to ? { from, to } : undefined

  function handleSelect(selected: DateRange | undefined) {
    onChange?.({ from: selected?.from, to: selected?.to })
  }

  function handlePreset(preset: DateRangePreset) {
    const { from: presetFrom, to: presetTo } = preset.getValue()
    onChange?.({ from: presetFrom, to: presetTo })
    setOpen(false)
  }

  const displayValue =
    from && to
      ? `${format(from, "MMM d, yyyy")} – ${format(to, "MMM d, yyyy")}`
      : from
        ? `${format(from, "MMM d, yyyy")} – ...`
        : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !displayValue && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="size-4 shrink-0" />
          <span className="truncate">{displayValue ?? placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align={align}
        sideOffset={4}
      >
        <div className="flex">
          {presets && presets.length > 0 && (
            <div className="flex flex-col gap-1 border-r p-3">
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="justify-start text-xs"
                  onClick={() => handlePreset(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          )}
          <div className="p-3">
            <Calendar
              mode="range"
              selected={range}
              onSelect={handleSelect}
              numberOfMonths={isMobile ? 1 : 2}
              defaultMonth={from}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { DateRangePicker }
export type { DateRangePickerProps, DateRangePreset }
