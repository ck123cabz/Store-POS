import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const statusDotVariants = cva(
  "size-2 shrink-0 rounded-full",
  {
    variants: {
      variant: {
        ok: "bg-status-ok",
        warning: "bg-status-warning",
        critical: "bg-status-critical",
        info: "bg-status-info",
        neutral: "bg-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

function StatusDot({
  className,
  variant,
  pulse = false,
  label,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof statusDotVariants> & {
    pulse?: boolean
    label?: string
  }) {
  const dot = (
    <span
      data-slot="status-dot"
      aria-hidden="true"
      className={cn(
        statusDotVariants({ variant }),
        pulse && "animate-status-pulse motion-reduce:animate-none",
        !label && className,
      )}
      {...(!label ? props : {})}
    />
  )

  if (label) {
    return (
      <span
        data-slot="status-dot-label"
        className={cn("inline-flex items-center gap-2 text-sm", className)}
        {...props}
      >
        {dot}
        {label}
      </span>
    )
  }

  return dot
}

export { StatusDot, statusDotVariants }
