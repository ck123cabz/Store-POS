import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { unitAliasSchema } from "@/lib/ingredient-utils"

/**
 * GET /api/ingredients/:id/unit-aliases
 * List all unit aliases for an ingredient
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const ingredientId = parseInt(id)

    if (isNaN(ingredientId)) {
      return NextResponse.json({ error: "Invalid ingredient ID" }, { status: 400 })
    }

    const aliases = await prisma.ingredientUnitAlias.findMany({
      where: { ingredientId },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json(
      aliases.map((a) => ({
        id: a.id,
        ingredientId: a.ingredientId,
        name: a.name,
        baseUnitMultiplier: Number(a.baseUnitMultiplier),
        description: a.description,
        isDefault: a.isDefault,
        createdAt: a.createdAt.toISOString(),
      }))
    )
  } catch (error) {
    console.error("Failed to fetch unit aliases:", error)
    return NextResponse.json({ error: "Failed to fetch unit aliases" }, { status: 500 })
  }
}

/**
 * POST /api/ingredients/:id/unit-aliases
 * Create a new unit alias for an ingredient
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

    const { id } = await params
    const ingredientId = parseInt(id)

    if (isNaN(ingredientId)) {
      return NextResponse.json({ error: "Invalid ingredient ID" }, { status: 400 })
    }

    const body = await request.json()

    // Validate input
    const validation = unitAliasSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      )
    }

    const { name, baseUnitMultiplier, description, isDefault } = validation.data

    // Check ingredient exists
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
    })
    if (!ingredient) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 })
    }

    // Check for duplicate name (case-insensitive)
    const existing = await prisma.ingredientUnitAlias.findFirst({
      where: {
        ingredientId,
        name: { equals: name.toLowerCase(), mode: "insensitive" },
      },
    })
    if (existing) {
      return NextResponse.json(
        { error: `Unit alias "${name}" already exists for this ingredient` },
        { status: 400 }
      )
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.ingredientUnitAlias.updateMany({
        where: { ingredientId, isDefault: true },
        data: { isDefault: false },
      })
    }

    const alias = await prisma.ingredientUnitAlias.create({
      data: {
        ingredientId,
        name: name.toLowerCase(),
        baseUnitMultiplier,
        description: description || null,
        isDefault: isDefault || false,
      },
    })

    return NextResponse.json(
      {
        id: alias.id,
        ingredientId: alias.ingredientId,
        name: alias.name,
        baseUnitMultiplier: Number(alias.baseUnitMultiplier),
        description: alias.description,
        isDefault: alias.isDefault,
        createdAt: alias.createdAt.toISOString(),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Failed to create unit alias:", error)
    return NextResponse.json({ error: "Failed to create unit alias" }, { status: 500 })
  }
}
