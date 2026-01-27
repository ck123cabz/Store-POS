"use client"

import { useState, useCallback } from "react"

export interface CartItem {
  id: number
  productName: string
  sku: string
  price: number
  quantity: number
  maxQuantity: number | null // null if stock not tracked
  stockChanged?: boolean // EC-05: True if stock level changed after adding to cart
}

export interface Cart {
  items: CartItem[]
  discount: number
  customerId: number | null
  customerName: string
  refNumber: string
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
    quantity: number
    trackStock: boolean
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
          maxQuantity: product.trackStock ? product.quantity : null,
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
    })
  }, [])

  const loadOrder = useCallback((order: {
    items: CartItem[]
    discount: number
    customerId: number | null
    customerName: string
    refNumber: string
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
    subtotal,
    discountedSubtotal,
    itemCount: cart.items.length,
  }
}
