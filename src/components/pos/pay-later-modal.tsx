"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Card } from "@/components/ui/card"
import {
  Search,
  UserPlus,
  User,
  Phone,
  Loader2,
  Check,
  ArrowLeft,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ===============================================================================
// TYPES
// ===============================================================================

export interface CustomerWithTab {
  id: number
  name: string
  phone: string
  tabBalance: number
  creditLimit: number
  tabStatus: string
}

export interface PayLaterResult {
  customerId: number
  customerName: string
}

interface PayLaterModalProps {
  open: boolean
  onClose: () => void
  total: number
  currencySymbol: string
  onConfirm: (data: PayLaterResult) => Promise<boolean>
}

// ===============================================================================
// COMPONENT
// ===============================================================================

export function PayLaterModal({
  open,
  onClose,
  total,
  currencySymbol,
  onConfirm,
}: PayLaterModalProps) {
  // State
  const [customers, setCustomers] = useState<CustomerWithTab[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithTab | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // New customer form state
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState("")
  const [newCustomerPhone, setNewCustomerPhone] = useState("")
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false)

  // Fetch customers on mount
  const fetchCustomers = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/customers")
      if (response.ok) {
        const data = await response.json()
        setCustomers(data)
      }
    } catch {
      toast.error("Failed to load customers")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSearchQuery("")
      setSelectedCustomer(null)
      setShowNewCustomerForm(false)
      setNewCustomerName("")
      setNewCustomerPhone("")
      setIsProcessing(false)
      fetchCustomers()
    }
  }, [open, fetchCustomers])

  // Filter customers based on search
  const filteredCustomers = customers.filter((customer) => {
    const query = searchQuery.toLowerCase()
    return (
      customer.name.toLowerCase().includes(query) ||
      customer.phone.toLowerCase().includes(query)
    )
  })

  // Sort by most recent activity (customers with tab balance first, then alphabetically)
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    // Customers with active tab balance come first
    if (a.tabBalance > 0 && b.tabBalance === 0) return -1
    if (a.tabBalance === 0 && b.tabBalance > 0) return 1
    // Then alphabetically
    return a.name.localeCompare(b.name)
  })

  // Handle customer selection
  const handleSelectCustomer = (customer: CustomerWithTab) => {
    setSelectedCustomer(customer)
  }

  // Handle confirm
  const handleConfirm = async () => {
    if (!selectedCustomer) return

    setIsProcessing(true)
    try {
      const success = await onConfirm({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
      })

      if (success) {
        onClose()
      }
    } catch {
      toast.error("Failed to add to tab")
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle create new customer
  const handleCreateCustomer = async () => {
    const name = newCustomerName.trim()
    if (!name) {
      toast.error("Customer name is required")
      return
    }

    setIsCreatingCustomer(true)
    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: newCustomerPhone.trim(),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create customer")
      }

      const newCustomer = await response.json()

      // Add to customers list and select
      const customerWithTab: CustomerWithTab = {
        ...newCustomer,
        tabBalance: 0,
        creditLimit: 0,
        tabStatus: "active",
      }

      setCustomers((prev) => [...prev, customerWithTab])
      setSelectedCustomer(customerWithTab)
      setShowNewCustomerForm(false)
      setNewCustomerName("")
      setNewCustomerPhone("")
      toast.success(`Customer "${name}" created`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create customer")
    } finally {
      setIsCreatingCustomer(false)
    }
  }

  // Calculate new tab balance for selected customer
  const newTabBalance = selectedCustomer
    ? Number(selectedCustomer.tabBalance) + total
    : 0

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden max-h-[90vh]">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <User className="h-6 w-6" />
            Pay Later - Select Customer
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 pt-4 space-y-4">
          {/* Total display */}
          <div className="text-center py-3 bg-muted rounded-xl">
            <p className="text-sm text-muted-foreground">Order Total</p>
            <p className="text-2xl font-bold text-primary">
              {currencySymbol}{total.toFixed(2)}
            </p>
          </div>

          {/* New Customer Form */}
          {showNewCustomerForm ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewCustomerForm(false)}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <span className="font-medium">New Customer</span>
              </div>

              <div>
                <Label htmlFor="customer-name">Name *</Label>
                <Input
                  id="customer-name"
                  placeholder="Customer name"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="mt-1"
                  autoFocus
                />
              </div>

              <div>
                <Label htmlFor="customer-phone">Phone (optional)</Label>
                <Input
                  id="customer-phone"
                  placeholder="Phone number"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-11"
                  onClick={() => setShowNewCustomerForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 h-11"
                  onClick={handleCreateCustomer}
                  disabled={!newCustomerName.trim() || isCreatingCustomer}
                >
                  {isCreatingCustomer ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create & Add to Tab
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customer name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11"
                  autoFocus
                />
              </div>

              {/* Customer list */}
              <ScrollArea className="h-[200px] pr-2">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : sortedCustomers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <User className="h-10 w-10 mb-2 opacity-30" />
                    <p className="text-sm">
                      {searchQuery ? "No customers found" : "No customers yet"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sortedCustomers.map((customer) => (
                      <Card
                        key={customer.id}
                        className={cn(
                          "p-3 cursor-pointer transition-all hover:border-primary/50",
                          selectedCustomer?.id === customer.id && "border-primary bg-primary/5"
                        )}
                        onClick={() => handleSelectCustomer(customer)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center",
                              selectedCustomer?.id === customer.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            )}>
                              {selectedCustomer?.id === customer.id ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <User className="h-4 w-4" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{customer.name}</p>
                              {customer.phone && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {customer.phone}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Tab Balance</p>
                            <p className={cn(
                              "font-semibold text-sm",
                              Number(customer.tabBalance) > 0 ? "text-amber-600" : "text-muted-foreground"
                            )}>
                              {currencySymbol}{Number(customer.tabBalance).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <Separator />

              {/* New customer button */}
              <Button
                variant="outline"
                className="w-full h-11"
                onClick={() => setShowNewCustomerForm(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                New Customer
              </Button>

              {/* Selected customer preview */}
              {selectedCustomer && (
                <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Customer</span>
                    <span className="font-medium">{selectedCustomer.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Current Tab</span>
                    <span className={cn(
                      "font-medium",
                      Number(selectedCustomer.tabBalance) > 0 && "text-amber-600"
                    )}>
                      {currencySymbol}{Number(selectedCustomer.tabBalance).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">This Order</span>
                    <span className="font-medium text-primary">
                      +{currencySymbol}{total.toFixed(2)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="font-medium">New Tab Balance</span>
                    <span className="font-bold text-lg text-amber-600">
                      {currencySymbol}{newTabBalance.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Action buttons - only show when not in new customer form */}
        {!showNewCustomerForm && (
          <div className="p-6 pt-0 flex gap-3">
            <Button variant="outline" className="flex-1 h-12" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1 h-12 text-lg font-bold"
              onClick={handleConfirm}
              disabled={!selectedCustomer || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Add to Tab
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
