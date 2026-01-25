import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    const where: { date?: { gte?: Date; lte?: Date } } = {}

    if (dateFrom || dateTo) {
      where.date = {}
      if (dateFrom) where.date.gte = new Date(dateFrom)
      if (dateTo) where.date.lte = new Date(dateTo + "T23:59:59.999Z")
    }

    const wasteLogs = await prisma.wasteLog.findMany({
      where,
      include: { ingredient: true },
      orderBy: { date: "desc" },
      take: 100,
    })

    const formatted = wasteLogs.map((w) => ({
      id: w.id,
      date: w.date,
      ingredientId: w.ingredientId,
      ingredientName: w.ingredient.name,
      quantity: Number(w.quantity),
      unit: w.ingredient.unit,
      reason: w.reason,
      estimatedCost: Number(w.estimatedCost),
      preventable: w.preventable,
      notes: w.notes,
    }))

    // Calculate totals
    const totalCost = formatted.reduce((sum, w) => sum + w.estimatedCost, 0)
    const preventableCost = formatted.reduce(
      (sum, w) => sum + (w.preventable ? w.estimatedCost : 0),
      0
    )

    return NextResponse.json({
      items: formatted,
      summary: {
        totalEntries: formatted.length,
        totalCost: Math.round(totalCost * 100) / 100,
        preventableCost: Math.round(preventableCost * 100) / 100,
        preventablePercent: totalCost > 0 ? Math.round((preventableCost / totalCost) * 100) : 0,
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch waste logs" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Get ingredient to calculate cost
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: body.ingredientId },
    })

    if (!ingredient) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 })
    }

    const estimatedCost = Number(body.quantity) * Number(ingredient.costPerUnit)

    const wasteLog = await prisma.wasteLog.create({
      data: {
        date: body.date ? new Date(body.date) : new Date(),
        ingredientId: body.ingredientId,
        quantity: body.quantity,
        reason: body.reason,
        estimatedCost: Math.round(estimatedCost * 100) / 100,
        preventable: body.preventable || false,
        notes: body.notes || null,
      },
      include: { ingredient: true },
    })

    return NextResponse.json({
      id: wasteLog.id,
      date: wasteLog.date,
      ingredientId: wasteLog.ingredientId,
      ingredientName: wasteLog.ingredient.name,
      quantity: Number(wasteLog.quantity),
      unit: wasteLog.ingredient.unit,
      reason: wasteLog.reason,
      estimatedCost: Number(wasteLog.estimatedCost),
      preventable: wasteLog.preventable,
      notes: wasteLog.notes,
    }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create waste log" }, { status: 500 })
  }
}
