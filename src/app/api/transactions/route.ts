import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { Prisma } from "@prisma/client"
import { validateCashPayment } from "@/lib/payment-validation"
import { validateTabPayment } from "@/lib/credit-limit-validation"

interface TransactionItem {
  id: number
  productName: string
  sku?: string
  price: number
  quantity: number
  categoryId?: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// KITCHEN ORDER BOARD - Check if a product requires kitchen preparation
// ═══════════════════════════════════════════════════════════════════════════════

async function productRequiresKitchen(productId: number): Promise<boolean> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { category: true },
  })

  if (!product) return false

  // Product-level override takes precedence
  if (product.requiresKitchen !== null) {
    return product.requiresKitchen
  }

  // Fall back to category default
  return product.category?.requiresKitchen ?? false
}

// Determine daypart based on hour
function getDaypart(date: Date): string {
  const hour = date.getHours()
  if (hour >= 6 && hour < 10) return "Morning"
  if (hour >= 10 && hour < 14) return "Midday"
  if (hour >= 14 && hour < 18) return "Afternoon"
  return "Evening"
}

// Determine day type
function getDayType(date: Date): string {
  const day = date.getDay()
  if (day === 0 || day === 6) return "Weekend"
  return "Weekday"
}

// ═══════════════════════════════════════════════════════════════════════════════
// GCASH PHOTO STORAGE - Validate and return base64 data URL for DB storage
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate a base64 GCash photo data URL.
 * Returns the data URL as-is if valid, null otherwise.
 */
function validateGCashPhoto(base64Data: string): string | null {
  const match = base64Data.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/)
  if (!match) return null

  const buffer = Buffer.from(match[2], "base64")

  // Skip files over 5MB
  if (buffer.length > 5 * 1024 * 1024) return null

  return base64Data
}

