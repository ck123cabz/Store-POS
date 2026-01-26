import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/sidebar-badges
 *
 * Returns aggregated counts for sidebar navigation badges:
 * - Low stock ingredients (quantity > 0 AND quantity <= parLevel AND isActive AND parLevel > 0)
 * - Products needing pricing review (needsPricing = true)
 * - Today's task completion progress
 *
 * Requires authentication (T037)
 */
export async function GET() {
  try {
    // T037: Require authentication
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: true, message: "Unauthorized" },
        { status: 401 }
      )
    }

    // T041: Low-stock ingredient count query
    // Only count ingredients that are LOW (have stock > 0 but at or below parLevel)
    // Not counting items that are completely OUT (quantity <= 0)
    // Prisma doesn't support field references in where, so use raw SQL
    const lowStockResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM ingredients
      WHERE is_active = true
        AND par_level > 0
        AND quantity > 0
        AND quantity <= par_level
    `
    const lowStockIngredients = Number(lowStockResult[0]?.count ?? 0)

    // T042: Needs-pricing product count query
    const needsPricingProducts = await prisma.product.count({
      where: {
        needsPricing: true,
      },
    })

    // T043: Task progress query for today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dayOfWeek = today.getDay()

    // Get total active tasks scheduled for today
    const totalTasks = await prisma.employeeTask.count({
      where: {
        isActive: true,
        status: "approved",
        daysOfWeek: { has: dayOfWeek },
      },
    })

    // Get completed tasks for today
    const completedTasks = await prisma.taskCompletion.count({
      where: {
        date: today,
        status: "completed",
      },
    })

    return NextResponse.json({
      lowStockIngredients,
      needsPricingProducts,
      taskProgress: {
        completed: completedTasks,
        total: totalTasks,
      },
    })
  } catch (error) {
    console.error("Failed to fetch sidebar badges:", error)
    return NextResponse.json(
      { error: true, message: "Failed to fetch badge counts" },
      { status: 500 }
    )
  }
}
