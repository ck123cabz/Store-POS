import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    if (!body.orders || !Array.isArray(body.orders)) {
      return NextResponse.json(
        { error: "orders array is required" },
        { status: 400 }
      )
    }

    // Validate each order item
    for (const order of body.orders) {
      if (typeof order.id !== "number" || typeof order.displayOrder !== "number") {
        return NextResponse.json(
          { error: "Each order must have numeric id and displayOrder" },
          { status: 400 }
        )
      }
    }

    // Update all orders in a transaction
    await prisma.$transaction(
      body.orders.map((order: { id: number; displayOrder: number }) =>
        prisma.kitchenOrder.update({
          where: { id: order.id },
          data: { displayOrder: order.displayOrder },
        })
      )
    )

    return NextResponse.json({ message: "Orders reordered successfully" })
  } catch (error) {
    console.error("Failed to reorder kitchen orders:", error)
    return NextResponse.json(
      { error: "Failed to reorder kitchen orders" },
      { status: 500 }
    )
  }
}
