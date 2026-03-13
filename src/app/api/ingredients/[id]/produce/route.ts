import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
import { nanoid } from "nanoid"
import {
  productionRunSchema,
  calculateWeightedAvgCost,
  calculateProductionCostPerBaseUnit,
  calculateStockStatus,
  calculateStockRatio,
} from "@/lib/ingredient-utils"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ingredientId = parseInt(id)
    const body = await request.json()

    // Validate request
    const parsed = productionRunSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      )
    }

    const { batchCount, userId, userName, note } = parsed.data

    // Fetch output ingredient with production recipe
    const outputIngredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
      include: {
        baseUnit: true,
        productionInputs: {
          include: {
            inputIngredient: {
              include: { baseUnit: true },
            },
            unit: true,
          },
        },
      },
    })

    if (!outputIngredient) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 })
    }

    if (outputIngredient.type !== "PREPARED") {
      return NextResponse.json(
        { error: "Only PREPARED ingredients can be produced" },
        { status: 400 }
      )
    }

    if (outputIngredient.productionInputs.length === 0) {
      return NextResponse.json(
        { error: "No production recipe defined. Add inputs first." },
        { status: 400 }
      )
    }

    const batchYield = Number(outputIngredient.batchYield)
    if (batchYield <= 0) {
      return NextResponse.json(
        { error: "Batch yield must be set before producing" },
        { status: 400 }
      )
    }

    // Check sufficient stock for all inputs
    const insufficientInputs: string[] = []
    for (const pi of outputIngredient.productionInputs) {
      const requiredBaseUnits = (Number(pi.baseQuantity) || Number(pi.quantity)) * batchCount
      const availableStock = Number(pi.inputIngredient.stockQty)
      if (availableStock < requiredBaseUnits) {
        const unitName = pi.inputIngredient.baseUnit.name
        insufficientInputs.push(
          `${pi.inputIngredient.name}: need ${requiredBaseUnits} ${unitName}, have ${availableStock} ${unitName}`
        )
      }
    }

    if (insufficientInputs.length > 0) {
      return NextResponse.json(
        {
          error: "Insufficient stock for production",
          details: insufficientInputs,
        },
        { status: 400 }
      )
    }

    // Execute production run atomically
    const changeId = `production_${nanoid(10)}`
    const addedBaseUnits = batchYield * batchCount

    const result = await prisma.$transaction(async (tx) => {
      const inputDeductions: Array<{
        ingredientId: number
        ingredientName: string
        baseUnitName: string
        deductedBaseUnits: number
        previousStockQty: number
        newStockQty: number
      }> = []

      // 1. Deduct all input ingredients
      for (const pi of outputIngredient.productionInputs) {
        const ingredient = pi.inputIngredient
        const deductedBaseUnits = (Number(pi.baseQuantity) || Number(pi.quantity)) * batchCount
        const oldStockQty = Number(ingredient.stockQty)
        const newStockQty = Math.max(0, oldStockQty - deductedBaseUnits)

        await tx.ingredient.update({
          where: { id: ingredient.id },
          data: {
            stockQty: newStockQty,
            lastUpdated: new Date(),
          },
        })

        await tx.ingredientHistory.create({
          data: {
            ingredientId: ingredient.id,
            ingredientName: ingredient.name,
            changeId,
            field: "stockQty",
            oldValue: oldStockQty.toString(),
            newValue: newStockQty.toString(),
            source: "production",
            reason: "production_input",
            reasonNote: note || `Used in ${batchCount}x batch of ${outputIngredient.name}`,
            userId,
            userName,
          },
        })

        inputDeductions.push({
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          baseUnitName: ingredient.baseUnit.name,
          deductedBaseUnits,
          previousStockQty: oldStockQty,
          newStockQty,
        })
      }

      // 2. Calculate cost per base unit of output from inputs
      const inputCostData = outputIngredient.productionInputs.map((pi) => ({
        baseQuantity: Number(pi.baseQuantity) || Number(pi.quantity),
        avgCostPerBaseUnit: Number(pi.inputIngredient.avgCostPerBaseUnit),
      }))
      const costPerOutputUnit = calculateProductionCostPerBaseUnit(inputCostData, batchYield)

      // 3. Add output stock with weighted average cost
      const oldOutputStockQty = Number(outputIngredient.stockQty)
      const oldOutputAvgCost = Number(outputIngredient.avgCostPerBaseUnit)
      const newOutputStockQty = oldOutputStockQty + addedBaseUnits
      const newOutputAvgCost = calculateWeightedAvgCost(
        oldOutputStockQty,
        oldOutputAvgCost,
        addedBaseUnits,
        costPerOutputUnit
      )

      await tx.ingredient.update({
        where: { id: ingredientId },
        data: {
          stockQty: newOutputStockQty,
          avgCostPerBaseUnit: newOutputAvgCost,
          lastUpdated: new Date(),
          lastRestockDate: new Date(),
        },
      })

      // History: stock change
      await tx.ingredientHistory.create({
        data: {
          ingredientId,
          ingredientName: outputIngredient.name,
          changeId,
          field: "stockQty",
          oldValue: oldOutputStockQty.toString(),
          newValue: newOutputStockQty.toString(),
          source: "production",
          reason: "production_output",
          reasonNote: note || `Produced ${batchCount}x batch (${addedBaseUnits} ${outputIngredient.baseUnit.name})`,
          userId,
          userName,
        },
      })

      // History: cost change (if changed)
      if (newOutputAvgCost !== oldOutputAvgCost) {
        await tx.ingredientHistory.create({
          data: {
            ingredientId,
            ingredientName: outputIngredient.name,
            changeId,
            field: "avgCostPerBaseUnit",
            oldValue: oldOutputAvgCost.toString(),
            newValue: newOutputAvgCost.toString(),
            source: "production",
            reason: "cost_update",
            reasonNote: note || `Cost updated from production`,
            userId,
            userName,
          },
        })
      }

      return {
        newOutputStockQty,
        newOutputAvgCost,
        oldOutputStockQty,
        oldOutputAvgCost,
        inputDeductions,
      }
    }, { timeout: 15000 })

    await logAudit({
      entity: "ingredient", entityId: ingredientId, action: "produce",
      changes: { stockQty: { old: result.oldOutputStockQty, new: result.newOutputStockQty } },
      summary: `Produced ${batchCount} batch(es) of ${outputIngredient.name} (+${addedBaseUnits} ${outputIngredient.baseUnit.name})`,
      userId, userName,
    })

    const parLevel = Number(outputIngredient.parLevel)

    return NextResponse.json({
      outputIngredient: {
        id: outputIngredient.id,
        name: outputIngredient.name,
        baseUnitName: outputIngredient.baseUnit.name,
        previousStockQty: result.oldOutputStockQty,
        addedBaseUnits,
        newStockQty: result.newOutputStockQty,
        previousAvgCost: result.oldOutputAvgCost,
        newAvgCost: result.newOutputAvgCost,
        stockStatus: calculateStockStatus(result.newOutputStockQty, parLevel),
        stockRatio: calculateStockRatio(result.newOutputStockQty, parLevel),
      },
      inputDeductions: result.inputDeductions,
      batchCount,
      changeId,
      message: `Produced ${batchCount} batch(es) of ${outputIngredient.name} (+${addedBaseUnits} ${outputIngredient.baseUnit.name})`,
    })
  } catch (error) {
    console.error("Failed to execute production run:", error)
    return NextResponse.json({ error: "Failed to execute production run" }, { status: 500 })
  }
}
