import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  calculateCostPerBaseUnit,
  calculateTotalBaseUnits,
  calculateStockStatus,
  calculateStockRatio,
  ingredientFormSchema,
} from "@/lib/ingredient-utils"

/**
 * Format ingredient for API response
 * Includes computed fields and maintains backward compatibility
 */
function formatIngredient(i: {
  id: number
  name: string
  category: string
  baseUnit: string
  packageSize: { toNumber: () => number } | number
  packageUnit: string
  costPerPackage: { toNumber: () => number } | number
  unit: string
  costPerUnit: { toNumber: () => number } | number
  parLevel: number
  quantity: { toNumber: () => number } | number
  lastRestockDate: Date | null
  lastUpdated: Date | null
  vendorId: number | null
  barcode: string | null
  countByBaseUnit: boolean
  sellable: boolean
  sellPrice: { toNumber: () => number } | null
  linkedProductId: number | null
  syncStatus: string
  isOverhead: boolean
  overheadPerTransaction: { toNumber: () => number } | null
  yieldFactor: { toNumber: () => number } | number | null
  vendor?: { name: string } | null
  unitAliases?: Array<{
    id: number
    name: string
    baseUnitMultiplier: { toNumber: () => number } | number
    description: string | null
    isDefault: boolean
    createdAt: Date
  }>
}) {
  const rawPackageSize = typeof i.packageSize === "number" ? i.packageSize : Number(i.packageSize)
  const rawCostPerPackage = typeof i.costPerPackage === "number" ? i.costPerPackage : Number(i.costPerPackage)
  const rawCostPerUnit = typeof i.costPerUnit === "number" ? i.costPerUnit : Number(i.costPerUnit)
  const quantity = typeof i.quantity === "number" ? i.quantity : Number(i.quantity)
  const parLevel = i.parLevel

  // Check if using new unit system or legacy data
  // Legacy data has: costPerPackage = 0 AND costPerUnit > 0
  // OR: packageUnit = "each" AND unit is a real unit (kg, g, etc.)
  const isLegacyData = rawCostPerPackage === 0 && rawCostPerUnit > 0

  // Effective values - prefer new system, fall back to legacy
  let effectivePackageUnit: string
  let effectiveBaseUnit: string
  let effectivePackageSize: number
  let effectiveCostPerPackage: number
  let effectiveCostPerBaseUnit: number

  if (isLegacyData) {
    // Use legacy unit/costPerUnit directly
    effectivePackageUnit = i.unit || "each"
    effectiveBaseUnit = i.unit || "each"
    effectivePackageSize = 1
    effectiveCostPerPackage = rawCostPerUnit
    effectiveCostPerBaseUnit = rawCostPerUnit
  } else {
    // Use new unit system
    effectivePackageUnit = i.packageUnit || "each"
    effectiveBaseUnit = i.baseUnit || "pcs"
    effectivePackageSize = rawPackageSize > 0 ? rawPackageSize : 1
    effectiveCostPerPackage = rawCostPerPackage
    effectiveCostPerBaseUnit = effectivePackageSize > 0
      ? calculateCostPerBaseUnit(effectiveCostPerPackage, effectivePackageSize)
      : 0
  }

  const totalBaseUnits = calculateTotalBaseUnits(quantity, effectivePackageSize)
  const stockStatus = calculateStockStatus(quantity, parLevel)
  const stockRatio = calculateStockRatio(quantity, parLevel)

  return {
    id: i.id,
    name: i.name,
    category: i.category,

    // Unit system (uses effective values for backward compatibility)
    baseUnit: effectiveBaseUnit,
    packageSize: effectivePackageSize,
    packageUnit: effectivePackageUnit,
    costPerPackage: effectiveCostPerPackage,
    costPerBaseUnit: effectiveCostPerBaseUnit,

    // Stock data
    quantity,
    totalBaseUnits,
    parLevel,
    stockStatus,
    stockRatio,
    countByBaseUnit: i.countByBaseUnit,

    // Metadata
    lastRestockDate: i.lastRestockDate,
    lastUpdated: i.lastUpdated,
    vendorId: i.vendorId,
    vendorName: i.vendor?.name || null,
    barcode: i.barcode,

    // Sellable fields
    sellable: i.sellable,
    sellPrice: i.sellPrice ? (typeof i.sellPrice === "number" ? i.sellPrice : Number(i.sellPrice)) : null,
    linkedProductId: i.linkedProductId,
    syncStatus: i.syncStatus,

    // Overhead fields
    isOverhead: i.isOverhead,
    overheadPerTransaction: i.overheadPerTransaction
      ? (typeof i.overheadPerTransaction === "number" ? i.overheadPerTransaction : Number(i.overheadPerTransaction))
      : null,

    // Yield factor
    yieldFactor: typeof i.yieldFactor === "number"
      ? i.yieldFactor
      : i.yieldFactor
        ? Number(i.yieldFactor)
        : null,

    // Unit aliases
    unitAliases: (i.unitAliases || []).map((ua) => ({
      id: ua.id,
      ingredientId: i.id,
      name: ua.name,
      baseUnitMultiplier: typeof ua.baseUnitMultiplier === "number"
        ? ua.baseUnitMultiplier
        : ua.baseUnitMultiplier.toNumber(),
      description: ua.description,
      isDefault: ua.isDefault,
      createdAt: ua.createdAt.toISOString(),
    })),

    // Legacy fields (deprecated, for backward compatibility)
    unit: i.unit || effectivePackageUnit,
    costPerUnit: rawCostPerUnit || effectiveCostPerBaseUnit,
  }
}

