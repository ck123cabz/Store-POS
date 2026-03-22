"use client"

import { useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Layers } from "lucide-react"

interface Category {
  id: number
  name: string
  productCount: number
}

interface CategoryChipsProps {
  categories: Category[]
  selectedCategoryId: number | null
  onSelectCategory: (categoryId: number | null) => void
}

export function CategoryChips({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: CategoryChipsProps) {
  const activeRef = useRef<HTMLButtonElement>(null)

  // Scroll the active chip into view when selection changes
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
  }, [selectedCategoryId])

  return (
    <div className="border-b shrink-0">
      <ScrollArea className="w-full">
        <div className="flex items-center gap-1.5 px-3 py-2">
          <button
            ref={selectedCategoryId === null ? activeRef : undefined}
            onClick={() => onSelectCategory(null)}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 h-8 text-xs font-medium transition-colors shrink-0",
              "min-h-[44px]",
              selectedCategoryId === null
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            <Layers className="size-3" />
            All
          </button>

          {categories.map((cat) => {
            const isActive = selectedCategoryId === cat.id
            return (
              <button
                key={cat.id}
                ref={isActive ? activeRef : undefined}
                onClick={() => onSelectCategory(cat.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 h-8 text-xs font-medium transition-colors shrink-0",
                  "min-h-[44px]",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {cat.name}
                <span className={cn(
                  "font-mono text-[10px] tabular-nums",
                  isActive ? "text-primary-foreground/70" : "text-muted-foreground/70"
                )}>
                  {cat.productCount}
                </span>
              </button>
            )
          })}
        </div>
        <ScrollBar orientation="horizontal" className="h-1.5" />
      </ScrollArea>
    </div>
  )
}
