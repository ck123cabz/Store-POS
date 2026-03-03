"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const alertBannerVariants = cva(
  "relative flex w-full items-center gap-3 rounded-md border px-4 py-3 text-sm",
  {
    variants: {
      variant: {
        ok: "border-status-ok/30 bg-status-ok/10 text-status-ok",
        warning: "border-status-warning/30 bg-status-warning/10 text-status-warning",
        critical: "border-status-critical/30 bg-status-critical/10 text-status-critical",
        info: "border-status-info/30 bg-status-info/10 text-status-info",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
)

interface AlertBannerProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof alertBannerVariants> {
  icon?: React.ReactNode
  dismissible?: boolean
  onDismiss?: () => void
  sticky?: boolean
}

function AlertBanner({
  className,
  variant,
  icon,
  dismissible,
  onDismiss,
  sticky,
  children,
  ...props
}: AlertBannerProps) {
  const [dismissed, setDismissed] = React.useState(false)

  if (dismissed) return null

  return (
    <div
      data-slot="alert-banner"
      role="alert"
      className={cn(
        alertBannerVariants({ variant }),
        sticky && "sticky top-0 z-40",
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <div className="flex-1 min-w-0">{children}</div>
      {dismissible && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => {
            setDismissed(true)
            onDismiss?.()
          }}
          className="shrink-0 rounded-sm p-0.5 opacity-70 hover:opacity-100 transition-opacity"
        >
          <XIcon className="size-4" />
        </button>
      )}
    </div>
  )
}

export { AlertBanner, alertBannerVariants }
export type { AlertBannerProps }
