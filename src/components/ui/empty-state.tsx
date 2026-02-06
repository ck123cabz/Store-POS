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
    <div className={cn("flex flex-col items-center justify-center py-8 text-center", className)}>
      {icon && (
        <div className="text-muted-foreground/30 mb-3">{icon}</div>
      )}
      <p className="font-medium text-muted-foreground">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground/70 mt-1 max-w-[250px]">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export { EmptyState }
