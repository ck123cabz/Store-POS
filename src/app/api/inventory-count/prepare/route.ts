import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch all active ingredients with current stock
    const ingredients = await prisma.ingredient.findMany({
      where: { isActive: true },
      include: {
        baseUnit: true,
        countUnit: true,
        purchaseVariants: {
          where: { isDefault: true, isActive: true },
          take: 1,
          select: { barcode: true },
        },
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    })

    // Transform to count format
    const countItems = ingredients.map((ing) => ({
      ingredientId: ing.id,
      name: ing.name,
      category: ing.category,
      unit: ing.countUnit?.name || ing.baseUnit.name,
      expected: Number(ing.stockQty),
      parLevel: Number(ing.parLevel),
      barcode: ing.purchaseVariants[0]?.barcode || null,
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
