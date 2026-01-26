"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  ShoppingCart,
  Package,
  FolderTree,
  Users,
  Receipt,
  Settings,
  UserCircle,
  BarChart3,
  Carrot,
  Trash2,
  ClipboardList,
  Calendar,
  History,
  Menu,
  X,
} from "lucide-react"

const navItems = [
  { href: "/pos", label: "POS", icon: ShoppingCart, permission: null },
  { href: "/transactions", label: "Transactions", icon: Receipt, permission: "permTransactions" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, permission: null },
  { href: "/calendar", label: "Calendar", icon: Calendar, permission: null },
  { href: "/products", label: "Products", icon: Package, permission: "permProducts" },
  { href: "/categories", label: "Categories", icon: FolderTree, permission: "permCategories" },
  { href: "/ingredients", label: "Ingredients", icon: Carrot, permission: "permProducts" },
  { href: "/ingredients/count", label: "Inventory Count", icon: ClipboardList, permission: "permProducts" },
  { href: "/audit-log", label: "Audit Log", icon: History, permission: "permProducts" },
  { href: "/waste", label: "Waste Log", icon: Trash2, permission: null },
  { href: "/employee", label: "My Tasks", icon: ClipboardList, permission: null },
  { href: "/customers", label: "Customers", icon: UserCircle, permission: null },
  { href: "/users", label: "Users", icon: Users, permission: "permUsers" },
  { href: "/settings", label: "Settings", icon: Settings, permission: "permSettings" },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)

  const toggleSidebar = () => setIsOpen(!isOpen)
  const closeSidebar = () => setIsOpen(false)

  return (
    <>
      {/* Mobile toggle button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-2 left-2 z-50 md:hidden"
        onClick={toggleSidebar}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:static z-40 w-56 border-r bg-gray-50 min-h-[calc(100vh-3.5rem)] transition-transform duration-200 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <nav className="p-2 space-y-1 pt-12 md:pt-2">
          {navItems.map((item) => {
            // Check permission
            if (item.permission && session?.user) {
              const hasPermission = session.user[item.permission as keyof typeof session.user]
              if (!hasPermission) return null
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeSidebar}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-gray-200 text-gray-900"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
