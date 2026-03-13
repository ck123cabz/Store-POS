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
    const logType = searchParams.get("logType") // "ingredient" | "general" | null (both)
    const source = searchParams.get("source")
    const entity = searchParams.get("entity")
    const userId = searchParams.get("userId")
    const ingredientId = searchParams.get("ingredientId")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    const skip = (page - 1) * limit

    // Date range helper
    const dateRange = (dateFrom || dateTo)
      ? {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo && { lte: new Date(dateTo + "T23:59:59.999Z") }),
        }
      : undefined

    // ═══════════════════════════════════════════════════════════════════════
    // Fetch ingredient history logs
    // ═══════════════════════════════════════════════════════════════════════
    const fetchIngredientLogs = logType !== "general"
    let ingredientLogs: Array<{
      logType: "ingredient"
      id: number
      changeId: string
      ingredientId: number
      ingredientName: string
      unit: string
      field: string
      oldValue: string
      newValue: string
      change: string | null
      source: string
      reason: string | null
      reasonNote: string | null
      userId: number
      userName: string
      createdAt: Date
    }> = []
    let ingredientTotal = 0

    if (fetchIngredientLogs && !entity) {
      const where: Prisma.IngredientHistoryWhereInput = {}
      if (source) where.source = source
      if (userId) where.userId = parseInt(userId)
      if (ingredientId) where.ingredientId = parseInt(ingredientId)
      if (dateRange) where.createdAt = dateRange

      const [logs, total] = await Promise.all([
        prisma.ingredientHistory.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: logType === "ingredient" ? skip : 0,
          take: logType === "ingredient" ? limit : limit * 2,
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
                baseUnit: { select: { name: true } },
              },
            },
          },
        }),
        prisma.ingredientHistory.count({ where }),
      ])

      ingredientTotal = total
      ingredientLogs = logs.map((log) => ({
        logType: "ingredient" as const,
        id: log.id,
        changeId: log.changeId,
        ingredientId: log.ingredientId,
        ingredientName: log.ingredientName,
        unit: log.ingredient.baseUnit.name,
        field: log.field,
        oldValue: log.oldValue,
        newValue: log.newValue,
        change: log.field === "stockQty"
          ? (parseFloat(log.newValue) - parseFloat(log.oldValue)).toFixed(2)
          : null,
        source: log.source,
        reason: log.reason,
        reasonNote: log.reasonNote,
        userId: log.userId,
        userName: log.userName,
        createdAt: log.createdAt,
      }))
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Fetch general audit logs
    // ═══════════════════════════════════════════════════════════════════════
    const fetchGeneralLogs = logType !== "ingredient"
    let generalLogs: Array<{
      logType: "general"
      id: number
      entity: string
      entityId: number | null
      action: string
      changes: unknown
      summary: string
      userId: number | null
      userName: string | null
      createdAt: Date
    }> = []
    let generalTotal = 0

    if (fetchGeneralLogs) {
      const where: Prisma.AuditLogWhereInput = {}
      if (entity) where.entity = entity
      if (userId) where.userId = parseInt(userId)
      if (dateRange) where.createdAt = dateRange
      // Map source filter to action for general logs
      if (source) where.action = source

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: logType === "general" ? skip : 0,
          take: logType === "general" ? limit : limit * 2,
        }),
        prisma.auditLog.count({ where }),
      ])

      generalTotal = total
      generalLogs = logs.map((log) => ({
        logType: "general" as const,
        id: log.id,
        entity: log.entity,
        entityId: log.entityId,
        action: log.action,
        changes: log.changes,
        summary: log.summary,
        userId: log.userId,
        userName: log.userName,
        createdAt: log.createdAt,
      }))
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Merge and paginate
    // ═══════════════════════════════════════════════════════════════════════

    if (logType === "ingredient") {
      // Return ingredient-only (backward compatible)
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
        total: ingredientTotal,
        totalPages: Math.ceil(ingredientTotal / limit),
        logType: "ingredient",
        filters: {
          sources: sources.map((s) => s.source),
          users: users.map((u) => ({ id: u.userId, name: u.userName })),
        },
        logs: ingredientLogs,
      })
    }

    if (logType === "general") {
      // Return general-only
      const [entities, users] = await Promise.all([
        prisma.auditLog.findMany({
          select: { entity: true },
          distinct: ["entity"],
        }),
        prisma.auditLog.findMany({
          where: { userId: { not: null } },
          select: { userId: true, userName: true },
          distinct: ["userId"],
        }),
      ])

      return NextResponse.json({
        page,
        limit,
        total: generalTotal,
        totalPages: Math.ceil(generalTotal / limit),
        logType: "general",
        filters: {
          entities: entities.map((e) => e.entity),
          users: users.filter((u) => u.userId !== null).map((u) => ({ id: u.userId, name: u.userName })),
        },
        logs: generalLogs,
      })
    }

    // Default: merged view — interleave by createdAt desc
    const merged = [
      ...ingredientLogs.map((log) => ({ ...log, _sortDate: log.createdAt })),
      ...generalLogs.map((log) => ({ ...log, _sortDate: log.createdAt })),
    ]
      .sort((a, b) => new Date(b._sortDate).getTime() - new Date(a._sortDate).getTime())
      .slice(skip, skip + limit)

    const total = ingredientTotal + generalTotal

    // Get filter options from both tables
    const [ihSources, ihUsers, alEntities, alUsers] = await Promise.all([
      prisma.ingredientHistory.findMany({
        select: { source: true },
        distinct: ["source"],
      }),
      prisma.ingredientHistory.findMany({
        select: { userId: true, userName: true },
        distinct: ["userId"],
      }),
      prisma.auditLog.findMany({
        select: { entity: true },
        distinct: ["entity"],
      }),
      prisma.auditLog.findMany({
        where: { userId: { not: null } },
        select: { userId: true, userName: true },
        distinct: ["userId"],
      }),
    ])

    // Merge user filter lists (deduplicate by id)
    const allUsersMap = new Map<number, string>()
    for (const u of ihUsers) allUsersMap.set(u.userId, u.userName)
    for (const u of alUsers) {
      if (u.userId !== null && u.userName !== null) {
        allUsersMap.set(u.userId, u.userName)
      }
    }

    return NextResponse.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      logType: "all",
      filters: {
        sources: ihSources.map((s) => s.source),
        entities: alEntities.map((e) => e.entity),
        users: Array.from(allUsersMap.entries()).map(([id, name]) => ({ id, name })),
      },
      logs: merged.map(({ _sortDate: _, ...log }) => log),
    })
  } catch (error) {
    console.error("Failed to fetch audit log:", error)
    return NextResponse.json({ error: "Failed to fetch audit log" }, { status: 500 })
  }
}
