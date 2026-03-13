import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"

// Get recipe for a product (ingredients and quantities)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params
    const product = await prisma.product.findUnique({
      where: { id: parseInt(productId) },
      include: {
        recipeItems: {
          include: {
            ingredient: {
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

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Calculate food cost using avgCostPerBaseUnit
    const foodCost = product.recipeItems.reduce((sum, ri) => {
      const qty = ri.baseQuantity ? Number(ri.baseQuantity) : Number(ri.quantity)
      return sum + qty * Number(ri.ingredient.avgCostPerBaseUnit)
    }, 0)

    // Get hourly rate from settings for labor cost calculation
    const settings = await prisma.settings.findFirst()
    const hourlyRate = settings?.avgHourlyLaborCost ? Number(settings.avgHourlyLaborCost) : 75
    const laborCost = product.prepTime ? (product.prepTime / 60) * hourlyRate : 0
    const overheadCost = product.overheadAllocation ? Number(product.overheadAllocation) : 0

    const trueCost = foodCost + laborCost + overheadCost
    const price = Number(product.price)
    const trueMargin = price - trueCost
    const trueMarginPercent = price > 0 ? (trueMargin / price) * 100 : 0

    return NextResponse.json({
      productId: product.id,
      productName: product.name,
      price: price,
      prepTime: product.prepTime,
      overheadAllocation: overheadCost,
      ingredients: product.recipeItems.map((ri) => {
        const baseQuantity = ri.baseQuantity ? Number(ri.baseQuantity) : Number(ri.quantity)
        const baseUnitName = ri.ingredient.baseUnit.name
        const chosenUnitName = ri.unit?.name || baseUnitName

        return {
          ingredientId: ri.ingredientId,
          ingredientName: ri.ingredient.name,
          quantity: Number(ri.quantity),
          unitId: ri.unitId,
          unitName: chosenUnitName,
          baseUnitId: ri.ingredient.baseUnitId,
          baseUnitName: baseUnitName,
          baseQuantity: baseQuantity,
          portionNote: ri.portionNote,
          costPerBaseUnit: Number(ri.ingredient.avgCostPerBaseUnit),
          lineCost: baseQuantity * Number(ri.ingredient.avgCostPerBaseUnit),
          yieldFactor: ri.ingredient.yieldFactor ? Number(ri.ingredient.yieldFactor) : null,
          unitAliases: (ri.ingredient.unitAliases || []).map((ua) => ({
            name: ua.name,
            baseUnitMultiplier: Number(ua.baseUnitMultiplier),
            description: ua.description,
          })),
        }
      }),
      costs: {
        foodCost: Math.round(foodCost * 100) / 100,
        laborCost: Math.round(laborCost * 100) / 100,
        overheadCost: Math.round(overheadCost * 100) / 100,
        trueCost: Math.round(trueCost * 100) / 100,
        trueMargin: Math.round(trueMargin * 100) / 100,
        trueMarginPercent: Math.round(trueMarginPercent * 10) / 10,
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch recipe" }, { status: 500 })
  }
}

// Update recipe for a product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params
    const body = await request.json()
    const id = parseInt(productId)

    // Update product fields
    if (body.prepTime !== undefined || body.overheadAllocation !== undefined) {
      await prisma.product.update({
        where: { id },
        data: {
          prepTime: body.prepTime,
          overheadAllocation: body.overheadAllocation,
        },
      })
    }

    // Update recipe items if provided
    if (body.ingredients && Array.isArray(body.ingredients)) {
      await prisma.recipeItem.deleteMany({
        where: { productId: id },
      })

      if (body.ingredients.length > 0) {
        interface RecipeIngredientInput {
          ingredientId: number
          quantity: number
          unitId?: number | null
          unitName?: string
          baseQuantity?: number
          portionNote?: string
        }

        // Resolve unitName → unitId for ingredients that have a name but no id
        const ingredientsWithUnits = await Promise.all(
          body.ingredients.map(async (ing: RecipeIngredientInput) => {
            let unitId = ing.unitId || null
            if (!unitId && ing.unitName) {
              const unit = await prisma.unit.findUnique({ where: { name: ing.unitName } })
              unitId = unit?.id ?? null
            }
            return {
              productId: id,
              ingredientId: ing.ingredientId,
              quantity: ing.quantity,
              unitId,
              baseQuantity: ing.baseQuantity ?? ing.quantity,
              portionNote: ing.portionNote || null,
            }
          })
        )

        await prisma.recipeItem.createMany({
          data: ingredientsWithUnits,
        })
      }
    }

    // Recalculate costs
    const product = await prisma.product.findUnique({
      where: { id },
      include: { recipeItems: { include: { ingredient: true } } },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const foodCost = product.recipeItems.reduce((sum, ri) => {
      const qty = ri.baseQuantity ? Number(ri.baseQuantity) : Number(ri.quantity)
      return sum + qty * Number(ri.ingredient.avgCostPerBaseUnit)
    }, 0)

    const settings = await prisma.settings.findFirst()
    const hourlyRate = settings?.avgHourlyLaborCost ? Number(settings.avgHourlyLaborCost) : 75
    const laborCost = product.prepTime ? (product.prepTime / 60) * hourlyRate : 0
    const overheadCost = product.overheadAllocation ? Number(product.overheadAllocation) : 0

    const trueCost = foodCost + laborCost + overheadCost
    const price = Number(product.price)
    const trueMargin = price - trueCost
    const trueMarginPercent = price > 0 ? (trueMargin / price) * 100 : 0

    await prisma.product.update({
      where: { id },
      data: {
        laborCost: Math.round(laborCost * 100) / 100,
        trueCost: Math.round(trueCost * 100) / 100,
        trueMargin: Math.round(trueMargin * 100) / 100,
        trueMarginPercent: Math.round(trueMarginPercent * 10) / 10,
      },
    })

    await logAudit({
      entity: "recipe", entityId: id, action: "update",
      summary: `Updated recipe for product (id: ${id})`,
      userId: null, userName: null,
    })

    return NextResponse.json({
      success: true,
      costs: {
        foodCost: Math.round(foodCost * 100) / 100,
        laborCost: Math.round(laborCost * 100) / 100,
        overheadCost: Math.round(overheadCost * 100) / 100,
        trueCost: Math.round(trueCost * 100) / 100,
        trueMargin: Math.round(trueMargin * 100) / 100,
        trueMarginPercent: Math.round(trueMarginPercent * 10) / 10,
      },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to update recipe" }, { status: 500 })
  }
}
