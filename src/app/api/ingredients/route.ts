import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  calculateStockStatus,
  calculateStockRatio,
  ingredientFormSchema,
  purchaseVariantSchema,
  computeBaseUnitsPerVariant,
} from "@/lib/ingredient-utils"

/**
 * Format ingredient for API response
 */
function formatIngredient(i: {
  id: number
  name: string
  category: string
  baseUnitId: number
  stockQty: { toNumber?: () => number } | number
  avgCostPerBaseUnit: { toNumber?: () => number } | number
  parLevel: { toNumber?: () => number } | number
  countUnitId: number | null
  isOverhead: boolean
  overheadPerTransaction: { toNumber?: () => number } | null
  yieldFactor: { toNumber?: () => number } | null
  vendorId: number | null
  lastUpdated: Date | null
  lastRestockDate: Date | null
  isActive: boolean
  baseUnit: { id: number; name: string; abbr: string; isDiscrete: boolean }
  countUnit?: { id: number; name: string; abbr: string } | null
  vendor?: { name: string } | null
  purchaseVariants?: Array<{
    id: number
    ingredientId: number
    label: string
    contentQty: { toNumber?: () => number } | number
    contentUnitId: number
    packageQty: number
    packageUnitId: number
    costPerVariant: { toNumber?: () => number } | number
    baseUnitsPerVariant: { toNumber?: () => number } | number
    sellable: boolean
    sellPrice: { toNumber?: () => number } | null
    linkedProductId: number | null
    syncStatus: string
    vendorId: number | null
    barcode: string | null
    sku: string | null
    isActive: boolean
    isDefault: boolean
    contentUnit?: { name: string }
    packageUnit?: { name: string }
  }>
  unitAliases?: Array<{
    id: number
    name: string
    baseUnitMultiplier: { toNumber?: () => number } | number
    description: string | null
    isDefault: boolean
    unitId: number | null
    createdAt: Date
  }>
}) {
  const num = (v: { toNumber?: () => number } | number | null | undefined): number => {
    if (v === null || v === undefined) return 0
    return typeof v === "number" ? v : Number(v)
  }

  const stockQty = num(i.stockQty)
  const parLevel = num(i.parLevel)
  const avgCost = num(i.avgCostPerBaseUnit)

  return {
    id: i.id,
    name: i.name,
    category: i.category,

    // Unit system
    baseUnitId: i.baseUnitId,
    baseUnitName: i.baseUnit.name,
    baseUnitAbbr: i.baseUnit.abbr,

    // Stock
    stockQty,
    avgCostPerBaseUnit: avgCost,
    parLevel,
    stockStatus: calculateStockStatus(stockQty, parLevel),
    stockRatio: calculateStockRatio(stockQty, parLevel),

    // Count preference
    countUnitId: i.countUnitId,
    countUnitName: i.countUnit?.name || null,

    // Overhead
    isOverhead: i.isOverhead,
    overheadPerTransaction: i.overheadPerTransaction ? num(i.overheadPerTransaction) : null,

    // Yield
    yieldFactor: i.yieldFactor ? num(i.yieldFactor) : null,

    // Metadata
    vendorId: i.vendorId,
    vendorName: i.vendor?.name || null,
    lastUpdated: i.lastUpdated?.toISOString() || null,
    lastRestockDate: i.lastRestockDate?.toISOString() || null,

    // Variants
    purchaseVariants: (i.purchaseVariants || []).map((v) => ({
      id: v.id,
      ingredientId: v.ingredientId,
      label: v.label,
      contentQty: num(v.contentQty),
      contentUnitId: v.contentUnitId,
      contentUnitName: v.contentUnit?.name || null,
      packageQty: v.packageQty,
      packageUnitId: v.packageUnitId,
      packageUnitName: v.packageUnit?.name || null,
      costPerVariant: num(v.costPerVariant),
      baseUnitsPerVariant: num(v.baseUnitsPerVariant),
      sellable: v.sellable,
      sellPrice: v.sellPrice ? num(v.sellPrice) : null,
      linkedProductId: v.linkedProductId,
      syncStatus: v.syncStatus,
      vendorId: v.vendorId,
      barcode: v.barcode,
      sku: v.sku,
      isActive: v.isActive,
      isDefault: v.isDefault,
    })),

    // Unit aliases
    unitAliases: (i.unitAliases || []).map((ua) => ({
      id: ua.id,
      ingredientId: i.id,
      name: ua.name,
      baseUnitMultiplier: num(ua.baseUnitMultiplier),
      description: ua.description,
      isDefault: ua.isDefault,
      unitId: ua.unitId,
      createdAt: ua.createdAt.toISOString(),
    })),
  }
}

