"use client"

import { useState, useEffect, useCallback } from "react"
import { ProductGrid } from "@/components/pos/product-grid"
import { Cart } from "@/components/pos/cart"
import { PaymentModal } from "@/components/pos/payment-modal"
import { HoldModal } from "@/components/pos/hold-modal"
import { PayLaterModal, PayLaterResult } from "@/components/pos/pay-later-modal"
import { POSAlertBell } from "@/components/pos/pos-alert-bell"
import { useCart } from "@/hooks/use-cart"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  PauseCircle,
  Users,
  ShoppingBag,
  Clock,
  RefreshCw,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

interface Product {
  id: number
  name: string
  price: number
  quantity: number
  trackStock: boolean
  image: string
  categoryId: number
  linkedIngredientId?: number | null
  needsPricing?: boolean
  linkedIngredient?: {
    id: number
    name: string
    quantity: number
    parLevel: number
    unit: string
    stockStatus: "ok" | "low" | "critical" | "out" | null
    stockRatio: number | null
  } | null
  // NEW: Ingredient-derived availability (004-ingredient-unit-system)
  availability: {
    status: "available" | "low" | "critical" | "out"
    maxProducible: number | null
    limitingIngredient: { id: number; name: string } | null
    warnings: string[]
  }
}

interface Category {
  id: number
  name: string
}

interface Customer {
  id: number
  name: string
}

interface Settings {
  currencySymbol: string
  taxPercentage: number
  chargeTax: boolean
}

interface HoldOrderItem {
  productId: number
  productName: string
  sku: string
  price: string | number
  quantity: number
}

interface HoldOrder {
  id: number
  orderNumber: number
  refNumber: string
  total: number
  items: HoldOrderItem[]
  customer: { id: number; name: string } | null
  createdAt?: string
}

