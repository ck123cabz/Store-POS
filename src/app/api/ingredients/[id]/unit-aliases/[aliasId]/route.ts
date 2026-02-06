import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

/**
 * DELETE /api/ingredients/:id/unit-aliases/:aliasId
 * Delete a unit alias
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; aliasId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, aliasId } = await params
    const ingredientId = parseInt(id)
    const aliasIdInt = parseInt(aliasId)

    if (isNaN(ingredientId) || isNaN(aliasIdInt)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    }

    // Verify alias belongs to ingredient
    const alias = await prisma.ingredientUnitAlias.findFirst({
      where: { id: aliasIdInt, ingredientId },
    })

    if (!alias) {
      return NextResponse.json({ error: "Unit alias not found" }, { status: 404 })
    }

    await prisma.ingredientUnitAlias.delete({
      where: { id: aliasIdInt },
    })

    return NextResponse.json({
      success: true,
      message: `Unit "${alias.name}" deleted`
    })
  } catch (error) {
    console.error("Failed to delete unit alias:", error)
    return NextResponse.json({ error: "Failed to delete unit alias" }, { status: 500 })
  }
}
