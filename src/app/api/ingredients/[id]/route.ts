import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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
    const body = await request.json()

    const ingredient = await prisma.ingredient.update({
      where: { id: parseInt(id) },
      data: {
        name: body.name,
        category: body.category,
        unit: body.unit,
        costPerUnit: body.costPerUnit,
        parLevel: body.parLevel,
        vendorId: body.vendorId || null,
        lastUpdated: new Date(),
      },
      include: { vendor: true },
    })

    return NextResponse.json({
      id: ingredient.id,
      name: ingredient.name,
      category: ingredient.category,
      unit: ingredient.unit,
      costPerUnit: Number(ingredient.costPerUnit),
      parLevel: ingredient.parLevel,
      vendorId: ingredient.vendorId,
      vendorName: ingredient.vendor?.name || null,
    })
  } catch {
    return NextResponse.json({ error: "Failed to update ingredient" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.ingredient.delete({
      where: { id: parseInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete ingredient" }, { status: 500 })
  }
}
