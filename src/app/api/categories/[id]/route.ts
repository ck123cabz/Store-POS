import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const category = await prisma.category.findUnique({
      where: { id: parseInt(id) },
      include: { _count: { select: { products: true } } },
    })

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    return NextResponse.json(category)
  } catch {
    return NextResponse.json({ error: "Failed to fetch category" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const name = typeof body.name === "string" ? body.name.trim() : ""
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  // Build update data
  const updateData: { name: string; requiresKitchen?: boolean; isBeverage?: boolean } = { name }

  // Add requiresKitchen if provided
  if (body.requiresKitchen !== undefined) {
    updateData.requiresKitchen = body.requiresKitchen
  }
  if (body.isBeverage !== undefined) {
    updateData.isBeverage = body.isBeverage
  }

  try {
    const category = await prisma.category.update({
      where: { id: parseInt(id) },
      data: updateData,
    })

    await logAudit({
      entity: "category", entityId: category.id, action: "update",
      summary: `Updated category '${category.name}'`,
      userId: null, userName: null,
    })

    return NextResponse.json(category)
  } catch {
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  // Build update data for partial updates
  const updateData: { name?: string; requiresKitchen?: boolean; isBeverage?: boolean } = {}

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (!name) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 })
    }
    updateData.name = name
  }

  if (body.requiresKitchen !== undefined) {
    updateData.requiresKitchen = body.requiresKitchen
  }
  if (body.isBeverage !== undefined) {
    updateData.isBeverage = body.isBeverage
  }

  // Ensure at least one field is being updated
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  try {
    const category = await prisma.category.update({
      where: { id: parseInt(id) },
      data: updateData,
    })

    await logAudit({
      entity: "category", entityId: category.id, action: "update",
      summary: `Updated category '${category.name}'`,
      userId: null, userName: null,
    })

    return NextResponse.json(category)
  } catch {
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // First check if category has products
    const category = await prisma.category.findUnique({
      where: { id: parseInt(id) },
      include: { _count: { select: { products: true } } },
    })

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    // If category has products, we need to handle them
    // Option: Set products to a default/uncategorized state by deleting them from this category
    // For now, we'll just delete the category and let Prisma handle the constraint
    // If there are products, this will fail - which is safer

    await prisma.category.delete({ where: { id: parseInt(id) } })

    await logAudit({
      entity: "category", entityId: parseInt(id), action: "delete",
      summary: `Deleted category '${category.name}'`,
      userId: null, userName: null,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: "Failed to delete category. Make sure no products are assigned to it." },
      { status: 500 }
    )
  }
}
