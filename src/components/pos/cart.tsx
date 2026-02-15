"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  ArrowLeft,
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

interface CartProps {
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
  // Mobile-specific props
  onMobileBack?: () => void
  isMobile?: boolean
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
  onMobileBack,
  isMobile,
}: CartProps) {
  const taxAmount = chargeTax ? discountedSubtotal * (taxPercentage / 100) : 0
  const total = discountedSubtotal + taxAmount

  const handleCustomerChange = (value: string) => {
    if (value === "0") {
      onSetCustomer(null, "Walk in customer")
    } else {
      const customer = customers.find((c) => c.id === parseInt(value))
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
            {/* Mobile back button - 44px minimum touch target */}
            {isMobile && onMobileBack && (
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 min-h-11 min-w-11 mr-1"
                onClick={onMobileBack}
                aria-label="Back to products"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
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
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Select
              value={cart.customerId?.toString() || "0"}
              onValueChange={handleCustomerChange}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Walk in customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Walk in customer</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id.toString()}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
                    "group py-3 transition-colors",
                    item.stockChanged && "bg-status-warning/5"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Product info */}
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
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                        {currencySymbol}{item.price.toFixed(2)} each
                      </p>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <p className="font-semibold text-sm font-mono tabular-nums">
                        {currencySymbol}{(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Quantity controls - 44px minimum touch targets for mobile */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 min-h-[44px] min-w-[44px] rounded-full"
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          onUpdateQuantity(item.id, parseInt(e.target.value) || 1)
                        }
                        className="w-12 h-8 text-center text-sm font-medium tabular-nums"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 min-h-[44px] min-w-[44px] rounded-full"
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 min-h-[44px] min-w-[44px] text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onRemoveItem(item.id)}
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Summary */}
      <div className="border-t">
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
              className="w-20 h-7 text-sm font-mono ml-auto"
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
