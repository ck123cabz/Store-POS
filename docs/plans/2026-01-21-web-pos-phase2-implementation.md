# Store POS Web Rebuild - Phase 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the remaining CRUD pages, receipt system, and deployment configuration to achieve feature parity with the original Electron app.

**Architecture:** Server components for data fetching, client components for interactivity, Server Actions for mutations, file uploads via API routes with formidable.

**Tech Stack:** Next.js 14+ App Router, shadcn/ui, Prisma, @react-pdf/renderer, Resend

---

## Task 15: Products Management Page

**Files:**
- Create: `src/app/(dashboard)/products/page.tsx`
- Create: `src/components/products/product-form.tsx`
- Create: `src/components/products/product-table.tsx`
- Modify: `src/app/api/products/route.ts`
- Create: `src/app/api/products/[id]/route.ts`
- Create: `src/app/api/upload/route.ts`

**Step 1: Create the products table component**

```tsx
// src/components/products/product-table.tsx
"use client"

import { useState } from "react"
import Image from "next/image"
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
import { Pencil, Trash2 } from "lucide-react"
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

interface Product {
  id: number
  name: string
  price: string
  quantity: number
  stock: number
  img: string | null
  category: { id: number; name: string } | null
}

interface ProductTableProps {
  products: Product[]
  onEdit: (product: Product) => void
  onRefresh: () => void
}

export function ProductTable({ products, onEdit, onRefresh }: ProductTableProps) {
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/products/${deleteId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      toast.success("Product deleted")
      onRefresh()
    } catch {
      toast.error("Failed to delete product")
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Image</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                {product.img ? (
                  <Image
                    src={`/uploads/${product.img}`}
                    alt={product.name}
                    width={40}
                    height={40}
                    className="rounded object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-muted rounded" />
                )}
              </TableCell>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell>{product.category?.name || "—"}</TableCell>
              <TableCell className="text-right">{product.price}</TableCell>
              <TableCell className="text-right">
                {product.stock ? (
                  <Badge variant={product.quantity > 0 ? "default" : "destructive"}>
                    {product.quantity}
                  </Badge>
                ) : (
                  <Badge variant="secondary">N/A</Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => onEdit(product)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setDeleteId(product.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
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
    </>
  )
}
```

**Step 2: Create the product form component**

