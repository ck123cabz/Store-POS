"use client"

import { useState, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { getDateRange, type DateRangeType } from "@/lib/date-ranges"
import { toast } from "sonner"

// ─── Types ───────────────────────────────────────────────────────

export interface TransactionItem {
  id: number
  productName: string
  price: string
  quantity: number
}

export interface Transaction {
  id: number
  orderNumber: number
  total: string
  subtotal: string
  discount: string
  taxAmount: string
  status: number
  paymentType: string
  paidAmount: string
  changeAmount: string
  paymentStatus: string | null
  paymentInfo: string | null
  gcashPhotoPath: string | null
  createdAt: string
  tillNumber: number
  refNumber: string
  customer: { id: number; name: string } | null
  user: { id: number; fullname: string }
  items: TransactionItem[]
  isVoided: boolean
  voidedAt: string | null
  voidedByName: string | null
  voidReason: string | null
}

export interface User {
  id: number
  fullname: string
}

export interface TodayData {
  totalRevenue: number
  transactions: number
  avgTicket: number
  totalItems: number
  peakHour: {
    hour: number
    label: string
    transactions: number
    revenue: number
  }
  daypartBreakdown: Array<{
    daypart: string
    count: number
    total: number
  }>
}

export type QuickFilter = "Today" | "Yesterday" | "This Week" | "This Month" | "All"

export interface TransactionFilters {
  status: string
  userId: string
  searchQuery: string
  includeVoided: boolean
  dateFrom: string
  dateTo: string
  tillNumber: string
}

export interface UseTransactionsReturn {
  // Data
  transactions: Transaction[]
  todayData: TodayData | null
  users: User[]

  // Filter state
  filters: TransactionFilters
  setFilters: (updates: Partial<TransactionFilters>) => void
  activeQuickFilter: QuickFilter | null
  setActiveQuickFilter: (filter: QuickFilter | null) => void
  clearFilters: () => void

  // Loading
  isLoading: boolean

  // Actions
  refreshTransactions: () => Promise<void>
  refreshTodayData: () => Promise<void>

  // GCash actions
  handleGcashConfirm: (txId: number) => Promise<void>
  handleGcashCancel: (txId: number) => Promise<void>
  gcashActionLoading: "confirm" | "cancel" | null

  // Void actions
  handleVoidTransaction: (
    transactionId: number,
    reason: string,
    customReason?: string
  ) => Promise<boolean>
  voidLoading: boolean

  // View state
  viewTransaction: Transaction | null
  setViewTransaction: (tx: Transaction | null) => void

  // Void modal state
  showVoidModal: boolean
  setShowVoidModal: (show: boolean) => void
  voidError: string | null
  setVoidError: (error: string | null) => void
}

// ─── Quick filter options ────────────────────────────────────────

export const QUICK_FILTER_OPTIONS: { label: string; value: QuickFilter }[] = [
  { label: "Today", value: "Today" },
  { label: "Yesterday", value: "Yesterday" },
  { label: "This Week", value: "This Week" },
  { label: "This Month", value: "This Month" },
  { label: "All", value: "All" },
]

// ─── Hook ────────────────────────────────────────────────────────

const DEFAULT_FILTERS: TransactionFilters = {
  status: "",
  userId: "",
  searchQuery: "",
  includeVoided: false,
  dateFrom: "",
  dateTo: "",
  tillNumber: "",
}

export function useTransactions(): UseTransactionsReturn {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [todayData, setTodayData] = useState<TodayData | null>(null)

  // Filters
  const [filters, setFiltersState] = useState<TransactionFilters>(DEFAULT_FILTERS)
  const [activeQuickFilter, setActiveQuickFilterState] = useState<QuickFilter | null>(null)

  // View state
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null)

  // Void modal state
  const [showVoidModal, setShowVoidModal] = useState(false)
  const [voidError, setVoidError] = useState<string | null>(null)
  const [voidLoading, setVoidLoading] = useState(false)

  // GCash action state
  const [gcashActionLoading, setGcashActionLoading] = useState<"confirm" | "cancel" | null>(null)

  // ─── Data fetching ─────────────────────────────────────────────

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.status && filters.status !== "all") params.append("status", filters.status)
      if (filters.userId && filters.userId !== "all") params.append("userId", filters.userId)
      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom)
      if (filters.dateTo) params.append("dateTo", filters.dateTo)
      if (filters.tillNumber) params.append("till", filters.tillNumber)
      if (filters.includeVoided) params.append("includeVoided", "true")

      const res = await fetch(`/api/transactions?${params}`)
      if (res.ok) {
        setTransactions(await res.json())
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error)
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users")
      if (res.ok) {
        setUsers(await res.json())
      }
    } catch (error) {
      console.error("Failed to fetch users:", error)
    }
  }, [])

  const fetchTodayData = useCallback(async () => {
    try {
      const res = await fetch("/api/transactions/today")
      if (res.ok) {
        setTodayData(await res.json())
      }
    } catch (error) {
      console.error("Failed to fetch today's data:", error)
    }
  }, [])

  useEffect(() => {
    fetchTransactions()
    fetchUsers()
    fetchTodayData()
  }, [fetchTransactions, fetchUsers, fetchTodayData])

  // ─── Filter management ─────────────────────────────────────────

  const setFilters = useCallback((updates: Partial<TransactionFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...updates }))
  }, [])

  const setActiveQuickFilter = useCallback((filter: QuickFilter | null) => {
    if (!filter) {
      setActiveQuickFilterState(null)
      setFiltersState((prev) => ({ ...prev, dateFrom: "", dateTo: "" }))
      return
    }

    setActiveQuickFilterState(filter)

    if (filter === "All") {
      setFiltersState({
        ...DEFAULT_FILTERS,
        includeVoided: false,
      })
      return
    }

    const range = getDateRange(filter as DateRangeType)
    const formattedFrom = format(range.start, "yyyy-MM-dd")
    const formattedTo = format(range.end, "yyyy-MM-dd")

    setFiltersState((prev) => ({
      ...prev,
      dateFrom: formattedFrom,
      dateTo: formattedTo,
      status: "",
      userId: "",
      tillNumber: "",
    }))
  }, [])

  const clearFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS)
    setActiveQuickFilterState(null)
  }, [])

  // ─── GCash actions ─────────────────────────────────────────────

  const handleGcashConfirm = useCallback(async (txId: number) => {
    setGcashActionLoading("confirm")
    try {
      const res = await fetch(`/api/transactions/${txId}/confirm`, { method: "POST" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to confirm")
      }
      const updated = await res.json()
      toast.success("GCash payment confirmed")
      setViewTransaction((prev) =>
        prev ? { ...prev, paymentStatus: updated.paymentStatus } : prev
      )
      fetchTransactions()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to confirm payment")
    } finally {
      setGcashActionLoading(null)
    }
  }, [fetchTransactions])

  const handleGcashCancel = useCallback(async (txId: number) => {
    setGcashActionLoading("cancel")
    try {
      const res = await fetch(`/api/transactions/${txId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "GCash payment not received" }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to cancel")
      }
      toast.success("GCash payment cancelled — stock restored")
      setViewTransaction(null)
      fetchTransactions()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel payment")
    } finally {
      setGcashActionLoading(null)
    }
  }, [fetchTransactions])

  // ─── Void action ───────────────────────────────────────────────

  const handleVoidTransaction = useCallback(async (
    transactionId: number,
    reason: string,
    customReason?: string
  ): Promise<boolean> => {
    setVoidLoading(true)
    setVoidError(null)

    try {
      const res = await fetch(`/api/transactions/${transactionId}/void`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason,
          customReason: reason === "Other" ? customReason : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to void transaction")
      }

      const voidedTx = await res.json()

      // Update local state
      setTransactions((prev) =>
        prev.map((tx) => (tx.id === voidedTx.id ? { ...tx, ...voidedTx } : tx))
      )
      setViewTransaction((prev) => (prev ? { ...prev, ...voidedTx } : prev))

      toast.success("Transaction voided", {
        description: "Stock and ingredients have been restored.",
      })

      setShowVoidModal(false)
      fetchTodayData()
      return true
    } catch (err) {
      setVoidError(err instanceof Error ? err.message : "Failed to void transaction")
      return false
    } finally {
      setVoidLoading(false)
    }
  }, [fetchTodayData])

  return {
    transactions,
    todayData,
    users,
    filters,
    setFilters,
    activeQuickFilter,
    setActiveQuickFilter,
    clearFilters,
    isLoading,
    refreshTransactions: fetchTransactions,
    refreshTodayData: fetchTodayData,
    handleGcashConfirm,
    handleGcashCancel,
    gcashActionLoading,
    handleVoidTransaction,
    voidLoading,
    viewTransaction,
    setViewTransaction,
    showVoidModal,
    setShowVoidModal,
    voidError,
    setVoidError,
  }
}
