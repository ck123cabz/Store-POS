import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { productionRecipeItemSchema } from "@/lib/ingredient-utils"
import { z } from "zod"

/**
 * GET /api/ingredients/:id/production-recipe
 * Fetch the production recipe for a PREPARED ingredient.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: parseInt(id) },
      include: {
        baseUnit: true,
        productionInputs: {
          include: {
            inputIngredient: {
              include: {
                baseUnit: true,
                unitAliases: { orderBy: { createdAt: "asc" } },
              },
            },
            unit: true,
          },
        },
      },
    })

    if (!ingredient) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 })
    }

    if (ingredient.type !== "PREPARED") {
      return NextResponse.json(
        { error: "Only PREPARED ingredients have production recipes" },
        { status: 400 }
      )
    }

    const batchYield = ingredient.batchYield ? Number(ingredient.batchYield) : 1

    // Calculate costs
    const totalInputCost = ingredient.productionInputs.reduce((sum, pi) => {
      const qty = pi.baseQuantity ? Number(pi.baseQuantity) : Number(pi.quantity)
      return sum + qty * Number(pi.inputIngredient.avgCostPerBaseUnit)
    }, 0)

    const costPerUnit = batchYield > 0 ? totalInputCost / batchYield : 0

    return NextResponse.json({
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      baseUnitName: ingredient.baseUnit.name,
      batchYield,
      inputs: ingredient.productionInputs.map((pi) => {
        const baseQuantity = pi.baseQuantity ? Number(pi.baseQuantity) : Number(pi.quantity)
        const inputBaseUnitName = pi.inputIngredient.baseUnit.name
        const inputBaseUnitAbbr = pi.inputIngredient.baseUnit.abbr
        const chosenUnitName = pi.unit?.name || inputBaseUnitName
        const costPerBaseUnit = Number(pi.inputIngredient.avgCostPerBaseUnit)

        return {
          id: pi.id,
          inputIngredientId: pi.inputIngredientId,
          inputIngredientName: pi.inputIngredient.name,
          inputBaseUnitName,
          inputBaseUnitAbbr,
          quantity: Number(pi.quantity),
          baseQuantity,
          unitId: pi.unitId,
          unitName: chosenUnitName,
          note: pi.note,
          costPerBaseUnit,
          lineCost: baseQuantity * costPerBaseUnit,
          unitAliases: (pi.inputIngredient.unitAliases || []).map((ua) => ({
            id: ua.id,
            name: ua.name,
            baseUnitMultiplier: Number(ua.baseUnitMultiplier),
            description: ua.description,
            unitId: ua.unitId,
          })),
        }
      }),
      costs: {
        totalInputCost: Math.round(totalInputCost * 100) / 100,
        batchYield,
        costPerUnit: Math.round(costPerUnit * 100) / 100,
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch production recipe" }, { status: 500 })
  }
}

/**
 * PUT /api/ingredients/:id/production-recipe
 * Update the production recipe for a PREPARED ingredient.
 * Uses delete-and-recreate pattern (same as product recipe PUT).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ingredientId = parseInt(id)
    const body = await request.json()

    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
    })

    if (!ingredient) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 })
    }

    if (ingredient.type !== "PREPARED") {
      return NextResponse.json(
        { error: "Only PREPARED ingredients have production recipes" },
        { status: 400 }
      )
    }

    // Validate inputs array
    const inputsSchema = z.array(productionRecipeItemSchema)
    const parseResult = inputsSchema.safeParse(body.inputs)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid inputs", details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const inputs = parseResult.data

    // Prevent self-reference
    const selfRef = inputs.find((inp) => inp.inputIngredientId === ingredientId)
    if (selfRef) {
      return NextResponse.json(
        { error: "An ingredient cannot be an input to its own production recipe" },
        { status: 400 }
      )
    }

    // Resolve unitName → unitId for inputs that have a name but no id
    const resolvedInputs = inputs.length > 0
      ? await Promise.all(
          inputs.map(async (inp) => {
            let unitId = inp.unitId || null
            if (!unitId && inp.unitName) {
              const unit = await prisma.unit.findUnique({ where: { name: inp.unitName } })
              unitId = unit?.id ?? null
            }
            return {
              outputIngredientId: ingredientId,
              inputIngredientId: inp.inputIngredientId,
              quantity: inp.quantity,
              unitId,
              baseQuantity: inp.baseQuantity ?? inp.quantity,
              note: inp.note || null,
            }
          })
        )
      : []

    await prisma.$transaction([
      // Optionally update batchYield
      ...(body.batchYield !== undefined
        ? [prisma.ingredient.update({
            where: { id: ingredientId },
            data: { batchYield: body.batchYield },
          })]
        : []),
      // Delete existing recipe items
      prisma.productionRecipeItem.deleteMany({
        where: { outputIngredientId: ingredientId },
      }),
      // Create new recipe items
      ...(resolvedInputs.length > 0
        ? [prisma.productionRecipeItem.createMany({ data: resolvedInputs })]
        : []),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to update production recipe:", error)
    return NextResponse.json({ error: "Failed to update production recipe" }, { status: 500 })
  }
}
