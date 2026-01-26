import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
      include: { category: true },
    })

    if (!product) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      categoryId: product.categoryId,
      categoryName: product.category?.name ?? null,
      quantity: product.quantity,
      trackStock: product.trackStock,
      image: product.image,
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const product = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        name: body.name,
        price: body.price,
        categoryId: body.categoryId,
        quantity: body.quantity,
        trackStock: body.trackStock,
        ...(body.image && { image: body.image }),
        // Phase 4: Support needsPricing and linkedIngredientId
        ...(body.needsPricing !== undefined && { needsPricing: body.needsPricing }),
        ...(body.linkedIngredientId !== undefined && { linkedIngredientId: body.linkedIngredientId }),
      },
    })

    return NextResponse.json({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      categoryId: product.categoryId,
      quantity: product.quantity,
      trackStock: product.trackStock,
      image: product.image,
      needsPricing: product.needsPricing,
      linkedIngredientId: product.linkedIngredientId,
    })
  } catch {
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.product.delete({ where: { id: parseInt(id) } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 })
  }
}
