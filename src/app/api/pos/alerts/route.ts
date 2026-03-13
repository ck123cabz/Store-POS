import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSettings } from "@/lib/settings-server"

export async function GET() {
  try {
    const settings = await getSettings()
    const criticalRatio = Number(settings.lowStockCriticalRatio)
    const warningRatio = Number(settings.lowStockWarningRatio)
    const markup = Number(settings.suggestedPriceMarkup)

    // Get low-stock ingredients
    const ingredients = await prisma.ingredient.findMany({
      where: { isActive: true },
      include: { baseUnit: true },
    })

    const lowStockItems = ingredients
      .map((i) => {
        const stockQty = Number(i.stockQty)
        const parLevel = Number(i.parLevel)
        const ratio = parLevel > 0 ? stockQty / parLevel : 1

        let priority: "critical" | "high" | "medium" | null = null
        if (stockQty <= 0 || ratio <= criticalRatio) priority = "critical"
        else if (ratio <= warningRatio) priority = "high"
        else if (ratio < 1) priority = "medium"

        if (!priority) return null

        return {
          id: i.id,
          name: i.name,
          quantity: stockQty,
          parLevel,
          unit: i.baseUnit.name,
          priority,
          stockRatio: parLevel > 0 ? Math.round(ratio * 100) : null,
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
        linkedVariant: {
          select: {
            costPerVariant: true,
            baseUnitsPerVariant: true,
            label: true,
          },
        },
      },
    })

    const needsPricing = needsPricingProducts.map((p) => {
      const variantCostPerUnit = p.linkedVariant && Number(p.linkedVariant.baseUnitsPerVariant) > 0
        ? Number(p.linkedVariant.costPerVariant) / Number(p.linkedVariant.baseUnitsPerVariant)
        : null

      return {
        id: p.id,
        name: p.name,
        currentPrice: Number(p.price),
        suggestedPrice: variantCostPerUnit
          ? Math.ceil(variantCostPerUnit * markup * 100) / 100
          : null,
        ingredientCost: variantCostPerUnit,
      }
    })

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
