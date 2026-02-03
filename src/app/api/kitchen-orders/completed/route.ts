import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get today's start
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const orders = await prisma.kitchenOrder.findMany({
      where: {
        status: "served",
        servedAt: {
          gte: today,
        },
      },
      include: {
        items: true,
      },
      orderBy: {
        servedAt: "desc",
      },
    })

    return NextResponse.json({ orders })
  } catch (error) {
    console.error("Failed to fetch completed orders:", error)
    return NextResponse.json(
      { error: "Failed to fetch completed orders" },
      { status: 500 }
    )
  }
}
