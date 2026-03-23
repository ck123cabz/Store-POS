"use client"

import { useState, useEffect, useCallback } from "react"
import { ProductGrid } from "@/components/pos/product-grid"
import { Cart } from "@/components/pos/cart"
import { CartDrawer } from "@/components/pos/cart-drawer"
import { MobileCartBar } from "@/components/pos/mobile-cart-bar"
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  PauseCircle,
  Users,
  ShoppingBag,
  Clock,
  RefreshCw,
  Trash2,
  Search,
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
  //
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

  // Command palette state
  const [commandOpen, setCommandOpen] = useState(false)

  // Mobile cart drawer state
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false)

  const taxAmount = settings.chargeTax
    ? discountedSubtotal * (settings.taxPercentage / 100)
    : 0
  const total = discountedSubtotal + taxAmount

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true)
    try {
      const [productsRes, categoriesRes, customersRes, settingsRes] =
        await Promise.all([
          fetch("/api/products?status=ACTIVE,UNAVAILABLE"),
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

  // ⌘K / Ctrl+K keyboard shortcut for command palette
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setCommandOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

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
    if (cartDrawerOpen) {
      setCartDrawerOpen(false)
      setTimeout(() => setHoldModalOpen(true), 200)
    } else {
      setHoldModalOpen(true)
    }
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
    // Close drawer first to prevent overlay stacking, then open payment modal
    if (cartDrawerOpen) {
      setCartDrawerOpen(false)
      setTimeout(() => setPaymentModalOpen(true), 200)
    } else {
      setPaymentModalOpen(true)
    }
  }

  const handlePayLater = () => {
    if (cart.items.length === 0) {
      toast.error("Add items before paying")
      return
    }
    if (cartDrawerOpen) {
      setCartDrawerOpen(false)
      setTimeout(() => setPayLaterModalOpen(true), 200)
    } else {
      setPayLaterModalOpen(true)
    }
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

  const handleDeleteHoldOrder = async (orderId: number, e: React.MouseEvent) => {
    e.stopPropagation() // Don't trigger card click (load order)
    try {
      const response = await fetch(`/api/transactions/${orderId}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete")
      }
      fetchHoldOrders()
      toast.success("Hold order removed")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove hold order")
    }
  }

  const handleClearAllHoldOrders = async () => {
    if (holdOrders.length === 0) return
    try {
      const results = await Promise.all(
        holdOrders.map((order) =>
          fetch(`/api/transactions/${order.id}`, { method: "DELETE" })
        )
      )
      const failed = results.filter((r) => !r.ok).length
      fetchHoldOrders()
      if (failed > 0) {
        toast.error(`Failed to remove ${failed} order(s)`)
      } else {
        toast.success("All hold orders cleared")
        setHoldOrdersModalOpen(false)
      }
    } catch {
      toast.error("Failed to clear hold orders")
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col md:flex-row h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-4rem)] gap-0 overflow-hidden">
        {/* Product grid skeleton */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Header bar skeleton */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-9" />
            </div>
            <Skeleton className="h-9 w-9" />
          </div>
          {/* Category filter skeleton */}
          <div className="flex gap-2 px-4 pt-4 pb-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-full" />
            ))}
          </div>
          {/* Product cards skeleton */}
          <div className="flex-1 px-4 py-2">
            <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-3">
                  <Skeleton className="h-20 sm:h-28 w-full rounded-md" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Cart panel skeleton (hidden on mobile) */}
        <div className="hidden md:flex flex-shrink-0 border-l bg-background md:w-[380px] lg:w-[420px] flex-col">
          <div className="p-4 border-b space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="flex-1 p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
          <div className="p-4 border-t space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-11 flex-1" />
              <Skeleton className="h-11 flex-1" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const cartItemCount = cart.items.length

  return (
    <div className="flex flex-col md:flex-row h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-4rem)] gap-0 overflow-hidden">
      {/* Product Grid Section */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Header bar — fixed above scroll area via flex shrink-0 */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background shrink-0 z-10">
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
              aria-label="Refresh products"
              onClick={() => fetchData(true)}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={cn("h-4 w-4", isRefreshing && "animate-spin")}
              />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* Command palette trigger */}
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex h-9 gap-2 text-muted-foreground"
              onClick={() => setCommandOpen(true)}
            >
              <Search className="h-4 w-4" />
              <span>Search</span>
              <kbd className="pointer-events-none ml-1 inline-flex h-5 items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>

            {/* Alert Bell */}
            <POSAlertBell
              currencySymbol={settings.currencySymbol}
            />
          </div>
        </div>

        {/* Products — scrollable area, contained to prevent iOS scroll chaining */}
        <div className={cn("flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4", cartItemCount > 0 && "pb-20 md:pb-4")}>
          <ProductGrid
            products={products}
            categories={categories}
            currencySymbol={settings.currencySymbol}
            onAddToCart={handleAddToCart}
          />
        </div>
      </div>

      {/* Desktop Cart Sidebar — hidden on mobile */}
      <div className="hidden md:block flex-shrink-0 border-l bg-background md:w-[380px] lg:w-[420px] h-full overflow-hidden">
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
        />
      </div>

      {/* Mobile Cart Bar — floating bottom bar */}
      <MobileCartBar
        itemCount={cartItemCount}
        total={total}
        currencySymbol={settings.currencySymbol}
        onViewCart={() => setCartDrawerOpen(true)}
      />

      {/* Mobile Cart Drawer — bottom sheet */}
      <CartDrawer
        open={cartDrawerOpen}
        onOpenChange={setCartDrawerOpen}
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
        onCancel={() => { setCartDrawerOpen(false); handleCancel() }}
        onHold={handleHold}
        onPayNow={handlePayNow}
        onPayLater={handlePayLater}
      />

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

      {/* Hold Orders Sheet */}
      <Sheet open={holdOrdersModalOpen} onOpenChange={setHoldOrdersModalOpen}>
        <SheetContent side="right" className="w-full sm:w-[640px] sm:max-w-[640px]">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <PauseCircle className="h-5 w-5" />
                Hold Orders
                <Badge variant="secondary">{holdOrders.length}</Badge>
              </SheetTitle>
              {holdOrders.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={handleClearAllHoldOrders}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Clear All
                </Button>
              )}
            </div>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
            {holdOrders.length === 0 ? (
              <EmptyState
                icon={<PauseCircle className="h-12 w-12" />}
                title="No hold orders"
                description="Orders placed on hold will appear here"
                className="py-12"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-1">
                {holdOrders.map((order) => (
                  <Card
                    key={order.id}
                    className="p-4 cursor-pointer hover:border-primary/50 transition-all"
                    onClick={() => handleLoadOrder(order)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">#{order.refNumber || order.id}</p>
                        {order.createdAt && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            {formatDistanceToNow(new Date(order.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {order.items.length} {order.items.length === 1 ? "item" : "items"}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      {order.items.slice(0, 3).map((item, idx) => (
                        <p key={idx} className="text-sm text-muted-foreground truncate">
                          {item.quantity}x {item.productName}
                        </p>
                      ))}
                      {order.items.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{order.items.length - 3} more
                        </p>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t flex items-center justify-between">
                      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary font-mono tabular-nums">
                          {settings.currencySymbol}
                          {Number(order.total).toFixed(2)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => handleDeleteHoldOrder(order.id, e)}
                          aria-label={`Remove hold order ${order.refNumber || order.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Customer Orders Sheet */}
      <Sheet
        open={customerOrdersModalOpen}
        onOpenChange={setCustomerOrdersModalOpen}
      >
        <SheetContent side="right" className="w-full sm:w-[640px] sm:max-w-[640px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Customer Orders
              <Badge variant="secondary">{customerOrders.length}</Badge>
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
            {customerOrders.length === 0 ? (
              <EmptyState
                icon={<Users className="h-12 w-12" />}
                title="No customer orders"
                description="Orders with customers assigned will appear here"
                className="py-12"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-1">
                {customerOrders.map((order) => (
                  <Card
                    key={order.id}
                    className="p-4 cursor-pointer hover:border-primary/50 transition-all"
                    onClick={() => handleLoadOrder(order)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{order.customer?.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          #{order.refNumber || order.id}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {order.items.length} {order.items.length === 1 ? "item" : "items"}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      {order.items.slice(0, 3).map((item, idx) => (
                        <p key={idx} className="text-sm text-muted-foreground truncate">
                          {item.quantity}x {item.productName}
                        </p>
                      ))}
                      {order.items.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{order.items.length - 3} more
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
        </SheetContent>
      </Sheet>

      {/* Command Palette */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen} title="Search">
        <CommandInput placeholder="Search products, customers, or actions..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Products">
            {products
              .filter((p) => p.availability.status !== "out")
              .slice(0, 8)
              .map((product) => (
                <CommandItem
                  key={`product-${product.id}`}
                  value={product.name}
                  onSelect={() => {
                    handleAddToCart(product)
                    setCommandOpen(false)
                  }}
                >
                  <span className="flex-1">{product.name}</span>
                  <span className="text-xs text-muted-foreground font-mono tabular-nums">
                    {settings.currencySymbol}{product.price.toFixed(2)}
                  </span>
                  {product.trackStock && (
                    <Badge variant="outline" className="ml-2 text-[10px]">
                      {product.quantity}
                    </Badge>
                  )}
                </CommandItem>
              ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Customers">
            {customers.slice(0, 5).map((customer) => {
              const initials = customer.name
                .split(" ")
                .map((w) => w[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)
              return (
                <CommandItem
                  key={`customer-${customer.id}`}
                  value={customer.name}
                  onSelect={() => {
                    setCustomer(customer.id, customer.name)
                    setCommandOpen(false)
                    toast.success(`Customer set to ${customer.name}`)
                  }}
                >
                  <Avatar size="sm">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <span>{customer.name}</span>
                </CommandItem>
              )
            })}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Quick Actions">
            <CommandItem
              onSelect={() => {
                setHoldModalOpen(true)
                setCommandOpen(false)
              }}
            >
              <PauseCircle className="size-4" />
              <span>Hold Order</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setHoldOrdersModalOpen(true)
                setCommandOpen(false)
              }}
            >
              <Clock className="size-4" />
              <span>View Hold Orders</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  )
}
