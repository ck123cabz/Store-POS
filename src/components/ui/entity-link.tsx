import * as React from "react"

import { cn } from "@/lib/utils"

type EntityType = "product" | "customer" | "ingredient" | "transaction"

interface EntityLinkProps
  extends Omit<React.ComponentProps<"button">, "onClick"> {
  entityType: EntityType
  entityId: number
  onEntityClick?: (entityType: EntityType, entityId: number) => void
}

function EntityLink({
  className,
  entityType,
  entityId,
  onEntityClick,
  children,
  ...props
}: EntityLinkProps) {
  return (
    <button
      type="button"
      role="link"
      data-slot="entity-link"
      data-entity-type={entityType}
      aria-label={`View ${typeof children === "string" ? children : entityType} details`}
      className={cn(
        "inline font-medium text-foreground bg-transparent border-none p-0 cursor-pointer hover:underline active:scale-[0.98] transition-transform outline-none focus-visible:underline focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:rounded-sm",
        className
      )}
      onClick={() => onEntityClick?.(entityType, entityId)}
      {...props}
    >
      {children}
    </button>
  )
}

export { EntityLink }
export type { EntityType, EntityLinkProps }