```tsx
// src/components/products/product-form.tsx
"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

interface Category {
  id: number
  name: string
}

interface ProductFormData {
  name: string
  price: string
  categoryId: number | null
  quantity: number
  stock: boolean
  sku: string
}

interface ProductFormProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  categories: Category[]
  product?: {
    id: number
    name: string
    price: string
    quantity: number
    stock: number
    sku: string | null
    categoryId: number | null
  } | null
}

export function ProductForm({ open, onClose, onSuccess, categories, product }: ProductFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)

  const { register, handleSubmit, reset, setValue, watch } = useForm<ProductFormData>({
    defaultValues: {
      name: product?.name || "",
      price: product?.price || "",
      categoryId: product?.categoryId || null,
      quantity: product?.quantity || 0,
      stock: product?.stock === 1,
      sku: product?.sku || "",
    },
  })

  const trackStock = watch("stock")

  async function onSubmit(data: ProductFormData) {
    setSubmitting(true)
    try {
      let imgFilename = null

      // Upload image if selected
      if (imageFile) {
        const formData = new FormData()
        formData.append("file", imageFile)
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData })
        if (!uploadRes.ok) throw new Error("Image upload failed")
        const { filename } = await uploadRes.json()
        imgFilename = filename
      }

      const body = {
        name: data.name,
        price: data.price,
        categoryId: data.categoryId,
        quantity: data.quantity,
        stock: data.stock ? 1 : 0,
        sku: data.sku || null,
        ...(imgFilename && { img: imgFilename }),
      }

      const url = product ? `/api/products/${product.id}` : "/api/products"
      const method = product ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error("Failed to save")

      toast.success(product ? "Product updated" : "Product created")
      reset()
      setImageFile(null)
      onSuccess()
      onClose()
    } catch {
      toast.error("Failed to save product")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "Add Product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name", { required: true })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <Input id="price" {...register("price", { required: true })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sku">SKU / Barcode</Label>
            <Input id="sku" {...register("sku")} />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select onValueChange={(v) => setValue("categoryId", parseInt(v))}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={trackStock}
              onCheckedChange={(checked) => setValue("stock", checked)}
            />
            <Label>Track Stock</Label>
          </div>

          {trackStock && (
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                {...register("quantity", { valueAsNumber: true })}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="image">Product Image</Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 3: Create the products page**

```tsx
// src/app/(dashboard)/products/page.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { ProductTable } from "@/components/products/product-table"
import { ProductForm } from "@/components/products/product-form"

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [formOpen, setFormOpen] = useState(false)
  const [editProduct, setEditProduct] = useState(null)

  const fetchData = useCallback(async () => {
    const [productsRes, categoriesRes] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/categories"),
    ])
    setProducts(await productsRes.json())
    setCategories(await categoriesRes.json())
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function handleEdit(product: any) {
    setEditProduct(product)
    setFormOpen(true)
  }

  function handleClose() {
    setFormOpen(false)
    setEditProduct(null)
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Products</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Product
        </Button>
      </div>

      <ProductTable products={products} onEdit={handleEdit} onRefresh={fetchData} />

      <ProductForm
        open={formOpen}
        onClose={handleClose}
        onSuccess={fetchData}
        categories={categories}
        product={editProduct}
      />
    </div>
  )
}
```

**Step 4: Create the file upload API route**

```ts
// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get("file") as File | null

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Generate timestamp-based filename
  const ext = path.extname(file.name)
  const filename = `${Date.now()}${ext}`

  // Ensure uploads directory exists
  const uploadDir = path.join(process.cwd(), "public", "uploads")
  await mkdir(uploadDir, { recursive: true })

  // Write file
  const filepath = path.join(uploadDir, filename)
  await writeFile(filepath, buffer)

  return NextResponse.json({ filename })
}
```

**Step 5: Create the product [id] API route**

```ts
// src/app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const product = await prisma.product.findUnique({
    where: { id: parseInt(id) },
    include: { category: true },
  })

  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(product)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const product = await prisma.product.update({
    where: { id: parseInt(id) },
    data: {
      name: body.name,
      price: body.price,
      categoryId: body.categoryId,
      quantity: body.quantity,
      stock: body.stock,
      sku: body.sku,
      ...(body.img && { img: body.img }),
    },
  })

  return NextResponse.json(product)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.product.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ success: true })
}
```

**Step 6: Update products route to support POST creation**

Modify `src/app/api/products/route.ts` to add POST handler:

```ts
export async function POST(request: NextRequest) {
  const body = await request.json()

  const product = await prisma.product.create({
    data: {
      name: body.name,
      price: body.price,
      categoryId: body.categoryId || null,
      quantity: body.quantity || 0,
      stock: body.stock || 0,
      sku: body.sku || null,
      img: body.img || null,
    },
  })

  return NextResponse.json(product, { status: 201 })
}
```

**Step 7: Install react-hook-form**

Run: `npm install react-hook-form`

**Step 8: Commit**

```bash
git add .
git commit -m "feat: add products management page with CRUD operations"
```

---

## Task 16: Categories Management Page

**Files:**
- Create: `src/app/(dashboard)/categories/page.tsx`
- Create: `src/app/api/categories/[id]/route.ts`
- Modify: `src/app/api/categories/route.ts`

**Step 1: Create the categories page**

```tsx
// src/app/(dashboard)/categories/page.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface Category {
  id: number
  name: string
  _count?: { products: number }
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editCategory, setEditCategory] = useState<Category | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [name, setName] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/categories")
    setCategories(await res.json())
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  function openForm(category?: Category) {
    setEditCategory(category || null)
    setName(category?.name || "")
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditCategory(null)
    setName("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setSubmitting(true)
    try {
      const url = editCategory ? `/api/categories/${editCategory.id}` : "/api/categories"
      const method = editCategory ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })

      if (!res.ok) throw new Error("Failed")

      toast.success(editCategory ? "Category updated" : "Category created")
      closeForm()
      fetchCategories()
    } catch {
      toast.error("Failed to save category")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/categories/${deleteId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed")
      toast.success("Category deleted")
      fetchCategories()
    } catch {
      toast.error("Failed to delete category")
    } finally {
      setDeleteId(null)
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Categories</h1>
        <Button onClick={() => openForm()}>
          <Plus className="h-4 w-4 mr-2" /> Add Category
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Products</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell className="font-medium">{category.name}</TableCell>
              <TableCell className="text-right">{category._count?.products || 0}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openForm(category)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setDeleteId(category.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={formOpen} onOpenChange={closeForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editCategory ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
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
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              Products in this category will become uncategorized.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

**Step 2: Update categories API to include product count**

```ts
// src/app/api/categories/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  })
  return NextResponse.json(categories)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const category = await prisma.category.create({
    data: { name: body.name },
  })
  return NextResponse.json(category, { status: 201 })
}
```

**Step 3: Create categories [id] route**

```ts
// src/app/api/categories/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const category = await prisma.category.update({
    where: { id: parseInt(id) },
    data: { name: body.name },
  })

  return NextResponse.json(category)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.category.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ success: true })
}
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add categories management page with CRUD operations"
```

---

## Task 17: Customers Management Page

**Files:**
- Create: `src/app/(dashboard)/customers/page.tsx`
- Create: `src/app/api/customers/[id]/route.ts`
- Modify: `src/app/api/customers/route.ts`

**Step 1: Create the customers page**

```tsx
// src/app/(dashboard)/customers/page.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface Customer {
  id: number
  name: string
  email: string | null
  phone: string | null
  address: string | null
}

interface CustomerFormData {
  name: string
  email: string
  phone: string
  address: string
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, reset } = useForm<CustomerFormData>()

  const fetchCustomers = useCallback(async () => {
    const res = await fetch("/api/customers")
    setCustomers(await res.json())
  }, [])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  function openForm(customer?: Customer) {
    setEditCustomer(customer || null)
    reset({
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
    reset()
  }

  async function onSubmit(data: CustomerFormData) {
    setSubmitting(true)
    try {
      const url = editCustomer ? `/api/customers/${editCustomer.id}` : "/api/customers"
      const method = editCustomer ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error("Failed")

      toast.success(editCustomer ? "Customer updated" : "Customer created")
      closeForm()
      fetchCustomers()
    } catch {
      toast.error("Failed to save customer")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/customers/${deleteId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed")
      toast.success("Customer deleted")
      fetchCustomers()
    } catch {
      toast.error("Failed to delete customer")
    } finally {
      setDeleteId(null)
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Customers</h1>
        <Button onClick={() => openForm()}>
          <Plus className="h-4 w-4 mr-2" /> Add Customer
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell className="font-medium">{customer.name}</TableCell>
              <TableCell>{customer.email || "—"}</TableCell>
              <TableCell>{customer.phone || "—"}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openForm(customer)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setDeleteId(customer.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={formOpen} onOpenChange={closeForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editCustomer ? "Edit Customer" : "Add Customer"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register("name", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" {...register("address")} />
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
              This will remove the customer from all records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

**Step 2: Update customers API for POST**

```ts
// src/app/api/customers/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
  })
  return NextResponse.json(customers)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const customer = await prisma.customer.create({
    data: {
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      address: body.address || null,
    },
  })
  return NextResponse.json(customer, { status: 201 })
}
```

**Step 3: Create customers [id] route**

```ts
// src/app/api/customers/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const customer = await prisma.customer.findUnique({
    where: { id: parseInt(id) },
  })
  if (!customer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json(customer)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const customer = await prisma.customer.update({
    where: { id: parseInt(id) },
    data: {
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      address: body.address || null,
    },
  })

  return NextResponse.json(customer)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.customer.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ success: true })
}
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add customers management page with CRUD operations"
```

---

## Task 18: Users Management Page

**Files:**
- Create: `src/app/(dashboard)/users/page.tsx`
- Create: `src/app/api/users/route.ts`
- Create: `src/app/api/users/[id]/route.ts`

**Step 1: Create users API routes**

```ts
// src/app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { fullname: "asc" },
    select: {
      id: true,
      username: true,
      fullname: true,
      permProducts: true,
      permCategories: true,
      permTransactions: true,
      permUsers: true,
      permSettings: true,
      status: true,
    },
  })
  return NextResponse.json(users)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  // Check if username exists
  const existing = await prisma.user.findUnique({
    where: { username: body.username },
  })
  if (existing) {
    return NextResponse.json({ error: "Username already exists" }, { status: 400 })
  }

  const hashedPassword = await bcrypt.hash(body.password, 10)

  const user = await prisma.user.create({
    data: {
      username: body.username,
      password: hashedPassword,
      fullname: body.fullname,
      permProducts: body.permProducts || 0,
      permCategories: body.permCategories || 0,
      permTransactions: body.permTransactions || 0,
      permUsers: body.permUsers || 0,
      permSettings: body.permSettings || 0,
      status: "Logged Out",
    },
    select: {
      id: true,
      username: true,
      fullname: true,
    },
  })

  return NextResponse.json(user, { status: 201 })
}
```

**Step 2: Create users [id] route**

```ts
// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await prisma.user.findUnique({
    where: { id: parseInt(id) },
    select: {
      id: true,
      username: true,
      fullname: true,
      permProducts: true,
      permCategories: true,
      permTransactions: true,
      permUsers: true,
      permSettings: true,
    },
  })
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json(user)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const data: any = {
    fullname: body.fullname,
    permProducts: body.permProducts,
    permCategories: body.permCategories,
    permTransactions: body.permTransactions,
    permUsers: body.permUsers,
    permSettings: body.permSettings,
  }

  // Only update password if provided
  if (body.password) {
    data.password = await bcrypt.hash(body.password, 10)
  }

  const user = await prisma.user.update({
    where: { id: parseInt(id) },
    data,
    select: {
      id: true,
      username: true,
      fullname: true,
    },
  })

  return NextResponse.json(user)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Prevent deleting admin user (id: 1)
  if (parseInt(id) === 1) {
    return NextResponse.json({ error: "Cannot delete admin user" }, { status: 400 })
  }

  await prisma.user.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ success: true })
}
```

**Step 3: Create users management page**

```tsx
// src/app/(dashboard)/users/page.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface User {
  id: number
  username: string
  fullname: string
  permProducts: number
  permCategories: number
  permTransactions: number
  permUsers: number
  permSettings: number
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
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, reset, setValue, watch } = useForm<UserFormData>()

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/users")
    setUsers(await res.json())
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  function openForm(user?: User) {
    setEditUser(user || null)
    reset({
      username: user?.username || "",
      password: "",
      fullname: user?.fullname || "",
      permProducts: user?.permProducts === 1,
      permCategories: user?.permCategories === 1,
      permTransactions: user?.permTransactions === 1,
      permUsers: user?.permUsers === 1,
      permSettings: user?.permSettings === 1,
    })
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditUser(null)
    reset()
  }

  async function onSubmit(data: UserFormData) {
    setSubmitting(true)
    try {
      const url = editUser ? `/api/users/${editUser.id}` : "/api/users"
      const method = editUser ? "PUT" : "POST"

      const body: any = {
        fullname: data.fullname,
        permProducts: data.permProducts ? 1 : 0,
        permCategories: data.permCategories ? 1 : 0,
        permTransactions: data.permTransactions ? 1 : 0,
        permUsers: data.permUsers ? 1 : 0,
        permSettings: data.permSettings ? 1 : 0,
      }

      if (!editUser) {
        body.username = data.username
        body.password = data.password
      } else if (data.password) {
        body.password = data.password
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed")
      }

      toast.success(editUser ? "User updated" : "User created")
      closeForm()
      fetchUsers()
    } catch (err: any) {
      toast.error(err.message || "Failed to save user")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/users/${deleteId}`, { method: "DELETE" })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed")
      }
      toast.success("User deleted")
      fetchUsers()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user")
    } finally {
      setDeleteId(null)
    }
  }

  const permissions = [
    { key: "permProducts", label: "Products" },
    { key: "permCategories", label: "Categories" },
    { key: "permTransactions", label: "Transactions" },
    { key: "permUsers", label: "Users" },
    { key: "permSettings", label: "Settings" },
  ] as const

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Users</h1>
        <Button onClick={() => openForm()}>
          <Plus className="h-4 w-4 mr-2" /> Add User
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Username</TableHead>
            <TableHead>Full Name</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.username}</TableCell>
              <TableCell>{user.fullname}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {user.permProducts === 1 && <Badge variant="outline">Products</Badge>}
                  {user.permCategories === 1 && <Badge variant="outline">Categories</Badge>}
                  {user.permTransactions === 1 && <Badge variant="outline">Transactions</Badge>}
                  {user.permUsers === 1 && <Badge variant="outline">Users</Badge>}
                  {user.permSettings === 1 && <Badge variant="outline">Settings</Badge>}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={user.status.startsWith("Logged In") ? "default" : "secondary"}>
                  {user.status.startsWith("Logged In") ? "Online" : "Offline"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openForm(user)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {user.id !== 1 && (
                    <Button size="icon" variant="ghost" onClick={() => setDeleteId(user.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={formOpen} onOpenChange={closeForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editUser ? "Edit User" : "Add User"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {!editUser && (
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" {...register("username", { required: !editUser })} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="fullname">Full Name</Label>
              <Input id="fullname" {...register("fullname", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                {editUser ? "New Password (leave blank to keep)" : "Password"}
              </Label>
              <Input
                id="password"
                type="password"
                {...register("password", { required: !editUser })}
              />
            </div>

            <div className="space-y-3">
              <Label>Permissions</Label>
              {permissions.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm">{label}</span>
                  <Switch
                    checked={watch(key)}
                    onCheckedChange={(checked) => setValue(key, checked)}
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
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add users management page with permissions"
```

---

## Task 19: Transaction History Page

**Files:**
- Create: `src/app/(dashboard)/transactions/page.tsx`
- Modify: `src/app/api/transactions/route.ts`

**Step 1: Update transactions API with filters**

```ts
// src/app/api/transactions/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const status = searchParams.get("status")
  const userId = searchParams.get("userId")
  const dateFrom = searchParams.get("dateFrom")
  const dateTo = searchParams.get("dateTo")
  const till = searchParams.get("till")

  const where: any = {}

  if (status !== null && status !== "") {
    where.status = parseInt(status)
  }
  if (userId) {
    where.userId = parseInt(userId)
  }
  if (till) {
    where.till = parseInt(till)
  }
  if (dateFrom || dateTo) {
    where.date = {}
    if (dateFrom) where.date.gte = new Date(dateFrom)
    if (dateTo) where.date.lte = new Date(dateTo + "T23:59:59")
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      customer: true,
      items: true,
    },
    orderBy: { date: "desc" },
    take: 100,
  })

  return NextResponse.json(transactions)
}

// Keep existing POST handler...
```

**Step 2: Create transactions history page**

```tsx
// src/app/(dashboard)/transactions/page.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Eye, Search } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface Transaction {
  id: number
  total: string
  subtotal: string
  discount: string
  tax: number
  status: number
  paymentType: string
  paid: string
  change: string
  date: string
  user: string
  till: number
  refNumber: string | null
  customer: { id: number; name: string } | null
  items: Array<{
    id: number
    productName: string
    price: string
    quantity: number
  }>
}

interface User {
  id: number
  fullname: string
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null)

  // Filters
  const [status, setStatus] = useState<string>("")
  const [userId, setUserId] = useState<string>("")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [till, setTill] = useState<string>("")

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (status) params.append("status", status)
    if (userId) params.append("userId", userId)
    if (dateFrom) params.append("dateFrom", dateFrom)
    if (dateTo) params.append("dateTo", dateTo)
    if (till) params.append("till", till)

    const res = await fetch(`/api/transactions?${params}`)
    setTransactions(await res.json())
    setLoading(false)
  }, [status, userId, dateFrom, dateTo, till])

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/users")
    setUsers(await res.json())
  }, [])

  useEffect(() => {
    fetchTransactions()
    fetchUsers()
  }, [fetchTransactions, fetchUsers])

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Transaction History</h1>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="1">Completed</SelectItem>
                  <SelectItem value="0">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cashier</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      {u.fullname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Till</Label>
              <Input
                type="number"
                placeholder="All"
                value={till}
                onChange={(e) => setTill(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button onClick={fetchTransactions} disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                {loading ? "Loading..." : "Search"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order #</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Cashier</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-16">View</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow key={tx.id}>
              <TableCell className="font-mono">{tx.id}</TableCell>
              <TableCell>{format(new Date(tx.date), "MMM d, yyyy h:mm a")}</TableCell>
              <TableCell>{tx.customer?.name || "Walk-in"}</TableCell>
              <TableCell>{tx.user}</TableCell>
              <TableCell>{tx.paymentType}</TableCell>
              <TableCell className="text-right font-medium">{tx.total}</TableCell>
              <TableCell>
                <Badge variant={tx.status === 1 ? "default" : "secondary"}>
                  {tx.status === 1 ? "Completed" : tx.refNumber ? "On Hold" : "Pending"}
                </Badge>
              </TableCell>
              <TableCell>
                <Button size="icon" variant="ghost" onClick={() => setViewTransaction(tx)}>
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {transactions.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                No transactions found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Detail Dialog */}
      <Dialog open={!!viewTransaction} onOpenChange={() => setViewTransaction(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order #{viewTransaction?.id}</DialogTitle>
          </DialogHeader>
          {viewTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Date:</div>
                <div>{format(new Date(viewTransaction.date), "MMM d, yyyy h:mm a")}</div>
                <div>Customer:</div>
                <div>{viewTransaction.customer?.name || "Walk-in"}</div>
                <div>Cashier:</div>
                <div>{viewTransaction.user}</div>
                <div>Till:</div>
                <div>{viewTransaction.till}</div>
                <div>Payment:</div>
                <div>{viewTransaction.paymentType}</div>
                {viewTransaction.refNumber && (
                  <>
                    <div>Ref #:</div>
                    <div>{viewTransaction.refNumber}</div>
                  </>
                )}
              </div>

              <div className="border rounded p-3 space-y-2">
                <div className="font-medium">Items</div>
                {viewTransaction.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>
                      {item.quantity}x {item.productName}
                    </span>
                    <span>{item.price}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{viewTransaction.subtotal}</span>
                </div>
                {viewTransaction.discount && viewTransaction.discount !== "0" && (
                  <div className="flex justify-between">
                    <span>Discount</span>
                    <span>-{viewTransaction.discount}</span>
                  </div>
                )}
                {viewTransaction.tax > 0 && (
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>{viewTransaction.tax.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{viewTransaction.total}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paid</span>
                  <span>{viewTransaction.paid}</span>
                </div>
                <div className="flex justify-between">
                  <span>Change</span>
                  <span>{viewTransaction.change}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add transaction history page with filters"
```

---

## Task 20: Settings Page

**Files:**
- Create: `src/app/(dashboard)/settings/page.tsx`
- Modify: `src/app/api/settings/route.ts`

**Step 1: Update settings API for POST with logo upload**

```ts
// src/app/api/settings/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const settings = await prisma.settings.findFirst()
  return NextResponse.json(settings)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  // Upsert settings (create if not exists, update if exists)
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      app: body.app || "Store POS",
      store: body.store || "",
      addressOne: body.addressOne || "",
      addressTwo: body.addressTwo || "",
      contact: body.contact || "",
      tax: body.tax || "",
      symbol: body.symbol || "$",
      percentage: body.percentage || "0",
      chargeTax: body.chargeTax || false,
      footer: body.footer || "",
      img: body.img || null,
    },
    update: {
      app: body.app,
      store: body.store,
      addressOne: body.addressOne,
      addressTwo: body.addressTwo,
      contact: body.contact,
      tax: body.tax,
      symbol: body.symbol,
      percentage: body.percentage,
      chargeTax: body.chargeTax,
      footer: body.footer,
      ...(body.img && { img: body.img }),
    },
  })

  return NextResponse.json(settings)
}
```

**Step 2: Create settings page**

```tsx
// src/app/(dashboard)/settings/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

interface SettingsFormData {
  app: string
  store: string
  addressOne: string
  addressTwo: string
  contact: string
  tax: string
  symbol: string
  percentage: string
  chargeTax: boolean
  footer: string
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [currentLogo, setCurrentLogo] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)

  const { register, handleSubmit, reset, setValue, watch } = useForm<SettingsFormData>()
  const chargeTax = watch("chargeTax")

  useEffect(() => {
    async function loadSettings() {
      const res = await fetch("/api/settings")
      const data = await res.json()
      if (data) {
        reset({
          app: data.app || "",
          store: data.store || "",
          addressOne: data.addressOne || "",
          addressTwo: data.addressTwo || "",
          contact: data.contact || "",
          tax: data.tax || "",
          symbol: data.symbol || "$",
          percentage: data.percentage || "0",
          chargeTax: data.chargeTax || false,
          footer: data.footer || "",
        })
        setCurrentLogo(data.img)
      }
      setLoading(false)
    }
    loadSettings()
  }, [reset])

  async function onSubmit(data: SettingsFormData) {
    setSubmitting(true)
    try {
      let imgFilename = null

      // Upload logo if selected
      if (logoFile) {
        const formData = new FormData()
        formData.append("file", logoFile)
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData })
        if (!uploadRes.ok) throw new Error("Logo upload failed")
        const { filename } = await uploadRes.json()
        imgFilename = filename
      }

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          ...(imgFilename && { img: imgFilename }),
        }),
      })

      if (!res.ok) throw new Error("Failed to save")

      toast.success("Settings saved")
      if (imgFilename) setCurrentLogo(imgFilename)
      setLogoFile(null)
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Store Settings</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Store Information */}
        <Card>
          <CardHeader>
            <CardTitle>Store Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="app">Application Name</Label>
              <Input id="app" {...register("app")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store">Store Name</Label>
              <Input id="store" {...register("store")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressOne">Address Line 1</Label>
              <Input id="addressOne" {...register("addressOne")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressTwo">Address Line 2</Label>
              <Input id="addressTwo" {...register("addressTwo")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact">Contact Number</Label>
              <Input id="contact" {...register("contact")} />
            </div>
          </CardContent>
        </Card>

        {/* Tax Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Tax Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Charge Tax</Label>
              <Switch
                checked={chargeTax}
                onCheckedChange={(checked) => setValue("chargeTax", checked)}
              />
            </div>
            {chargeTax && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="tax">Tax Registration Number</Label>
                  <Input id="tax" {...register("tax")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="percentage">Tax Percentage (%)</Label>
                  <Input id="percentage" {...register("percentage")} />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Currency & Appearance */}
        <Card>
          <CardHeader>
            <CardTitle>Currency & Appearance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="symbol">Currency Symbol</Label>
              <Input id="symbol" {...register("symbol")} className="w-20" />
            </div>
            <div className="space-y-2">
              <Label>Store Logo</Label>
              <div className="flex items-center gap-4">
                {currentLogo && (
                  <Image
                    src={`/uploads/${currentLogo}`}
                    alt="Store Logo"
                    width={80}
                    height={80}
                    className="rounded border object-contain"
                  />
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Receipt */}
        <Card>
          <CardHeader>
            <CardTitle>Receipt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="footer">Receipt Footer Message</Label>
              <Textarea id="footer" {...register("footer")} rows={3} />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Saving..." : "Save Settings"}
        </Button>
      </form>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add settings page with store configuration"
```

---

## Task 21: Receipt PDF Generation

**Files:**
- Create: `src/lib/receipt-pdf.tsx`
- Create: `src/app/api/receipts/[id]/route.ts`
- Modify: `src/components/pos/payment-modal.tsx`

**Step 1: Install @react-pdf/renderer**

Run: `npm install @react-pdf/renderer`

**Step 2: Create receipt PDF template**

```tsx
// src/lib/receipt-pdf.tsx
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer"
import { prisma } from "@/lib/prisma"

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    textAlign: "center",
    marginBottom: 20,
  },
  storeName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  address: {
    fontSize: 9,
    color: "#666",
    marginBottom: 2,
  },
  divider: {
    borderBottom: "1px dashed #999",
    marginVertical: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  itemName: {
    flex: 1,
  },
  itemQty: {
    width: 40,
    textAlign: "center",
  },
  itemPrice: {
    width: 60,
    textAlign: "right",
  },
  totalSection: {
    marginTop: 10,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  grandTotal: {
    fontSize: 12,
    fontWeight: "bold",
  },
  footer: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 9,
    color: "#666",
  },
})

interface ReceiptData {
  transaction: any
  settings: any
}

function ReceiptDocument({ transaction, settings }: ReceiptData) {
  const symbol = settings?.symbol || "$"

  return (
    <Document>
      <Page size={[226, 600]} style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.storeName}>{settings?.store || "Store"}</Text>
          {settings?.addressOne && <Text style={styles.address}>{settings.addressOne}</Text>}
          {settings?.addressTwo && <Text style={styles.address}>{settings.addressTwo}</Text>}
          {settings?.contact && <Text style={styles.address}>Tel: {settings.contact}</Text>}
          {settings?.tax && <Text style={styles.address}>VAT: {settings.tax}</Text>}
        </View>

        <View style={styles.divider} />

        {/* Order Info */}
        <View style={styles.row}>
          <Text>Order #: {transaction.id}</Text>
          <Text>{new Date(transaction.date).toLocaleString()}</Text>
        </View>
        <View style={styles.row}>
          <Text>Cashier: {transaction.user}</Text>
          <Text>Till: {transaction.till}</Text>
        </View>
        {transaction.customer && (
          <View style={styles.row}>
            <Text>Customer: {transaction.customer.name}</Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* Items */}
        <View style={styles.itemRow}>
          <Text style={[styles.itemName, { fontWeight: "bold" }]}>Item</Text>
          <Text style={[styles.itemQty, { fontWeight: "bold" }]}>Qty</Text>
          <Text style={[styles.itemPrice, { fontWeight: "bold" }]}>Price</Text>
        </View>
        {transaction.items.map((item: any, i: number) => (
          <View key={i} style={styles.itemRow}>
            <Text style={styles.itemName}>{item.productName}</Text>
            <Text style={styles.itemQty}>{item.quantity}</Text>
            <Text style={styles.itemPrice}>
              {symbol}
              {item.price}
            </Text>
          </View>
        ))}

        <View style={styles.divider} />

        {/* Totals */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>
              {symbol}
              {transaction.subtotal}
            </Text>
          </View>
          {transaction.discount && transaction.discount !== "0" && (
            <View style={styles.totalRow}>
              <Text>Discount</Text>
              <Text>
                -{symbol}
                {transaction.discount}
              </Text>
            </View>
          )}
          {transaction.tax > 0 && (
            <View style={styles.totalRow}>
              <Text>Tax ({settings?.percentage || 0}%)</Text>
              <Text>
                {symbol}
                {transaction.tax.toFixed(2)}
              </Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text>TOTAL</Text>
            <Text>
              {symbol}
              {transaction.total}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Paid ({transaction.paymentType})</Text>
            <Text>
              {symbol}
              {transaction.paid}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Change</Text>
            <Text>
              {symbol}
              {transaction.change}
            </Text>
          </View>
        </View>

        {/* Footer */}
        {settings?.footer && (
          <View style={styles.footer}>
            <Text>{settings.footer}</Text>
          </View>
        )}
      </Page>
    </Document>
  )
}

export async function generateReceiptPDF(transactionId: number): Promise<Buffer> {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      customer: true,
      items: true,
    },
  })

  if (!transaction) throw new Error("Transaction not found")

  const settings = await prisma.settings.findFirst()

  const buffer = await renderToBuffer(
    <ReceiptDocument transaction={transaction} settings={settings} />
  )

  return Buffer.from(buffer)
}
```

**Step 3: Create receipt API endpoint**

```ts
// src/app/api/receipts/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { generateReceiptPDF } from "@/lib/receipt-pdf"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const pdfBuffer = await generateReceiptPDF(parseInt(id))

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="receipt-${id}.pdf"`,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate receipt" }, { status: 500 })
  }
}
```

**Step 4: Add download receipt button to payment success**

Update payment modal to show receipt download after successful payment:

```tsx
// In payment-modal.tsx, add to success state:
{paymentComplete && lastTransactionId && (
  <div className="text-center space-y-4">
    <div className="text-green-600 text-lg font-bold">Payment Complete!</div>
    <Button
      variant="outline"
      onClick={() => window.open(`/api/receipts/${lastTransactionId}`, "_blank")}
    >
      Download Receipt
    </Button>
  </div>
)}
```

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add PDF receipt generation"
```

