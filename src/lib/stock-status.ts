/**
 * Stock status calculation utilities
 * Used for POS product tile status indicators
 */

export type StockStatusType = "ok" | "low-stock" | "out-of-stock";

export interface ProductStockInfo {
  quantity: number;
  trackStock: boolean;
  parLevel?: number;
}

export interface StockStatus {
  status: StockStatusType;
  isOutOfStock: boolean;
  isLowStock: boolean;
  quantityLeft?: number;
}

/**
 * Calculates the stock status for a product
 * Handles EC-03: trackStock=false should not show out-of-stock indicator
 *
 * @param product - Product stock information
 * @returns Stock status object with flags and remaining quantity
 */
export function getStockStatus(product: ProductStockInfo): StockStatus {
  const { quantity, trackStock, parLevel } = product;

  // EC-03: If stock tracking is disabled, always return ok
  if (!trackStock) {
    return {
      status: "ok",
      isOutOfStock: false,
      isLowStock: false,
    };
  }

  // Out of stock: quantity <= 0
  if (quantity <= 0) {
    return {
      status: "out-of-stock",
      isOutOfStock: true,
      isLowStock: false,
      quantityLeft: 0,
    };
  }

  // Low stock: quantity > 0 AND quantity <= parLevel AND parLevel > 0
  const effectiveParLevel = parLevel ?? 0;
  if (effectiveParLevel > 0 && quantity <= effectiveParLevel) {
    return {
      status: "low-stock",
      isOutOfStock: false,
      isLowStock: true,
      quantityLeft: quantity,
    };
  }

  // Normal stock
  return {
    status: "ok",
    isOutOfStock: false,
    isLowStock: false,
    quantityLeft: quantity,
  };
}

/**
 * Calculates the ingredient stock percentage
 * Used for linked ingredient badges on POS tiles
 *
 * @param currentStock - Current ingredient quantity
 * @param parLevel - PAR level for the ingredient
 * @returns Percentage (0-100), capped at 100
 */
export function getIngredientStockPercentage(
  currentStock: number,
  parLevel: number
): number {
  if (parLevel <= 0) {
    return 100; // No threshold defined, consider full
  }

  const percentage = Math.round((currentStock / parLevel) * 100);
  return Math.min(Math.max(percentage, 0), 100);
}

/**
 * Gets Tailwind color classes based on stock percentage
 * Based on "Ingredient Stock Percentage Display" table in spec.md
 *
 * @param percentage - Stock percentage (0-100)
 * @returns Tailwind color class string
 */
export function getStockPercentageColor(percentage: number): string {
  if (percentage <= 25) {
    return "bg-red-100 text-red-800 border-red-200";
  }
  if (percentage <= 50) {
    return "bg-orange-100 text-orange-800 border-orange-200";
  }
  if (percentage <= 75) {
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
  }
  return "bg-green-100 text-green-800 border-green-200";
}

/**
 * Gets CSS classes for product tile based on stock status
 *
 * @param status - Stock status
 * @returns Object with CSS class strings for different states
 */
export function getStockStatusClasses(status: StockStatus): {
  container: string;
  badge?: string;
  overlay?: string;
} {
  if (status.isOutOfStock) {
    return {
      container: "opacity-50 pointer-events-none",
      badge: "bg-muted text-muted-foreground",
      overlay: "absolute inset-0 bg-background/60 flex items-center justify-center",
    };
  }

  if (status.isLowStock) {
    return {
      container: "ring-2 ring-orange-400",
      badge: "bg-orange-100 text-orange-800 border-orange-200",
    };
  }

  return {
    container: "",
  };
}
