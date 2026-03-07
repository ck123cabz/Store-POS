import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { convertUnits } from "@/lib/ingredient-utils"
import type { UnitConversion } from "@/types/ingredient"

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

    // Load all unit conversions (small table) for transitive conversion support
    const allConversions: UnitConversion[] = (
      await prisma.unitConversion.findMany()
    ).map((c) => ({
      id: c.id,
      fromUnitId: c.fromUnitId,
      toUnitId: c.toUnitId,
      factor: Number(c.factor),
    }))

    // Transform to count format, converting expected and parLevel from base units to count units
    const countItems = ingredients.map((ing) => {
      const stockQtyBase = Number(ing.stockQty)
      const parLevelBase = Number(ing.parLevel)
      let expected = stockQtyBase
      let parLevel = parLevelBase

      if (ing.countUnitId && ing.countUnitId !== ing.baseUnitId) {
        const converted = convertUnits(stockQtyBase, ing.baseUnitId, ing.countUnitId, allConversions)
        if (converted !== null) {
          expected = converted
        } else {
          console.warn(
            `No conversion path from unit ${ing.baseUnitId} to count unit ${ing.countUnitId} for ingredient "${ing.name}" (id=${ing.id}). Falling back to base-unit value.`
          )
        }

        const convertedPar = convertUnits(parLevelBase, ing.baseUnitId, ing.countUnitId, allConversions)
        if (convertedPar !== null) {
          parLevel = convertedPar
        } else if (parLevelBase > 0) {
          console.warn(
            `No conversion path for parLevel from unit ${ing.baseUnitId} to count unit ${ing.countUnitId} for ingredient "${ing.name}" (id=${ing.id}). Falling back to base-unit value.`
          )
        }
      }

      return {
        ingredientId: ing.id,
        name: ing.name,
        category: ing.category,
        unit: ing.countUnit?.name || ing.baseUnit.name,
        expected,
        parLevel,
        barcode: ing.purchaseVariants[0]?.barcode || null,
      }
    })

    return NextResponse.json(countItems)
  } catch (error) {
    console.error("Failed to prepare inventory count:", error)
    return NextResponse.json(
      { error: "Failed to prepare inventory count" },
      { status: 500 }
    )
  }
}
