"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function MenuPage() {
  const [activeTab, setActiveTab] = useState("products")

  return (
    <div className="p-4 md:p-6 space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TabsList>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {activeTab === "products" ? "Add Product" : "Add Category"}
          </Button>
        </div>

        <TabsContent value="products" className="mt-4">
          <div className="text-muted-foreground">Products tab content (coming soon)</div>
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <div className="text-muted-foreground">Categories tab content (coming soon)</div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
