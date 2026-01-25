import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const ingredients = await prisma.ingredient.findMany({
      where: {
        isActive: true,
        parLevel: { gt: 0 },
      },
      include: { vendor: true },
      orderBy: { name: "asc" },
    })

    // Filter to only low stock items and calculate priority
    const lowStockItems = ingredients
      .map((i) => {
        const quantity = Number(i.quantity)
        const parLevel = i.parLevel
        const ratio = parLevel > 0 ? quantity / parLevel : 1

        let priority: "critical" | "high" | "medium" | "low" | null
        if (quantity <= 0) priority = "critical"
        else if (ratio <= 0.25) priority = "critical"
        else if (ratio <= 0.5) priority = "high"
        else if (ratio < 1) priority = "medium"
        else priority = null

        return {
          id: i.id,
          name: i.name,
          category: i.category,
          unit: i.unit,
          costPerUnit: Number(i.costPerUnit),
          parLevel: i.parLevel,
          quantity,
          priority,
          stockRatio: Math.round(ratio * 100),
          vendorId: i.vendorId,
          vendorName: i.vendor?.name || null,
        }
      })
      .filter((i) => i.priority !== null)
      .sort((a, b) => {
        // Sort by priority: critical > high > medium > low
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
        const aPriority = priorityOrder[a.priority!]
        const bPriority = priorityOrder[b.priority!]
        if (aPriority !== bPriority) return aPriority - bPriority
        // Then by stock ratio (lowest first)
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