---

## Task 22: Email Receipt Integration

**Files:**
- Create: `src/lib/email.ts`
- Create: `src/app/api/receipts/[id]/email/route.ts`
- Modify: `src/components/pos/payment-modal.tsx`

**Step 1: Install Resend**

Run: `npm install resend`

**Step 2: Create email utility**

```ts
// src/lib/email.ts
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendReceiptEmailParams {
  to: string
  storeName: string
  orderId: number
  total: string
  pdfBuffer: Buffer
}

export async function sendReceiptEmail({
  to,
  storeName,
  orderId,
  total,
  pdfBuffer,
}: SendReceiptEmailParams) {
  const { data, error } = await resend.emails.send({
    from: `${storeName} <receipts@${process.env.RESEND_DOMAIN || "resend.dev"}>`,
    to,
    subject: `Receipt #${orderId} - ${storeName}`,
    html: `
      <h2>Thank you for your purchase!</h2>
      <p>Your receipt for order #${orderId} is attached.</p>
      <p><strong>Total: ${total}</strong></p>
      <br/>
      <p>Thank you for shopping with us!</p>
      <p>${storeName}</p>
    `,
    attachments: [
      {
        filename: `receipt-${orderId}.pdf`,
        content: pdfBuffer,
      },
    ],
  })

  if (error) throw error
  return data
}
```

**Step 3: Create email receipt endpoint**

```ts
// src/app/api/receipts/[id]/email/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateReceiptPDF } from "@/lib/receipt-pdf"
import { sendReceiptEmail } from "@/lib/email"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { email } = await request.json()

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 })
  }

  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: parseInt(id) },
    })

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    const settings = await prisma.settings.findFirst()
    const pdfBuffer = await generateReceiptPDF(parseInt(id))

    await sendReceiptEmail({
      to: email,
      storeName: settings?.store || "Store",
      orderId: transaction.id,
      total: `${settings?.symbol || "$"}${transaction.total}`,
      pdfBuffer,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Email error:", error)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}
```

**Step 4: Add email receipt option to payment modal**

Update payment modal with email option after successful payment.

**Step 5: Add RESEND_API_KEY to .env.example**

```
RESEND_API_KEY=your_resend_api_key
RESEND_DOMAIN=your_verified_domain
```

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add email receipt functionality"
```

---

## Task 23: Final Polish and Testing

**Step 1: Add missing shadcn components**

Run: `npx shadcn@latest add textarea card alert-dialog switch badge`

**Step 2: Create public/uploads directory**

```bash
mkdir -p public/uploads
echo "*\n!.gitkeep" > public/uploads/.gitignore
```

**Step 3: Update next.config.js for images**

```js
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [],
  },
}

module.exports = nextConfig
```

**Step 4: Verify all pages accessible**

Test each route:
- `/` - Login
- `/pos` - POS terminal
- `/products` - Products CRUD
- `/categories` - Categories CRUD
- `/customers` - Customers CRUD
- `/users` - Users CRUD
- `/transactions` - Transaction history
- `/settings` - Store settings

**Step 5: Final commit**

```bash
git add .
git commit -m "chore: final polish and configuration"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 15 | Products Management | page, form, table, API routes, upload |
| 16 | Categories Management | page, API routes |
| 17 | Customers Management | page, API routes |
| 18 | Users Management | page, API routes |
| 19 | Transaction History | page with filters |
| 20 | Settings Page | page, API update |
| 21 | Receipt PDF | PDF template, API route |
| 22 | Email Receipts | Resend integration |
| 23 | Final Polish | Components, config, testing |

**Total: 9 tasks to complete Phase 2**
