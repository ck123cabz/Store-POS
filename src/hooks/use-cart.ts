"use client"

import { useState, useCallback } from "react"
import type { SplitPaymentComponent } from "@/lib/payment-validation"

export interface CartItem {
  id: number
  productName: string
  sku: string
  price: number
  quantity: number
  maxQuantity: number | null // null if stock not tracked
  stockChanged?: boolean // EC-05: True if stock level changed after adding to cart
}

export type PaymentType = "Cash" | "GCash" | "Tab" | "Split"

export interface PaymentInfo {
  type: PaymentType
  amountTendered?: number
  changeGiven?: number
  gcashReference?: string
  splitComponents?: SplitPaymentComponent[]
}

export interface Cart {
  items: CartItem[]
  discount: number
  customerId: number | null
  customerName: string
  refNumber: string
  // Split payment support (002-pos-mobile-payments)
  payment?: PaymentInfo
}

export function useCart() {
  const [cart, setCart] = useState<Cart>({
    items: [],
    discount: 0,
    customerId: null,
    customerName: "Walk in customer",
    refNumber: "",
  })

  const addToCart = useCallback((product: {
    id: number
    name: string
    price: number
    availability: { maxProducible: number | null }
  }) => {
    setCart((prev) => {
      const existingIndex = prev.items.findIndex((item) => item.id === product.id)

      if (existingIndex >= 0) {
        // Increment quantity
        const items = [...prev.items]
        const item = items[existingIndex]

        // Check stock limit
        if (item.maxQuantity !== null && item.quantity >= item.maxQuantity) {
          return prev // Don't exceed stock
        }

        items[existingIndex] = { ...item, quantity: item.quantity + 1 }
        return { ...prev, items }
      } else {
        // Add new item
        const newItem: CartItem = {
          id: product.id,
          productName: product.name,
          sku: String(product.id),
          price: product.price,
          quantity: 1,
          maxQuantity: product.availability.maxProducible,
        }
        return { ...prev, items: [...prev.items, newItem] }
      }
    })
  }, [])

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    setCart((prev) => {
      const items = prev.items.map((item) => {
        if (item.id === productId) {
          const newQty = Math.max(1, quantity)
          const finalQty = item.maxQuantity !== null
            ? Math.min(newQty, item.maxQuantity)
            : newQty
          return { ...item, quantity: finalQty }
        }
        return item
      })
      return { ...prev, items }
    })
  }, [])

  const removeFromCart = useCallback((productId: number) => {
    setCart((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== productId),
    }))
  }, [])

  const setDiscount = useCallback((discount: number) => {
    setCart((prev) => ({ ...prev, discount: Math.max(0, discount) }))
  }, [])

  const setCustomer = useCallback((customerId: number | null, customerName: string) => {
    setCart((prev) => ({ ...prev, customerId, customerName }))
  }, [])

  const setRefNumber = useCallback((refNumber: string) => {
    setCart((prev) => ({ ...prev, refNumber }))
  }, [])

  const clearCart = useCallback(() => {
    setCart({
      items: [],
      discount: 0,
      customerId: null,
      customerName: "Walk in customer",
      refNumber: "",
      payment: undefined,
    })
  }, [])

  // Payment info management (002-pos-mobile-payments)
  const setPayment = useCallback((payment: PaymentInfo | undefined) => {
    setCart((prev) => ({ ...prev, payment }))
  }, [])

  const clearPayment = useCallback(() => {
    setCart((prev) => ({ ...prev, payment: undefined }))
  }, [])

  const loadOrder = useCallback((order: {
    items: CartItem[]
    discount: number
    customerId: number | null
    customerName: string
    refNumber: string
    payment?: PaymentInfo
  }) => {
    setCart(order)
  }, [])

  // Calculate totals
  const subtotal = cart.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )
  const discountedSubtotal = Math.max(0, subtotal - cart.discount)

  return {
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    setDiscount,
    setCustomer,
    setRefNumber,
    clearCart,
    loadOrder,
    // Payment methods (002-pos-mobile-payments)
    setPayment,
    clearPayment,
    // Calculated values
    subtotal,
    discountedSubtotal,
    itemCount: cart.items.length,
  }
}