export async function GET() {
  try {
    const ingredients = await prisma.ingredient.findMany({
      where: { isActive: true },
      include: {
        vendor: true,
        unitAliases: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { name: "asc" },
    })

    const formatted = ingredients.map(formatIngredient)

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Failed to fetch ingredients:", error)
    return NextResponse.json({ error: "Failed to fetch ingredients" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Check if using new unit system or legacy
    const isNewUnitSystem = body.packageUnit !== undefined && body.baseUnit !== undefined

    if (isNewUnitSystem) {
      // Validate with new schema
      const validation = ingredientFormSchema.safeParse({
        name: body.name,
        category: body.category,
        vendorId: body.vendorId ?? null,
        packageUnit: body.packageUnit,
        costPerPackage: body.costPerPackage,
        baseUnit: body.baseUnit,
        packageSize: body.packageSize,
        quantity: body.quantity ?? 0,
        parLevel: body.parLevel ?? 0,
        countByBaseUnit: body.countByBaseUnit ?? false,
        sellable: body.sellable ?? false,
        sellPrice: body.sellPrice ?? null,
        isOverhead: body.isOverhead ?? false,
        overheadPerTransaction: body.overheadPerTransaction ?? null,
      })

      if (!validation.success) {
        return NextResponse.json(
          {
            error: "Validation failed",
            details: validation.error.issues.map((issue) => ({
              field: issue.path.join("."),
              message: issue.message,
            })),
          },
          { status: 400 }
        )
      }

      const data = validation.data

      const ingredient = await prisma.ingredient.create({
        data: {
          name: data.name,
          category: data.category,

          // New unit system
          baseUnit: data.baseUnit,
          packageSize: data.packageSize,
          packageUnit: data.packageUnit,
          costPerPackage: data.costPerPackage,

          // Also set legacy fields for backward compatibility
          unit: data.packageUnit,
          costPerUnit: data.costPerPackage / data.packageSize,

          // Stock
          quantity: data.quantity,
          parLevel: data.parLevel,
          countByBaseUnit: data.countByBaseUnit,

          // Special options
          vendorId: data.vendorId,
          barcode: body.barcode || null,
          sellable: data.sellable,
          sellPrice: data.sellPrice,
          isOverhead: data.isOverhead,
          overheadPerTransaction: data.overheadPerTransaction,

          lastUpdated: new Date(),
        },
        include: { vendor: true },
      })

      // Phase 4: Auto-sync if sellable
      if (ingredient.sellable && body.categoryId) {
        const { syncIngredientToProduct } = await import("@/lib/ingredient-sync")
        await syncIngredientToProduct(ingredient.id, body.categoryId)
      }

      return NextResponse.json(formatIngredient(ingredient), { status: 201 })
    } else {
      // Legacy creation path - for backward compatibility
      if (!body.name || !body.category || !body.unit || body.costPerUnit === undefined) {
        return NextResponse.json(
          { error: "Missing required fields: name, category, unit, costPerUnit" },
          { status: 400 }
        )
      }

      const ingredient = await prisma.ingredient.create({
        data: {
          name: body.name,
          category: body.category,
          unit: body.unit,
          costPerUnit: body.costPerUnit,

          // Set new unit system fields with defaults based on legacy data
          baseUnit: body.unit,
          packageSize: 1,
          packageUnit: body.unit,
          costPerPackage: body.costPerUnit,

          parLevel: body.parLevel || 0,
          quantity: body.quantity || 0,
          vendorId: body.vendorId || null,
          barcode: body.barcode || null,
          sellable: body.sellable || false,
          lastUpdated: new Date(),
        },
        include: { vendor: true },
      })

      // Phase 4: Auto-sync if sellable
      if (ingredient.sellable && body.categoryId) {
        const { syncIngredientToProduct } = await import("@/lib/ingredient-sync")
        await syncIngredientToProduct(ingredient.id, body.categoryId)
      }

      return NextResponse.json(formatIngredient(ingredient), { status: 201 })
    }
  } catch (error) {
    console.error("Failed to create ingredient:", error)
    return NextResponse.json({ error: "Failed to create ingredient" }, { status: 500 })
  }
}
