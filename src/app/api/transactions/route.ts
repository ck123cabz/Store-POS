import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { Prisma } from "@prisma/client"

interface TransactionItem {
  id: number
  productName: string
  sku?: string
  price: number
  quantity: number
  categoryId?: number
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

// Check if category is beverage (categoryId 2 in our seed data)
const BEVERAGE_CATEGORY_ID = 2

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const onHold = searchParams.get("onHold")
    const customerOrders = searchParams.get("customerOrders")
    const userId = searchParams.get("userId")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const till = searchParams.get("till")
    const daypart = searchParams.get("daypart")

    const where: Prisma.TransactionWhereInput = {}

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

    const transaction = await prisma.transaction.create({
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

    // Decrement stock if paid
    if (body.status === 1 && body.paidAmount >= body.total) {
      const { nanoid } = await import("nanoid")
      const saleChangeId = nanoid(10)

      for (const item of body.items) {
        const product = await prisma.product.findUnique({
          where: { id: item.id },
          include: {
            linkedIngredient: true,
            recipeItems: {
              include: { ingredient: true },
            },
          },
        })

        if (!product) continue

        // Decrement product stock if tracked
        if (product.trackStock) {
          await prisma.product.update({
            where: { id: item.id },
            data: {
              quantity: { decrement: item.quantity },
              weeklyUnitsSold: { increment: item.quantity },
            },
          })
        }

        // Phase 4: Decrement linked ingredient (for directly-linked products like "Bottled Water")
        if (product.linkedIngredientId && product.linkedIngredient) {
          const ingredient = product.linkedIngredient
          const oldQty = Number(ingredient.quantity)
          const newQty = Math.max(0, oldQty - item.quantity)

          await prisma.ingredient.update({
            where: { id: ingredient.id },
            data: {
              quantity: newQty,
              lastUpdated: new Date(),
            },
          })

          // Log to ingredient history
          await prisma.ingredientHistory.create({
            data: {
              ingredientId: ingredient.id,
              ingredientName: ingredient.name,
              changeId: saleChangeId,
              field: "quantity",
              oldValue: oldQty.toString(),
              newValue: newQty.toString(),
              source: "sale",
              reason: "sale",
              reasonNote: `Sold ${item.quantity}x ${product.name} (Order #${orderNumber})`,
              userId: parseInt(session.user.id),
              userName: session.user.name || "Unknown",
            },
          })
        }

        // Phase 4: Decrement recipe ingredients (for products with recipes)
        if (product.recipeItems.length > 0) {
          for (const recipeItem of product.recipeItems) {
            const ingredient = recipeItem.ingredient
            const usagePerUnit = Number(recipeItem.quantity)
            const totalUsage = usagePerUnit * item.quantity
            const oldQty = Number(ingredient.quantity)
            const newQty = Math.max(0, oldQty - totalUsage)

            await prisma.ingredient.update({
              where: { id: ingredient.id },
              data: {
                quantity: newQty,
                lastUpdated: new Date(),
              },
            })

            // Log to ingredient history
            await prisma.ingredientHistory.create({
              data: {
                ingredientId: ingredient.id,
                ingredientName: ingredient.name,
                changeId: saleChangeId,
                field: "quantity",
                oldValue: oldQty.toString(),
                newValue: newQty.toString(),
                source: "sale",
                reason: "sale",
                reasonNote: `Recipe: ${item.quantity}x ${product.name} used ${totalUsage} ${ingredient.unit} (Order #${orderNumber})`,
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
        const customer = await prisma.customer.findUnique({
          where: { id: body.customerId },
        })

        if (customer) {
          const newVisitCount = customer.visitCount + 1
          const newLifetimeSpend = Number(customer.lifetimeSpend) + Number(body.total)
          const newAvgTicket = newLifetimeSpend / newVisitCount

          await prisma.customer.update({
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
    }

    return NextResponse.json(transaction)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 })
  }
}
