import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
import { nanoid } from "nanoid"
import {
  calculateStockStatus,
  calculateStockRatio,
} from "@/lib/ingredient-utils"

/**
 * Format ingredient for API response (same as list route)
 */
function formatIngredient(i: Record<string, unknown>) {
  const num = (v: unknown): number => {
    if (v === null || v === undefined) return 0
    return typeof v === "number" ? v : Number(v)
  }

  const baseUnit = i.baseUnit as { id: number; name: string; abbr: string; isDiscrete: boolean }
  const countUnit = i.countUnit as { id: number; name: string; abbr: string } | null
  const vendor = i.vendor as { name: string } | null

  const stockQty = num(i.stockQty)
  const parLevel = num(i.parLevel)

  return {
    id: i.id,
    name: i.name,
    category: i.category,
    baseUnitId: i.baseUnitId,
    baseUnitName: baseUnit.name,
    baseUnitAbbr: baseUnit.abbr,
    stockQty,
    avgCostPerBaseUnit: num(i.avgCostPerBaseUnit),
    parLevel,
    stockStatus: calculateStockStatus(stockQty, parLevel),
    stockRatio: calculateStockRatio(stockQty, parLevel),
    countUnitId: i.countUnitId,
    countUnitName: countUnit?.name || null,
    isOverhead: i.isOverhead,
    overheadPerTransaction: i.overheadPerTransaction ? num(i.overheadPerTransaction) : null,
    yieldFactor: i.yieldFactor ? num(i.yieldFactor) : null,
    vendorId: i.vendorId,
    type: (i.type as string) || "RAW",
    batchYield: i.batchYield ? num(i.batchYield) : null,
    productionInputCount: ((i as Record<string, unknown>)._count as { productionInputs: number })?.productionInputs ?? 0,
    productionInputs: [],
    vendorName: vendor?.name || null,
    lastUpdated: i.lastUpdated ? (i.lastUpdated as Date).toISOString() : null,
    lastRestockDate: i.lastRestockDate ? (i.lastRestockDate as Date).toISOString() : null,

    purchaseVariants: ((i.purchaseVariants as Array<Record<string, unknown>>) || []).map((v) => ({
      id: v.id,
      ingredientId: v.ingredientId,
      label: v.label,
      contentQty: num(v.contentQty),
      contentUnitId: v.contentUnitId,
      contentUnitName: (v.contentUnit as { name: string } | undefined)?.name || null,
      packageQty: v.packageQty,
      packageUnitId: v.packageUnitId,
      packageUnitName: (v.packageUnit as { name: string } | undefined)?.name || null,
      costPerVariant: num(v.costPerVariant),
      baseUnitsPerVariant: num(v.baseUnitsPerVariant),
      vendorId: v.vendorId,
      barcode: v.barcode,
      sku: v.sku,
      isActive: v.isActive,
      isDefault: v.isDefault,
    })),

    unitAliases: ((i.unitAliases as Array<Record<string, unknown>>) || []).map((ua) => ({
      id: ua.id,
      ingredientId: i.id,
      name: ua.name,
      baseUnitMultiplier: num(ua.baseUnitMultiplier),
      description: ua.description,
      isDefault: ua.isDefault,
      unitId: ua.unitId,
      createdAt: (ua.createdAt as Date).toISOString(),
    })),

    usedInProducts: ((i.recipeItems as Array<Record<string, unknown>> | undefined) || []).map((ri) => ({
      productId: ri.productId,
      productName: (ri.product as { name: string }).name,
      quantity: num(ri.quantity),
    })),
  }
}

