import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const kitchenOrder = await prisma.kitchenOrder.findUnique({
      where: { id: parseInt(id) },
      include: { items: true },
    })

    if (!kitchenOrder) {
      return NextResponse.json({ error: "Kitchen order not found" }, { status: 404 })
    }

    return NextResponse.json(kitchenOrder)
  } catch (error) {
    console.error("Failed to fetch kitchen order:", error)
    return NextResponse.json(
      { error: "Failed to fetch kitchen order" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Build update data based on what's provided
    const updateData: {
      status?: string
      isRush?: boolean
      displayOrder?: number
      cookingAt?: Date
      readyAt?: Date
      servedAt?: Date
    } = {}

    if (body.status !== undefined) {
      const validStatuses = ["new", "cooking", "ready", "served", "cancelled"]
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
          { status: 400 }
        )
      }
      updateData.status = body.status

      // Set timestamps based on status change
      const now = new Date()
      if (body.status === "cooking") {
        updateData.cookingAt = now
      } else if (body.status === "ready") {
        updateData.readyAt = now
      } else if (body.status === "served") {
        updateData.servedAt = now
      }
    }

    if (body.isRush !== undefined) {
      updateData.isRush = body.isRush
    }

    if (body.displayOrder !== undefined) {
      updateData.displayOrder = body.displayOrder
    }

    const kitchenOrder = await prisma.kitchenOrder.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: { items: true },
    })

    return NextResponse.json(kitchenOrder)
  } catch (error) {
    console.error("Failed to update kitchen order:", error)
    return NextResponse.json(
      { error: "Failed to update kitchen order" },
      { status: 500 }
    )
  }
}
