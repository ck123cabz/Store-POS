import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { logAudit, auditUser } from "@/lib/audit"

/**
 * POST /api/ingredients/:id/create-product
 *
 * Creates a Product with a 1-ingredient recipe from a purchase variant.
 * Replaces the old "sellable" toggle — explicit action instead of implicit sync.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!session.user.permProducts) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 })
    }

    const { id } = await params
    const ingredientId = parseInt(id)
    const body = await request.json()

    const { variantId, categoryId, sellPrice } = body

    if (!variantId || !categoryId || sellPrice == null) {
      return NextResponse.json(
        { error: "variantId, categoryId, and sellPrice are required" },
        { status: 400 }
      )
    }

    // Fetch ingredient + variant
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
      include: { baseUnit: true },
    })

    if (!ingredient) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 })
    }

    const variant = await prisma.purchaseVariant.findFirst({
      where: { id: variantId, ingredientId },
    })

    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 })
    }

    // Calculate costs
    const baseUnitsPerVariant = Number(variant.baseUnitsPerVariant)
    const foodCost = baseUnitsPerVariant * Number(ingredient.avgCostPerBaseUnit)
    const trueMargin = Number(sellPrice) - foodCost
    const trueMarginPercent = Number(sellPrice) > 0
      ? (trueMargin / Number(sellPrice)) * 100
      : 0

    // Create product + recipe in a transaction
    const product = await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          name: `${ingredient.name} (${variant.label})`,
          price: sellPrice,
          categoryId,
          quantity: 0,
          trackStock: false, // Stock tracked via ingredient
          image: "",
          trueCost: foodCost,
          trueMargin,
          trueMarginPercent,
        },
      })

      await tx.recipeItem.create({
        data: {
          productId: newProduct.id,
          ingredientId: ingredient.id,
          quantity: baseUnitsPerVariant,
          baseQuantity: baseUnitsPerVariant,
          unitId: ingredient.baseUnitId,
        },
      })

      return newProduct
    })

    await logAudit({
      entity: "product", entityId: product.id, action: "create",
      summary: `Created product '${product.name}' from ingredient '${ingredient.name}' variant '${variant.label}'`,
      ...auditUser(session),
    })

    return NextResponse.json(
      {
        id: product.id,
        name: product.name,
        price: Number(product.price),
        categoryId: product.categoryId,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Failed to create product from ingredient:", error)
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    )
  }
}
