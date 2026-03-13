import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { logAudit, auditUser } from "@/lib/audit"
import { getSettings } from "@/lib/settings-server"
import { type ProductStatus } from "@prisma/client"
import {
  calculateProductAvailability,
  calculateEnhancedRecipeAvailability,
  type EnhancedProductAvailability,
} from "@/lib/product-availability"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeCosting = searchParams.get("includeCosting") === "true"
    const statusParam = searchParams.get("status") // comma-separated: "ACTIVE,UNAVAILABLE"

    const products = await prisma.product.findMany({
      where: statusParam
        ? { status: { in: statusParam.split(",") as ProductStatus[] } }
        : undefined,
      include: {
        category: true,
        linkedVariant: {
          include: {
            ingredient: {
              include: { baseUnit: true },
            },
          },
        },
        recipeItems: {
          include: {
            ingredient: {
              include: { baseUnit: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    })

    const settings = await getSettings()
    const criticalRatio = Number(settings.lowStockCriticalRatio)
    const warningRatio = Number(settings.lowStockWarningRatio)

    const formatted = products.map((p) => {
      // Calculate ingredient stock status if linked via variant
      let ingredientStockStatus: "ok" | "low" | "critical" | "out" | null = null
      let ingredientStockRatio: number | null = null

      if (p.linkedVariant) {
        const ingredient = p.linkedVariant.ingredient
        const stockQty = Number(ingredient.stockQty)
        const par = Number(ingredient.parLevel)
        const ratio = par > 0 ? stockQty / par : 1

        if (stockQty <= 0) ingredientStockStatus = "out"
        else if (ratio <= criticalRatio) ingredientStockStatus = "critical"
        else if (ratio <= warningRatio) ingredientStockStatus = "low"
        else ingredientStockStatus = "ok"

        ingredientStockRatio = par > 0 ? Math.round(ratio * 100) : null
      }

      // Calculate recipe-based availability with enhanced details
      let availability: EnhancedProductAvailability

      if (p.recipeItems && p.recipeItems.length > 0) {
        availability = calculateEnhancedRecipeAvailability(
          p.recipeItems.map((ri) => ({
            quantity: Number(ri.baseQuantity),
            ingredient: {
              id: ri.ingredient.id,
              name: ri.ingredient.name,
              quantity: Number(ri.ingredient.stockQty), // stockQty is already in base units
              packageSize: 1, // already base units, no conversion needed
              baseUnit: ri.ingredient.baseUnit.name,
            },
          }))
        )
      } else if (p.linkedVariant) {
        const ingredient = p.linkedVariant.ingredient
        const basic = calculateProductAvailability({
          id: p.id,
          name: p.name,
          linkedVariant: {
            baseUnitsPerVariant: Number(p.linkedVariant.baseUnitsPerVariant),
            ingredient: {
              id: ingredient.id,
              name: ingredient.name,
              quantity: Number(ingredient.stockQty),
              packageSize: 1,
              baseUnit: ingredient.baseUnit.name,
            },
          },
        })
        availability = {
          ...basic,
          missingIngredients: basic.status === "out" ? [{
            id: ingredient.id,
            name: ingredient.name,
            have: 0,
            needPerUnit: 1,
            status: "missing" as const,
          }] : [],
          lowIngredients: basic.status === "low" || basic.status === "critical" ? [{
            id: ingredient.id,
            name: ingredient.name,
            have: Number(ingredient.stockQty),
            needPerUnit: 1,
            status: "low" as const,
          }] : [],
          limitingIngredientDetails: basic.limitingIngredient ? {
            ...basic.limitingIngredient,
            have: Number(ingredient.stockQty),
            needPerUnit: 1,
            status: basic.status === "out" ? "missing" as const : "low" as const,
          } : null,
        }
      } else {
        availability = {
          status: "available",
          maxProducible: null,
          limitingIngredient: null,
          limitingIngredientDetails: null,
          warnings: [],
          missingIngredients: [],
          lowIngredients: [],
        }
      }

      return {
        id: p.id,
        name: p.name,
        price: Number(p.price),
        categoryId: p.categoryId,
        categoryName: p.category.name,
        quantity: p.quantity,
        trackStock: p.trackStock,
        image: p.image,
        linkedVariantId: p.linkedVariantId,
        needsPricing: p.needsPricing,
        status: p.status,
        requiresKitchen: p.requiresKitchen,
        linkedIngredient: p.linkedVariant
          ? {
              id: p.linkedVariant.ingredient.id,
              name: p.linkedVariant.ingredient.name,
              quantity: Number(p.linkedVariant.ingredient.stockQty),
              parLevel: Number(p.linkedVariant.ingredient.parLevel),
              unit: p.linkedVariant.ingredient.baseUnit.name,
              stockStatus: ingredientStockStatus,
              stockRatio: ingredientStockRatio,
            }
          : null,
        // Enhanced availability with all shortage details
        availability: {
          status: availability.status,
          maxProducible: availability.maxProducible,
          limitingIngredient: availability.limitingIngredient,
          limitingIngredientDetails: availability.limitingIngredientDetails,
          missingIngredients: availability.missingIngredients,
          lowIngredients: availability.lowIngredients,
          warnings: availability.warnings,
        },
        ...(includeCosting && {
          trueCost: p.trueCost ? Number(p.trueCost) : null,
          trueMargin: p.trueMargin ? Number(p.trueMargin) : null,
          trueMarginPercent: p.trueMarginPercent ? Number(p.trueMarginPercent) : null,
        }),
      }
    })

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Failed to fetch products:", error)
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!session.user.permProducts) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 })
    }

    const body = await request.json()

    const product = await prisma.product.create({
      data: {
        name: body.name,
        price: body.price,
        categoryId: body.categoryId,
        quantity: body.quantity || 0,
        trackStock: body.trackStock || false,
        image: body.image || "",
        linkedVariantId: body.linkedVariantId || null,
        needsPricing: body.needsPricing || false,
        requiresKitchen: body.requiresKitchen ?? null,
      },
    })

    await logAudit({
      entity: "product", entityId: product.id, action: "create",
      summary: `Created product '${product.name}'`,
      ...auditUser(session),
    })

    return NextResponse.json(
      {
        id: product.id,
        name: product.name,
        price: Number(product.price),
        categoryId: product.categoryId,
        quantity: product.quantity,
        trackStock: product.trackStock,
        image: product.image,
        linkedVariantId: product.linkedVariantId,
        needsPricing: product.needsPricing,
        requiresKitchen: product.requiresKitchen,
        status: product.status,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Failed to create product:", error)
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
}
