import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

/**
 * PUT /api/categories/reorder
 *
 * Updates the displayOrder for multiple categories in a single transaction.
 *
 * Request body:
 * {
 *   orders: [
 *     { id: 1, displayOrder: 0 },
 *     { id: 2, displayOrder: 1 },
 *     ...
 *   ]
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!session.user.permCategories) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 })
    }

    const body = await request.json()

    if (!body.orders || !Array.isArray(body.orders)) {
      return NextResponse.json(
        { error: "orders array is required" },
        { status: 400 }
      )
    }

    // Validate each order item has required fields
    for (const order of body.orders) {
      if (typeof order.id !== "number" || typeof order.displayOrder !== "number") {
        return NextResponse.json(
          { error: "Each order item must have numeric id and displayOrder" },
          { status: 400 }
        )
      }
    }

    // Update all categories in a transaction
    await prisma.$transaction(
      body.orders.map((order: { id: number; displayOrder: number }) =>
        prisma.category.update({
          where: { id: order.id },
          data: { displayOrder: order.displayOrder },
        })
      )
    )

    return NextResponse.json({ message: "Categories reordered successfully" })
  } catch (error) {
    console.error("Failed to reorder categories:", error)
    return NextResponse.json(
      { error: "Failed to reorder categories" },
      { status: 500 }
    )
  }
}
