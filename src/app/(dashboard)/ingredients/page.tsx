"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Plus, ClipboardList } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { useIsMobile } from "@/hooks/use-mobile"
import { RestockDialog } from "@/components/inventory/restock-dialog"
import { IngredientEditPanel } from "@/components/ingredients/ingredient-edit-panel"
import { IngredientList } from "@/components/ingredients/ingredient-list"
import { IngredientDetail } from "@/components/ingredients/ingredient-detail"
import type { Ingredient, Unit } from "@/types/ingredient"

interface Vendor {
  id: number
  name: string
}

// ─── Page Component ──────────────────────────────────────────────────────────

export default function IngredientsPage() {
  const isMobile = useIsMobile()
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editIngredient, setEditIngredient] = useState<Ingredient | null>(null)
  const [restockIngredient, setRestockIngredient] = useState<Ingredient | null>(null)
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null)
  const [mobileView, setMobileView] = useState<"list" | "detail">("list")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [ingredientsRes, vendorsRes, unitsRes] = await Promise.all([
        fetch("/api/ingredients"),
        fetch("/api/vendors"),
        fetch("/api/units"),
      ])
      const ingredientsData: Ingredient[] = await ingredientsRes.json()
      setIngredients(ingredientsData)
      setVendors(await vendorsRes.json())
      const unitsData = await unitsRes.json()
      setUnits(unitsData.units || [])

      // Auto-select: try to keep current selection, otherwise pick first
      setSelectedIngredient((prev) => {
        if (prev) {
          const found = ingredientsData.find((i) => i.id === prev.id)
          if (found) return found
        }
        return ingredientsData[0] ?? null
      })
    } catch (error) {
      console.error("Failed to fetch data", error)
      toast.error("Failed to load ingredients")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function openPanel(ingredient?: Ingredient) {
    setEditIngredient(ingredient || null)
    setPanelOpen(true)
  }

  function handleSelect(ingredient: Ingredient) {
    setSelectedIngredient(ingredient)
    if (isMobile) setMobileView("detail")
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  const showList = !isMobile || mobileView === "list"
  const showDetail = !isMobile || mobileView === "detail"

  return (
    <div className="flex h-[calc(100dvh-64px)]">
      {/* Left panel – ingredient list */}
      {showList && (
        <div className="w-full md:w-[300px] shrink-0 md:border-r flex flex-col">
          {/* Header actions */}
          <div className="flex items-center gap-2 p-3 border-b">
            <Button asChild variant="outline" size="sm" className="flex-1">
              <Link href="/ingredients/count">
                <ClipboardList className="h-4 w-4 mr-1.5" />
                Start Count
              </Link>
            </Button>
            <Button size="sm" className="flex-1" onClick={() => openPanel()}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Ingredient
            </Button>
          </div>

          {/* Scrollable ingredient list */}
          <div className="flex-1 min-h-0">
            <IngredientList
              ingredients={ingredients}
              selectedId={selectedIngredient?.id ?? null}
              onSelect={handleSelect}
              loading={loading}
            />
          </div>
        </div>
      )}

      {/* Right panel – ingredient detail */}
      {showDetail && (
        <div className="flex-1 min-w-0">
          <IngredientDetail
            ingredient={selectedIngredient}
            onEdit={(ing) => openPanel(ing)}
            onRestock={setRestockIngredient}
            onBack={isMobile ? () => setMobileView("list") : undefined}
          />
        </div>
      )}

      {/* Edit Panel (Sheet) */}
      <IngredientEditPanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        ingredient={editIngredient}
        vendors={vendors}
        units={units}
        onSaved={fetchData}
      />

      {/* Restock Dialog */}
      <RestockDialog
        open={!!restockIngredient}
        onOpenChange={(open) => { if (!open) setRestockIngredient(null) }}
        ingredient={restockIngredient as Parameters<typeof RestockDialog>[0]["ingredient"]}
        onSuccess={fetchData}
      />
    </div>
  )
}
