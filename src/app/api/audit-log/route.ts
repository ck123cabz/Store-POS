import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { Prisma } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!session.user.permAuditLog) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const source = searchParams.get("source")
    const userId = searchParams.get("userId")
    const ingredientId = searchParams.get("ingredientId")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    const skip = (page - 1) * limit

    // Build where clause
    const where: Prisma.IngredientHistoryWhereInput = {}

    if (source) {
      where.source = source
    }

    if (userId) {
      where.userId = parseInt(userId)
    }

    if (ingredientId) {
      where.ingredientId = parseInt(ingredientId)
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo + "T23:59:59.999Z")
      }
    }

    const [logs, total] = await Promise.all([
      prisma.ingredientHistory.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          ingredient: {
            select: {
              id: true,
              name: true,
              unit: true,
            },
          },
        },
      }),
      prisma.ingredientHistory.count({ where }),
    ])

    // Get distinct sources and users for filter options
    const [sources, users] = await Promise.all([
      prisma.ingredientHistory.findMany({
        select: { source: true },
        distinct: ["source"],
      }),
      prisma.ingredientHistory.findMany({
        select: { userId: true, userName: true },
        distinct: ["userId"],
      }),
    ])

    return NextResponse.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      filters: {
        sources: sources.map((s) => s.source),
        users: users.map((u) => ({ id: u.userId, name: u.userName })),
      },
      logs: logs.map((log) => ({
        id: log.id,
        changeId: log.changeId,
        ingredientId: log.ingredientId,
        ingredientName: log.ingredientName,
        unit: log.ingredient.unit,
        field: log.field,
        oldValue: log.oldValue,
        newValue: log.newValue,
        change: log.field === "quantity"
          ? (parseFloat(log.newValue) - parseFloat(log.oldValue)).toFixed(2)
          : null,
        source: log.source,
        reason: log.reason,
        reasonNote: log.reasonNote,
        userId: log.userId,
        userName: log.userName,
        createdAt: log.createdAt,
      })),
    })
  } catch (error) {
    console.error("Failed to fetch audit log:", error)
    return NextResponse.json({ error: "Failed to fetch audit log" }, { status: 500 })
  }
}
