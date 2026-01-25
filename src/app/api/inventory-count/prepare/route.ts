import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch all active ingredients with current quantities
    const ingredients = await prisma.ingredient.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        category: true,
        unit: true,
        quantity: true,
        parLevel: true,
        barcode: true,
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    })

    // Transform to count format with expected quantities
    const countItems = ingredients.map((ing) => ({
      ingredientId: ing.id,
      name: ing.name,
      category: ing.category,
      unit: ing.unit,
      expected: Number(ing.quantity),
      parLevel: ing.parLevel,
      barcode: ing.barcode,
    }))

    return NextResponse.json(countItems)
  } catch (error) {
    console.error("Failed to prepare inventory count:", error)
    return NextResponse.json(
      { error: "Failed to prepare inventory count" },
      { status: 500 }
    )
  }
}
