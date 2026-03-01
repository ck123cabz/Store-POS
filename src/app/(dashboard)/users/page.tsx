"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { StatusDot } from "@/components/ui/status-dot"
import { Plus, Pencil, Trash2, Users } from "lucide-react"
import { toast } from "sonner"

interface User {
  id: number
  username: string
  fullname: string
  permProducts: boolean
  permCategories: boolean
  permTransactions: boolean
  permUsers: boolean
  permSettings: boolean
  permVoid: boolean
  status: string
}

interface UserFormData {
  username: string
  password: string
  fullname: string
  permProducts: boolean
  permCategories: boolean
  permTransactions: boolean
  permUsers: boolean
  permSettings: boolean
  permVoid: boolean
}

const initialFormData: UserFormData = {
  username: "",
  password: "",
  fullname: "",
  permProducts: false,
  permCategories: false,
  permTransactions: false,
  permUsers: false,
  permSettings: false,
  permVoid: false,
}

const permissions = [
  { key: "permProducts" as const, label: "Products" },
  { key: "permCategories" as const, label: "Categories" },
  { key: "permTransactions" as const, label: "Transactions" },
  { key: "permUsers" as const, label: "Users" },
  { key: "permSettings" as const, label: "Settings" },
  { key: "permVoid" as const, label: "Void Transactions" },
]

function getActivePermissions(user: User) {
  return permissions.filter((p) => user[p.key])
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [formData, setFormData] = useState<UserFormData>(initialFormData)

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users")
      setUsers(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  function openForm(user?: User) {
    setEditUser(user || null)
    setFormData({
      username: user?.username || "",
      password: "",
      fullname: user?.fullname || "",
      permProducts: user?.permProducts || false,
      permCategories: user?.permCategories || false,
      permTransactions: user?.permTransactions || false,
      permUsers: user?.permUsers || false,
      permSettings: user?.permSettings || false,
      permVoid: user?.permVoid || false,
    })
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditUser(null)
    setFormData(initialFormData)
  }

  function handleInputChange(field: keyof UserFormData, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.fullname.trim()) return
    if (!editUser && !formData.username.trim()) return
    if (!editUser && !formData.password) return

    setSubmitting(true)
    try {
      const url = editUser ? `/api/users/${editUser.id}` : "/api/users"
      const method = editUser ? "PUT" : "POST"

      const body: Record<string, string | boolean> = {
        fullname: formData.fullname,
        permProducts: formData.permProducts,
        permCategories: formData.permCategories,
        permTransactions: formData.permTransactions,
        permUsers: formData.permUsers,
        permSettings: formData.permSettings,
        permVoid: formData.permVoid,
      }

      if (!editUser) {
        body.username = formData.username
        body.password = formData.password
      } else if (formData.password) {
        body.password = formData.password
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save user")
      }

      toast.success(editUser ? "User updated" : "User created")
      closeForm()
      fetchUsers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save user")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/users/${deleteId}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete user")
      }
      toast.success("User deleted")
      fetchUsers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete user")
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  const columns: DataTableColumn<User>[] = [
    {
      id: "fullname",
      header: "Name",
      cell: (u) => (
        <div>
          <div className="font-medium">{u.fullname}</div>
          <div className="text-xs text-muted-foreground">{u.username}</div>
        </div>
      ),
      priority: 0,
    },
    {
      id: "permissions",
      header: "Permissions",
      cell: (u) => {
        const perms = getActivePermissions(u)
        if (perms.length === 0) return <span className="text-muted-foreground">None</span>
        return <span className="text-sm text-muted-foreground">{perms.length} permissions</span>
      },
      priority: 1,
    },
    {
      id: "status",
      header: "Status",
      cell: (u) => {
        const isOnline = u.status.startsWith("Logged In")
        return <StatusDot variant={isOnline ? "ok" : "neutral"} label={isOnline ? "Online" : "Offline"} />
      },
      priority: 0,
      align: "center",
    },
    {
      id: "actions",
      header: "",
      cell: (u) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="icon" variant="ghost" aria-label={`Edit ${u.fullname}`} onClick={() => openForm(u)}>
            <Pencil className="h-4 w-4" />
          </Button>
          {u.id !== 1 && (
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Delete ${u.fullname}`}
              onClick={() => setDeleteId(u.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
      priority: 0,
      align: "right",
    },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Users</h1>
        <Button onClick={() => openForm()}>
          <Plus className="h-4 w-4 mr-2" /> Add User
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={users}
        rowKey={(u) => u.id}
        loading={loading}
        emptyIcon={<Users className="h-10 w-10" />}
        emptyTitle="No team members yet"
        emptyDescription="Add your first user to start managing your team."
        emptyAction={
          <Button onClick={() => openForm()}>
            <Plus className="h-4 w-4 mr-2" />Add User
          </Button>
        }
      />

      <Dialog open={formOpen} onOpenChange={closeForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editUser ? "Edit User" : "Add User"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editUser && (
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => handleInputChange("username", e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="fullname">Full Name</Label>
              <Input
                id="fullname"
                value={formData.fullname}
                onChange={(e) => handleInputChange("fullname", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                {editUser ? "New Password (leave blank to keep)" : "Password"}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                required={!editUser}
                minLength={4}
              />
            </div>

            <div className="space-y-3">
              <Label>Permissions</Label>
              {permissions.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm">{label}</span>
                  <Switch
                    checked={formData[key]}
                    onCheckedChange={(checked) => handleInputChange(key, checked)}
                  />
                </div>
              ))}
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
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. You cannot delete users who have processed transactions.
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
