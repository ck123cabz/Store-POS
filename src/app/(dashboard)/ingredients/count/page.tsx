"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw, Save, Send, X, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { CountItemRow } from "@/components/inventory-count/count-item-row"
import { DiscrepancyModal } from "@/components/inventory-count/discrepancy-modal"
import type { CountItem, CountEntry, CountDraft } from "@/types/inventory-count"

export default function InventoryCountPage() {
  const router = useRouter()

  // Data state
  const [items, setItems] = useState<CountItem[]>([])
  const [entries, setEntries] = useState<Map<number, CountEntry>>(new Map())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // UI state
  const [discrepancyItem, setDiscrepancyItem] = useState<CountItem | null>(null)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())

  // Load items and check for existing draft
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [itemsRes, draftRes] = await Promise.all([
        fetch("/api/inventory-count/prepare"),
        fetch("/api/inventory-count/draft"),
      ])

      if (!itemsRes.ok) throw new Error("Failed to load ingredients")

      const itemsData: CountItem[] = await itemsRes.json()
      setItems(itemsData)

      // Check for existing draft
      const draftData: CountDraft | null = await draftRes.json()
      if (draftData && Array.isArray(draftData.counts)) {
        // Restore entries from draft
        const restoredEntries = new Map<number, CountEntry>()
        for (const entry of draftData.counts) {
          restoredEntries.set(entry.ingredientId, entry)
        }
        setEntries(restoredEntries)
        // Draft restored from server
        toast.info("Resumed from saved draft")
      }
    } catch (error) {
      console.error("Failed to load data:", error)
      toast.error("Failed to load inventory data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Group items by category
  const categorizedItems = items.reduce(
    (acc, item) => {
      const cat = item.category || "Uncategorized"
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(item)
      return acc
    },
    {} as Record<string, CountItem[]>
  )

  const categories = Object.keys(categorizedItems).sort()

  // Progress calculation
  const totalItems = items.length
  const countedItems = entries.size
  const progress = totalItems > 0 ? (countedItems / totalItems) * 100 : 0
  const discrepancyCount = Array.from(entries.values()).filter(
    (e) => e.actual !== null && e.actual !== items.find((i) => i.ingredientId === e.ingredientId)?.expected
  ).length

  // Quick confirm: actual matches expected
  function handleQuickConfirm(ingredientId: number) {
    const item = items.find((i) => i.ingredientId === ingredientId)
    if (!item) return

    setEntries((prev) => {
      const next = new Map(prev)
      next.set(ingredientId, {
        ingredientId,
        expected: item.expected,
        actual: item.expected,
        confirmed: true,
      })
      return next
    })
  }

  // Discrepancy confirmation from modal
  function handleDiscrepancyConfirm(
    actual: number,
    reason: string,
    reasonNote?: string
  ) {
    if (!discrepancyItem) return

    setEntries((prev) => {
      const next = new Map(prev)
      next.set(discrepancyItem.ingredientId, {
        ingredientId: discrepancyItem.ingredientId,
        expected: discrepancyItem.expected,
        actual,
        confirmed: true,
        reason,
        reasonNote,
      })
      return next
    })
    setDiscrepancyItem(null)
  }

  // Save draft
  async function saveDraft() {
    try {
      const counts = Array.from(entries.values())
      const res = await fetch("/api/inventory-count/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counts }),
      })

      if (!res.ok) throw new Error("Failed to save")

      // Draft restored from server
      toast.success("Draft saved")
    } catch (error) {
      console.error("Failed to save draft:", error)
      toast.error("Failed to save draft")
    }
  }

  // Discard draft
  async function discardDraft() {
    try {
      await fetch("/api/inventory-count/draft", { method: "DELETE" })
      setEntries(new Map())
      // Draft discarded
      setShowDiscardDialog(false)
      toast.success("Count discarded")
    } catch (error) {
      console.error("Failed to discard:", error)
      toast.error("Failed to discard draft")
    }
  }

  // Submit count
  async function submitCount() {
    setSubmitting(true)
    try {
      const counts = Array.from(entries.values()).map((e) => ({
        ingredientId: e.ingredientId,
        expected: e.expected,
        actual: e.actual,
        reason: e.reason,
        reasonNote: e.reasonNote,
      }))

      const res = await fetch("/api/inventory-count/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counts }),
      })

      if (!res.ok) throw new Error("Failed to submit")

      const result = await res.json()
      toast.success(
        `Count submitted! ${result.discrepancies} discrepancies recorded.`
      )
      router.push("/ingredients")
    } catch (error) {
      console.error("Failed to submit:", error)
      toast.error("Failed to submit count")
    } finally {
      setSubmitting(false)
      setShowSubmitDialog(false)
    }
  }

  // Toggle category collapse
  function toggleCategory(category: string) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory Count</h1>
          <p className="text-muted-foreground">
            {countedItems} of {totalItems} items counted
            {discrepancyCount > 0 && (
              <span className="text-amber-600 ml-2">
                ({discrepancyCount} discrepancies)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDiscardDialog(true)}
            disabled={entries.size === 0}
          >
            <X className="h-4 w-4 mr-1" />
            Discard
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={saveDraft}
            disabled={entries.size === 0}
          >
            <Save className="h-4 w-4 mr-1" />
            Save Draft
          </Button>
          <Button
            size="sm"
            onClick={() => setShowSubmitDialog(true)}
            disabled={countedItems === 0}
          >
            <Send className="h-4 w-4 mr-1" />
            Submit Count
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <Card>
        <CardContent className="pt-4">
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Items by category */}
      <div className="space-y-4">
        {categories.map((category) => {
          const categoryItems = categorizedItems[category]
          const isCollapsed = collapsedCategories.has(category)
          const categoryProgress = categoryItems.filter((item) =>
            entries.has(item.ingredientId)
          ).length

          return (
            <Card key={category}>
              <CardHeader
                className="cursor-pointer"
                onClick={() => toggleCategory(category)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {category}
                    <span className="text-sm font-normal text-muted-foreground">
                      ({categoryProgress}/{categoryItems.length})
                    </span>
                  </CardTitle>
                  {isCollapsed ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronUp className="h-5 w-5" />
                  )}
                </div>
              </CardHeader>
              {!isCollapsed && (
                <CardContent className="space-y-2">
                  {categoryItems.map((item) => (
                    <CountItemRow
                      key={item.ingredientId}
                      item={item}
                      entry={entries.get(item.ingredientId)}
                      onQuickConfirm={handleQuickConfirm}
                      onOpenDiscrepancy={setDiscrepancyItem}
                    />
                  ))}
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Discrepancy modal */}
      {discrepancyItem && (
        <DiscrepancyModal
          open={!!discrepancyItem}
          onClose={() => setDiscrepancyItem(null)}
          onConfirm={handleDiscrepancyConfirm}
          ingredientName={discrepancyItem.name}
          expected={discrepancyItem.expected}
          unit={discrepancyItem.unit}
          currentActual={entries.get(discrepancyItem.ingredientId)?.actual}
          currentReason={entries.get(discrepancyItem.ingredientId)?.reason}
          currentNote={entries.get(discrepancyItem.ingredientId)?.reasonNote}
        />
      )}

      {/* Discard confirmation dialog */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Count?</AlertDialogTitle>
            <AlertDialogDescription>
              This will discard all {countedItems} counted items. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={discardDraft}
              className="bg-destructive text-destructive-foreground"
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Submit confirmation dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Inventory Count?</AlertDialogTitle>
            <AlertDialogDescription>
              This will update {discrepancyCount} ingredient quantities based on
              your count. All changes will be logged to history.
              {countedItems < totalItems && (
                <span className="block mt-2 text-amber-600">
                  Note: {totalItems - countedItems} items were not counted.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={submitCount} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Count"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
