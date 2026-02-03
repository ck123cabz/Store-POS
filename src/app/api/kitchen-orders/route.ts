import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const since = searchParams.get("since")

    // Get active orders (not served or cancelled)
    const orders = await prisma.kitchenOrder.findMany({
      where: {
        status: {
          in: ["new", "cooking", "ready"],
        },
      },
      include: {
        items: true,
      },
      orderBy: [
        { isRush: "desc" },
        { displayOrder: "asc" },
        { sentAt: "asc" },
      ],
    })

    // Calculate seconds in current status for each order
    const now = new Date()
    const ordersWithTiming = orders.map((order) => {
      let statusStartTime: Date
      switch (order.status) {
        case "ready":
          statusStartTime = order.readyAt || order.sentAt
          break
        case "cooking":
          statusStartTime = order.cookingAt || order.sentAt
          break
        default:
          statusStartTime = order.sentAt
      }
      const secondsInStatus = Math.floor(
        (now.getTime() - statusStartTime.getTime()) / 1000
      )

      return {
        ...order,
        secondsInStatus,
      }
    })

    // Check if there are new orders since the provided timestamp
    let hasNewSince = false
    if (since) {
      const sinceDate = new Date(since)
      hasNewSince = orders.some((order) => order.sentAt > sinceDate)
    }

    return NextResponse.json({
      orders: ordersWithTiming,
      hasNewSince,
    })
  } catch (error) {
    console.error("Failed to fetch kitchen orders:", error)
    return NextResponse.json(
      { error: "Failed to fetch kitchen orders" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    if (!body.transactionId || !body.orderNumber || !body.items?.length) {
      return NextResponse.json(
        { error: "transactionId, orderNumber, and items are required" },
        { status: 400 }
      )
    }

    const kitchenOrder = await prisma.kitchenOrder.create({
      data: {
        transactionId: body.transactionId,
        orderNumber: body.orderNumber,
        status: "new",
        items: {
          create: body.items.map((item: { productId: number; productName: string; quantity: number }) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: true,
      },
    })

    return NextResponse.json(kitchenOrder)
  } catch (error) {
    console.error("Failed to create kitchen order:", error)
    return NextResponse.json(
      { error: "Failed to create kitchen order" },
      { status: 500 }
    )
  }
}
