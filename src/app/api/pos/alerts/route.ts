import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // Get low-stock ingredients
    const ingredients = await prisma.ingredient.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        quantity: true,
        parLevel: true,
        unit: true,
      },
    })

    const lowStockItems = ingredients
      .map((i) => {
        const qty = Number(i.quantity)
        const ratio = i.parLevel > 0 ? qty / i.parLevel : 1

        let priority: "critical" | "high" | "medium" | null = null
        if (qty <= 0 || ratio <= 0.25) priority = "critical"
        else if (ratio <= 0.5) priority = "high"
        else if (ratio < 1) priority = "medium"

        if (!priority) return null

        return {
          id: i.id,
          name: i.name,
          quantity: qty,
          parLevel: i.parLevel,
          unit: i.unit,
          priority,
          stockRatio: i.parLevel > 0 ? Math.round(ratio * 100) : null,
        }
      })
      .filter(Boolean)
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2 }
        return priorityOrder[a!.priority] - priorityOrder[b!.priority]
      })

    // Get products needing pricing
    const needsPricingProducts = await prisma.product.findMany({
      where: { needsPricing: true },
      select: {
        id: true,
        name: true,
        price: true,
        linkedIngredient: {
          select: {
            costPerUnit: true,
            unit: true,
          },
        },
      },
    })

    const needsPricing = needsPricingProducts.map((p) => ({
      id: p.id,
      name: p.name,
      currentPrice: Number(p.price),
      suggestedPrice: p.linkedIngredient
        ? Math.ceil(Number(p.linkedIngredient.costPerUnit) * 1.5 * 100) / 100 // 50% markup suggestion
        : null,
      ingredientCost: p.linkedIngredient ? Number(p.linkedIngredient.costPerUnit) : null,
    }))

    return NextResponse.json({
      lowStock: {
        count: lowStockItems.length,
        criticalCount: lowStockItems.filter((i) => i?.priority === "critical").length,
        items: lowStockItems,
      },
      needsPricing: {
        count: needsPricing.length,
        items: needsPricing,
      },
      totalAlerts: lowStockItems.length + needsPricing.length,
    })
  } catch (error) {
    console.error("Failed to fetch POS alerts:", error)
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 })
  }
}
