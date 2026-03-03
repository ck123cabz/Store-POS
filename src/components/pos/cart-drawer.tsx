"use client"

import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Cart, type CartProps } from "./cart"

interface CartDrawerProps extends CartProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CartDrawer({ open, onOpenChange, ...cartProps }: CartDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        {/* Accessible title (visually hidden — Cart has its own header) */}
        <DrawerTitle className="sr-only">Shopping Cart</DrawerTitle>
        <div className="flex flex-col overflow-hidden h-full">
          <Cart {...cartProps} />
        </div>
      </DrawerContent>
    </Drawer>
  )
}
