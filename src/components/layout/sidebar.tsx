"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
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
  Calculator,
} from "lucide-react"

const navItems = [
  { href: "/pos", label: "POS", icon: ShoppingCart, permission: null },
  { href: "/transactions", label: "Transactions", icon: Receipt, permission: "permTransactions" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, permission: null },
  { href: "/products", label: "Products", icon: Package, permission: "permProducts" },
  { href: "/pricing", label: "Pricing", icon: Calculator, permission: "permProducts" },
  { href: "/categories", label: "Categories", icon: FolderTree, permission: "permCategories" },
  { href: "/ingredients", label: "Ingredients", icon: Carrot, permission: "permProducts" },
  { href: "/waste", label: "Waste Log", icon: Trash2, permission: null },
  { href: "/customers", label: "Customers", icon: UserCircle, permission: null },
  { href: "/users", label: "Users", icon: Users, permission: "permUsers" },
  { href: "/settings", label: "Settings", icon: Settings, permission: "permSettings" },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <aside className="w-56 border-r bg-gray-50 min-h-[calc(100vh-3.5rem)]">
      <nav className="p-2 space-y-1">
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
  )
}
