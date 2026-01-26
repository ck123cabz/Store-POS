import { prisma } from "./prisma"

interface SyncResult {
  success: boolean
  productId?: number
  error?: string
}

/**
 * Syncs a sellable ingredient to a product
 * Creates a new product if one doesn't exist, or updates the existing linked product
 */
export async function syncIngredientToProduct(
  ingredientId: number,
  categoryId: number
): Promise<SyncResult> {
  try {
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
      include: { linkedProduct: true },
    })

    if (!ingredient) {
      return { success: false, error: "Ingredient not found" }
    }

    if (!ingredient.sellable) {
      return { success: false, error: "Ingredient is not sellable" }
    }

    // If already has a linked product, update it
    if (ingredient.linkedProductId && ingredient.linkedProduct) {
      await prisma.product.update({
        where: { id: ingredient.linkedProductId },
        data: {
          name: ingredient.name,
          // Keep existing price, or mark as needs pricing if zero
          needsPricing: Number(ingredient.linkedProduct.price) === 0,
        },
      })

      await prisma.ingredient.update({
        where: { id: ingredientId },
        data: {
          syncStatus: "synced",
          syncError: null,
          lastSyncAt: new Date(),
        },
      })

      return { success: true, productId: ingredient.linkedProductId }
    }

    // Create new product
    const product = await prisma.product.create({
      data: {
        name: ingredient.name,
        price: 0, // Will be set by user
        categoryId,
        quantity: Math.floor(Number(ingredient.quantity)),
        trackStock: false, // Stock tracked via ingredient
        image: "",
        linkedIngredientId: ingredientId,
        needsPricing: true,
      },
    })

    // Link back to ingredient
    await prisma.ingredient.update({
      where: { id: ingredientId },
      data: {
        linkedProductId: product.id,
        syncStatus: "synced",
        syncError: null,
        lastSyncAt: new Date(),
      },
    })

    return { success: true, productId: product.id }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    await prisma.ingredient.update({
      where: { id: ingredientId },
      data: {
        syncStatus: "error",
        syncError: errorMessage,
      },
    })

    return { success: false, error: errorMessage }
  }
}

/**
 * Unlinks an ingredient from its product when sellable is set to false
 */
export async function unlinkIngredientFromProduct(ingredientId: number): Promise<SyncResult> {
  try {
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
    })

    if (!ingredient?.linkedProductId) {
      return { success: true }
    }

    // Remove the link from the product
    await prisma.product.update({
      where: { id: ingredient.linkedProductId },
      data: {
        linkedIngredientId: null,
      },
    })

    // Clear the link from the ingredient
    await prisma.ingredient.update({
      where: { id: ingredientId },
      data: {
        linkedProductId: null,
        syncStatus: "synced",
        syncError: null,
        lastSyncAt: new Date(),
      },
    })

    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return { success: false, error: errorMessage }
  }
}
