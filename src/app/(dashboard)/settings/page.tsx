"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, Save, Upload } from "lucide-react"

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
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [currentLogo, setCurrentLogo] = useState<string>("")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>("")
  const [formData, setFormData] = useState<SettingsFormData>(initialFormData)

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
          })
          setCurrentLogo(data.logo || "")
        }
      } catch {
        toast.error("Failed to load settings")
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [])

  function handleInputChange(field: keyof SettingsFormData, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }))
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Store Settings</h1>

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
                    <div className="relative w-24 h-24 border rounded-lg overflow-hidden bg-gray-50">
                      <Image
                        src={logoPreview || `/uploads/${currentLogo}`}
                        alt="Store Logo"
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 border rounded-lg bg-gray-50 flex items-center justify-center">
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
    </div>
  )
}
