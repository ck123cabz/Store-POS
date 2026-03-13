import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSettings } from "@/lib/settings-server"

/**
 * GET /api/ingredients/low-stock
 * Compare stockQty vs parLevel (both in base units)
 * Uses configurable thresholds from Settings.
 */
export async function GET() {
  try {
    const settings = await getSettings()
    const criticalRatio = Number(settings.lowStockCriticalRatio)
    const warningRatio = Number(settings.lowStockWarningRatio)

    const ingredients = await prisma.ingredient.findMany({
      where: {
        isActive: true,
        parLevel: { gt: 0 },
      },
      include: { baseUnit: true, vendor: true },
      orderBy: { name: "asc" },
    })

    const lowStockItems = ingredients
      .map((i) => {
        const stockQty = Number(i.stockQty)
        const parLevel = Number(i.parLevel)
        const ratio = parLevel > 0 ? stockQty / parLevel : 1

        let priority: "critical" | "high" | "medium" | "low" | null
        if (stockQty <= 0) priority = "critical"
        else if (ratio <= criticalRatio) priority = "critical"
        else if (ratio <= warningRatio) priority = "high"
        else if (ratio < 1) priority = "medium"
        else priority = null

        return {
          id: i.id,
          name: i.name,
          category: i.category,
          stockQty,
          parLevel,
          baseUnitName: i.baseUnit.name,
          priority,
          stockRatio: Math.round(ratio * 100),
          vendorId: i.vendorId,
          vendorName: i.vendor?.name || null,
        }
      })
      .filter((i) => i.priority !== null)
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
        const aPriority = priorityOrder[a.priority!]
        const bPriority = priorityOrder[b.priority!]
        if (aPriority !== bPriority) return aPriority - bPriority
        return a.stockRatio - b.stockRatio
      })

    return NextResponse.json({
      count: lowStockItems.length,
      items: lowStockItems,
    })
  } catch (error) {
    console.error("Failed to fetch low-stock ingredients:", error)
    return NextResponse.json({ error: "Failed to fetch low-stock ingredients" }, { status: 500 })
  }
}
