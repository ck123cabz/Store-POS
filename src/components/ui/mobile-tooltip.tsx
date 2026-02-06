"use client"

import * as React from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface MobileTooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
  className?: string
}

/**
 * Mobile-friendly tooltip that works on both hover and click
 * - Desktop: Shows on hover
 * - Mobile: Shows on click/tap
 */
export function MobileTooltip({
  children,
  content,
  side = "top",
  className,
}: MobileTooltipProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            className="inline-flex items-center justify-center"
          >
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className={className}>
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
