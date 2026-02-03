"use client"

import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface IngredientShortage {
  id: number
  name: string
  have: number
  needPerUnit: number
  status: "missing" | "low"
}

interface StockBadgeProps {
  status: "available" | "low" | "critical" | "out"
  maxProducible: number | null
  missingIngredients: IngredientShortage[]
  lowIngredients: IngredientShortage[]
  onViewAll?: () => void
}

export function StockBadge({
  status,
  maxProducible,
  missingIngredients,
  lowIngredients,
  onViewAll,
}: StockBadgeProps) {
  const hasIssues = missingIngredients.length > 0 || lowIngredients.length > 0

  // Build display text
  let displayText = ""
  let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "default"

  if (status === "available") {
    displayText = "Available"
    badgeVariant = "default"
  } else if (status === "out") {
    const missingCount = missingIngredients.length
    displayText = `OUT · ${missingCount} missing`
    badgeVariant = "destructive"
  } else {
    // low or critical
    const lowCount = lowIngredients.length
    displayText = `${maxProducible} left · ${lowCount} low`
    badgeVariant = "secondary"
  }

  if (!hasIssues) {
    return (
      <Badge variant={badgeVariant} className={cn(
        status === "available" && "bg-green-100 text-green-800 hover:bg-green-100",
      )}>
        {displayText}
      </Badge>
    )
  }

  // Combine for tooltip
  const allIssues = [...missingIngredients, ...lowIngredients]
  const showMax = 5
  const hasMore = allIssues.length > showMax

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={badgeVariant}
            className={cn(
              "cursor-help",
              status === "out" && "bg-red-100 text-red-800 hover:bg-red-100",
              (status === "low" || status === "critical") && "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
            )}
          >
            {displayText}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-medium">
              {status === "out" ? "Missing" : "Low"} Ingredients ({allIssues.length})
            </p>
            <ul className="text-sm space-y-1">
              {allIssues.slice(0, showMax).map((ing) => (
                <li key={ing.id} className="flex justify-between gap-4">
                  <span>{ing.name}</span>
                  <span className="text-muted-foreground">
                    need {ing.needPerUnit}/unit
                  </span>
                </li>
              ))}
            </ul>
            {hasMore && (
              <p className="text-sm text-muted-foreground">
                + {allIssues.length - showMax} more...
              </p>
            )}
            {onViewAll && (
              <button
                onClick={onViewAll}
                className="text-sm text-primary hover:underline"
              >
                View all in panel →
              </button>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
