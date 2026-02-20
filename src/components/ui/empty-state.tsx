import * as React from "react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div role="status" className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
      {icon && (
        <div className="text-muted-foreground mb-4">{icon}</div>
      )}
      <h3 className="font-semibold text-lg tracking-tight text-muted-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-2 max-w-[280px] leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export { EmptyState }