export default function POSPage() {
  const {
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    setDiscount,
    setCustomer,
    clearCart,
    loadOrder,
    subtotal,
    discountedSubtotal,
  } = useCart()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [settings, setSettings] = useState<Settings>({
    currencySymbol: "$",
    taxPercentage: 0,
    chargeTax: false,
  })
  const [holdOrders, setHoldOrders] = useState<HoldOrder[]>([])
  const [customerOrders, setCustomerOrders] = useState<HoldOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [holdModalOpen, setHoldModalOpen] = useState(false)
  const [payLaterModalOpen, setPayLaterModalOpen] = useState(false)
  const [holdOrdersModalOpen, setHoldOrdersModalOpen] = useState(false)
  const [customerOrdersModalOpen, setCustomerOrdersModalOpen] = useState(false)
  const [_currentOrderId, setCurrentOrderId] = useState<number | null>(null)

  // Mobile view state - toggle between products and cart
  const [showMobileCart, setShowMobileCart] = useState(false)

  const taxAmount = settings.chargeTax
    ? discountedSubtotal * (settings.taxPercentage / 100)
    : 0
  const total = discountedSubtotal + taxAmount

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true)
    try {
      const [productsRes, categoriesRes, customersRes, settingsRes] =
        await Promise.all([
          fetch("/api/products"),
          fetch("/api/categories"),
          fetch("/api/customers"),
          fetch("/api/settings"),
        ])

      if (productsRes.ok) {
        const data = await productsRes.json()
        if (Array.isArray(data)) setProducts(data)
      }
      if (categoriesRes.ok) {
        const data = await categoriesRes.json()
        if (Array.isArray(data)) setCategories(data)
      }
      if (customersRes.ok) {
        const data = await customersRes.json()
        if (Array.isArray(data)) setCustomers(data)
      }
      if (settingsRes.ok) {
        const data = await settingsRes.json()
        if (data && !data.error) setSettings(data)
      }
    } catch {
      toast.error("Failed to load data")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  const fetchHoldOrders = useCallback(async () => {
    try {
      const [holdRes, customerRes] = await Promise.all([
        fetch("/api/transactions?onHold=true"),
        fetch("/api/transactions?customerOrders=true"),
      ])
      if (holdRes.ok) {
        const data = await holdRes.json()
        if (Array.isArray(data)) setHoldOrders(data)
      }
      if (customerRes.ok) {
        const data = await customerRes.json()
        if (Array.isArray(data)) setCustomerOrders(data)
      }
    } catch {
      console.error("Failed to fetch orders")
    }
  }, [])

  useEffect(() => {
    fetchData()
    fetchHoldOrders()

    const interval = setInterval(() => {
      fetchData()
      fetchHoldOrders()
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchData, fetchHoldOrders])

  const handleAddToCart = (product: Product) => {
    // Use ingredient-derived availability (004-ingredient-unit-system)
    if (product.availability.status === "out") {
      const reason = product.availability.limitingIngredient
        ? `Out of ${product.availability.limitingIngredient.name}`
        : "Out of stock"
      toast.error(`${reason}! This item is currently unavailable`)
      return
    }

    // Show warning for critical stock but still allow adding
    if (product.availability.status === "critical") {
      const limitMsg = product.availability.maxProducible
        ? `Only ${product.availability.maxProducible} left`
        : "Running very low"
      toast.warning(limitMsg)
    }

    addToCart(product)
    toast.success(`Added ${product.name}`, { duration: 1500 })
  }

  const handleCancel = () => {
    if (cart.items.length > 0) {
      clearCart()
      setCurrentOrderId(null)
      toast.success("Cart cleared")
    }
  }

  const handleHold = () => {
    if (cart.items.length === 0) {
      toast.error("Add items before holding")
      return
    }
    setHoldModalOpen(true)
  }

  const handleHoldConfirm = async (data: {
    refNumber: string
    customerId: number | null
    customerName: string
  }) => {
    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refNumber: data.refNumber,
          customerId: data.customerId,
          status: 0,
          subtotal: discountedSubtotal,
          taxAmount,
          total,
          discount: cart.discount,
          items: cart.items,
          tillNumber: 1,
        }),
      })

      if (!response.ok) throw new Error("Failed to hold order")

      setHoldModalOpen(false)
      clearCart()
      setCurrentOrderId(null)
      fetchHoldOrders()
      toast.success("Order held successfully")
    } catch {
      toast.error("Failed to hold order")
    }
  }

  const handlePayNow = () => {
    if (cart.items.length === 0) {
      toast.error("Add items before paying")
      return
    }
    setPaymentModalOpen(true)
  }

  const handlePayLater = () => {
    if (cart.items.length === 0) {
      toast.error("Add items before paying")
      return
    }
    setPayLaterModalOpen(true)
  }

  const handlePaymentConfirm = async (data: {
    paidAmount: number
    changeAmount: number
    paymentType: string
    paymentInfo: string
  }): Promise<number | null> => {
    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refNumber: cart.refNumber,
          customerId: cart.customerId,
          status: 1,
          subtotal: discountedSubtotal,
          taxAmount,
          total,
          discount: cart.discount,
          paidAmount: data.paidAmount,
          changeAmount: data.changeAmount,
          paymentType: data.paymentType,
          paymentInfo: data.paymentInfo,
          items: cart.items,
          tillNumber: 1,
        }),
      })

      if (!response.ok) throw new Error("Failed to process payment")

      const transaction = await response.json()
      clearCart()
      setCurrentOrderId(null)
      fetchData()
      fetchHoldOrders()
      toast.success("Payment successful!")

      return transaction.id
    } catch {
      toast.error("Failed to process payment")
      return null
    }
  }

  const handlePayLaterConfirm = async (data: PayLaterResult): Promise<boolean> => {
    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refNumber: cart.refNumber,
          customerId: data.customerId,
          status: 1, // Mark as paid (adds to tab)
          subtotal: discountedSubtotal,
          taxAmount,
          total,
          discount: cart.discount,
          paidAmount: total, // Full amount goes to tab
          changeAmount: 0,
          paymentType: "Tab",
          paymentInfo: "",
          items: cart.items,
          tillNumber: 1,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to add to tab")
      }

      clearCart()
      setCurrentOrderId(null)
      setPayLaterModalOpen(false)
      fetchData()
      fetchHoldOrders()
      toast.success(`Order added to ${data.customerName}'s tab`)

      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add to tab")
      return false
    }
  }

  const handleLoadOrder = (order: HoldOrder) => {
    loadOrder({
      items: order.items.map((item) => ({
        id: item.productId,
        productName: item.productName,
        sku: item.sku,
        price: Number(item.price),
        quantity: item.quantity,
        maxQuantity: null,
      })),
      discount:
        Number(order.total) -
        order.items.reduce(
          (sum, item) => sum + Number(item.price) * item.quantity,
          0
        ),
      customerId: order.customer?.id || null,
      customerName: order.customer?.name || "Walk in customer",
      refNumber: order.refNumber,
    })
    setCurrentOrderId(order.id)
    setHoldOrdersModalOpen(false)
    setCustomerOrdersModalOpen(false)
    toast.success("Order loaded")
  }

  const handleQuickSetPrice = async (productId: number, price: number) => {
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price, needsPricing: false }),
      })

      if (!response.ok) throw new Error("Failed to update price")

      toast.success("Price updated!")
      fetchData()
    } catch {
      toast.error("Failed to update price")
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-7rem)]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading POS...</p>
        </div>
      </div>
    )
  }

  const cartItemCount = cart.items.length

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] md:h-[calc(100vh-7rem)] gap-0">
      {/* Product Grid Section - hidden on mobile when cart is shown */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0",
        showMobileCart && "hidden md:flex"
      )}>
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-2">
            {/* Hold Orders Button */}
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2"
              onClick={() => setHoldOrdersModalOpen(true)}
            >
              <PauseCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Hold</span>
              {holdOrders.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                  {holdOrders.length}
                </Badge>
              )}
            </Button>

            {/* Customer Orders Button */}
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2"
              onClick={() => setCustomerOrdersModalOpen(true)}
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Orders</span>
              {customerOrders.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                  {customerOrders.length}
                </Badge>
              )}
            </Button>

            {/* Refresh button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => fetchData(true)}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={cn("h-4 w-4", isRefreshing && "animate-spin")}
              />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* Alert Bell */}
            <POSAlertBell
              currencySymbol={settings.currencySymbol}
              onSetPrice={handleQuickSetPrice}
            />

            {/* Mobile Cart Toggle - only show on small screens */}
            <Button
              variant="default"
              size="sm"
              className="md:hidden h-11 min-h-11 gap-2 px-4"
              onClick={() => setShowMobileCart(true)}
            >
              <ShoppingBag className="h-5 w-5" />
              <span>Cart</span>
              {cartItemCount > 0 && (
                <Badge variant="secondary" className="bg-white text-primary ml-1 px-1.5 py-0 text-xs">
                  {cartItemCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Products */}
        <ScrollArea className="flex-1 px-4 py-4">
          <ProductGrid
            products={products}
            categories={categories}
            currencySymbol={settings.currencySymbol}
            onAddToCart={handleAddToCart}
          />
        </ScrollArea>
      </div>

      {/* Cart Section - full width on mobile, fixed width on desktop */}
      <div className={cn(
        "flex-shrink-0 border-l bg-background",
        // Desktop: fixed width sidebar
        "md:w-[380px] lg:w-[420px]",
        // Mobile: full width, shown/hidden based on state
        "w-full absolute inset-0 md:relative md:inset-auto z-20",
        !showMobileCart && "hidden md:block"
      )}>
        <Cart
          cart={cart}
          subtotal={subtotal}
          discountedSubtotal={discountedSubtotal}
          taxPercentage={settings.taxPercentage}
          chargeTax={settings.chargeTax}
          currencySymbol={settings.currencySymbol}
          customers={customers}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeFromCart}
          onSetDiscount={setDiscount}
          onSetCustomer={setCustomer}
          onCancel={handleCancel}
          onHold={handleHold}
          onPayNow={handlePayNow}
          onPayLater={handlePayLater}
          onMobileBack={() => setShowMobileCart(false)}
          isMobile={showMobileCart}
        />
      </div>

      {/* Modals */}
      <PaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        total={total}
        currencySymbol={settings.currencySymbol}
        onConfirm={handlePaymentConfirm}
        // T066: Offline queue integration props
        cartItems={cart.items.map(item => ({
          id: item.id,
          productName: item.productName,
          sku: item.sku,
          price: item.price,
          quantity: item.quantity,
        }))}
        subtotal={discountedSubtotal}
        discount={cart.discount}
        taxAmount={taxAmount}
      />

      <HoldModal
        open={holdModalOpen}
        onClose={() => setHoldModalOpen(false)}
        customers={customers}
        currentCustomerId={cart.customerId}
        onConfirm={handleHoldConfirm}
      />

      <PayLaterModal
        open={payLaterModalOpen}
        onClose={() => setPayLaterModalOpen(false)}
        total={total}
        currencySymbol={settings.currencySymbol}
        onConfirm={handlePayLaterConfirm}
      />

      {/* Hold Orders Modal */}
      <Dialog open={holdOrdersModalOpen} onOpenChange={setHoldOrdersModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PauseCircle className="h-5 w-5" />
              Hold Orders
              <Badge variant="secondary">{holdOrders.length}</Badge>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {holdOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <PauseCircle className="h-12 w-12 mb-3 opacity-30" />
                <p className="font-medium">No hold orders</p>
                <p className="text-sm">Orders placed on hold will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1">
                {holdOrders.map((order) => (
                  <Card
                    key={order.id}
                    className="p-4 cursor-pointer hover:shadow-md hover:border-primary/50 transition-all"
                    onClick={() => handleLoadOrder(order)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">#{order.refNumber || order.id}</p>
                        {order.createdAt && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(order.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {order.items.length} items
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      {order.items.slice(0, 2).map((item, idx) => (
                        <p key={idx} className="text-sm text-muted-foreground truncate">
                          {item.quantity}x {item.productName}
                        </p>
                      ))}
                      {order.items.length > 2 && (
                        <p className="text-xs text-muted-foreground">
                          +{order.items.length - 2} more
                        </p>
                      )}
                    </div>
                    <div className="mt-3 pt-2 border-t flex items-center justify-between">
                      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                      <span className="font-bold text-primary">
                        {settings.currencySymbol}
                        {Number(order.total).toFixed(2)}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Customer Orders Modal */}
      <Dialog
        open={customerOrdersModalOpen}
        onOpenChange={setCustomerOrdersModalOpen}
      >
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Customer Orders
              <Badge variant="secondary">{customerOrders.length}</Badge>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {customerOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mb-3 opacity-30" />
                <p className="font-medium">No customer orders</p>
                <p className="text-sm">
                  Orders with customers assigned will appear here
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1">
                {customerOrders.map((order) => (
                  <Card
                    key={order.id}
                    className="p-4 cursor-pointer hover:shadow-md hover:border-primary/50 transition-all"
                    onClick={() => handleLoadOrder(order)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">{order.customer?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          #{order.refNumber || order.id}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {order.items.length} items
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      {order.items.slice(0, 2).map((item, idx) => (
                        <p key={idx} className="text-sm text-muted-foreground truncate">
                          {item.quantity}x {item.productName}
                        </p>
                      ))}
                      {order.items.length > 2 && (
                        <p className="text-xs text-muted-foreground">
                          +{order.items.length - 2} more
                        </p>
                      )}
                    </div>
                    <div className="mt-3 pt-2 border-t flex items-center justify-between">
                      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                      <span className="font-bold text-primary">
                        {settings.currencySymbol}
                        {Number(order.total).toFixed(2)}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