const ingredientInclude = {
  baseUnit: true,
  countUnit: true,
  vendor: true,
  purchaseVariants: {
    where: { isActive: true },
    include: { contentUnit: true, packageUnit: true },
    orderBy: { isDefault: "desc" as const },
  },
  unitAliases: { orderBy: { createdAt: "asc" as const } },
  recipeItems: { include: { product: true } },
  _count: { select: { productionInputs: true } },
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: parseInt(id) },
      include: ingredientInclude,
    })

    if (!ingredient) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 })
    }

    return NextResponse.json(formatIngredient(ingredient as unknown as Record<string, unknown>))
  } catch {
    return NextResponse.json({ error: "Failed to fetch ingredient" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ingredientId = parseInt(id)
    const body = await request.json()

    const current = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
    })

    if (!current) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 })
    }

    const changeId = `edit_${nanoid(10)}`
    const historyEntries: Parameters<typeof prisma.ingredientHistory.create>[0]["data"][] = []

    // Track stockQty changes
    if (body.stockQty !== undefined && Number(body.stockQty) !== Number(current.stockQty)) {
      historyEntries.push({
        ingredientId,
        ingredientName: current.name,
        changeId,
        field: "stockQty",
        oldValue: current.stockQty.toString(),
        newValue: body.stockQty.toString(),
        source: "manual_edit",
        reason: body.reason || null,
        reasonNote: body.reasonNote || null,
        userId: body.userId || 0,
        userName: body.userName || "System",
      })
    }

    // Track avgCostPerBaseUnit changes
    if (body.avgCostPerBaseUnit !== undefined && Number(body.avgCostPerBaseUnit) !== Number(current.avgCostPerBaseUnit)) {
      historyEntries.push({
        ingredientId,
        ingredientName: current.name,
        changeId,
        field: "avgCostPerBaseUnit",
        oldValue: current.avgCostPerBaseUnit.toString(),
        newValue: body.avgCostPerBaseUnit.toString(),
        source: "manual_edit",
        reason: body.reason || "price_update",
        reasonNote: body.reasonNote || null,
        userId: body.userId || 0,
        userName: body.userName || "System",
      })
    }

    const updateData: Record<string, unknown> = {
      lastUpdated: new Date(),
    }

    // Only set fields that are provided
    if (body.name !== undefined) updateData.name = body.name
    if (body.category !== undefined) updateData.category = body.category
    if (body.baseUnitId !== undefined) updateData.baseUnitId = body.baseUnitId
    if (body.stockQty !== undefined) updateData.stockQty = body.stockQty
    if (body.avgCostPerBaseUnit !== undefined) updateData.avgCostPerBaseUnit = body.avgCostPerBaseUnit
    if (body.parLevel !== undefined) updateData.parLevel = body.parLevel
    if (body.countUnitId !== undefined) updateData.countUnitId = body.countUnitId
    if (body.vendorId !== undefined) updateData.vendorId = body.vendorId
    if (body.isOverhead !== undefined) updateData.isOverhead = body.isOverhead
    if (body.overheadPerTransaction !== undefined) updateData.overheadPerTransaction = body.overheadPerTransaction
    if (body.yieldFactor !== undefined) updateData.yieldFactor = body.yieldFactor === null ? null : parseFloat(String(body.yieldFactor))
    if (body.type !== undefined) updateData.type = body.type
    if (body.batchYield !== undefined) updateData.batchYield = body.batchYield === null ? null : parseFloat(String(body.batchYield))

    const ingredient = await prisma.$transaction(async (tx) => {
      // If changing from PREPARED to RAW, clean up production recipe
      if (body.type === "RAW" && current.type === "PREPARED") {
        await tx.productionRecipeItem.deleteMany({
          where: { outputIngredientId: ingredientId },
        })
      }

      const updated = await tx.ingredient.update({
        where: { id: ingredientId },
        data: updateData,
        include: ingredientInclude,
      })

      for (const entry of historyEntries) {
        await tx.ingredientHistory.create({ data: entry })
      }

      return updated
    })

    await logAudit({
      entity: "ingredient", entityId: ingredientId, action: "update",
      summary: `Updated ingredient '${current.name}'`,
      userId: body.userId || null, userName: body.userName || null,
    })

    return NextResponse.json(formatIngredient(ingredient as unknown as Record<string, unknown>))
  } catch (error) {
    console.error("Failed to update ingredient:", error)
    return NextResponse.json({ error: "Failed to update ingredient" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ingredientId = parseInt(id)

    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
    })

    if (!ingredient) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 })
    }

    await prisma.ingredient.update({
      where: { id: ingredientId },
      data: { isActive: false, updatedAt: new Date() },
    })

    await logAudit({
      entity: "ingredient", entityId: ingredientId, action: "delete",
      summary: `Deactivated ingredient '${ingredient.name}'`,
      userId: null, userName: null,
    })

    return NextResponse.json({ success: true, message: `${ingredient.name} has been deactivated` })
  } catch (error) {
    console.error("Failed to delete ingredient:", error)
    return NextResponse.json({ error: "Failed to delete ingredient" }, { status: 500 })
  }
}
