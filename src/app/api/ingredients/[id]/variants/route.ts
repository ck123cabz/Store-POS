import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
import {
  purchaseVariantSchema,
  computeBaseUnitsPerVariant,
} from "@/lib/ingredient-utils"

/**
 * GET /api/ingredients/:id/variants
 * List all purchase variants for an ingredient
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ingredientId = parseInt(id)

    const variants = await prisma.purchaseVariant.findMany({
      where: { ingredientId, isActive: true },
      include: { contentUnit: true, packageUnit: true },
      orderBy: [{ isDefault: "desc" }, { label: "asc" }],
    })

    return NextResponse.json(
      variants.map((v) => ({
        id: v.id,
        ingredientId: v.ingredientId,
        label: v.label,
        contentQty: Number(v.contentQty),
        contentUnitId: v.contentUnitId,
        contentUnitName: v.contentUnit.name,
        packageQty: v.packageQty,
        packageUnitId: v.packageUnitId,
        packageUnitName: v.packageUnit.name,
        costPerVariant: Number(v.costPerVariant),
        baseUnitsPerVariant: Number(v.baseUnitsPerVariant),
        sellable: v.sellable,
        sellPrice: v.sellPrice ? Number(v.sellPrice) : null,
        linkedProductId: v.linkedProductId,
        syncStatus: v.syncStatus,
        vendorId: v.vendorId,
        barcode: v.barcode,
        sku: v.sku,
        isActive: v.isActive,
        isDefault: v.isDefault,
      }))
    )
  } catch (error) {
    console.error("Failed to fetch variants:", error)
    return NextResponse.json({ error: "Failed to fetch variants" }, { status: 500 })
  }
}

/**
 * POST /api/ingredients/:id/variants
 * Create a new purchase variant for an ingredient
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ingredientId = parseInt(id)
    const body = await request.json()

    // Verify ingredient exists
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
    })
    if (!ingredient) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 })
    }

    const validation = purchaseVariantSchema.safeParse(body)
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

    // Compute baseUnitsPerVariant
    const conversions = await prisma.unitConversion.findMany()
    const baseUnitsPerVariant = computeBaseUnitsPerVariant(
      data.contentQty,
      data.contentUnitId,
      ingredient.baseUnitId,
      data.packageQty,
      conversions.map((c) => ({ id: c.id, fromUnitId: c.fromUnitId, toUnitId: c.toUnitId, factor: Number(c.factor) }))
    )

    const variant = await prisma.purchaseVariant.create({
      data: {
        ingredientId,
        label: data.label,
        contentQty: data.contentQty,
        contentUnitId: data.contentUnitId,
        packageQty: data.packageQty,
        packageUnitId: data.packageUnitId,
        costPerVariant: data.costPerVariant,
        baseUnitsPerVariant,
        sellable: data.sellable,
        sellPrice: data.sellPrice,
        vendorId: data.vendorId,
        barcode: data.barcode,
        sku: data.sku,
        isDefault: false,
      },
      include: { contentUnit: true, packageUnit: true },
    })

    await logAudit({
      entity: "purchase_variant", entityId: variant.id, action: "create",
      summary: `Created variant '${variant.label}' for ingredient #${ingredientId}`,
      userId: null, userName: null,
    })

    return NextResponse.json(
      {
        id: variant.id,
        ingredientId: variant.ingredientId,
        label: variant.label,
        contentQty: Number(variant.contentQty),
        contentUnitId: variant.contentUnitId,
        contentUnitName: variant.contentUnit.name,
        packageQty: variant.packageQty,
        packageUnitId: variant.packageUnitId,
        packageUnitName: variant.packageUnit.name,
        costPerVariant: Number(variant.costPerVariant),
        baseUnitsPerVariant: Number(variant.baseUnitsPerVariant),
        sellable: variant.sellable,
        sellPrice: variant.sellPrice ? Number(variant.sellPrice) : null,
        linkedProductId: variant.linkedProductId,
        syncStatus: variant.syncStatus,
        vendorId: variant.vendorId,
        barcode: variant.barcode,
        sku: variant.sku,
        isActive: variant.isActive,
        isDefault: variant.isDefault,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Failed to create variant:", error)
    return NextResponse.json({ error: "Failed to create variant" }, { status: 500 })
  }
}
