"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { getImageSrc, isDataUrl } from "@/lib/image-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Save, Upload, RotateCcw, Check, Calendar, Wallet, Trash2, Pencil, Plus, X, ShieldCheck, Package, Clock } from "lucide-react"
import { useOnboarding } from "@/hooks/use-onboarding"
import { useColorTheme } from "@/components/providers/color-theme-provider"
import { useTheme } from "next-themes"
import { COLOR_THEMES } from "@/lib/themes"

interface SettingsFormData {
  appMode: string
  storeName: string
  addressLine1: string
  addressLine2: string
  phone: string
  taxNumber: string
  currencySymbol: string
  taxPercentage: string
  chargeTax: boolean
  receiptFooter: string
  payPeriodType: string
  payPeriodStartDay: string
}

interface BusinessRulesData {
  voidWindowDays: number
  voidReasons: string[]
  wasteReasons: string[]
  daypartMorningStart: number
  daypartMiddayStart: number
  daypartAfternoonStart: number
  daypartEveningStart: number
  kitchenWarningMinutes: number
  kitchenDangerMinutes: number
  lowStockCriticalRatio: number
  lowStockWarningRatio: number
  stockCriticalMax: number
  stockLowMax: number
  creditWarningThreshold: number
  suggestedPriceMarkup: number
}

interface ShiftTemplate {
  id: number
  name: string
  startTime: string
  endTime: string
  color: string
  isActive: boolean
}

const initialFormData: SettingsFormData = {
  appMode: "Point of Sale",
  storeName: "",
  addressLine1: "",
  addressLine2: "",
  phone: "",
  taxNumber: "",
  currencySymbol: "$",
  taxPercentage: "0",
  chargeTax: false,
  receiptFooter: "",
  payPeriodType: "custom",
  payPeriodStartDay: "1",
}

const initialBusinessRules: BusinessRulesData = {
  voidWindowDays: 7,
  voidReasons: ["Wrong Items", "Test Transaction", "Customer Dispute", "Duplicate Entry", "Other"],
  wasteReasons: ["Expired", "Spoiled", "Overproduction", "Prep Waste", "Dropped/Spilled", "Quality Issue", "Customer Return", "Other"],
  daypartMorningStart: 6,
  daypartMiddayStart: 10,
  daypartAfternoonStart: 14,
  daypartEveningStart: 18,
  kitchenWarningMinutes: 5,
  kitchenDangerMinutes: 10,
  lowStockCriticalRatio: 0.25,
  lowStockWarningRatio: 0.50,
  stockCriticalMax: 5,
  stockLowMax: 20,
  creditWarningThreshold: 0.80,
  suggestedPriceMarkup: 1.50,
}

