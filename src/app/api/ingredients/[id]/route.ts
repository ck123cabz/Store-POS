import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { nanoid } from "nanoid"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: parseInt(id) },
      include: { vendor: true, recipeItems: { include: { product: true } } },
    })

    if (!ingredient) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: ingredient.id,
      name: ingredient.name,
      category: ingredient.category,
      unit: ingredient.unit,
      costPerUnit: Number(ingredient.costPerUnit),
      parLevel: ingredient.parLevel,
      vendorId: ingredient.vendorId,
      vendorName: ingredient.vendor?.name || null,
      usedInProducts: ingredient.recipeItems.map((ri) => ({
        productId: ri.productId,
        productName: ri.product.name,
        quantity: Number(ri.quantity),
      })),
    })
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

    // Get current ingredient for history comparison
    const current = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
    })

    if (!current) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 })
    }

    const changeId = `edit_${nanoid(10)}`
    const historyEntries: Parameters<typeof prisma.ingredientHistory.create>[0]["data"][] = []

    // Check for quantity change
    if (body.quantity !== undefined && Number(body.quantity) !== Number(current.quantity)) {
      historyEntries.push({
        ingredientId,
        ingredientName: current.name,
        changeId,
        field: "quantity",
        oldValue: current.quantity.toString(),
        newValue: body.quantity.toString(),
        source: "manual_edit",
        reason: body.reason || null,
        reasonNote: body.reasonNote || null,
        userId: body.userId || 0,
        userName: body.userName || "System",
      })
    }

    // Check for cost change
    if (body.costPerUnit !== undefined && Number(body.costPerUnit) !== Number(current.costPerUnit)) {
      historyEntries.push({
        ingredientId,
        ingredientName: current.name,
        changeId,
        field: "costPerUnit",
        oldValue: current.costPerUnit.toString(),
        newValue: body.costPerUnit.toString(),
        source: "manual_edit",
        reason: body.reason || "price_update",
        reasonNote: body.reasonNote || null,
        userId: body.userId || 0,
        userName: body.userName || "System",
      })
    }

    // Update ingredient and create history entries in transaction
    const [ingredient] = await prisma.$transaction([
      prisma.ingredient.update({
        where: { id: ingredientId },
        data: {
          name: body.name,
          category: body.category,
          unit: body.unit,
          costPerUnit: body.costPerUnit,
          parLevel: body.parLevel,
          quantity: body.quantity,
          vendorId: body.vendorId || null,
          barcode: body.barcode || null,
          lastUpdated: new Date(),
        },
        include: { vendor: true },
      }),
      ...historyEntries.map((entry) =>
        prisma.ingredientHistory.create({ data: entry })
      ),
    ])

    return NextResponse.json({
      id: ingredient.id,
      name: ingredient.name,
      category: ingredient.category,
      unit: ingredient.unit,
      costPerUnit: Number(ingredient.costPerUnit),
      parLevel: ingredient.parLevel,
      quantity: Number(ingredient.quantity),
      vendorId: ingredient.vendorId,
      vendorName: ingredient.vendor?.name || null,
      barcode: ingredient.barcode,
    })
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

    // Check existence before update
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
    })

    if (!ingredient) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 })
    }

    // Soft delete - set isActive to false
    await prisma.ingredient.update({
      where: { id: ingredientId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, message: `${ingredient.name} has been deactivated` })
  } catch (error) {
    console.error("Failed to delete ingredient:", error)
    return NextResponse.json({ error: "Failed to delete ingredient" }, { status: 500 })
  }
}
