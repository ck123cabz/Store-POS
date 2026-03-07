import { prisma } from "./prisma"

interface SyncResult {
  success: boolean
  productId?: number
  error?: string
}

/**
 * Syncs a sellable purchase variant to a POS product.
 * Creates a new product if one doesn't exist, or updates the existing linked product.
 */
export async function syncVariantToProduct(
  variantId: number,
  categoryId: number
): Promise<SyncResult> {
  try {
    const variant = await prisma.purchaseVariant.findUnique({
      where: { id: variantId },
      include: {
        ingredient: true,
        linkedProduct: true,
      },
    })

    if (!variant) {
      return { success: false, error: "Variant not found" }
    }

    if (!variant.sellable) {
      return { success: false, error: "Variant is not sellable" }
    }

    // If already has a linked product, update it
    if (variant.linkedProductId && variant.linkedProduct) {
      const displayName = `${variant.ingredient.name} (${variant.label})`
      await prisma.product.update({
        where: { id: variant.linkedProductId },
        data: {
          name: displayName,
          needsPricing: Number(variant.linkedProduct.price) === 0,
        },
      })

      await prisma.purchaseVariant.update({
        where: { id: variantId },
        data: {
          syncStatus: "synced",
          syncError: null,
          lastSyncAt: new Date(),
        },
      })

      return { success: true, productId: variant.linkedProductId }
    }

    // Create new product
    const displayName = `${variant.ingredient.name} (${variant.label})`
    const product = await prisma.product.create({
      data: {
        name: displayName,
        price: variant.sellPrice ?? 0,
        categoryId,
        quantity: 0,
        trackStock: false, // Stock tracked via ingredient
        image: "",
        linkedVariantId: variantId,
        needsPricing: !variant.sellPrice || Number(variant.sellPrice) === 0,
      },
    })

    // Link back to variant
    await prisma.purchaseVariant.update({
      where: { id: variantId },
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

    await prisma.purchaseVariant.update({
      where: { id: variantId },
      data: {
        syncStatus: "error",
        syncError: errorMessage,
      },
    })

    return { success: false, error: errorMessage }
  }
}

/**
 * Unlinks a variant from its product when sellable is set to false.
 */
export async function unlinkVariantFromProduct(variantId: number): Promise<SyncResult> {
  try {
    const variant = await prisma.purchaseVariant.findUnique({
      where: { id: variantId },
    })

    if (!variant?.linkedProductId) {
      return { success: true }
    }

    // Remove the link from the product
    await prisma.product.update({
      where: { id: variant.linkedProductId },
      data: { linkedVariantId: null },
    })

    // Clear the link from the variant
    await prisma.purchaseVariant.update({
      where: { id: variantId },
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

/**
 * @deprecated Use syncVariantToProduct instead
 */
export async function syncIngredientToProduct(
  ingredientId: number,
  categoryId: number
): Promise<SyncResult> {
  // Find the default variant for this ingredient
  const variant = await prisma.purchaseVariant.findFirst({
    where: { ingredientId, isDefault: true, isActive: true },
  })

  if (!variant) {
    return { success: false, error: "No default variant found for ingredient" }
  }

  return syncVariantToProduct(variant.id, categoryId)
}

/**
 * @deprecated Use unlinkVariantFromProduct instead
 */
export async function unlinkIngredientFromProduct(ingredientId: number): Promise<SyncResult> {
  const variant = await prisma.purchaseVariant.findFirst({
    where: { ingredientId, isDefault: true },
  })

  if (!variant) {
    return { success: true }
  }

  return unlinkVariantFromProduct(variant.id)
}
