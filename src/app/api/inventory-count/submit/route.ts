import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { nanoid } from "nanoid"
import { convertUnits } from "@/lib/ingredient-utils"
import type { UnitConversion } from "@/types/ingredient"
import { logAudit, auditUser } from "@/lib/audit"

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

    // Get current ingredient data for history logging and unit conversion
    const ingredientIds = discrepancies.map((c) => c.ingredientId)
    const ingredients = await prisma.ingredient.findMany({
      where: { id: { in: ingredientIds } },
      select: { id: true, name: true, stockQty: true, baseUnitId: true, countUnitId: true },
    })

    const ingredientMap = new Map(ingredients.map((i) => [i.id, i]))

    // Load all unit conversions (small table) for transitive conversion support
    const allConversions: UnitConversion[] = (
      await prisma.unitConversion.findMany()
    ).map((c) => ({
      id: c.id,
      fromUnitId: c.fromUnitId,
      toUnitId: c.toUnitId,
      factor: Number(c.factor),
    }))

    // Pre-compute updates (unit conversions) before entering the transaction
    const updates: { ingredientId: number; actualInBaseUnits: number; ingredient: typeof ingredients[0]; count: CountItem }[] = []
    let skippedCount = 0

    for (const count of discrepancies) {
      const ingredient = ingredientMap.get(count.ingredientId)
      if (!ingredient) continue

      // Convert actual from count units to base units
      let actualInBaseUnits = count.actual
      if (ingredient.countUnitId && ingredient.countUnitId !== ingredient.baseUnitId) {
        const converted = convertUnits(
          count.actual,
          ingredient.countUnitId,
          ingredient.baseUnitId,
          allConversions
        )
        if (converted !== null) {
          actualInBaseUnits = converted
        } else {
          console.warn(
            `No conversion path from count unit ${ingredient.countUnitId} to base unit ${ingredient.baseUnitId} for ingredient "${ingredient.name}" (id=${ingredient.id}). Skipping update to avoid data corruption.`
          )
          skippedCount++
          continue
        }
      }

      updates.push({ ingredientId: count.ingredientId, actualInBaseUnits, ingredient, count })
    }

    // Execute all operations in an interactive transaction with extended timeout
    await prisma.$transaction(async (tx) => {
      for (const { ingredientId, actualInBaseUnits, ingredient, count } of updates) {
        await tx.ingredient.update({
          where: { id: ingredientId },
          data: {
            stockQty: actualInBaseUnits,
            lastUpdated: new Date(),
          },
        })

        await tx.ingredientHistory.create({
          data: {
            ingredientId,
            ingredientName: ingredient.name,
            changeId,
            field: "stockQty",
            oldValue: String(ingredient.stockQty),
            newValue: String(actualInBaseUnits),
            source: "inventory_count",
            reason: count.reason || null,
            reasonNote: count.reasonNote || null,
            userId,
            userName,
          },
        })
      }

      // Delete the user's draft after successful submit
      await tx.inventoryCountDraft.deleteMany({
        where: { userId },
      })
    }, { timeout: 30000 })

    await logAudit({
      entity: "inventory_count", entityId: null, action: "inventory_count",
      summary: `Submitted inventory count: ${counts.length} items, ${discrepancies.length} discrepancies`,
      ...auditUser(session),
    })

    return NextResponse.json({
      success: true,
      changeId,
      totalCounted: counts.length,
      discrepancies: discrepancies.length,
      skipped: skippedCount,
    })
  } catch (error) {
    console.error("Failed to submit inventory count:", error)
    return NextResponse.json(
      { error: "Failed to submit inventory count" },
      { status: 500 }
    )
  }
}
