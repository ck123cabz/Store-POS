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
