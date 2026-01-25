import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { nanoid } from "nanoid"

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

    // Get current ingredient
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
    })

    if (!ingredient) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 })
    }

    if (!ingredient.isActive) {
      return NextResponse.json({ error: "Ingredient is inactive" }, { status: 400 })
    }

    const oldQuantity = Number(ingredient.quantity)
    const newQuantity = oldQuantity + body.quantity
    const oldCost = Number(ingredient.costPerUnit)
    const newCost = body.costPerUnit !== undefined ? body.costPerUnit : oldCost

    // Generate a change ID to group related history entries
    const changeId = `restock_${nanoid(10)}`

    // Use transaction to update ingredient and create history
    const [updatedIngredient] = await prisma.$transaction([
      // Update ingredient
      prisma.ingredient.update({
        where: { id: ingredientId },
        data: {
          quantity: newQuantity,
          costPerUnit: newCost,
          lastRestockDate: new Date(),
          lastUpdated: new Date(),
        },
        include: { vendor: true },
      }),
      // Log quantity change
      prisma.ingredientHistory.create({
        data: {
          ingredientId,
          ingredientName: ingredient.name,
          changeId,
          field: "quantity",
          oldValue: oldQuantity.toString(),
          newValue: newQuantity.toString(),
          source: "restock",
          reason: "restock",
          reasonNote: body.note || null,
          userId: body.userId || 0,
          userName: body.userName || "System",
        },
      }),
      // Log cost change if changed
      ...(newCost !== oldCost
        ? [
            prisma.ingredientHistory.create({
              data: {
                ingredientId,
                ingredientName: ingredient.name,
                changeId,
                field: "costPerUnit",
                oldValue: oldCost.toString(),
                newValue: newCost.toString(),
                source: "restock",
                reason: "price_update",
                reasonNote: body.note || null,
                userId: body.userId || 0,
                userName: body.userName || "System",
              },
            }),
          ]
        : []),
    ])

    return NextResponse.json({
      id: updatedIngredient.id,
      name: updatedIngredient.name,
      quantity: Number(updatedIngredient.quantity),
      costPerUnit: Number(updatedIngredient.costPerUnit),
      lastRestockDate: updatedIngredient.lastRestockDate,
      message: `Added ${body.quantity} ${ingredient.unit} to ${ingredient.name}`,
    })
  } catch (error) {
    console.error("Failed to restock ingredient:", error)
    return NextResponse.json({ error: "Failed to restock ingredient" }, { status: 500 })
  }
}
