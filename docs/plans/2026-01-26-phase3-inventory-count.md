# Phase 3: Inventory Count Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a complete inventory count system that allows employees to count physical stock, handle discrepancies with reason tracking, save/resume drafts, and log all changes to ingredient history.

**Architecture:** The inventory count flow is: prepare (fetch ingredients with expected quantities) → count items (quick-confirm or enter discrepancy) → save draft (for resumption) → submit (update quantities + log history). Uses the existing `IngredientHistory` model for audit trail.

**Tech Stack:** Next.js 15 App Router, Prisma with PostgreSQL, shadcn/ui components, react-hook-form, sonner for toasts.

---

## Task 1: Add InventoryCountDraft Prisma Model

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add the InventoryCountDraft model to schema**

Add after the `IngredientHistory` model (around line 308):

```prisma
model InventoryCountDraft {
  id              Int       @id @default(autoincrement())
  userId          Int       @map("user_id")
  userName        String    @map("user_name")

  // Draft data stored as JSON array
  // [{ingredientId, expected, actual, confirmed, reason, reasonNote}]
  counts          Json      @default("[]")

  startedAt       DateTime  @default(now()) @map("started_at")
  lastUpdatedAt   DateTime  @updatedAt @map("last_updated_at")

  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("inventory_count_drafts")
}
```

**Step 2: Add relation to User model**

In the User model (around line 37), add within the relations section:

```prisma
  countDrafts      InventoryCountDraft[]
```

**Step 3: Run the migration**

Run: `npx prisma migrate dev --name add_inventory_count_draft`
Expected: Migration created and applied successfully

**Step 4: Verify the schema**

Run: `npx prisma generate`
Expected: Prisma Client generated successfully

**Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(prisma): add InventoryCountDraft model for count persistence"
```

---

## Task 2: Create Inventory Count Prepare API

**Files:**
- Create: `src/app/api/inventory-count/prepare/route.ts`

**Step 1: Create the prepare route**

```typescript
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch all active ingredients with current quantities
    const ingredients = await prisma.ingredient.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        category: true,
        unit: true,
        quantity: true,
        parLevel: true,
        barcode: true,
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    })

    // Transform to count format with expected quantities
    const countItems = ingredients.map((ing) => ({
      ingredientId: ing.id,
      name: ing.name,
      category: ing.category,
      unit: ing.unit,
      expected: Number(ing.quantity),
      parLevel: ing.parLevel,
      barcode: ing.barcode,
    }))

    return NextResponse.json(countItems)
  } catch (error) {
    console.error("Failed to prepare inventory count:", error)
    return NextResponse.json(
      { error: "Failed to prepare inventory count" },
      { status: 500 }
    )
  }
}
```

**Step 2: Test the API endpoint**

Run: `curl http://localhost:3000/api/inventory-count/prepare` (with auth cookie)
Expected: JSON array of ingredients with id, name, category, unit, expected, parLevel, barcode

**Step 3: Commit**

```bash
git add src/app/api/inventory-count/prepare/route.ts
git commit -m "feat(api): add inventory count prepare endpoint"
```

---

## Task 3: Create Inventory Count Draft API

**Files:**
- Create: `src/app/api/inventory-count/draft/route.ts`

**Step 1: Create the draft route with GET, POST, DELETE**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET: Retrieve current user's draft
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const draft = await prisma.inventoryCountDraft.findFirst({
      where: { userId: session.user.id },
      orderBy: { lastUpdatedAt: "desc" },
    })

    if (!draft) {
      return NextResponse.json(null)
    }

    return NextResponse.json({
      id: draft.id,
      counts: draft.counts,
      startedAt: draft.startedAt,
      lastUpdatedAt: draft.lastUpdatedAt,
    })
  } catch (error) {
    console.error("Failed to get draft:", error)
    return NextResponse.json({ error: "Failed to get draft" }, { status: 500 })
  }
}

