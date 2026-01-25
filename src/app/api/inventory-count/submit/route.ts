import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { nanoid } from "nanoid"

interface CountItem {
  ingredientId: number
  expected: number
  actual: number
  reason?: string
  reasonNote?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { counts } = body as { counts: CountItem[] }

    if (!Array.isArray(counts) || counts.length === 0) {
      return NextResponse.json(
        { error: "counts must be a non-empty array" },
        { status: 400 }
      )
    }

    // Validate all counts have required fields and valid values
    for (const count of counts) {
      if (
        typeof count.ingredientId !== "number" ||
        !Number.isInteger(count.ingredientId) ||
        count.ingredientId <= 0 ||
        typeof count.actual !== "number" ||
        count.actual < 0
      ) {
        return NextResponse.json(
          { error: "Each count must have a valid ingredientId and non-negative actual value" },
          { status: 400 }
        )
      }
    }

    // Generate a single changeId for this count session
    const changeId = nanoid(10)
    const userId = Number(session.user.id)
    const userName = session.user.name || session.user.username

    // Process counts that have discrepancies (actual != expected)
    const discrepancies = counts.filter((c) => c.actual !== c.expected)

    // Get current ingredient data for history logging
    const ingredientIds = discrepancies.map((c) => c.ingredientId)
    const ingredients = await prisma.ingredient.findMany({
      where: { id: { in: ingredientIds } },
      select: { id: true, name: true, quantity: true },
    })

    const ingredientMap = new Map(ingredients.map((i) => [i.id, i]))

    // Build transaction operations
    const operations = []

    for (const count of discrepancies) {
      const ingredient = ingredientMap.get(count.ingredientId)
      if (!ingredient) continue

      // Update ingredient quantity
      operations.push(
        prisma.ingredient.update({
          where: { id: count.ingredientId },
          data: {
            quantity: count.actual,
            lastUpdated: new Date(),
          },
        })
      )

      // Create history entry
      operations.push(
        prisma.ingredientHistory.create({
          data: {
            ingredientId: count.ingredientId,
            ingredientName: ingredient.name,
            changeId,
            field: "quantity",
            oldValue: String(ingredient.quantity),
            newValue: String(count.actual),
            source: "inventory_count",
            reason: count.reason || null,
            reasonNote: count.reasonNote || null,
            userId,
            userName,
          },
        })
      )
    }

    // Delete the user's draft after successful submit
    operations.push(
      prisma.inventoryCountDraft.deleteMany({
        where: { userId },
      })
    )

    // Execute all operations in a transaction
    await prisma.$transaction(operations)

    return NextResponse.json({
      success: true,
      changeId,
      totalCounted: counts.length,
      discrepancies: discrepancies.length,
    })
  } catch (error) {
    console.error("Failed to submit inventory count:", error)
    return NextResponse.json(
      { error: "Failed to submit inventory count" },
      { status: 500 }
    )
  }
}
