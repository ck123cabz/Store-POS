"use client"

import * as React from "react"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

interface DetailPanelProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

function DetailPanel({ open, onOpenChange, children }: DetailPanelProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-slot="detail-panel"
        showCloseButton={false}
        className={cn(
          "w-full sm:max-w-3xl lg:max-w-4xl",
          "max-h-[90vh]",
          "gap-0 p-0",
          "flex flex-col overflow-hidden"
        )}
      >
        {children}
      </DialogContent>
    </Dialog>
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
        "flex items-center gap-2 border-b px-5 py-3.5",
        className
      )}
      {...props}
    >
      <div className="flex-1 min-w-0">
        <DialogTitle className="text-base font-semibold truncate">
          {title}
        </DialogTitle>
        {description ? (
          <DialogDescription className="text-sm text-muted-foreground truncate">
            {description}
          </DialogDescription>
        ) : (
          <DialogDescription className="sr-only">{title}</DialogDescription>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-1 shrink-0">
          {actions}
        </div>
      )}
      <DialogClose className="ring-offset-background focus:ring-ring rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none shrink-0 ml-1">
        <XIcon className="size-4" />
        <span className="sr-only">Close</span>
      </DialogClose>
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
      className={cn("flex-1 min-h-0 overflow-y-auto p-5", className)}
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
        "border-t bg-background p-4 shrink-0 rounded-b-lg",
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
