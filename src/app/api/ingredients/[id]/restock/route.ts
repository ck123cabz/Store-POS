import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
import { nanoid } from "nanoid"
import {
  calculateStockStatus,
  calculateStockRatio,
  calculateWeightedAvgCost,
} from "@/lib/ingredient-utils"

/**
 * POST /api/ingredients/:id/restock
 * Accept variantId + quantity. Convert to base units. Update weighted avg cost.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ingredientId = parseInt(id)
    const body = await request.json()

    // Validate required fields
    if (typeof body.quantity !== "number" || body.quantity <= 0) {
      return NextResponse.json(
        { error: "Quantity must be a positive number" },
        { status: 400 }
      )
    }

    if (!body.variantId) {
      return NextResponse.json(
        { error: "variantId is required" },
        { status: 400 }
      )
    }

    // Get ingredient and variant
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
      include: { baseUnit: true },
    })

    if (!ingredient) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 })
    }

    if (!ingredient.isActive) {
      return NextResponse.json({ error: "Ingredient is inactive" }, { status: 400 })
    }

    const variant = await prisma.purchaseVariant.findFirst({
      where: { id: body.variantId, ingredientId },
    })

    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 })
    }

    // Calculate stock changes
    const oldStockQty = Number(ingredient.stockQty)
    const oldAvgCost = Number(ingredient.avgCostPerBaseUnit)
    const baseUnitsPerVariant = Number(variant.baseUnitsPerVariant)

    // Use cost override or variant's cost
    const costPerVariant = body.costPerVariant ?? Number(variant.costPerVariant)
    const costPerBaseUnit = baseUnitsPerVariant > 0 ? costPerVariant / baseUnitsPerVariant : 0

    const addedBaseUnits = body.quantity * baseUnitsPerVariant
    const newStockQty = oldStockQty + addedBaseUnits
    const newAvgCost = calculateWeightedAvgCost(
      oldStockQty,
      oldAvgCost,
      addedBaseUnits,
      costPerBaseUnit
    )

    // Generate change ID for audit trail
    const changeId = `restock_${nanoid(10)}`
    const parLevel = Number(ingredient.parLevel)

    const historyEntries: Parameters<typeof prisma.ingredientHistory.create>[0]["data"][] = [
      {
        ingredientId,
        ingredientName: ingredient.name,
        changeId,
        field: "stockQty",
        oldValue: oldStockQty.toString(),
        newValue: newStockQty.toString(),
        source: "restock",
        reason: "restock",
        reasonNote: body.note || `Restocked ${body.quantity}x ${variant.label}`,
        purchaseVariantId: variant.id,
        userId: body.userId || 0,
        userName: body.userName || "System",
      },
    ]

    if (newAvgCost !== oldAvgCost) {
      historyEntries.push({
        ingredientId,
        ingredientName: ingredient.name,
        changeId,
        field: "avgCostPerBaseUnit",
        oldValue: oldAvgCost.toString(),
        newValue: newAvgCost.toString(),
        source: "restock",
        reason: "cost_update",
        reasonNote: body.note || null,
        purchaseVariantId: variant.id,
        userId: body.userId || 0,
        userName: body.userName || "System",
      })
    }

    // Update variant cost if override was provided
    const variantUpdate = body.costPerVariant !== undefined
      ? { costPerVariant: body.costPerVariant }
      : {}

    // Atomic update
    await prisma.$transaction([
      prisma.ingredient.update({
        where: { id: ingredientId },
        data: {
          stockQty: newStockQty,
          avgCostPerBaseUnit: newAvgCost,
          lastRestockDate: new Date(),
          lastUpdated: new Date(),
        },
      }),
      ...(Object.keys(variantUpdate).length > 0
        ? [prisma.purchaseVariant.update({ where: { id: variant.id }, data: variantUpdate })]
        : []),
      ...historyEntries.map((entry) =>
        prisma.ingredientHistory.create({ data: entry })
      ),
    ])

    await logAudit({
      entity: "ingredient", entityId: ingredientId, action: "restock",
      changes: { stockQty: { old: oldStockQty, new: newStockQty } },
      summary: `Restocked ${ingredient.name}: +${addedBaseUnits} ${ingredient.baseUnit.name} (${body.quantity}x ${variant.label})`,
      userId: body.userId || null, userName: body.userName || null,
    })

    return NextResponse.json({
      ingredient: {
        id: ingredient.id,
        name: ingredient.name,
        baseUnitName: ingredient.baseUnit.name,
        stockQty: newStockQty,
        avgCostPerBaseUnit: newAvgCost,
        parLevel,
        stockStatus: calculateStockStatus(newStockQty, parLevel),
        stockRatio: calculateStockRatio(newStockQty, parLevel),
        lastRestockDate: new Date().toISOString(),
      },
      restockDetails: {
        variantId: variant.id,
        variantLabel: variant.label,
        previousStockQty: oldStockQty,
        addedBaseUnits,
        newStockQty,
        previousAvgCost: oldAvgCost,
        newAvgCost,
      },
      message: `Added ${body.quantity}x ${variant.label} to ${ingredient.name} (+${addedBaseUnits} ${ingredient.baseUnit.name})`,
    })
  } catch (error) {
    console.error("Failed to restock ingredient:", error)
    return NextResponse.json({ error: "Failed to restock ingredient" }, { status: 500 })
  }
}
