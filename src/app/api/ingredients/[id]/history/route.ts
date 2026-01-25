import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ingredientId = parseInt(id)

    // Get pagination params
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit

    // Verify ingredient exists
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
      select: { id: true, name: true },
    })

    if (!ingredient) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 })
    }

    // Get history with pagination
    const [history, total] = await Promise.all([
      prisma.ingredientHistory.findMany({
        where: { ingredientId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.ingredientHistory.count({
        where: { ingredientId },
      }),
    ])

    return NextResponse.json({
      ingredientId,
      ingredientName: ingredient.name,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      history: history.map((h) => ({
        id: h.id,
        changeId: h.changeId,
        field: h.field,
        oldValue: h.oldValue,
        newValue: h.newValue,
        source: h.source,
        reason: h.reason,
        reasonNote: h.reasonNote,
        userId: h.userId,
        userName: h.userName,
        createdAt: h.createdAt,
      })),
    })
  } catch (error) {
    console.error("Failed to fetch ingredient history:", error)
    return NextResponse.json({ error: "Failed to fetch ingredient history" }, { status: 500 })
  }
}
