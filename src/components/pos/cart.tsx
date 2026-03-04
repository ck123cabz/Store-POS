"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Minus,
  Plus,
  Trash2,
  AlertTriangle,
  ShoppingCart,
  User,
  Percent,
  CreditCard,
  PauseCircle,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Cart as CartType } from "@/hooks/use-cart"

interface Customer {
  id: number
  name: string
}

export interface CartProps {
  cart: CartType
  subtotal: number
  discountedSubtotal: number
  taxPercentage: number
  chargeTax: boolean
  currencySymbol: string
  customers: Customer[]
  onUpdateQuantity: (productId: number, quantity: number) => void
  onRemoveItem: (productId: number) => void
  onSetDiscount: (discount: number) => void
  onSetCustomer: (customerId: number | null, customerName: string) => void
  onCancel: () => void
  onHold: () => void
  onPayNow: () => void
  onPayLater: () => void
}

export function Cart({
  cart,
  subtotal,
  discountedSubtotal,
  taxPercentage,
  chargeTax,
  currencySymbol,
  customers,
  onUpdateQuantity,
  onRemoveItem,
  onSetDiscount,
  onSetCustomer,
  onCancel,
  onHold,
  onPayNow,
  onPayLater,
}: CartProps) {
  const taxAmount = chargeTax ? discountedSubtotal * (taxPercentage / 100) : 0
  const total = discountedSubtotal + taxAmount

  const customerOptions: ComboboxOption<number>[] = [
    { value: 0, label: "Walk in customer" },
    ...customers.map((c) => ({ value: c.id, label: c.name })),
  ]

  const handleCustomerChange = (value: number | null) => {
    if (!value || value === 0) {
      onSetCustomer(null, "Walk in customer")
    } else {
      const customer = customers.find((c) => c.id === value)
      if (customer) {
        onSetCustomer(customer.id, customer.name)
      }
    }
  }

  return (
    <div className="h-full flex flex-col bg-card text-card-foreground">
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-base tracking-tight">Cart</h2>
          </div>
          <Badge
            key={cart.items.length}
            variant="secondary"
            className="text-xs tabular-nums px-2.5 py-0.5 rounded-full animate-in zoom-in-75 duration-150"
          >
            {cart.items.length}
          </Badge>
        </div>

        {/* Customer selector */}
        <div className="mt-2.5">
          <Combobox<number>
            options={customerOptions}
            value={cart.customerId || 0}
            onChange={handleCustomerChange}
            placeholder="Walk in customer"
            searchPlaceholder="Search customers..."
            emptyMessage="No customers found."
            icon={<User className="h-4 w-4 text-muted-foreground" />}
            className="h-8 text-sm"
            renderOption={(option) => (
              <div className="flex items-center gap-2">
                {option.value !== 0 && (
                  <Avatar size="sm">
                    <AvatarFallback>
                      {option.label.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <span>{option.label}</span>
              </div>
            )}
          />
        </div>
      </div>

      {/* Cart Items */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-2">
          {cart.items.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart className="h-12 w-12" />}
              title="Cart is empty"
              description="Add products to start an order"
              className="py-16"
            />
          ) : (
            <div className="divide-y divide-border">
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "group flex items-center gap-2 py-2.5 transition-colors",
                    item.stockChanged && "bg-status-warning/5"
                  )}
                >
                  {/* Product name + unit price */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-sm leading-tight truncate">
                        {item.productName}
                      </p>
                      {item.stockChanged && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertTriangle className="h-3.5 w-3.5 text-status-warning flex-shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Stock changed since added</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono tabular-nums">
                      {currencySymbol}{item.price.toFixed(2)} ea
                    </p>
                  </div>

                  {/* Quantity controls — inline */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-full"
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium tabular-nums select-none">
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-full"
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Line total + remove */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="font-semibold text-sm font-mono tabular-nums w-16 text-right">
                      {currencySymbol}{(item.price * item.quantity).toFixed(2)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onRemoveItem(item.id)}
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Summary */}
      <div className="border-t flex-shrink-0">
        <div className="px-4 py-3 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium font-mono tabular-nums">{currencySymbol}{subtotal.toFixed(2)}</span>
          </div>

          {/* Discount input */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Percent className="h-3.5 w-3.5" />
              <span>Discount</span>
            </div>
            <Input
              type="number"
              value={cart.discount || ""}
              onChange={(e) => onSetDiscount(parseFloat(e.target.value) || 0)}
              className="w-24 h-7 text-sm font-mono ml-auto"
              placeholder="0.00"
            />
          </div>

          {cart.discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">After discount</span>
              <span className="font-medium font-mono tabular-nums text-status-ok">
                {currencySymbol}{discountedSubtotal.toFixed(2)}
              </span>
            </div>
          )}

          {chargeTax && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax ({taxPercentage}%)</span>
              <span className="font-medium font-mono tabular-nums">{currencySymbol}{taxAmount.toFixed(2)}</span>
            </div>
          )}

          {/* Hairline separator */}
          <div className="border-t my-2" />

          <div className="flex justify-between items-center">
            <span className="font-semibold text-sm">Total</span>
            <span className="font-bold text-xl font-mono tabular-nums tracking-tight">
              {currencySymbol}{total.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Footer action buttons */}
        <div className="px-4 pb-4 pt-1 space-y-2">
          {/* Primary pay button - 48px height */}
          <Button
            className="w-full h-12 min-h-12 text-base font-semibold"
            onClick={onPayNow}
            disabled={cart.items.length === 0}
          >
            <CreditCard className="h-5 w-5 mr-2" />
            Pay <span className="font-mono tabular-nums">{currencySymbol}{total.toFixed(2)}</span>
          </Button>

          {/* Secondary actions row */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="secondary"
              className="h-9"
              onClick={onHold}
              disabled={cart.items.length === 0}
            >
              <PauseCircle className="h-4 w-4 mr-1.5" />
              Hold
            </Button>
            <Button
              variant="secondary"
              className="h-9"
              onClick={onPayLater}
              disabled={cart.items.length === 0}
            >
              <User className="h-4 w-4 mr-1.5" />
              Pay Later
            </Button>
            <Button
              variant="ghost"
              className="h-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={onCancel}
              disabled={cart.items.length === 0}
            >
              <XCircle className="h-4 w-4 mr-1.5" />
              Clear
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
