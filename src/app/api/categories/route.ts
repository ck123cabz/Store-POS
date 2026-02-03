import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import {
  calculateProductAvailability,
  AvailabilityStatus,
} from "@/lib/product-availability"

/**
 * Stock health counts for a category
 */
interface StockHealth {
  available: number
  low: number
  critical: number
  out: number
}

/**
 * Product summary for category expanded view
 */
interface ProductSummary {
  id: number
  name: string
  price: number
  availability: {
    status: AvailabilityStatus
  }
}

/**
 * Category response with enhanced data
 */
interface CategoryResponse {
  id: number
  name: string
  displayOrder: number
  createdAt: Date
  updatedAt: Date
  productCount: number
  stockHealth: StockHealth
  products: ProductSummary[]
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const categories = await prisma.category.findMany({
      orderBy: { displayOrder: "asc" },
      include: {
        _count: { select: { products: true } },
        products: {
          include: {
            recipeItems: {
              include: {
                ingredient: {
                  select: {
                    id: true,
                    name: true,
                    quantity: true,
                    packageSize: true,
                  },
                },
              },
            },
            linkedIngredient: {
              select: {
                id: true,
                name: true,
                quantity: true,
                packageSize: true,
              },
            },
          },
        },
      },
    })

    // Transform categories to include stockHealth and products
    const categoriesWithHealth: CategoryResponse[] = categories.map((category) => {
      // Calculate stock health counts and build product summaries
      const stockHealth: StockHealth = {
        available: 0,
        low: 0,
        critical: 0,
        out: 0,
      }

      const productSummaries: ProductSummary[] = []

      for (const product of category.products) {
        // Transform product data for availability calculation
        const availabilityProduct = {
          id: product.id,
          name: product.name,
          recipeItems: product.recipeItems.map((ri) => ({
            quantity: Number(ri.quantity),
            ingredient: {
              id: ri.ingredient.id,
              name: ri.ingredient.name,
              quantity: Number(ri.ingredient.quantity),
              packageSize: Number(ri.ingredient.packageSize),
            },
          })),
          linkedIngredient: product.linkedIngredient
            ? {
                id: product.linkedIngredient.id,
                name: product.linkedIngredient.name,
                quantity: Number(product.linkedIngredient.quantity),
                packageSize: Number(product.linkedIngredient.packageSize),
              }
            : null,
        }

        const availability = calculateProductAvailability(availabilityProduct)
        const status: AvailabilityStatus = availability.status

        stockHealth[status]++

        // Add product summary for expanded view
        productSummaries.push({
          id: product.id,
          name: product.name,
          price: Number(product.price),
          availability: { status },
        })
      }

      return {
        id: category.id,
        name: category.name,
        displayOrder: category.displayOrder,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
        productCount: category._count.products,
        stockHealth,
        products: productSummaries,
      }
    })

    return NextResponse.json(categoriesWithHealth)
  } catch (error) {
    console.error("Failed to fetch categories:", error)
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!session.user.permCategories) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 })
    }

    const body = await request.json()

    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 })
    }

    const category = await prisma.category.create({
      data: { name: body.name.trim() },
    })

    return NextResponse.json(category, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 })
  }
}
