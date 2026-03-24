import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
import { computeBaseUnitsPerVariant } from "@/lib/ingredient-utils"

/**
 * PUT /api/ingredients/:id/variants/:variantId
 * Update a purchase variant
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    const { id, variantId } = await params
    const ingredientId = parseInt(id)
    const vid = parseInt(variantId)
    const body = await request.json()

    const variant = await prisma.purchaseVariant.findFirst({
      where: { id: vid, ingredientId },
    })
    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 })
    }

    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
    })
    if (!ingredient) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 })
    }

    // Recompute baseUnitsPerVariant if content or package changed
    let baseUnitsPerVariant = Number(variant.baseUnitsPerVariant)
    const contentQty = body.contentQty ?? Number(variant.contentQty)
    const contentUnitId = body.contentUnitId ?? variant.contentUnitId
    const packageQty = body.packageQty ?? variant.packageQty

    if (
      body.contentQty !== undefined ||
      body.contentUnitId !== undefined ||
      body.packageQty !== undefined
    ) {
      const conversions = await prisma.unitConversion.findMany()
      baseUnitsPerVariant = computeBaseUnitsPerVariant(
        contentQty,
        contentUnitId,
        ingredient.baseUnitId,
        packageQty,
        conversions.map((c) => ({ id: c.id, fromUnitId: c.fromUnitId, toUnitId: c.toUnitId, factor: Number(c.factor) }))
      )
    }

    const updated = await prisma.purchaseVariant.update({
      where: { id: vid },
      data: {
        label: body.label ?? variant.label,
        contentQty,
        contentUnitId,
        packageQty,
        packageUnitId: body.packageUnitId ?? variant.packageUnitId,
        costPerVariant: body.costPerVariant ?? Number(variant.costPerVariant),
        baseUnitsPerVariant,
        vendorId: body.vendorId !== undefined ? body.vendorId : variant.vendorId,
        barcode: body.barcode !== undefined ? body.barcode : variant.barcode,
        sku: body.sku !== undefined ? body.sku : variant.sku,
      },
      include: { contentUnit: true, packageUnit: true },
    })

    await logAudit({
      entity: "purchase_variant", entityId: vid, action: "update",
      summary: `Updated variant '${updated.label}' for ingredient #${ingredientId}`,
      userId: null, userName: null,
    })

    return NextResponse.json({
      id: updated.id,
      ingredientId: updated.ingredientId,
      label: updated.label,
      contentQty: Number(updated.contentQty),
      contentUnitId: updated.contentUnitId,
      contentUnitName: updated.contentUnit.name,
      packageQty: updated.packageQty,
      packageUnitId: updated.packageUnitId,
      packageUnitName: updated.packageUnit.name,
      costPerVariant: Number(updated.costPerVariant),
      baseUnitsPerVariant: Number(updated.baseUnitsPerVariant),
      vendorId: updated.vendorId,
      barcode: updated.barcode,
      sku: updated.sku,
      isActive: updated.isActive,
      isDefault: updated.isDefault,
    })
  } catch (error) {
    console.error("Failed to update variant:", error)
    return NextResponse.json({ error: "Failed to update variant" }, { status: 500 })
  }
}

/**
 * DELETE /api/ingredients/:id/variants/:variantId
 * Soft-delete a purchase variant
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    const { id, variantId } = await params
    const ingredientId = parseInt(id)
    const vid = parseInt(variantId)

    const variant = await prisma.purchaseVariant.findFirst({
      where: { id: vid, ingredientId },
    })
    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 })
    }
    if (variant.isDefault) {
      return NextResponse.json({ error: "Cannot delete the default variant" }, { status: 400 })
    }

    await prisma.purchaseVariant.update({
      where: { id: vid },
      data: { isActive: false },
    })

    await logAudit({
      entity: "purchase_variant", entityId: vid, action: "delete",
      summary: `Deactivated variant '${variant.label}' for ingredient #${ingredientId}`,
      userId: null, userName: null,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete variant:", error)
    return NextResponse.json({ error: "Failed to delete variant" }, { status: 500 })
  }
}
