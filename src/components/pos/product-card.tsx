"use client"

import Image from "next/image"
import { Package } from "lucide-react"
import { cn } from "@/lib/utils"
import { getImageSrc, isDataUrl } from "@/lib/image-utils"

interface Availability {
  status: "available" | "low" | "critical" | "out"
  maxProducible: number | null
  limitingIngredient: { id: number; name: string } | null
  warnings: string[]
}

interface ProductCardProps {
  product: {
    id: number
    name: string
    price: number
    image: string
    needsPricing?: boolean
    status?: string
    availability: Availability
  }
  currencySymbol: string
  onAddToCart: () => void
}

function StatusDot({
  status,
  maxProducible,
}: {
  status: Availability["status"]
  maxProducible: number | null
}) {
  const config = {
    available: {
      dot: "bg-status-ok",
      label: "In Stock",
    },
    low: {
      dot: "bg-status-warning",
      label: maxProducible != null ? `${maxProducible} left` : "Low Stock",
    },
    critical: {
      dot: "bg-status-critical",
      label: maxProducible != null ? `Only ${maxProducible} left` : "Critical",
    },
    out: {
      dot: "bg-status-critical",
      label: "Out of Stock",
    },
  } as const

  const { dot, label } = config[status]

  return (
    <span className="flex items-center gap-1.5 min-w-0">
      <span
        className={cn("inline-block size-2 shrink-0 rounded-full", dot)}
        aria-hidden="true"
      />
      <span className="text-xs leading-none text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
        {label}
      </span>
    </span>
  )
}

export function ProductCard({ product, currencySymbol, onAddToCart }: ProductCardProps) {
  const { availability } = product
  const isUnavailable = product.status === "UNAVAILABLE"
  const isOutOfStock = availability.status === "out"
  const isDisabled = isOutOfStock || isUnavailable

  // Build stock status text for aria-label
  const stockStatusLabel = isUnavailable
    ? "Unavailable"
    : availability.status === "available"
      ? "In Stock"
      : availability.status === "out"
        ? "Out of Stock"
        : availability.maxProducible != null
          ? `${availability.maxProducible} left`
          : "Low Stock"

  return (
    <div
      data-testid="product-card"
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-disabled={isDisabled}
      aria-label={`Add ${product.name}, ${currencySymbol}${product.price.toFixed(2)}, ${stockStatusLabel}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card",
        "min-h-[80px] cursor-pointer select-none",
        "transition-[background-color,transform] duration-100",
        !isDisabled && "hover:bg-accent active:scale-[0.98]",
        isDisabled && "cursor-not-allowed opacity-50"
      )}
      onClick={() => !isDisabled && onAddToCart()}
      onKeyDown={(e) => {
        if (!isDisabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault()
          onAddToCart()
        }
      }}
    >
      {/* Image area — 4:3 aspect ratio */}
      <div className="relative aspect-[4/3] w-full bg-muted">
        {product.image ? (
          <Image
            src={getImageSrc(product.image)}
            alt={product.name}
            fill
            className="object-cover"
            unoptimized={isDataUrl(product.image)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
            <Package className="size-8" />
          </div>
        )}

        {/* Out-of-stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Out of Stock
            </span>
          </div>
        )}

        {/* Unavailable overlay */}
        {isUnavailable && !isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <span className="text-xs font-semibold uppercase tracking-wider text-status-warning">
              Unavailable
            </span>
          </div>
        )}
      </div>

      {/* Product info */}
      <div className="flex flex-1 flex-col justify-between gap-1.5 p-3">
        <p className="truncate text-sm font-medium leading-snug">
          {product.name}
        </p>

        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold font-mono tabular-nums shrink-0">
            {currencySymbol}{product.price.toFixed(2)}
          </span>

          <StatusDot
            status={availability.status}
            maxProducible={availability.maxProducible}
          />
        </div>
      </div>
    </div>
  )
}
