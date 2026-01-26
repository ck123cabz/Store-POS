import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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
          include: { ingredient: true },
        },
      },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Calculate food cost from recipe
    const foodCost = product.recipeItems.reduce((sum, ri) => {
      return sum + Number(ri.quantity) * Number(ri.ingredient.costPerUnit)
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
      ingredients: product.recipeItems.map((ri) => ({
        ingredientId: ri.ingredientId,
        ingredientName: ri.ingredient.name,
        unit: ri.ingredient.unit,
        quantity: Number(ri.quantity),
        portionNote: ri.portionNote,
        costPerUnit: Number(ri.ingredient.costPerUnit),
        lineCost: Number(ri.quantity) * Number(ri.ingredient.costPerUnit),
      })),
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
      // Delete existing recipe items
      await prisma.recipeItem.deleteMany({
        where: { productId: id },
      })

      // Create new recipe items
      if (body.ingredients.length > 0) {
        await prisma.recipeItem.createMany({
          data: body.ingredients.map((ing: { ingredientId: number; quantity: number; portionNote?: string }) => ({
            productId: id,
            ingredientId: ing.ingredientId,
            quantity: ing.quantity,
            portionNote: ing.portionNote || null,
          })),
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
      return sum + Number(ri.quantity) * Number(ri.ingredient.costPerUnit)
    }, 0)

    const settings = await prisma.settings.findFirst()
    const hourlyRate = settings?.avgHourlyLaborCost ? Number(settings.avgHourlyLaborCost) : 75
    const laborCost = product.prepTime ? (product.prepTime / 60) * hourlyRate : 0
    const overheadCost = product.overheadAllocation ? Number(product.overheadAllocation) : 0

    const trueCost = foodCost + laborCost + overheadCost
    const price = Number(product.price)
    const trueMargin = price - trueCost
    const trueMarginPercent = price > 0 ? (trueMargin / price) * 100 : 0

    // Update product with calculated costs
    await prisma.product.update({
      where: { id },
      data: {
        laborCost: Math.round(laborCost * 100) / 100,
        trueCost: Math.round(trueCost * 100) / 100,
        trueMargin: Math.round(trueMargin * 100) / 100,
        trueMarginPercent: Math.round(trueMarginPercent * 10) / 10,
      },
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
