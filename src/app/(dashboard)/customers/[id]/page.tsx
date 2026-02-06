"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  Receipt,
  Loader2,
  Save,
  Banknote,
  Smartphone,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { TabSettlement } from "@/components/customers/tab-settlement"

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface Customer {
  id: number
  name: string
  email: string
  phone: string
  address: string
  tabBalance: number
  creditLimit: number
  tabStatus: string
  visitCount: number
  lifetimeSpend: number
  firstVisit: string | null
  lastVisit: string | null
  customerType: string | null
  isRegular: boolean
  notes: string | null
}

interface TabSettlementRecord {
  id: number
  amount: number
  paymentType: string
  paymentInfo: string | null
  previousBalance: number
  newBalance: number
  createdAt: string
}

interface TabData {
  customer: {
    id: number
    name: string
    tabBalance: number
    creditLimit: number
    tabStatus: string
  }
  settlements: TabSettlementRecord[]
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function CustomerProfilePage() {
  const params = useParams()
  const router = useRouter()
  const customerId = parseInt(params.id as string)

  // Customer data state
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [tabData, setTabData] = useState<TabData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tabLoading, setTabLoading] = useState(true)

  // Edit form state
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  })

  // Fetch customer data
  const fetchCustomer = useCallback(async () => {
    try {
      const response = await fetch(`/api/customers/${customerId}`)
      if (!response.ok) {
        if (response.status === 404) {
          toast.error("Customer not found")
          router.push("/customers")
          return
        }
        throw new Error("Failed to fetch customer")
      }
      const data = await response.json()
      setCustomer(data)
      setFormData({
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        address: data.address || "",
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load customer")
    } finally {
      setLoading(false)
    }
  }, [customerId, router])

  // Fetch tab data (settlements)
  const fetchTabData = useCallback(async () => {
    setTabLoading(true)
    try {
      const response = await fetch(`/api/customers/${customerId}/tab`)
      if (!response.ok) throw new Error("Failed to fetch tab data")
      const data = await response.json()
      setTabData(data)
    } catch (error) {
      console.error("Failed to fetch tab data:", error)
    } finally {
      setTabLoading(false)
    }
  }, [customerId])

  // Initial data fetch
  useEffect(() => {
    if (!isNaN(customerId)) {
      fetchCustomer()
      fetchTabData()
    }
  }, [customerId, fetchCustomer, fetchTabData])

  // Handle settlement complete - refresh data
  const handleSettlementComplete = useCallback(() => {
    fetchCustomer()
    fetchTabData()
  }, [fetchCustomer, fetchTabData])

  // Handle form input changes
  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Handle save
  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Name is required")
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update customer")
      }

      toast.success("Customer updated successfully")
      setIsEditing(false)
      fetchCustomer()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update customer")
    } finally {
      setIsSaving(false)
    }
  }

  // Cancel editing
  const handleCancelEdit = () => {
    if (customer) {
      setFormData({
        name: customer.name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
      })
    }
    setIsEditing(false)
  }

  // Format date helper
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // Format date with time helper
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Loading state
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Not found state
  if (!customer) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Customer not found</p>
          <Link href="/customers">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Customers
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Calculate tab credit usage
  const creditUsage =
    customer.creditLimit > 0
      ? (customer.tabBalance / customer.creditLimit) * 100
      : 0
  const isNearCreditLimit = creditUsage >= 80
  const isOverCreditLimit = creditUsage >= 100

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/customers">Customers</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{customer.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{customer.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            {customer.isRegular && (
              <Badge variant="secondary">Regular</Badge>
            )}
            {customer.customerType && (
              <Badge variant="outline">{customer.customerType}</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ═══════════════════════════════════════════════════════════════════════
            LEFT COLUMN: Customer Info
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="space-y-6">
          {/* Contact Information Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Contact Information</CardTitle>
                <CardDescription>Customer details and contact info</CardDescription>
              </div>
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="min-h-11"
                >
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="min-h-11"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="min-h-11"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                // Edit Form
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className="min-h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className="min-h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      className="min-h-11"
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
                </>
              ) : (
                // Display Mode
                <>
                  <div className="flex items-center gap-3 py-2">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <span>{customer.name}</span>
                  </div>
                  <div className="flex items-center gap-3 py-2">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <span>{customer.email || "Not provided"}</span>
                  </div>
                  <div className="flex items-center gap-3 py-2">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <span>{customer.phone || "Not provided"}</span>
                  </div>
                  <div className="flex items-start gap-3 py-2">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <span>{customer.address || "Not provided"}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Visit Statistics Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Visit Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted rounded-xl p-4 text-center">
                  <Receipt className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-2xl font-bold">{customer.visitCount}</p>
                  <p className="text-xs text-muted-foreground">Total Visits</p>
                </div>
                <div className="bg-muted rounded-xl p-4 text-center">
                  <CreditCard className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-2xl font-bold">
                    ₱{Number(customer.lifetimeSpend).toFixed(0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Lifetime Spend</p>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    First Visit
                  </span>
                  <span>{formatDate(customer.firstVisit)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Last Visit
                  </span>
                  <span>{formatDate(customer.lastVisit)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            RIGHT COLUMN: Tab Section
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="space-y-6">
          {/* Tab Balance Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Tab Account
                </CardTitle>
                <Badge
                  variant={
                    customer.tabStatus === "frozen"
                      ? "destructive"
                      : customer.tabStatus === "suspended"
                      ? "secondary"
                      : "outline"
                  }
                >
                  {customer.tabStatus.charAt(0).toUpperCase() + customer.tabStatus.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Balance Display */}
              <div
                className={cn(
                  "rounded-xl p-4 text-center",
                  customer.tabBalance > 0
                    ? isOverCreditLimit
                      ? "bg-red-50"
                      : isNearCreditLimit
                      ? "bg-amber-50"
                      : "bg-blue-50"
                    : "bg-green-50"
                )}
              >
                <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
                <p
                  className={cn(
                    "text-4xl font-bold",
                    customer.tabBalance > 0
                      ? isOverCreditLimit
                        ? "text-red-600"
                        : isNearCreditLimit
                        ? "text-amber-600"
                        : "text-blue-600"
                      : "text-green-600"
                  )}
                >
                  ₱{Number(customer.tabBalance).toFixed(2)}
                </p>
              </div>

              {/* Credit Limit Progress */}
              {customer.creditLimit > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Credit Usage</span>
                    <span
                      className={cn(
                        "font-medium",
                        isOverCreditLimit
                          ? "text-red-600"
                          : isNearCreditLimit
                          ? "text-amber-600"
                          : ""
                      )}
                    >
                      {creditUsage.toFixed(0)}%
                    </span>
                  </div>
                  <Progress
                    value={Math.min(100, creditUsage)}
                    className={cn(
                      "h-2",
                      isOverCreditLimit
                        ? "[&>div]:bg-red-500"
                        : isNearCreditLimit
                        ? "[&>div]:bg-amber-500"
                        : ""
                    )}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    Limit: ₱{Number(customer.creditLimit).toFixed(2)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tab Settlement Component */}
          <TabSettlement
            customerId={customerId}
            currentBalance={Number(customer.tabBalance)}
            currencySymbol="₱"
            onSettlementComplete={handleSettlementComplete}
          />

          {/* Settlement History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment History</CardTitle>
              <CardDescription>Recent tab settlements</CardDescription>
            </CardHeader>
            <CardContent>
              {tabLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : tabData?.settlements && tabData.settlements.length > 0 ? (
                <div className="space-y-3">
                  {tabData.settlements.slice(0, 10).map((settlement) => (
                    <div
                      key={settlement.id}
                      className="flex items-center justify-between py-3 border-b last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "p-2 rounded-full",
                            settlement.paymentType === "Cash"
                              ? "bg-green-100"
                              : "bg-blue-100"
                          )}
                        >
                          {settlement.paymentType === "Cash" ? (
                            <Banknote
                              className={cn(
                                "h-4 w-4",
                                settlement.paymentType === "Cash"
                                  ? "text-green-600"
                                  : "text-blue-600"
                              )}
                            />
                          ) : (
                            <Smartphone className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            ₱{settlement.amount.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(settlement.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs">
                          {settlement.paymentType}
                        </Badge>
                        {settlement.paymentInfo && (
                          <p className="text-xs text-muted-foreground mt-1 truncate max-w-[100px]">
                            Ref: {settlement.paymentInfo}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {tabData.settlements.length > 10 && (
                    <p className="text-center text-sm text-muted-foreground py-2">
                      + {tabData.settlements.length - 10} more settlements
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No payment history</p>
                  <p className="text-sm mt-1">Settlements will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
