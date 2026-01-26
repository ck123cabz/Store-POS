"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Minus, Plus, X, AlertTriangle } from "lucide-react"
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
  onPay: () => void
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
  onPay,
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
    <div className="bg-white rounded-lg shadow h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg">Cart ({cart.items.length})</h2>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-auto p-4">
        {cart.items.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Cart is empty</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Price</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cart.items.map((item, index) => (
                <TableRow key={item.id} className={cn(item.stockChanged && "bg-orange-50")}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1">
                      {item.productName}
                      {/* EC-05: Stock changed warning */}
                      {item.stockChanged && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Stock changed</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          onUpdateQuantity(item.id, parseInt(e.target.value) || 1)
                        }
                        className="w-12 h-6 text-center p-1"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    {currencySymbol}
                    {(item.price * item.quantity).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-500"
                      onClick={() => onRemoveItem(item.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Totals and Actions */}
      <div className="p-4 border-t space-y-3">
        <div className="flex justify-between text-sm">
          <span>Subtotal:</span>
          <span>{currencySymbol}{subtotal.toFixed(2)}</span>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-sm">Discount:</Label>
          <Input
            type="number"
            value={cart.discount || ""}
            onChange={(e) => onSetDiscount(parseFloat(e.target.value) || 0)}
            className="w-20 h-8"
            placeholder="0.00"
          />
        </div>

        {chargeTax && (
          <div className="flex justify-between text-sm">
            <span>Tax ({taxPercentage}%):</span>
            <span>{currencySymbol}{taxAmount.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between font-bold text-lg border-t pt-2">
          <span>Total:</span>
          <span className="text-green-600">{currencySymbol}{total.toFixed(2)}</span>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Customer:</Label>
          <Select
            value={cart.customerId?.toString() || "0"}
            onValueChange={handleCustomerChange}
          >
            <SelectTrigger>
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

        <div className="grid grid-cols-3 gap-2 pt-2">
          <Button variant="destructive" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={onHold}>
            Hold
          </Button>
          <Button onClick={onPay} disabled={cart.items.length === 0}>
            Pay
          </Button>
        </div>
      </div>
    </div>
  )
}