// POST: Save/update draft
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { counts } = body

    if (!Array.isArray(counts)) {
      return NextResponse.json(
        { error: "counts must be an array" },
        { status: 400 }
      )
    }

    // Upsert: update existing draft or create new one
    const existingDraft = await prisma.inventoryCountDraft.findFirst({
      where: { userId: session.user.id },
    })

    let draft
    if (existingDraft) {
      draft = await prisma.inventoryCountDraft.update({
        where: { id: existingDraft.id },
        data: { counts },
      })
    } else {
      draft = await prisma.inventoryCountDraft.create({
        data: {
          userId: session.user.id,
          userName: session.user.fullname || session.user.username,
          counts,
        },
      })
    }

    return NextResponse.json({
      id: draft.id,
      counts: draft.counts,
      startedAt: draft.startedAt,
      lastUpdatedAt: draft.lastUpdatedAt,
    })
  } catch (error) {
    console.error("Failed to save draft:", error)
    return NextResponse.json({ error: "Failed to save draft" }, { status: 500 })
  }
}

// DELETE: Discard draft
export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.inventoryCountDraft.deleteMany({
      where: { userId: session.user.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete draft:", error)
    return NextResponse.json(
      { error: "Failed to delete draft" },
      { status: 500 }
    )
  }
}
```

**Step 2: Test the draft endpoints**

Run POST to save:
```bash
curl -X POST http://localhost:3000/api/inventory-count/draft \
  -H "Content-Type: application/json" \
  -d '{"counts": [{"ingredientId": 1, "actual": 10, "confirmed": true}]}'
```
Expected: Returns saved draft with id, counts, timestamps

Run GET to retrieve:
```bash
curl http://localhost:3000/api/inventory-count/draft
```
Expected: Returns the saved draft or null

Run DELETE to discard:
```bash
curl -X DELETE http://localhost:3000/api/inventory-count/draft
```
Expected: `{"success": true}`

**Step 3: Commit**

```bash
git add src/app/api/inventory-count/draft/route.ts
git commit -m "feat(api): add inventory count draft save/resume/discard"
```

---

## Task 4: Create Inventory Count Submit API

**Files:**
- Create: `src/app/api/inventory-count/submit/route.ts`

**Step 1: Create the submit route**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { nanoid } from "nanoid"

interface CountItem {
  ingredientId: number
  expected: number
  actual: number
  reason?: string
  reasonNote?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { counts } = body as { counts: CountItem[] }

    if (!Array.isArray(counts) || counts.length === 0) {
      return NextResponse.json(
        { error: "counts must be a non-empty array" },
        { status: 400 }
      )
    }

    // Validate all counts have required fields
    for (const count of counts) {
      if (
        typeof count.ingredientId !== "number" ||
        typeof count.actual !== "number"
      ) {
        return NextResponse.json(
          { error: "Each count must have ingredientId and actual" },
          { status: 400 }
        )
      }
    }

    // Generate a single changeId for this count session
    const changeId = nanoid(10)
    const userName = session.user.fullname || session.user.username

    // Process counts that have discrepancies (actual != expected)
    const discrepancies = counts.filter((c) => c.actual !== c.expected)

    // Get current ingredient data for history logging
    const ingredientIds = discrepancies.map((c) => c.ingredientId)
    const ingredients = await prisma.ingredient.findMany({
      where: { id: { in: ingredientIds } },
      select: { id: true, name: true, quantity: true },
    })

    const ingredientMap = new Map(ingredients.map((i) => [i.id, i]))

    // Build transaction operations
    const operations = []

    for (const count of discrepancies) {
      const ingredient = ingredientMap.get(count.ingredientId)
      if (!ingredient) continue

      // Update ingredient quantity
      operations.push(
        prisma.ingredient.update({
          where: { id: count.ingredientId },
          data: {
            quantity: count.actual,
            lastUpdated: new Date(),
          },
        })
      )

      // Create history entry
      operations.push(
        prisma.ingredientHistory.create({
          data: {
            ingredientId: count.ingredientId,
            ingredientName: ingredient.name,
            changeId,
            field: "quantity",
            oldValue: String(ingredient.quantity),
            newValue: String(count.actual),
            source: "inventory_count",
            reason: count.reason || null,
            reasonNote: count.reasonNote || null,
            userId: session.user.id,
            userName,
          },
        })
      )
    }

    // Delete the user's draft after successful submit
    operations.push(
      prisma.inventoryCountDraft.deleteMany({
        where: { userId: session.user.id },
      })
    )

    // Execute all operations in a transaction
    await prisma.$transaction(operations)

    return NextResponse.json({
      success: true,
      changeId,
      totalCounted: counts.length,
      discrepancies: discrepancies.length,
    })
  } catch (error) {
    console.error("Failed to submit inventory count:", error)
    return NextResponse.json(
      { error: "Failed to submit inventory count" },
      { status: 500 }
    )
  }
}
```

**Step 2: Test the submit endpoint**

Run:
```bash
curl -X POST http://localhost:3000/api/inventory-count/submit \
  -H "Content-Type: application/json" \
  -d '{"counts": [{"ingredientId": 1, "expected": 10, "actual": 8, "reason": "waste"}]}'
```
Expected: `{"success": true, "changeId": "...", "totalCounted": 1, "discrepancies": 1}`

**Step 3: Verify history was logged**

Check the ingredient history in database to confirm entry was created with source="inventory_count"

**Step 4: Commit**

```bash
git add src/app/api/inventory-count/submit/route.ts
git commit -m "feat(api): add inventory count submit with history logging"
```

---

## Task 5: Create TypeScript Types for Inventory Count

**Files:**
- Create: `src/types/inventory-count.ts`

**Step 1: Create the types file**

```typescript
export interface CountItem {
  ingredientId: number
  name: string
  category: string
  unit: string
  expected: number
  parLevel: number
  barcode: string | null
}

export interface CountEntry {
  ingredientId: number
  expected: number
  actual: number | null
  confirmed: boolean
  reason?: string
  reasonNote?: string
}

export interface CountDraft {
  id: number
  counts: CountEntry[]
  startedAt: string
  lastUpdatedAt: string
}

export interface DiscrepancyReason {
  value: string
  label: string
  icon: string
  requiresNote: boolean
}

export const DISCREPANCY_REASONS: DiscrepancyReason[] = [
  { value: "waste", label: "Waste / Spoilage", icon: "🗑️", requiresNote: false },
  { value: "breakage", label: "Breakage / Damaged", icon: "💔", requiresNote: false },
  { value: "theft", label: "Theft Suspected", icon: "🚨", requiresNote: true },
  { value: "miscount", label: "Miscount (previous)", icon: "🔢", requiresNote: false },
  { value: "testing", label: "Testing / Samples", icon: "🧪", requiresNote: false },
  { value: "promo", label: "Given Away / Promo", icon: "🎁", requiresNote: false },
  { value: "other", label: "Other", icon: "✏️", requiresNote: true },
]
```

**Step 2: Commit**

```bash
git add src/types/inventory-count.ts
git commit -m "feat(types): add inventory count types and discrepancy reasons"
```

---

## Task 6: Create Discrepancy Modal Component

**Files:**
- Create: `src/components/inventory-count/discrepancy-modal.tsx`

**Step 1: Create the discrepancy modal component**

```typescript
"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DISCREPANCY_REASONS } from "@/types/inventory-count"

interface DiscrepancyModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (actual: number, reason: string, reasonNote?: string) => void
  ingredientName: string
  expected: number
  unit: string
  currentActual?: number | null
  currentReason?: string
  currentNote?: string
}

export function DiscrepancyModal({
  open,
  onClose,
  onConfirm,
  ingredientName,
  expected,
  unit,
  currentActual,
  currentReason,
  currentNote,
}: DiscrepancyModalProps) {
  const [actual, setActual] = useState<string>("")
  const [reason, setReason] = useState<string>("")
  const [reasonNote, setReasonNote] = useState<string>("")

  // Reset form when modal opens with current values
  useEffect(() => {
    if (open) {
      setActual(currentActual !== null && currentActual !== undefined ? String(currentActual) : "")
      setReason(currentReason || "")
      setReasonNote(currentNote || "")
    }
  }, [open, currentActual, currentReason, currentNote])

  const selectedReason = DISCREPANCY_REASONS.find((r) => r.value === reason)
  const requiresNote = selectedReason?.requiresNote || false

  const canSubmit =
    actual !== "" &&
    reason !== "" &&
    (!requiresNote || reasonNote.trim() !== "")

  function handleSubmit() {
    if (!canSubmit) return
    onConfirm(parseFloat(actual), reason, reasonNote.trim() || undefined)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Count Discrepancy</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Ingredient info */}
          <div className="rounded-lg bg-muted p-3">
            <p className="font-medium">{ingredientName}</p>
            <p className="text-sm text-muted-foreground">
              Expected: {expected} {unit}
            </p>
          </div>

          {/* Actual count input */}
          <div className="space-y-2">
            <Label htmlFor="actual">Actual Count</Label>
            <Input
              id="actual"
              type="number"
              step="0.01"
              min="0"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              placeholder={`Enter count in ${unit}`}
              autoFocus
            />
          </div>

          {/* Reason quick picks */}
          <div className="space-y-2">
            <Label>Reason for Discrepancy</Label>
            <div className="grid grid-cols-2 gap-2">
              {DISCREPANCY_REASONS.map((r) => (
                <Button
                  key={r.value}
                  type="button"
                  variant={reason === r.value ? "default" : "outline"}
                  size="sm"
                  className="justify-start"
                  onClick={() => setReason(r.value)}
                >
                  <span className="mr-2">{r.icon}</span>
                  {r.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Note field (required for some reasons) */}
          {(requiresNote || reasonNote) && (
            <div className="space-y-2">
              <Label htmlFor="note">
                {requiresNote ? "Note (required)" : "Note (optional)"}
              </Label>
              <Textarea
                id="note"
                value={reasonNote}
                onChange={(e) => setReasonNote(e.target.value)}
                placeholder="Add details..."
                rows={2}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            Confirm Count
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/inventory-count/discrepancy-modal.tsx
git commit -m "feat(ui): add discrepancy modal with reason quick-picks"
```

---

## Task 7: Create Count Item Row Component

**Files:**
- Create: `src/components/inventory-count/count-item-row.tsx`

**Step 1: Create the count item row component**

```typescript
"use client"

import { Check, AlertTriangle, Edit2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { CountItem, CountEntry, DiscrepancyReason } from "@/types/inventory-count"
import { DISCREPANCY_REASONS } from "@/types/inventory-count"

interface CountItemRowProps {
  item: CountItem
  entry: CountEntry | undefined
  onQuickConfirm: (ingredientId: number) => void
  onOpenDiscrepancy: (item: CountItem) => void
}

export function CountItemRow({
  item,
  entry,
  onQuickConfirm,
  onOpenDiscrepancy,
}: CountItemRowProps) {
  const isConfirmed = entry?.confirmed
  const hasDiscrepancy = entry?.actual !== null && entry?.actual !== item.expected
  const reasonInfo = entry?.reason
    ? DISCREPANCY_REASONS.find((r) => r.value === entry.reason)
    : null

  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border",
        isConfirmed && !hasDiscrepancy && "bg-green-50 border-green-200",
        isConfirmed && hasDiscrepancy && "bg-amber-50 border-amber-200",
        !isConfirmed && "bg-background"
      )}
    >
      {/* Left: Item info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{item.name}</span>
          {isConfirmed && !hasDiscrepancy && (
            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
              <Check className="h-3 w-3 mr-1" />
              Matched
            </Badge>
          )}
          {isConfirmed && hasDiscrepancy && reasonInfo && (
            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
              <span className="mr-1">{reasonInfo.icon}</span>
              {entry.actual} {item.unit}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Expected: {item.expected} {item.unit}
          {item.category && <span className="ml-2">• {item.category}</span>}
        </p>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 ml-4">
        {!isConfirmed ? (
          <>
            {/* Quick confirm button (checkmark) */}
            <Button
              size="sm"
              variant="outline"
              className="h-9 w-9 p-0"
              onClick={() => onQuickConfirm(item.ingredientId)}
              title="Confirm count matches"
            >
              <Check className="h-4 w-4 text-green-600" />
            </Button>
            {/* Discrepancy button */}
            <Button
              size="sm"
              variant="outline"
              className="h-9 w-9 p-0"
              onClick={() => onOpenDiscrepancy(item)}
              title="Report discrepancy"
            >
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </Button>
          </>
        ) : (
          /* Edit button for already confirmed items */
          <Button
            size="sm"
            variant="ghost"
            className="h-9 w-9 p-0"
            onClick={() => onOpenDiscrepancy(item)}
            title="Edit count"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/inventory-count/count-item-row.tsx
git commit -m "feat(ui): add count item row with quick-confirm and discrepancy buttons"
```

---

## Task 8: Create Inventory Count Page

**Files:**
- Create: `src/app/(dashboard)/ingredients/count/page.tsx`

**Step 1: Create the inventory count page**

```typescript
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
  const [hasDraft, setHasDraft] = useState(false)

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
        setHasDraft(true)
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

      setHasDraft(true)
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
      setHasDraft(false)
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
```

**Step 2: Commit**

```bash
git add src/app/(dashboard)/ingredients/count/page.tsx
git commit -m "feat(ui): add inventory count page with full flow"
```

---

## Task 9: Add Navigation to Inventory Count Page

**Files:**
- Modify: `src/app/(dashboard)/ingredients/page.tsx`

**Step 1: Add "Start Count" button to ingredients page header**

Find the header section with buttons (around line 100-130) and add a new button:

```typescript
import Link from "next/link"
import { ClipboardList } from "lucide-react"

// In the header section, add alongside existing buttons:
<Button asChild variant="outline">
  <Link href="/ingredients/count">
    <ClipboardList className="h-4 w-4 mr-2" />
    Start Count
  </Link>
</Button>
```

**Step 2: Commit**

```bash
git add src/app/(dashboard)/ingredients/page.tsx
git commit -m "feat(ui): add Start Count button to ingredients page"
```

---

## Task 10: Add Count Link to Sidebar

**Files:**
- Modify: `src/components/sidebar.tsx`

**Step 1: Find the ingredients section in sidebar and add count link**

Locate the ingredients navigation item and add a nested link for inventory count:

```typescript
// Add to imports if not present
import { ClipboardList } from "lucide-react"

// In the navigation items array, add count as sub-item or separate item:
{
  name: "Inventory Count",
  href: "/ingredients/count",
  icon: ClipboardList,
}
```

**Step 2: Commit**

```bash
git add src/components/sidebar.tsx
git commit -m "feat(ui): add Inventory Count link to sidebar"
```

---

## Task 11: Integration Testing

**Files:**
- No new files

**Step 1: Start the development server**

Run: `npm run dev`
Expected: Server starts on localhost:3000

**Step 2: Test the full flow**

1. Navigate to `/ingredients` - verify "Start Count" button appears
2. Click "Start Count" - should navigate to `/ingredients/count`
3. Page loads with all ingredients grouped by category
4. Click checkmark on an item - should mark as "Matched" (green)
5. Click warning triangle - should open discrepancy modal
6. Enter different count, select reason, click Confirm
7. Item shows discrepancy badge with amount
8. Click "Save Draft" - should show success toast
9. Refresh page - should restore draft with all counts
10. Click "Submit Count" - should show confirmation dialog
11. Confirm submission - should redirect to ingredients with success message
12. Check ingredient history - should show entries with source="inventory_count"

**Step 3: Commit final verification**

```bash
git add -A
git commit -m "test: verify inventory count integration"
```

---

## Task 12: Final Cleanup and PR Preparation

**Files:**
- No new files

**Step 1: Run linting and type check**

Run: `npm run lint && npx tsc --noEmit`
Expected: No errors

**Step 2: Review all changes**

Run: `git log --oneline master..HEAD`
Expected: ~10 commits for Phase 3

**Step 3: Create summary commit if needed**

If any fixes were made during testing:
```bash
git add -A
git commit -m "fix: address issues found during integration testing"
```

---

## Summary

Phase 3 implementation includes:

1. **Prisma Model**: `InventoryCountDraft` for draft persistence
2. **API Routes**:
   - `GET /api/inventory-count/prepare` - fetch ingredients for counting
   - `GET/POST/DELETE /api/inventory-count/draft` - draft management
   - `POST /api/inventory-count/submit` - finalize count with history logging
3. **UI Components**:
   - `DiscrepancyModal` - reason selection with quick-picks
   - `CountItemRow` - item display with quick-confirm/discrepancy actions
4. **Page**: `/ingredients/count` - full count flow with progress, categories, save/submit
5. **Navigation**: Button on ingredients page, link in sidebar

All discrepancies are logged to `IngredientHistory` with `source: "inventory_count"` for audit trail.
