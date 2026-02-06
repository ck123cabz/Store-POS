"use client"

import * as React from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

interface ResponsiveDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

function ResponsiveDialog({ open, onOpenChange, children }: ResponsiveDialogProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        {children}
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
    </Dialog>
  )
}

function ResponsiveDialogTrigger({
  children,
  ...props
}: React.ComponentProps<typeof DialogTrigger>) {
  const isMobile = useIsMobile()
  if (isMobile) return <DrawerTrigger {...props}>{children}</DrawerTrigger>
  return <DialogTrigger {...props}>{children}</DialogTrigger>
}

function ResponsiveDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <DrawerContent className={className}>
        <div className="overflow-y-auto max-h-[80vh] px-4 pb-4">{children}</div>
      </DrawerContent>
    )
  }

  return (
    <DialogContent className={className} {...props}>
      {children}
    </DialogContent>
  )
}

function ResponsiveDialogHeader({
  className,
  ...props
}: React.ComponentProps<typeof DialogHeader>) {
  const isMobile = useIsMobile()
  if (isMobile) return <DrawerHeader className={className} {...props} />
  return <DialogHeader className={className} {...props} />
}

function ResponsiveDialogFooter({
  className,
  ...props
}: React.ComponentProps<typeof DialogFooter>) {
  const isMobile = useIsMobile()
  if (isMobile) return <DrawerFooter className={className} {...props} />
  return <DialogFooter className={className} {...props} />
}

function ResponsiveDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  const isMobile = useIsMobile()
  if (isMobile) return <DrawerTitle className={className} {...props} />
  return <DialogTitle className={className} {...props} />
}

function ResponsiveDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  const isMobile = useIsMobile()
  if (isMobile) return <DrawerDescription className={className} {...props} />
  return <DialogDescription className={className} {...props} />
}

function ResponsiveDialogClose({
  ...props
}: React.ComponentProps<typeof DialogClose>) {
  const isMobile = useIsMobile()
  if (isMobile) return <DrawerClose {...props} />
  return <DialogClose {...props} />
}

export {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogClose,
}
