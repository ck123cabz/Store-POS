import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
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

    const products = await prisma.product.findMany({
      include: {
        category: true,
        linkedIngredient: {
          select: {
            id: true,
            name: true,
            quantity: true,
            parLevel: true,
            unit: true,
            packageSize: true,
            baseUnit: true,
          },
        },
        recipeItems: {
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
                quantity: true,
                packageSize: true,
                baseUnit: true,
                parLevel: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    })

    const formatted = products.map((p) => {
      // Calculate ingredient stock status if linked
      let ingredientStockStatus: "ok" | "low" | "critical" | "out" | null = null
      let ingredientStockRatio: number | null = null

      if (p.linkedIngredient) {
        const qty = Number(p.linkedIngredient.quantity)
        const par = p.linkedIngredient.parLevel
        const ratio = par > 0 ? qty / par : 1

        if (qty <= 0) ingredientStockStatus = "out"
        else if (ratio <= 0.25) ingredientStockStatus = "critical"
        else if (ratio <= 0.5) ingredientStockStatus = "low"
        else ingredientStockStatus = "ok"

        ingredientStockRatio = par > 0 ? Math.round(ratio * 100) : null
      }

      // Calculate recipe-based availability with enhanced details
      let availability: EnhancedProductAvailability;

      if (p.recipeItems && p.recipeItems.length > 0) {
        availability = calculateEnhancedRecipeAvailability(
          (p.recipeItems ?? []).map((ri) => ({
            quantity: Number(ri.quantity),
            ingredient: {
              id: ri.ingredient.id,
              name: ri.ingredient.name,
              quantity: Number(ri.ingredient.quantity),
              packageSize: Number(ri.ingredient.packageSize),
            },
          }))
        );
      } else if (p.linkedIngredient) {
        // For linked ingredients, use basic calculation
        const basic = calculateProductAvailability({
          id: p.id,
          name: p.name,
          linkedIngredient: {
            id: p.linkedIngredient.id,
            name: p.linkedIngredient.name,
            quantity: Number(p.linkedIngredient.quantity),
            packageSize: Number(p.linkedIngredient.packageSize ?? 1),
          },
        });
        availability = {
          ...basic,
          missingIngredients: basic.status === "out" ? [{
            id: p.linkedIngredient.id,
            name: p.linkedIngredient.name,
            have: 0,
            needPerUnit: 1,
            status: "missing" as const,
          }] : [],
          lowIngredients: basic.status === "low" || basic.status === "critical" ? [{
            id: p.linkedIngredient.id,
            name: p.linkedIngredient.name,
            have: Number(p.linkedIngredient.quantity) * Number(p.linkedIngredient.packageSize ?? 1),
            needPerUnit: 1,
            status: "low" as const,
          }] : [],
          limitingIngredientDetails: basic.limitingIngredient ? {
            ...basic.limitingIngredient,
            have: Number(p.linkedIngredient.quantity) * Number(p.linkedIngredient.packageSize ?? 1),
            needPerUnit: 1,
            status: basic.status === "out" ? "missing" as const : "low" as const,
          } : null,
        };
      } else {
        availability = {
          status: "available",
          maxProducible: null,
          limitingIngredient: null,
          limitingIngredientDetails: null,
          warnings: [],
          missingIngredients: [],
          lowIngredients: [],
        };
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
        linkedIngredientId: p.linkedIngredientId,
        needsPricing: p.needsPricing,
        linkedIngredient: p.linkedIngredient
          ? {
              id: p.linkedIngredient.id,
              name: p.linkedIngredient.name,
              quantity: Number(p.linkedIngredient.quantity),
              parLevel: p.linkedIngredient.parLevel,
              unit: p.linkedIngredient.unit,
              packageSize: Number(p.linkedIngredient.packageSize ?? 1),
              baseUnit: p.linkedIngredient.baseUnit ?? null,
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
        linkedIngredientId: body.linkedIngredientId || null,
        needsPricing: body.needsPricing || false,
      },
      include: { linkedIngredient: true },
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
        linkedIngredientId: product.linkedIngredientId,
        needsPricing: product.needsPricing,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Failed to create product:", error)
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
}