// Editable tag list component for arrays of strings
function TagListEditor({
  value,
  onChange,
  placeholder = "Add item...",
}: {
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
}) {
  const [input, setInput] = useState("")

  function handleAdd() {
    const trimmed = input.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
      setInput("")
    }
  }

  function handleRemove(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((item, i) => (
          <Badge key={i} variant="secondary" className="gap-1 pr-1">
            {item}
            <button
              type="button"
              onClick={() => handleRemove(i)}
              className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={handleAdd} disabled={!input.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submittingRules, setSubmittingRules] = useState(false)
  const { reset: resetTour } = useOnboarding()
  const { colorTheme, setColorTheme } = useColorTheme()
  const { resolvedTheme } = useTheme()
  const [currentLogo, setCurrentLogo] = useState<string>("")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>("")
  const [formData, setFormData] = useState<SettingsFormData>(initialFormData)
  const [rulesData, setRulesData] = useState<BusinessRulesData>(initialBusinessRules)

  // Shift Templates state (separate from main settings form)
  const [templates, setTemplates] = useState<ShiftTemplate[]>([])
  const [templateFormOpen, setTemplateFormOpen] = useState(false)
  const [editTemplate, setEditTemplate] = useState<ShiftTemplate | null>(null)
  const [templateForm, setTemplateForm] = useState({ name: "", startTime: "", endTime: "", color: "#3B82F6", isActive: true })

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings")
        const data = await res.json()
        if (data && !data.error) {
          setFormData({
            appMode: data.appMode || "Point of Sale",
            storeName: data.storeName || "",
            addressLine1: data.addressLine1 || "",
            addressLine2: data.addressLine2 || "",
            phone: data.phone || "",
            taxNumber: data.taxNumber || "",
            currencySymbol: data.currencySymbol || "$",
            taxPercentage: String(data.taxPercentage || "0"),
            chargeTax: data.chargeTax || false,
            receiptFooter: data.receiptFooter || "",
            payPeriodType: data.payPeriodType || "custom",
            payPeriodStartDay: String(data.payPeriodStartDay || "1"),
          })
          setCurrentLogo(data.logo || "")
          setRulesData({
            voidWindowDays: data.voidWindowDays ?? initialBusinessRules.voidWindowDays,
            voidReasons: Array.isArray(data.voidReasons) ? data.voidReasons : initialBusinessRules.voidReasons,
            wasteReasons: Array.isArray(data.wasteReasons) ? data.wasteReasons : initialBusinessRules.wasteReasons,
            daypartMorningStart: data.daypartMorningStart ?? initialBusinessRules.daypartMorningStart,
            daypartMiddayStart: data.daypartMiddayStart ?? initialBusinessRules.daypartMiddayStart,
            daypartAfternoonStart: data.daypartAfternoonStart ?? initialBusinessRules.daypartAfternoonStart,
            daypartEveningStart: data.daypartEveningStart ?? initialBusinessRules.daypartEveningStart,
            kitchenWarningMinutes: data.kitchenWarningMinutes ?? initialBusinessRules.kitchenWarningMinutes,
            kitchenDangerMinutes: data.kitchenDangerMinutes ?? initialBusinessRules.kitchenDangerMinutes,
            lowStockCriticalRatio: data.lowStockCriticalRatio ?? initialBusinessRules.lowStockCriticalRatio,
            lowStockWarningRatio: data.lowStockWarningRatio ?? initialBusinessRules.lowStockWarningRatio,
            stockCriticalMax: data.stockCriticalMax ?? initialBusinessRules.stockCriticalMax,
            stockLowMax: data.stockLowMax ?? initialBusinessRules.stockLowMax,
            creditWarningThreshold: data.creditWarningThreshold ?? initialBusinessRules.creditWarningThreshold,
            suggestedPriceMarkup: data.suggestedPriceMarkup ?? initialBusinessRules.suggestedPriceMarkup,
          })
        }
      } catch {
        toast.error("Failed to load settings")
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
    loadTemplates()
  }, [])

  async function loadTemplates() {
    try {
      const res = await fetch("/api/shift-templates")
      const data = await res.json()
      if (Array.isArray(data)) setTemplates(data)
    } catch {
      // silently fail - templates are non-critical
    }
  }

  function openAddTemplate() {
    setEditTemplate(null)
    setTemplateForm({ name: "", startTime: "", endTime: "", color: "#3B82F6", isActive: true })
    setTemplateFormOpen(true)
  }

  function openEditTemplate(t: ShiftTemplate) {
    setEditTemplate(t)
    setTemplateForm({ name: t.name, startTime: t.startTime, endTime: t.endTime, color: t.color, isActive: t.isActive })
    setTemplateFormOpen(true)
  }

  async function handleTemplateSave() {
    try {
      if (editTemplate) {
        const res = await fetch(`/api/shift-templates/${editTemplate.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(templateForm),
        })
        if (!res.ok) throw new Error()
        toast.success("Template updated")
      } else {
        const res = await fetch("/api/shift-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(templateForm),
        })
        if (!res.ok) throw new Error()
        toast.success("Template created")
      }
      setTemplateFormOpen(false)
      loadTemplates()
    } catch {
      toast.error("Failed to save template")
    }
  }

  async function handleTemplateDelete(id: number) {
    if (!confirm("Delete this shift template?")) return
    try {
      const res = await fetch(`/api/shift-templates/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Template deleted")
      loadTemplates()
    } catch {
      toast.error("Failed to delete template")
    }
  }

  function handleInputChange(field: keyof SettingsFormData, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  function handleRulesChange<K extends keyof BusinessRulesData>(field: K, value: BusinessRulesData[K]) {
    setRulesData((prev) => ({ ...prev, [field]: value }))
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    try {
      let logoFilename: string | undefined = undefined

      // Upload logo if selected
      if (logoFile) {
        const uploadFormData = new FormData()
        uploadFormData.append("file", logoFile)
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: uploadFormData,
        })
        if (!uploadRes.ok) {
          throw new Error("Logo upload failed")
        }
        const { filename } = await uploadRes.json()
        logoFilename = filename
      }

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          taxPercentage: parseFloat(formData.taxPercentage) || 0,
          payPeriodStartDay: parseInt(formData.payPeriodStartDay) || 1,
          ...(logoFilename && { logo: logoFilename }),
        }),
      })

      if (!res.ok) {
        throw new Error("Failed to save settings")
      }

      toast.success("Settings saved successfully")

      if (logoFilename) {
        setCurrentLogo(logoFilename)
        setLogoFile(null)
        setLogoPreview("")
      }
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSaveBusinessRules() {
    setSubmittingRules(true)
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "businessRules",
          ...rulesData,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save business rules")
      }

      toast.success("Business rules saved successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save business rules")
    } finally {
      setSubmittingRules(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardHeader><Skeleton className="h-5 w-36" /></CardHeader>
          <CardContent className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><Skeleton className="h-5 w-28" /></CardHeader>
          <CardContent><Skeleton className="h-10 w-full" /></CardContent>
        </Card>
        <Skeleton className="h-11 w-full" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-6">Store Settings</h1>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="business-rules">Business Rules</TabsTrigger>
        </TabsList>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* GENERAL TAB */}
        {/* ════════════════════════════════════════════════════════════ */}
        <TabsContent value="general">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Store Information */}
            <Card>
              <CardHeader>
                <CardTitle>Store Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="appMode">Application Name</Label>
                  <Input
                    id="appMode"
                    value={formData.appMode}
                    onChange={(e) => handleInputChange("appMode", e.target.value)}
                    placeholder="Point of Sale"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storeName">Store Name</Label>
                  <Input
                    id="storeName"
                    value={formData.storeName}
                    onChange={(e) => handleInputChange("storeName", e.target.value)}
                    placeholder="My Store"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="addressLine1">Address Line 1</Label>
                    <Input
                      id="addressLine1"
                      value={formData.addressLine1}
                      onChange={(e) => handleInputChange("addressLine1", e.target.value)}
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="addressLine2">Address Line 2</Label>
                    <Input
                      id="addressLine2"
                      value={formData.addressLine2}
                      onChange={(e) => handleInputChange("addressLine2", e.target.value)}
                      placeholder="City, State ZIP"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Contact Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
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
                  <div className="space-y-0.5">
                    <Label>Charge Tax</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable tax calculation on transactions
                    </p>
                  </div>
                  <Switch
                    checked={formData.chargeTax}
                    onCheckedChange={(checked) => handleInputChange("chargeTax", checked)}
                  />
                </div>
                {formData.chargeTax && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="taxNumber">Tax Registration Number</Label>
                      <Input
                        id="taxNumber"
                        value={formData.taxNumber}
                        onChange={(e) => handleInputChange("taxNumber", e.target.value)}
                        placeholder="VAT/GST Number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taxPercentage">Tax Percentage (%)</Label>
                      <Input
                        id="taxPercentage"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.taxPercentage}
                        onChange={(e) => handleInputChange("taxPercentage", e.target.value)}
                        placeholder="10"
                        className="w-32"
                      />
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
                  <Label htmlFor="currencySymbol">Currency Symbol</Label>
                  <Input
                    id="currencySymbol"
                    value={formData.currencySymbol}
                    onChange={(e) => handleInputChange("currencySymbol", e.target.value)}
                    placeholder="$"
                    className="w-24"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Store Logo</Label>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {(logoPreview || currentLogo) ? (
                        <div className="relative w-24 h-24 border rounded-lg overflow-hidden bg-muted">
                          <Image
                            src={logoPreview || getImageSrc(currentLogo)}
                            alt="Store Logo"
                            fill
                            className="object-contain"
                            unoptimized={isDataUrl(logoPreview || currentLogo)}
                          />
                        </div>
                      ) : (
                        <div className="w-24 h-24 border rounded-lg bg-muted flex items-center justify-center">
                          <Upload className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleLogoChange}
                        className="cursor-pointer"
                      />
                      <p className="text-sm text-muted-foreground">
                        Recommended: Square image, max 5MB. Supports JPEG, PNG, GIF, WebP.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <Label>Color Theme</Label>
                  <RadioGroup
                    value={colorTheme}
                    onValueChange={setColorTheme}
                    className="grid grid-cols-2 sm:grid-cols-4 gap-3"
                  >
                    {COLOR_THEMES.map((theme) => {
                      const active = colorTheme === theme.id
                      const colors = resolvedTheme === "dark" ? theme.preview.dark : theme.preview.light
                      return (
                        <label
                          key={theme.id}
                          className={`group relative cursor-pointer rounded-lg border-2 p-3 text-left transition-colors ${
                            active
                              ? "border-primary ring-2 ring-primary/20"
                              : "border-border hover:border-primary/40"
                          }`}
                        >
                          <RadioGroupItem value={theme.id} className="sr-only" />
                          {active && (
                            <div className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                              <Check className="h-2.5 w-2.5 text-primary-foreground" />
                            </div>
                          )}
                          <div className="mb-2 flex gap-1">
                            {colors.map((color, i) => (
                              <div
                                key={i}
                                className="h-6 flex-1 rounded-sm first:rounded-l-md last:rounded-r-md"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                          <p className="text-sm font-medium leading-tight">{theme.name}</p>
                          <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                            {theme.description}
                          </p>
                        </label>
                      )
                    })}
                  </RadioGroup>
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
                  <Label htmlFor="receiptFooter">Receipt Footer Message</Label>
                  <Textarea
                    id="receiptFooter"
                    value={formData.receiptFooter}
                    onChange={(e) => handleInputChange("receiptFooter", e.target.value)}
                    placeholder="Thank you for your business!"
                    rows={3}
                  />
                  <p className="text-sm text-muted-foreground">
                    This message will appear at the bottom of printed receipts.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Help & Support */}
            <Card>
              <CardHeader>
                <CardTitle>Help & Support</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Onboarding Tour</Label>
                    <p className="text-sm text-muted-foreground">
                      Restart the guided tour to learn about Store POS features
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetTour()
                      toast.success("Tour reset! Refresh the page to see the tour.")
                    }}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restart Tour
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Payroll Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  <CardTitle>Payroll Settings</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="payPeriodType">Pay Period Type</Label>
                  <Select
                    value={formData.payPeriodType}
                    onValueChange={(value) => handleInputChange("payPeriodType", value)}
                  >
                    <SelectTrigger id="payPeriodType">
                      <SelectValue placeholder="Select pay period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    How often employees are paid. Custom allows flexible date ranges.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payPeriodStartDay">Pay Period Start Day</Label>
                  <Select
                    value={formData.payPeriodStartDay}
                    onValueChange={(value) => handleInputChange("payPeriodStartDay", value)}
                    disabled={formData.payPeriodType === "custom" || formData.payPeriodType === "monthly"}
                  >
                    <SelectTrigger id="payPeriodStartDay">
                      <SelectValue placeholder="Select start day" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Monday</SelectItem>
                      <SelectItem value="2">Tuesday</SelectItem>
                      <SelectItem value="3">Wednesday</SelectItem>
                      <SelectItem value="4">Thursday</SelectItem>
                      <SelectItem value="5">Friday</SelectItem>
                      <SelectItem value="6">Saturday</SelectItem>
                      <SelectItem value="7">Sunday</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    The day of the week each pay period begins. Not applicable for custom or monthly periods.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Button type="submit" disabled={submitting} className="w-full" size="lg">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </form>

          {/* Shift Templates (separate from settings form) */}
          <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <CardTitle>Shift Templates</CardTitle>
              </div>
              <Button size="sm" onClick={openAddTemplate}>
                <Plus className="h-4 w-4 mr-1" />
                Add Template
              </Button>
            </CardHeader>
            <CardContent>
              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No shift templates yet. Add one to get started.
                </p>
              ) : (
                <div className="space-y-2">
                  {templates.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-3 w-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: t.color }}
                        />
                        <div>
                          <span className="font-medium">{t.name}</span>
                          <span className="ml-2 font-mono text-sm text-muted-foreground tabular-nums">
                            {t.startTime} - {t.endTime}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={t.isActive ? "default" : "secondary"}>
                          {t.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Button variant="ghost" size="icon" onClick={() => openEditTemplate(t)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleTemplateDelete(t.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* BUSINESS RULES TAB */}
        {/* ════════════════════════════════════════════════════════════ */}
        <TabsContent value="business-rules">
          <div className="space-y-6">
            {/* Transaction Rules */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  <div>
                    <CardTitle>Transaction Rules</CardTitle>
                    <CardDescription>Configure void policies, credit limits, and pricing markup</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="voidWindowDays">Void Window (days)</Label>
                    <Input
                      id="voidWindowDays"
                      type="number"
                      min={1}
                      max={365}
                      value={rulesData.voidWindowDays}
                      onChange={(e) => handleRulesChange("voidWindowDays", parseInt(e.target.value) || 7)}
                      className="w-24"
                    />
                    <p className="text-sm text-muted-foreground">
                      Transactions older than this cannot be voided
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="creditWarningThreshold">Credit Warning (%)</Label>
                    <Input
                      id="creditWarningThreshold"
                      type="number"
                      min={1}
                      max={99}
                      value={Math.round(rulesData.creditWarningThreshold * 100)}
                      onChange={(e) => handleRulesChange("creditWarningThreshold", (parseInt(e.target.value) || 80) / 100)}
                      className="w-24"
                    />
                    <p className="text-sm text-muted-foreground">
                      Warn when tab balance reaches this % of credit limit
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="suggestedPriceMarkup">Suggested Price Markup</Label>
                  <Input
                    id="suggestedPriceMarkup"
                    type="number"
                    min={1}
                    max={10}
                    step={0.1}
                    value={rulesData.suggestedPriceMarkup}
                    onChange={(e) => handleRulesChange("suggestedPriceMarkup", parseFloat(e.target.value) || 1.5)}
                    className="w-24"
                  />
                  <p className="text-sm text-muted-foreground">
                    Multiplier for auto-suggested product prices (e.g., 1.5 = 50% markup over cost)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Void Reasons</Label>
                  <TagListEditor
                    value={rulesData.voidReasons}
                    onChange={(v) => handleRulesChange("voidReasons", v)}
                    placeholder="Add void reason..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Inventory Thresholds */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  <div>
                    <CardTitle>Inventory Thresholds</CardTitle>
                    <CardDescription>Configure low stock alerts and product availability levels</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold mb-3">Ingredient Stock Ratios (% of par level)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="lowStockCriticalRatio">Critical Ratio (%)</Label>
                      <Input
                        id="lowStockCriticalRatio"
                        type="number"
                        min={1}
                        max={99}
                        value={Math.round(rulesData.lowStockCriticalRatio * 100)}
                        onChange={(e) => handleRulesChange("lowStockCriticalRatio", (parseInt(e.target.value) || 25) / 100)}
                        className="w-24"
                      />
                      <p className="text-sm text-muted-foreground">
                        Below this = critical alert (red)
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lowStockWarningRatio">Warning Ratio (%)</Label>
                      <Input
                        id="lowStockWarningRatio"
                        type="number"
                        min={1}
                        max={99}
                        value={Math.round(rulesData.lowStockWarningRatio * 100)}
                        onChange={(e) => handleRulesChange("lowStockWarningRatio", (parseInt(e.target.value) || 50) / 100)}
                        className="w-24"
                      />
                      <p className="text-sm text-muted-foreground">
                        Below this = warning alert (amber)
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-3">Product Availability Counts</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stockCriticalMax">Critical Max</Label>
                      <Input
                        id="stockCriticalMax"
                        type="number"
                        min={1}
                        max={1000}
                        value={rulesData.stockCriticalMax}
                        onChange={(e) => handleRulesChange("stockCriticalMax", parseInt(e.target.value) || 5)}
                        className="w-24"
                      />
                      <p className="text-sm text-muted-foreground">
                        Products with max producible units at or below this are &quot;critical&quot;
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stockLowMax">Low Max</Label>
                      <Input
                        id="stockLowMax"
                        type="number"
                        min={1}
                        max={10000}
                        value={rulesData.stockLowMax}
                        onChange={(e) => handleRulesChange("stockLowMax", parseInt(e.target.value) || 20)}
                        className="w-24"
                      />
                      <p className="text-sm text-muted-foreground">
                        Products with max producible units at or below this are &quot;low&quot;
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Operations */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <div>
                    <CardTitle>Operations</CardTitle>
                    <CardDescription>Daypart scheduling, kitchen alerts, and waste tracking</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold mb-3">Daypart Boundaries (hour 0-23)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="daypartMorningStart">Morning</Label>
                      <Input
                        id="daypartMorningStart"
                        type="number"
                        min={0}
                        max={23}
                        value={rulesData.daypartMorningStart}
                        onChange={(e) => handleRulesChange("daypartMorningStart", parseInt(e.target.value) || 0)}
                        className="w-20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="daypartMiddayStart">Midday</Label>
                      <Input
                        id="daypartMiddayStart"
                        type="number"
                        min={0}
                        max={23}
                        value={rulesData.daypartMiddayStart}
                        onChange={(e) => handleRulesChange("daypartMiddayStart", parseInt(e.target.value) || 0)}
                        className="w-20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="daypartAfternoonStart">Afternoon</Label>
                      <Input
                        id="daypartAfternoonStart"
                        type="number"
                        min={0}
                        max={23}
                        value={rulesData.daypartAfternoonStart}
                        onChange={(e) => handleRulesChange("daypartAfternoonStart", parseInt(e.target.value) || 0)}
                        className="w-20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="daypartEveningStart">Evening</Label>
                      <Input
                        id="daypartEveningStart"
                        type="number"
                        min={0}
                        max={23}
                        value={rulesData.daypartEveningStart}
                        onChange={(e) => handleRulesChange("daypartEveningStart", parseInt(e.target.value) || 0)}
                        className="w-20"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-3">Kitchen Alert Thresholds (minutes)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="kitchenWarningMinutes">Warning</Label>
                      <Input
                        id="kitchenWarningMinutes"
                        type="number"
                        min={1}
                        max={60}
                        value={rulesData.kitchenWarningMinutes}
                        onChange={(e) => handleRulesChange("kitchenWarningMinutes", parseInt(e.target.value) || 5)}
                        className="w-24"
                      />
                      <p className="text-sm text-muted-foreground">
                        Amber alert after this many minutes
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="kitchenDangerMinutes">Danger</Label>
                      <Input
                        id="kitchenDangerMinutes"
                        type="number"
                        min={1}
                        max={120}
                        value={rulesData.kitchenDangerMinutes}
                        onChange={(e) => handleRulesChange("kitchenDangerMinutes", parseInt(e.target.value) || 10)}
                        className="w-24"
                      />
                      <p className="text-sm text-muted-foreground">
                        Red alert with pulse after this many minutes
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Waste Reasons</Label>
                  <TagListEditor
                    value={rulesData.wasteReasons}
                    onChange={(v) => handleRulesChange("wasteReasons", v)}
                    placeholder="Add waste reason..."
                  />
                </div>
              </CardContent>
            </Card>

            <Button
              type="button"
              onClick={handleSaveBusinessRules}
              disabled={submittingRules}
              className="w-full"
              size="lg"
            >
              {submittingRules ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Business Rules
                </>
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Shift Template Dialog */}
      <Dialog open={templateFormOpen} onOpenChange={setTemplateFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTemplate ? "Edit Template" : "Add Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="templateName">Name</Label>
              <Input
                id="templateName"
                value={templateForm.name}
                onChange={(e) => setTemplateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Morning Shift"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="templateStart">Start Time</Label>
                <Input
                  id="templateStart"
                  type="time"
                  value={templateForm.startTime}
                  onChange={(e) => setTemplateForm((f) => ({ ...f, startTime: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="templateEnd">End Time</Label>
                <Input
                  id="templateEnd"
                  type="time"
                  value={templateForm.endTime}
                  onChange={(e) => setTemplateForm((f) => ({ ...f, endTime: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="templateColor">Color</Label>
              <Input
                id="templateColor"
                type="color"
                value={templateForm.color}
                onChange={(e) => setTemplateForm((f) => ({ ...f, color: e.target.value }))}
                className="h-10 w-20 p-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={templateForm.isActive}
                onCheckedChange={(checked) => setTemplateForm((f) => ({ ...f, isActive: checked }))}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleTemplateSave}>
              {editTemplate ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
