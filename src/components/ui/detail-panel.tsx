"use client"

import * as React from "react"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"

interface DetailPanelProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

function DetailPanel({ open, onOpenChange, children }: DetailPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        data-slot="detail-panel"
        side="right"
        showCloseButton={false}
        className={cn(
          "w-full sm:max-w-[420px]",
          "gap-0 p-0",
          "flex flex-col"
        )}
      >
        {children}
      </SheetContent>
    </Sheet>
  )
}

interface DetailPanelHeaderProps extends React.ComponentProps<"div"> {
  title: string
  description?: string
  actions?: React.ReactNode
}

function DetailPanelHeader({
  className,
  title,
  description,
  actions,
  ...props
}: DetailPanelHeaderProps) {
  return (
    <div
      data-slot="detail-panel-header"
      className={cn(
        "flex items-center gap-2 border-b px-4 py-3",
        className
      )}
      {...props}
    >
      <div className="flex-1 min-w-0">
        <SheetTitle className="text-base font-semibold truncate">
          {title}
        </SheetTitle>
        {description && (
          <SheetDescription className="text-sm text-muted-foreground truncate">
            {description}
          </SheetDescription>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-1 shrink-0">
          {actions}
        </div>
      )}
      <SheetClose className="ring-offset-background focus:ring-ring rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none shrink-0 ml-1">
        <XIcon className="size-4" />
        <span className="sr-only">Close</span>
      </SheetClose>
    </div>
  )
}

function DetailPanelContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="detail-panel-content"
      className={cn("flex-1 overflow-y-auto p-4", className)}
      {...props}
    />
  )
}

function DetailPanelFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="detail-panel-footer"
      className={cn(
        "border-t bg-background p-4 sticky bottom-0",
        className
      )}
      {...props}
    />
  )
}

export {
  DetailPanel,
  DetailPanelHeader,
  DetailPanelContent,
  DetailPanelFooter,
}