const ingredientInclude = {
  baseUnit: true,
  countUnit: true,
  vendor: true,
  purchaseVariants: {
    where: { isActive: true },
    include: { contentUnit: true, packageUnit: true },
    orderBy: { isDefault: "desc" as const },
  },
  unitAliases: { orderBy: { createdAt: "asc" as const } },
}

export async function GET() {
  try {
    const ingredients = await prisma.ingredient.findMany({
      where: { isActive: true },
      include: ingredientInclude,
      orderBy: { name: "asc" },
    })

    return NextResponse.json(ingredients.map(formatIngredient))
  } catch (error) {
    console.error("Failed to fetch ingredients:", error)
    return NextResponse.json({ error: "Failed to fetch ingredients" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate ingredient fields
    const ingredientValidation = ingredientFormSchema.safeParse({
      name: body.name,
      category: body.category,
      baseUnitId: body.baseUnitId,
      vendorId: body.vendorId ?? null,
      parLevel: body.parLevel ?? 0,
      countUnitId: body.countUnitId ?? null,
      isOverhead: body.isOverhead ?? false,
      overheadPerTransaction: body.overheadPerTransaction ?? null,
      yieldFactor: body.yieldFactor ?? null,
    })

    if (!ingredientValidation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: ingredientValidation.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      )
    }

    // Validate default variant if provided
    let variantData: ReturnType<typeof purchaseVariantSchema.parse> | null = null
    if (body.defaultVariant) {
      const variantValidation = purchaseVariantSchema.safeParse(body.defaultVariant)
      if (!variantValidation.success) {
        return NextResponse.json(
          {
            error: "Default variant validation failed",
            details: variantValidation.error.issues.map((issue) => ({
              field: `defaultVariant.${issue.path.join(".")}`,
              message: issue.message,
            })),
          },
          { status: 400 }
        )
      }
      variantData = variantValidation.data
    }

    const data = ingredientValidation.data

    // Compute baseUnitsPerVariant for the default variant
    let baseUnitsPerVariant = 0
    if (variantData) {
      const conversions = await prisma.unitConversion.findMany()
      baseUnitsPerVariant = computeBaseUnitsPerVariant(
        variantData.contentQty,
        variantData.contentUnitId,
        data.baseUnitId,
        variantData.packageQty,
        conversions.map((c) => ({ id: c.id, fromUnitId: c.fromUnitId, toUnitId: c.toUnitId, factor: Number(c.factor) }))
      )
    }

    // Compute initial avgCostPerBaseUnit from variant
    const initialStockQty = body.initialStockQty ?? 0
    const avgCostPerBaseUnit =
      variantData && baseUnitsPerVariant > 0
        ? variantData.costPerVariant / baseUnitsPerVariant
        : 0

    const ingredient = await prisma.$transaction(async (tx) => {
      const created = await tx.ingredient.create({
        data: {
          name: data.name,
          category: data.category,
          baseUnitId: data.baseUnitId,
          stockQty: initialStockQty,
          avgCostPerBaseUnit,
          parLevel: data.parLevel,
          countUnitId: data.countUnitId,
          isOverhead: data.isOverhead,
          overheadPerTransaction: data.overheadPerTransaction,
          yieldFactor: data.yieldFactor,
          vendorId: data.vendorId,
          lastUpdated: new Date(),
        },
      })

      // Create default variant
      if (variantData) {
        await tx.purchaseVariant.create({
          data: {
            ingredientId: created.id,
            label: variantData.label,
            contentQty: variantData.contentQty,
            contentUnitId: variantData.contentUnitId,
            packageQty: variantData.packageQty,
            packageUnitId: variantData.packageUnitId,
            costPerVariant: variantData.costPerVariant,
            baseUnitsPerVariant,
            sellable: variantData.sellable,
            sellPrice: variantData.sellPrice,
            vendorId: variantData.vendorId,
            barcode: variantData.barcode,
            sku: variantData.sku,
            isDefault: true,
          },
        })
      }

      // Return with full includes
      return tx.ingredient.findUniqueOrThrow({
        where: { id: created.id },
        include: ingredientInclude,
      })
    })

    return NextResponse.json(formatIngredient(ingredient), { status: 201 })
  } catch (error) {
    console.error("Failed to create ingredient:", error)
    return NextResponse.json({ error: "Failed to create ingredient" }, { status: 500 })
  }
}
