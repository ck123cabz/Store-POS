import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { nanoid } from "nanoid"
import {
  calculateCostPerBaseUnit,
  calculateTotalBaseUnits,
  calculateStockStatus,
  calculateStockRatio,
  ingredientFormSchema,
} from "@/lib/ingredient-utils"

/**
 * Format ingredient for API response
 */
function formatIngredient(i: {
  id: number
  name: string
  category: string
  baseUnit: string
  packageSize: { toNumber?: () => number } | number
  packageUnit: string
  costPerPackage: { toNumber?: () => number } | number
  unit: string
  costPerUnit: { toNumber?: () => number } | number
  parLevel: number
  quantity: { toNumber?: () => number } | number
  lastRestockDate: Date | null
  lastUpdated: Date | null
  vendorId: number | null
  barcode: string | null
  countByBaseUnit: boolean
  sellable: boolean
  sellPrice: { toNumber?: () => number } | null
  linkedProductId: number | null
  syncStatus: string
  isOverhead: boolean
  overheadPerTransaction: { toNumber?: () => number } | null
  vendor?: { name: string } | null
  recipeItems?: Array<{
    productId: number
    quantity: { toNumber?: () => number } | number
    product: { name: string }
  }>
}) {
  const packageSize = typeof i.packageSize === "number" ? i.packageSize : Number(i.packageSize)
  const costPerPackage = typeof i.costPerPackage === "number" ? i.costPerPackage : Number(i.costPerPackage)
  const quantity = typeof i.quantity === "number" ? i.quantity : Number(i.quantity)
  const parLevel = i.parLevel

  const costPerBaseUnit = packageSize > 0 ? calculateCostPerBaseUnit(costPerPackage, packageSize) : 0
  const totalBaseUnits = calculateTotalBaseUnits(quantity, packageSize)
  const stockStatus = calculateStockStatus(quantity, parLevel)
  const stockRatio = calculateStockRatio(quantity, parLevel)

  return {
    id: i.id,
    name: i.name,
    category: i.category,

    // New unit system
    baseUnit: i.baseUnit,
    packageSize,
    packageUnit: i.packageUnit,
    costPerPackage,
    costPerBaseUnit,

    // Stock
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

    // Sellable
    sellable: i.sellable,
    sellPrice: i.sellPrice ? (typeof i.sellPrice === "number" ? i.sellPrice : Number(i.sellPrice)) : null,
    linkedProductId: i.linkedProductId,
    syncStatus: i.syncStatus,

    // Overhead
    isOverhead: i.isOverhead,
    overheadPerTransaction: i.overheadPerTransaction
      ? (typeof i.overheadPerTransaction === "number" ? i.overheadPerTransaction : Number(i.overheadPerTransaction))
      : null,

    // Legacy (deprecated)
    unit: i.unit || i.packageUnit,
    costPerUnit: typeof i.costPerUnit === "number" ? i.costPerUnit : Number(i.costPerUnit),

    // Recipe usage
    usedInProducts: i.recipeItems?.map((ri) => ({
      productId: ri.productId,
      productName: ri.product.name,
      quantity: typeof ri.quantity === "number" ? ri.quantity : Number(ri.quantity),
    })),
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: parseInt(id) },
      include: { vendor: true, recipeItems: { include: { product: true } } },
    })

    if (!ingredient) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 })
    }

    return NextResponse.json(formatIngredient(ingredient))
  } catch {
    return NextResponse.json({ error: "Failed to fetch ingredient" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ingredientId = parseInt(id)
    const body = await request.json()

    // Get current ingredient for history comparison
    const current = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
    })

    if (!current) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 })
    }

    const changeId = `edit_${nanoid(10)}`
    const historyEntries: Parameters<typeof prisma.ingredientHistory.create>[0]["data"][] = []

    // Check if using new unit system or legacy
    const isNewUnitSystem = body.packageUnit !== undefined && body.baseUnit !== undefined

    // Build update data based on input type
    let updateData: Record<string, unknown>

    if (isNewUnitSystem) {
      // Validate new unit system input
      const parsedPackageSize = parseFloat(body.packageSize) || 1
      if (parsedPackageSize <= 0) {
        return NextResponse.json(
          { error: "Package size must be greater than 0" },
          { status: 400 }
        )
      }

      const parsedCostPerPackage = parseFloat(body.costPerPackage) || 0

      // Track cost changes for history
      if (parsedCostPerPackage !== Number(current.costPerPackage)) {
        historyEntries.push({
          ingredientId,
          ingredientName: current.name,
          changeId,
          field: "costPerPackage",
          oldValue: current.costPerPackage.toString(),
          newValue: parsedCostPerPackage.toString(),
          source: "manual_edit",
          reason: body.reason || "price_update",
          reasonNote: body.reasonNote || null,
          userId: body.userId || 0,
          userName: body.userName || "System",
        })
      }

      // Track quantity changes
      const parsedQuantity = parseFloat(body.quantity) ?? Number(current.quantity)
      if (parsedQuantity !== Number(current.quantity)) {
        historyEntries.push({
          ingredientId,
          ingredientName: current.name,
          changeId,
          field: "quantity",
          oldValue: current.quantity.toString(),
          newValue: parsedQuantity.toString(),
          source: "manual_edit",
          reason: body.reason || null,
          reasonNote: body.reasonNote || null,
          userId: body.userId || 0,
          userName: body.userName || "System",
        })
      }

      updateData = {
        name: body.name,
        category: body.category,

        // New unit system
        baseUnit: body.baseUnit,
        packageSize: parsedPackageSize,
        packageUnit: body.packageUnit,
        costPerPackage: parsedCostPerPackage,

        // Also update legacy fields for backward compatibility
        unit: body.packageUnit,
        costPerUnit: parsedCostPerPackage / parsedPackageSize,

        // Stock
        parLevel: parseInt(body.parLevel) ?? current.parLevel,
        quantity: parsedQuantity,
        countByBaseUnit: body.countByBaseUnit ?? current.countByBaseUnit,

        // Special
        vendorId: body.vendorId ?? null,
        barcode: body.barcode ?? null,
        sellable: body.sellable ?? current.sellable,
        sellPrice: body.sellPrice ?? current.sellPrice,
        isOverhead: body.isOverhead ?? current.isOverhead,
        overheadPerTransaction: body.overheadPerTransaction ?? current.overheadPerTransaction,

        lastUpdated: new Date(),
      }
    } else {
      // Legacy update path
      // Track quantity changes
      if (body.quantity !== undefined && Number(body.quantity) !== Number(current.quantity)) {
        historyEntries.push({
          ingredientId,
          ingredientName: current.name,
          changeId,
          field: "quantity",
          oldValue: current.quantity.toString(),
          newValue: body.quantity.toString(),
          source: "manual_edit",
          reason: body.reason || null,
          reasonNote: body.reasonNote || null,
          userId: body.userId || 0,
          userName: body.userName || "System",
        })
      }

      // Track cost changes
      if (body.costPerUnit !== undefined && Number(body.costPerUnit) !== Number(current.costPerUnit)) {
        historyEntries.push({
          ingredientId,
          ingredientName: current.name,
          changeId,
          field: "costPerUnit",
          oldValue: current.costPerUnit.toString(),
          newValue: body.costPerUnit.toString(),
          source: "manual_edit",
          reason: body.reason || "price_update",
          reasonNote: body.reasonNote || null,
          userId: body.userId || 0,
          userName: body.userName || "System",
        })
      }

      updateData = {
        name: body.name,
        category: body.category,
        unit: body.unit,
        costPerUnit: body.costPerUnit,
        parLevel: body.parLevel,
        quantity: body.quantity,
        vendorId: body.vendorId || null,
        barcode: body.barcode || null,
        sellable: body.sellable ?? current.sellable,
        lastUpdated: new Date(),
      }
    }

    // Update ingredient and create history entries in transaction
    const [ingredient] = await prisma.$transaction([
      prisma.ingredient.update({
        where: { id: ingredientId },
        data: updateData,
        include: { vendor: true },
      }),
      ...historyEntries.map((entry) =>
        prisma.ingredientHistory.create({ data: entry })
      ),
    ])

    // Handle sellable toggle
    if (body.sellable !== undefined && body.sellable !== current.sellable) {
      if (body.sellable && body.categoryId) {
        // Turning on sellable - sync to product
        const { syncIngredientToProduct } = await import("@/lib/ingredient-sync")
        await syncIngredientToProduct(ingredientId, body.categoryId)
      } else if (!body.sellable && current.linkedProductId) {
        // Turning off sellable - unlink from product
        const { unlinkIngredientFromProduct } = await import("@/lib/ingredient-sync")
        await unlinkIngredientFromProduct(ingredientId)
      }
    }

    return NextResponse.json(formatIngredient(ingredient))
  } catch (error) {
    console.error("Failed to update ingredient:", error)
    return NextResponse.json({ error: "Failed to update ingredient" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ingredientId = parseInt(id)

    // Check existence before update
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
    })

    if (!ingredient) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 })
    }

    // Soft delete - set isActive to false
    await prisma.ingredient.update({
      where: { id: ingredientId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, message: `${ingredient.name} has been deactivated` })
  } catch (error) {
    console.error("Failed to delete ingredient:", error)
    return NextResponse.json({ error: "Failed to delete ingredient" }, { status: 500 })
  }
}
