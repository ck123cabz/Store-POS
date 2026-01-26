import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        recipeItems: true,
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(
      products.map((p) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        categoryName: p.category.name,
        trueCost: p.trueCost ? Number(p.trueCost) : null,
        trueMargin: p.trueMargin ? Number(p.trueMargin) : null,
        trueMarginPercent: p.trueMarginPercent ? Number(p.trueMarginPercent) : null,
        ingredientCount: p.recipeItems.length,
      }))
    )
  } catch {
    return NextResponse.json({ error: "Failed to fetch recipes" }, { status: 500 })
  }
}
