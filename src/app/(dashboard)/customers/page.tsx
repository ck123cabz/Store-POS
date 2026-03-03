"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Plus, Pencil, Trash2, Eye, Users } from "lucide-react"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/format-currency"
import { useSettings } from "@/hooks/use-settings"

// Epic 4 shared components
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { SummaryCard, SummaryCardGrid } from "@/components/ui/summary-card"
import { StatusDot } from "@/components/ui/status-dot"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface Customer {
  id: number
  name: string
  email: string
  phone: string
  address: string
  tabBalance?: number
  creditLimit?: number
  tabStatus?: string
}

interface CustomerFormData {
  name: string
  email: string
  phone: string
  address: string
}

export default function CustomersPage() {
  const router = useRouter()
  const { currencySymbol } = useSettings()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Form state
  const [formData, setFormData] = useState<CustomerFormData>({
    name: "",
    email: "",
    phone: "",
    address: "",
  })

  // Helper to format currency with settings symbol
  const fmtCurrency = (value: string | number | null | undefined) =>
    formatCurrency(value, currencySymbol)

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/customers")
      setCustomers(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  // Summary calculations
  const activeTabs = customers.filter(
    (c) => (Number(c.tabBalance) || 0) > 0
  ).length
  const totalTabBalance = customers.reduce(
    (sum, c) => sum + (Number(c.tabBalance) || 0),
    0
  )

  function openForm(customer?: Customer) {
    setEditCustomer(customer || null)
    setFormData({
      name: customer?.name || "",
      email: customer?.email || "",
      phone: customer?.phone || "",
      address: customer?.address || "",
    })
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditCustomer(null)
    setFormData({ name: "", email: "", phone: "", address: "" })
  }

  function handleInputChange(field: keyof CustomerFormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name.trim()) return

    setSubmitting(true)
    try {
      const url = editCustomer
        ? `/api/customers/${editCustomer.id}`
        : "/api/customers"
      const method = editCustomer ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save customer")
      }

      toast.success(editCustomer ? "Customer updated" : "Customer created")
      closeForm()
      fetchCustomers()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save customer"
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/customers/${deleteId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete customer")
      }
      toast.success("Customer deleted")
      fetchCustomers()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete customer"
      )
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  // DataTable column definitions
  const columns: DataTableColumn<Customer>[] = [
    {
      id: "name",
      header: "Name",
      cell: (c) => {
        const initials = c.name
          .split(" ")
          .map((w) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
        return (
          <div className="flex items-center gap-3">
            <Avatar size="sm">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{c.name}</span>
          </div>
        )
      },
      priority: 0,
      sortable: true,
    },
    {
      id: "phone",
      header: "Phone",
      cell: (c) => c.phone || "\u2014",
      priority: 1,
    },
    {
      id: "email",
      header: "Email",
      cell: (c) => c.email || "\u2014",
      priority: 2,
    },
    {
      id: "tabBalance",
      header: "Tab",
      cell: (c) => {
        const balance = Number(c.tabBalance) || 0
        if (balance <= 0)
          return <span className="text-muted-foreground">{"\u2014"}</span>
        return (
          <span className="flex items-center justify-end gap-2">
            <StatusDot variant="warning" />
            <span className="font-mono tabular-nums">
              {fmtCurrency(balance)}
            </span>
          </span>
        )
      },
      priority: 0,
      align: "right",
      sortable: true,
    },
    {
      id: "actions",
      header: "",
      cell: (c) => (
        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Link href={`/customers/${c.id}`}>
            <Button size="icon" variant="ghost" className="min-h-11 min-w-11" aria-label={`View ${c.name}`}>
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => openForm(c)}
            className="min-h-11 min-w-11"
            aria-label={`Edit ${c.name}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setDeleteId(c.id)}
            className="min-h-11 min-w-11"
            aria-label={`Delete ${c.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      priority: 0,
      align: "right",
    },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Customers
        </h1>
        <Button onClick={() => openForm()}>
          <Plus className="h-4 w-4 mr-2" /> Add Customer
        </Button>
      </div>

      <SummaryCardGrid>
        <SummaryCard
          label="Total Customers"
          value={customers.length.toString()}
        />
        <SummaryCard label="Active Tabs" value={activeTabs.toString()} />
        <SummaryCard
          label="Total Tab Balance"
          value={fmtCurrency(totalTabBalance)}
        />
      </SummaryCardGrid>

      <DataTable
        columns={columns}
        data={customers}
        rowKey={(c) => c.id}
        onRowClick={(c) => router.push(`/customers/${c.id}`)}
        loading={loading}
        emptyIcon={<Users className="h-10 w-10" />}
        emptyTitle="No regular customers yet"
        emptyDescription="They'll appear here after their first visit."
      />

      <Dialog open={formOpen} onOpenChange={closeForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editCustomer ? "Edit Customer" : "Add Customer"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeForm}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              customer record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
