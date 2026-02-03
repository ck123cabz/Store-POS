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
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
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
    <Card className="h-full flex flex-col bg-card border-l-0 rounded-l-none shadow-xl">
      {/* Header */}
      <div className="p-4 border-b bg-muted/30">
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
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-lg">Cart</h2>
          </div>
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {cart.items.length} item{cart.items.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        {/* Customer selector */}
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <Select
              value={cart.customerId?.toString() || "0"}
              onValueChange={handleCustomerChange}
            >
              <SelectTrigger className="h-9 text-sm">
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
        <div className="p-3 space-y-2">
          {cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ShoppingCart className="h-16 w-16 mb-3 opacity-30" />
              <p className="font-medium">Cart is empty</p>
              <p className="text-sm">Add products to get started</p>
            </div>
          ) : (
            cart.items.map((item, index) => (
              <div
                key={item.id}
                className={cn(
                  "group relative p-3 rounded-lg border bg-background transition-colors",
                  item.stockChanged && "bg-orange-50 border-orange-200"
                )}
              >
                {/* Item number badge */}
                <div className="absolute -left-1 -top-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                  {index + 1}
                </div>

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
                              <AlertTriangle className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Stock changed since added</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {currencySymbol}{item.price.toFixed(2)} each
                    </p>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <p className="font-bold text-sm text-primary">
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
                      className="h-11 w-11 min-h-11 min-w-11 rounded-full"
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        onUpdateQuantity(item.id, parseInt(e.target.value) || 1)
                      }
                      className="w-14 h-11 text-center text-sm font-medium"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 min-h-11 min-w-11 rounded-full"
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 min-h-11 min-w-11 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onRemoveItem(item.id)}
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Totals and Actions */}
      <div className="border-t bg-muted/20">
        {/* Summary */}
        <div className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{currencySymbol}{subtotal.toFixed(2)}</span>
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
              className="w-24 h-8 text-sm ml-auto"
              placeholder="0.00"
            />
          </div>

          {cart.discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">After discount</span>
              <span className="font-medium text-green-600">
                {currencySymbol}{discountedSubtotal.toFixed(2)}
              </span>
            </div>
          )}

          {chargeTax && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax ({taxPercentage}%)</span>
              <span className="font-medium">{currencySymbol}{taxAmount.toFixed(2)}</span>
            </div>
          )}

          <Separator className="my-2" />

          <div className="flex justify-between items-center">
            <span className="font-bold text-lg">Total</span>
            <span className="font-bold text-2xl text-primary">
              {currencySymbol}{total.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Action buttons - 44px minimum touch targets */}
        <div className="p-4 pt-0 space-y-2">
          {/* Pay buttons - prominent, split into Pay Now and Pay Later */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="h-14 min-h-14 text-base font-bold"
              onClick={onPayNow}
              disabled={cart.items.length === 0}
            >
              <CreditCard className="h-5 w-5 mr-2" />
              Pay Now {currencySymbol}{total.toFixed(2)}
            </Button>
            <Button
              variant="outline"
              className="h-14 min-h-14 text-base font-bold"
              onClick={onPayLater}
              disabled={cart.items.length === 0}
            >
              <User className="h-5 w-5 mr-2" />
              Pay Later
            </Button>
          </div>

          {/* Secondary actions - 44px minimum touch targets */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-11 min-h-11"
              onClick={onHold}
              disabled={cart.items.length === 0}
            >
              <PauseCircle className="h-4 w-4 mr-2" />
              Hold
            </Button>
            <Button
              variant="outline"
              className="h-11 min-h-11 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onCancel}
              disabled={cart.items.length === 0}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
