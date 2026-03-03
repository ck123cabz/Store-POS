import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const timelineDotVariants = cva(
  "relative z-10 size-3 shrink-0 rounded-full border-2 border-background",
  {
    variants: {
      status: {
        ok: "bg-status-ok",
        warning: "bg-status-warning",
        critical: "bg-status-critical",
        info: "bg-status-info",
        neutral: "bg-muted-foreground",
      },
    },
    defaultVariants: {
      status: "neutral",
    },
  }
)

function Timeline({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="timeline"
      className={cn("relative flex flex-col", className)}
      {...props}
    />
  )
}

function TimelineItem({
  className,
  status,
  children,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof timelineDotVariants>) {
  return (
    <div
      data-slot="timeline-item"
      className={cn(
        "relative flex gap-3 pb-6 last:pb-0",
        // vertical line connecting items
        "before:absolute before:left-[5px] before:top-3 before:h-full before:w-px before:bg-border last:before:hidden",
        className
      )}
      {...props}
    >
      <span className={cn(timelineDotVariants({ status }), "mt-1")} />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

function TimelineTimestamp({
  className,
  ...props
}: React.ComponentProps<"time">) {
  return (
    <time
      data-slot="timeline-timestamp"
      className={cn("text-xs text-muted-foreground font-mono tabular-nums", className)}
      {...props}
    />
  )
}

function TimelineContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="timeline-content"
      className={cn("text-sm", className)}
      {...props}
    />
  )
}

export { Timeline, TimelineItem, TimelineTimestamp, TimelineContent }