// Check if category is beverage (categoryId 2 in our seed data)
const BEVERAGE_CATEGORY_ID = 2

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const onHold = searchParams.get("onHold")
    const customerOrders = searchParams.get("customerOrders")
    const userId = searchParams.get("userId")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const till = searchParams.get("till")
    const daypart = searchParams.get("daypart")
    const includeVoided = searchParams.get("includeVoided") === "true"

    const where: Prisma.TransactionWhereInput = {}

    // By default, exclude voided transactions unless explicitly requested
    if (!includeVoided) {
      where.isVoided = false
    }

    if (onHold === "true") {
      where.status = 0
      where.refNumber = { not: "" }
    } else if (customerOrders === "true") {
      where.status = 0
      where.customerId = { not: null }
      where.refNumber = ""
    } else if (status !== null && status !== "") {
      where.status = parseInt(status)
    }

    // Additional filters for transaction history
    if (userId) {
      where.userId = parseInt(userId)
    }

    if (till) {
      where.tillNumber = parseInt(till)
    }

    if (daypart) {
      where.daypart = daypart
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        // Include the entire end day
        where.createdAt.lte = new Date(dateTo + "T23:59:59.999Z")
      }
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        items: true,
        customer: true,
        user: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    return NextResponse.json(transactions)
  } catch {
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const orderNumber = Math.floor(Date.now() / 1000)
    const now = new Date()

    // ═══════════════════════════════════════════════════════════════════════════
    // PAYMENT VALIDATION (002-pos-mobile-payments)
    // ═══════════════════════════════════════════════════════════════════════════

    // T067: Idempotency key handling for offline transaction deduplication
    if (body.idempotencyKey) {
      const existingTransaction = await prisma.transaction.findUnique({
        where: { idempotencyKey: body.idempotencyKey },
      })
      if (existingTransaction) {
        // Transaction already exists - return it instead of creating duplicate
        return NextResponse.json(existingTransaction)
      }
    }

    // T019/T020: Validate payment when completing a paid transaction (status=1)
    if (body.status === 1) {
      const paymentType = body.paymentType || ""
      const total = Number(body.total)
      const paidAmount = Number(body.paidAmount) || 0

      // Cash payment validation: tendered amount must cover total
      if (paymentType === "Cash") {
        const validation = validateCashPayment(total, paidAmount)
        if (!validation.valid) {
          return NextResponse.json(
            { error: validation.error || "Invalid cash payment" },
            { status: 400 }
          )
        }
      }

      // GCash payment: must have photo proof or reference
      if (paymentType === "GCash") {
        const info = body.paymentInfo?.trim()
        if (!info) {
          return NextResponse.json(
            { error: "GCash payment proof is required" },
            { status: 400 }
          )
        }

        // If paymentInfo is base64 photo data, validate and store as data URL
        if (info.startsWith("data:image")) {
          const validatedPhoto = validateGCashPhoto(info)
          if (validatedPhoto) {
            body.gcashPhotoPath = validatedPhoto
            body.paymentInfo = "photo:gcash-proof"
          } else {
            return NextResponse.json(
              { error: "Invalid GCash payment photo" },
              { status: 400 }
            )
          }
        }
      }

      // Split payment: validate sum of components >= total
      if (paymentType === "Split") {
        try {
          const splitData = JSON.parse(body.paymentInfo || "{}")
          const splitTotal = splitData.totalPaid || 0
          if (splitTotal < total) {
            return NextResponse.json(
              { error: `Split payment total (${splitTotal}) is less than transaction total (${total})` },
              { status: 400 }
            )
          }
        } catch {
          return NextResponse.json(
            { error: "Invalid split payment data" },
            { status: 400 }
          )
        }
      }

      // T046/T047: Tab payment validation - credit limit and tab status
      if (paymentType === "Tab") {
        if (!body.customerId) {
          return NextResponse.json(
            { error: "Tab payment requires a customer selection" },
            { status: 400 }
          )
        }

        // Fetch customer tab info
        const customer = await prisma.customer.findUnique({
          where: { id: body.customerId },
          select: {
            id: true,
            name: true,
            tabBalance: true,
            creditLimit: true,
            tabStatus: true,
          },
        })

        if (!customer) {
          return NextResponse.json(
            { error: "Customer not found" },
            { status: 404 }
          )
        }

        // Validate tab payment against credit limit and status
        const tabValidation = validateTabPayment({
          amount: total,
          currentBalance: Number(customer.tabBalance),
          creditLimit: Number(customer.creditLimit),
          tabStatus: customer.tabStatus as "active" | "suspended" | "frozen",
          allowOverride: body.overrideCreditLimit === true,
        })

        if (!tabValidation.valid) {
          return NextResponse.json(
            { error: tabValidation.error },
            { status: 400 }
          )
        }

        // Store override info in paymentInfo for audit purposes
        if (tabValidation.overrideApplied) {
          body.paymentInfo = JSON.stringify({
            type: "credit_limit_override",
            overriddenBy: session.user.id,
            overriddenAt: new Date().toISOString(),
            previousLimit: Number(customer.creditLimit),
            newBalance: tabValidation.newBalance,
          })
        }
      }
    }

    // Determine payment status (for GCash pending/confirmed workflow)
    const paymentStatus = body.paymentType === "GCash"
      ? (body.paymentStatus || "pending")
      : body.status === 1
        ? "confirmed"
        : null

    // ═══════════════════════════════════════════════════════════════════════════
    // 10-LEVER ENHANCEMENTS
    // ═══════════════════════════════════════════════════════════════════════════

    // LEVER 5: Daypart Economics - Determine daypart
    const daypart = body.daypart || getDaypart(now)
    const dayType = body.dayType || getDayType(now)

    // Get product categories for ticket analysis
    const productIds = body.items.map((item: TransactionItem) => item.id)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, categoryId: true },
    })
    const productCategoryMap = new Map(products.map((p) => [p.id, p.categoryId]))

    // LEVER 3: Ticket Size Analysis
    const itemCount = body.items.reduce((sum: number, item: TransactionItem) => sum + item.quantity, 0)

    // Check if all items are beverages (drink-only)
    const isDrinkOnly = body.items.every((item: TransactionItem) => {
      const categoryId = item.categoryId || productCategoryMap.get(item.id)
      return categoryId === BEVERAGE_CATEGORY_ID
    })

    // Check if any item is food
    const hasFoodAttached = body.items.some((item: TransactionItem) => {
      const categoryId = item.categoryId || productCategoryMap.get(item.id)
      return categoryId !== BEVERAGE_CATEGORY_ID
    })

    // Group order: 3+ items or total >= 250
    const isGroupOrder = itemCount >= 3 || Number(body.total) >= 250

    // ═══════════════════════════════════════════════════════════════════════════

    // Generate saleChangeId outside transaction for audit trail consistency
    const { nanoid } = await import("nanoid")
    const saleChangeId = nanoid(10)

    // Use Prisma interactive transaction for atomicity (Principle IV: Data Integrity)
    // All operations succeed together or fail together - no partial state
    const transaction = await prisma.$transaction(async (tx) => {
      // Create the transaction with items
      const newTransaction = await tx.transaction.create({
        data: {
          orderNumber,
          refNumber: body.refNumber || "",
          discount: body.discount || 0,
          customerId: body.customerId,
          userId: parseInt(session.user.id),
          status: body.status,
          subtotal: body.subtotal,
          taxAmount: body.taxAmount || 0,
          total: body.total,
          paidAmount: body.paidAmount,
          changeAmount: body.changeAmount,
          paymentType: body.paymentType || "",
          paymentInfo: body.paymentInfo || "",
          // 002-pos-mobile-payments fields
          paymentStatus,
          gcashPhotoPath: body.gcashPhotoPath || null,
          idempotencyKey: body.idempotencyKey || null,
          tillNumber: body.tillNumber || 1,
          macAddress: body.macAddress || "",
          // 10-Lever fields
          weather: body.weather || null,
          courtStatus: body.courtStatus || null,
          dayType,
          itemCount,
          isDrinkOnly,
          hasFoodAttached,
          isGroupOrder,
          daypart,
          items: {
            create: body.items.map((item: TransactionItem) => ({
              productId: item.id,
              productName: item.productName,
              sku: item.sku || String(item.id),
              price: item.price,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          items: true,
        },
      })

      // ═══════════════════════════════════════════════════════════════════════════
      // KITCHEN ORDER BOARD - Auto-create kitchen order for food items
      // ═══════════════════════════════════════════════════════════════════════════

      // Check which items require kitchen preparation
      const kitchenItems: { productId: number; productName: string; quantity: number }[] = []

      for (const item of body.items) {
        const requiresKitchen = await productRequiresKitchen(item.id)
        if (requiresKitchen) {
          kitchenItems.push({
            productId: item.id,
            productName: item.productName,
            quantity: item.quantity,
          })
        }
      }

      // Create kitchen order if there are kitchen items and order is being paid
      let kitchenOrderId: number | null = null
      if (kitchenItems.length > 0 && body.status === 1) {
        const kitchenOrder = await tx.kitchenOrder.create({
          data: {
            transactionId: newTransaction.id,
            orderNumber: newTransaction.orderNumber,
            status: "new",
            items: {
              create: kitchenItems,
            },
          },
        })
        kitchenOrderId = kitchenOrder.id
      }

      // Decrement stock if paid (all within same transaction for atomicity)
      if (body.status === 1 && body.paidAmount >= body.total) {
        for (const item of body.items) {
          const product = await tx.product.findUnique({
            where: { id: item.id },
            include: {
              linkedVariant: {
                include: { ingredient: true },
              },
              recipeItems: {
                include: {
                  ingredient: { include: { baseUnit: true } },
                },
              },
            },
          })

          if (!product) continue

          // Decrement product stock if tracked
          if (product.trackStock) {
            await tx.product.update({
              where: { id: item.id },
              data: {
                quantity: { decrement: item.quantity },
                weeklyUnitsSold: { increment: item.quantity },
              },
            })
          }

          // Variant-linked products: deduct baseUnitsPerVariant from ingredient stockQty
          if (product.linkedVariantId && product.linkedVariant) {
            const variant = product.linkedVariant
            const ingredient = variant.ingredient
            const baseUnitsPerVariant = Number(variant.baseUnitsPerVariant)
            const deduction = baseUnitsPerVariant * item.quantity
            const oldStockQty = Number(ingredient.stockQty)
            const newStockQty = Math.max(0, oldStockQty - deduction)

            await tx.ingredient.update({
              where: { id: ingredient.id },
              data: {
                stockQty: newStockQty,
                lastUpdated: new Date(),
              },
            })

            await tx.ingredientHistory.create({
              data: {
                ingredientId: ingredient.id,
                ingredientName: ingredient.name,
                changeId: saleChangeId,
                field: "stockQty",
                oldValue: oldStockQty.toString(),
                newValue: newStockQty.toString(),
                source: "sale",
                reason: "sale",
                reasonNote: `Sold ${item.quantity}x ${product.name} (Order #${orderNumber})`,
                purchaseVariantId: variant.id,
                userId: parseInt(session.user.id),
                userName: session.user.name || "Unknown",
              },
            })
          }

          // Recipe ingredients: deduct baseQuantity * itemQty from ingredient stockQty
          if (product.recipeItems.length > 0) {
            for (const recipeItem of product.recipeItems) {
              const ingredient = recipeItem.ingredient
              const baseUnitsPerProduct = Number(recipeItem.baseQuantity) || Number(recipeItem.quantity)
              const totalBaseUnits = baseUnitsPerProduct * item.quantity
              const oldStockQty = Number(ingredient.stockQty)
              const newStockQty = Math.max(0, oldStockQty - totalBaseUnits)

              await tx.ingredient.update({
                where: { id: ingredient.id },
                data: {
                  stockQty: newStockQty,
                  lastUpdated: new Date(),
                },
              })

              await tx.ingredientHistory.create({
                data: {
                  ingredientId: ingredient.id,
                  ingredientName: ingredient.name,
                  changeId: saleChangeId,
                  field: "stockQty",
                  oldValue: oldStockQty.toString(),
                  newValue: newStockQty.toString(),
                  source: "sale",
                  reason: "sale",
                  reasonNote: `Recipe: ${item.quantity}x ${product.name} used ${totalBaseUnits} ${ingredient.baseUnit.name} (Order #${orderNumber})`,
                  userId: parseInt(session.user.id),
                  userName: session.user.name || "Unknown",
                },
              })
            }
          }
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // LEVER 7: Repeat Rate - Update customer metrics on paid transaction
        // ═══════════════════════════════════════════════════════════════════════════
        if (body.customerId) {
          const customer = await tx.customer.findUnique({
            where: { id: body.customerId },
          })

          if (customer) {
            const newVisitCount = customer.visitCount + 1
            const newLifetimeSpend = Number(customer.lifetimeSpend) + Number(body.total)
            const newAvgTicket = newLifetimeSpend / newVisitCount

            await tx.customer.update({
              where: { id: body.customerId },
              data: {
                visitCount: newVisitCount,
                lifetimeSpend: newLifetimeSpend,
                avgTicket: Math.round(newAvgTicket * 100) / 100,
                lastVisit: now,
                firstVisit: customer.firstVisit || now,
                isRegular: newVisitCount >= 5,
              },
            })
          }
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // T046: Tab Payment - Atomic balance update (002-pos-mobile-payments)
        // ═══════════════════════════════════════════════════════════════════════════
        if (body.paymentType === "Tab" && body.customerId) {
          // Update customer's tab balance atomically
          await tx.customer.update({
            where: { id: body.customerId },
            data: {
              tabBalance: {
                increment: Number(body.total),
              },
            },
          })


        }
      }

      return { ...newTransaction, kitchenOrderId }
    }, { timeout: 15000 })

    return NextResponse.json({
      ...transaction,
      kitchenStatus: transaction.kitchenOrderId ? "new" : null,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 })
  }
}
