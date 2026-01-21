"use client"

import { useState, useEffect, useCallback } from "react"
import { ProductGrid } from "@/components/pos/product-grid"
import { Cart } from "@/components/pos/cart"
import { PaymentModal } from "@/components/pos/payment-modal"
import { HoldModal } from "@/components/pos/hold-modal"
import { useCart } from "@/hooks/use-cart"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Product {
  id: number
  name: string
  price: number
  quantity: number
  trackStock: boolean
  image: string
  categoryId: number
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

interface HoldOrder {
  id: number
  orderNumber: number
  refNumber: string
  total: number
  items: any[]
  customer: { id: number; name: string } | null
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

  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [holdModalOpen, setHoldModalOpen] = useState(false)
  const [holdOrdersModalOpen, setHoldOrdersModalOpen] = useState(false)
  const [customerOrdersModalOpen, setCustomerOrdersModalOpen] = useState(false)
  const [currentOrderId, setCurrentOrderId] = useState<number | null>(null)

  const taxAmount = settings.chargeTax
    ? discountedSubtotal * (settings.taxPercentage / 100)
    : 0
  const total = discountedSubtotal + taxAmount

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const [productsRes, categoriesRes, customersRes, settingsRes] =
        await Promise.all([
          fetch("/api/products"),
          fetch("/api/categories"),
          fetch("/api/customers"),
          fetch("/api/settings"),
        ])

      setProducts(await productsRes.json())
      setCategories(await categoriesRes.json())
      setCustomers(await customersRes.json())
      setSettings(await settingsRes.json())
    } catch {
      toast.error("Failed to load data")
    }
  }, [])

  const fetchHoldOrders = useCallback(async () => {
    try {
      const [holdRes, customerRes] = await Promise.all([
        fetch("/api/transactions?onHold=true"),
        fetch("/api/transactions?customerOrders=true"),
      ])
      setHoldOrders(await holdRes.json())
      setCustomerOrders(await customerRes.json())
    } catch {
      console.error("Failed to fetch orders")
    }
  }, [])

  useEffect(() => {
    fetchData()
    fetchHoldOrders()

    // Polling every 30 seconds
    const interval = setInterval(() => {
      fetchData()
      fetchHoldOrders()
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchData, fetchHoldOrders])

  const handleAddToCart = (product: Product) => {
    if (product.trackStock && product.quantity <= 0) {
      toast.error("Out of stock! This item is currently unavailable")
      return
    }
    addToCart(product)
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

  const handlePay = () => {
    if (cart.items.length === 0) {
      toast.error("Add items before paying")
      return
    }
    setPaymentModalOpen(true)
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

      // Don't close modal - it will show receipt options
      // Modal will close when user clicks Done
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

  const handleLoadOrder = (order: HoldOrder) => {
    loadOrder({
      items: order.items.map((item: any) => ({
        id: item.productId,
        productName: item.productName,
        sku: item.sku,
        price: Number(item.price),
        quantity: item.quantity,
        maxQuantity: null,
      })),
      discount: Number(order.total) - order.items.reduce((sum: number, item: any) =>
        sum + Number(item.price) * item.quantity, 0),
      customerId: order.customer?.id || null,
      customerName: order.customer?.name || "Walk in customer",
      refNumber: order.refNumber,
    })
    setCurrentOrderId(order.id)
    setHoldOrdersModalOpen(false)
    setCustomerOrdersModalOpen(false)
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-7rem)]">
      {/* Product Grid */}
      <div className="flex-1 overflow-auto">
        <ProductGrid
          products={products}
          categories={categories}
          currencySymbol={settings.currencySymbol}
          onAddToCart={handleAddToCart}
        />

        {/* Hold/Customer Orders Buttons */}
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => setHoldOrdersModalOpen(true)}
          >
            Hold Orders ({holdOrders.length})
          </Button>
          <Button
            variant="outline"
            onClick={() => setCustomerOrdersModalOpen(true)}
          >
            Customer Orders ({customerOrders.length})
          </Button>
        </div>
      </div>

      {/* Cart */}
      <div className="w-96">
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
          onPay={handlePay}
        />
      </div>

      {/* Modals */}
      <PaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        total={total}
        currencySymbol={settings.currencySymbol}
        onConfirm={handlePaymentConfirm}
      />

      <HoldModal
        open={holdModalOpen}
        onClose={() => setHoldModalOpen(false)}
        customers={customers}
        currentCustomerId={cart.customerId}
        onConfirm={handleHoldConfirm}
      />

      {/* Hold Orders Modal */}
      <Dialog open={holdOrdersModalOpen} onOpenChange={setHoldOrdersModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Hold Orders</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 max-h-96 overflow-auto">
            {holdOrders.map((order) => (
              <div
                key={order.id}
                className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => handleLoadOrder(order)}
              >
                <p className="font-medium">Ref: {order.refNumber}</p>
                <p className="text-sm text-gray-500">
                  {order.items.length} items
                </p>
                <p className="text-green-600 font-bold">
                  {settings.currencySymbol}{Number(order.total).toFixed(2)}
                </p>
              </div>
            ))}
            {holdOrders.length === 0 && (
              <p className="col-span-2 text-center text-gray-500 py-8">
                No hold orders
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Orders Modal */}
      <Dialog open={customerOrdersModalOpen} onOpenChange={setCustomerOrdersModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customer Orders</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 max-h-96 overflow-auto">
            {customerOrders.map((order) => (
              <div
                key={order.id}
                className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => handleLoadOrder(order)}
              >
                <p className="font-medium">{order.customer?.name}</p>
                <p className="text-sm text-gray-500">
                  {order.items.length} items
                </p>
                <p className="text-green-600 font-bold">
                  {settings.currencySymbol}{Number(order.total).toFixed(2)}
                </p>
              </div>
            ))}
            {customerOrders.length === 0 && (
              <p className="col-span-2 text-center text-gray-500 py-8">
                No customer orders
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
