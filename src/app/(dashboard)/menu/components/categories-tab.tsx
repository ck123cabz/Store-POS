"use client"

import { useState } from "react"
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GripVertical, ChevronRight, ChevronDown, Pencil, Trash2, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/ingredient-utils"

interface Product {
  id: number
  name: string
  price: number
  availability: {
    status: "available" | "low" | "critical" | "out"
  }
}

interface StockHealth {
  available: number
  low: number
  critical: number
  out: number
}

interface Category {
  id: number
  name: string
  displayOrder: number
  productCount: number
  stockHealth: StockHealth
  products?: Product[]
}

interface CategoriesTabProps {
  categories: Category[]
  onReorder: (orders: { id: number; displayOrder: number }[]) => void
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
  onFilterByCategory: (categoryId: number) => void
}

function getStockHealthDisplay(stockHealth: StockHealth): {
  text: string
  variant: "default" | "secondary" | "destructive"
  className: string
} {
  const { available, low, critical, out } = stockHealth
  const total = available + low + critical + out

  if (total === 0) {
    return {
      text: "No products",
      variant: "secondary",
      className: "bg-gray-100 text-gray-600",
    }
  }

  if (out > 0) {
    const issueCount = low + critical
    if (issueCount > 0) {
      return {
        text: `${issueCount} low, ${out} out`,
        variant: "destructive",
        className: "bg-red-100 text-red-800",
      }
    }
    return {
      text: `${out} out`,
      variant: "destructive",
      className: "bg-red-100 text-red-800",
    }
  }

  if (low > 0 || critical > 0) {
    const issueCount = low + critical
    return {
      text: `${issueCount} low`,
      variant: "secondary",
      className: "bg-yellow-100 text-yellow-800",
    }
  }

  return {
    text: "All available",
    variant: "default",
    className: "bg-green-100 text-green-800",
  }
}

function getProductStatusBadge(status: "available" | "low" | "critical" | "out") {
  switch (status) {
    case "available":
      return { text: "Available", className: "bg-green-100 text-green-800" }
    case "low":
      return { text: "Low", className: "bg-yellow-100 text-yellow-800" }
    case "critical":
      return { text: "Critical", className: "bg-orange-100 text-orange-800" }
    case "out":
      return { text: "Out", className: "bg-red-100 text-red-800" }
    default:
      return { text: "Unknown", className: "bg-gray-100 text-gray-600" }
  }
}

export function CategoriesTab({
  categories,
  onReorder,
  onEdit,
  onDelete,
  onFilterByCategory,
}: CategoriesTabProps) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const sourceIndex = result.source.index
    const destIndex = result.destination.index

    if (sourceIndex === destIndex) return

    // Create new order
    const reorderedCategories = Array.from(categories)
    const [removed] = reorderedCategories.splice(sourceIndex, 1)
    reorderedCategories.splice(destIndex, 0, removed)

    // Generate new display orders
    const orders = reorderedCategories.map((cat, index) => ({
      id: cat.id,
      displayOrder: index,
    }))

    onReorder(orders)
  }

  if (categories.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No categories found. Add your first category to get started.
      </div>
    )
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead className="w-10"></TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="w-24 text-center">Products</TableHead>
            <TableHead className="w-40">Stock Health</TableHead>
            <TableHead className="w-24 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <Droppable droppableId="categories">
          {(provided) => (
            <TableBody ref={provided.innerRef} {...provided.droppableProps}>
              {categories.map((category, index) => {
                const isExpanded = expandedIds.has(category.id)
                const stockDisplay = getStockHealthDisplay(category.stockHealth)

                return (
                  <Draggable
                    key={category.id}
                    draggableId={String(category.id)}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <>
                        <TableRow
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={cn(
                            snapshot.isDragging && "bg-muted shadow-lg"
                          )}
                        >
                          <TableCell
                            {...provided.dragHandleProps}
                            className="cursor-grab active:cursor-grabbing"
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                          </TableCell>

                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => toggleExpand(category.id)}
                              disabled={!category.products || category.products.length === 0}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>

                          <TableCell className="font-medium">
                            {category.name}
                          </TableCell>

                          <TableCell className="text-center">
                            <Badge variant="outline">
                              {category.productCount}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant={stockDisplay.variant}
                              className={stockDisplay.className}
                            >
                              {stockDisplay.text}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => onEdit(category)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => onDelete(category)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expanded products section */}
                        {isExpanded && category.products && category.products.length > 0 && (
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableCell colSpan={6} className="p-0">
                              <div className="px-12 py-3 space-y-2">
                                <div className="text-sm font-medium text-muted-foreground mb-2">
                                  Products in {category.name}
                                </div>
                                <div className="grid gap-1">
                                  {category.products.map((product) => {
                                    const statusBadge = getProductStatusBadge(
                                      product.availability.status
                                    )
                                    return (
                                      <div
                                        key={product.id}
                                        className="flex items-center justify-between py-1 px-2 rounded bg-background"
                                      >
                                        <span className="text-sm">
                                          {product.name}
                                        </span>
                                        <div className="flex items-center gap-3">
                                          <span className="text-sm text-muted-foreground">
                                            {formatCurrency(product.price)}
                                          </span>
                                          <Badge
                                            variant="secondary"
                                            className={cn("text-xs", statusBadge.className)}
                                          >
                                            {statusBadge.text}
                                          </Badge>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mt-2"
                                  onClick={() => onFilterByCategory(category.id)}
                                >
                                  <ExternalLink className="h-3 w-3 mr-2" />
                                  View in Products
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    )}
                  </Draggable>
                )
              })}
              {provided.placeholder}
            </TableBody>
          )}
        </Droppable>
      </Table>
    </DragDropContext>
  )
}
