"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { formatBadgeCount, shouldShowBadge } from "@/lib/format-utils"
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useSidebarBadges, type BadgeKey } from "@/hooks/use-sidebar-badges"
import {
  ShoppingCart,
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
  CheckSquare,
  LayoutGrid,
  ChefHat,
} from "lucide-react"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  permission: string | null
  badgeKey?: BadgeKey
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: "Sales",
    items: [
      { href: "/pos", label: "POS", icon: ShoppingCart, permission: null },
      { href: "/orders", label: "Orders", icon: ChefHat, permission: null },
      { href: "/transactions", label: "Transactions", icon: Receipt, permission: "permTransactions" },
    ],
  },
  {
    label: "Inventory",
    items: [
      { href: "/menu", label: "Menu", icon: LayoutGrid, permission: "permProducts" },
      { href: "/ingredients", label: "Ingredients", icon: Carrot, permission: "permProducts", badgeKey: "ingredients" },
      { href: "/ingredients/count", label: "Inventory Count", icon: ClipboardList, permission: "permProducts" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { href: "/analytics", label: "Analytics", icon: BarChart3, permission: null },
      { href: "/calendar", label: "Calendar", icon: Calendar, permission: null },
      { href: "/audit-log", label: "Audit Log", icon: History, permission: "permProducts" },
      { href: "/waste", label: "Waste Log", icon: Trash2, permission: null },
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/customers", label: "Customers", icon: UserCircle, permission: null },
      { href: "/users", label: "Users", icon: Users, permission: "permUsers" },
      { href: "/employee", label: "Tasks", icon: CheckSquare, permission: null, badgeKey: "employee" },
      { href: "/settings", label: "Settings", icon: Settings, permission: "permSettings" },
    ],
  },
]

// T053: Get badge color class based on badge type (Visual Design Specifications)
function getBadgeColorClass(badgeKey: BadgeKey | undefined): string {
  switch (badgeKey) {
    case "ingredients":
      return "bg-orange-500 hover:bg-orange-500/80 text-white"
    case "employee":
      return "bg-blue-500 hover:bg-blue-500/80 text-white"
    default:
      return ""
  }
}

export function AppSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { setOpenMobile } = useSidebar()
  const { getBadgeCount } = useSidebarBadges()

  // Helper to check if nav item is active (handles nested routes)
  function isActive(href: string) {
    if (href === pathname) return true
    if (href !== "/" && pathname.startsWith(href + "/")) return true
    return false
  }

  return (
    <SidebarRoot>
      <SidebarContent>
        {navGroups.map((group) => {
          // Filter items based on permissions
          const visibleItems = group.items.filter((item) => {
            if (item.permission && session?.user) {
              const hasPermission = session.user[item.permission as keyof typeof session.user]
              return hasPermission
            }
            return true
          })

          // Don't render empty groups
          if (visibleItems.length === 0) return null

          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarMenu>
                {visibleItems.map((item) => {
                  const badgeCount = getBadgeCount(item.badgeKey)
                  const badgeColorClass = getBadgeColorClass(item.badgeKey)

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.href)}
                        tooltip={item.label}
                      >
                        <Link
                          href={item.href}
                          onClick={() => setOpenMobile(false)}
                        >
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                      {/* T050, EC-07, EC-08: Show badge if count > 0, format 99+ */}
                      {/* T052: aria-label and aria-live for screen readers (NFR-A05, NFR-A06) */}
                      {shouldShowBadge(badgeCount) && (
                        <SidebarMenuBadge>
                          <Badge
                            className={cn(
                              "h-5 min-w-[1.25rem] px-1.5 text-xs font-semibold",
                              badgeColorClass
                            )}
                            aria-label={`${badgeCount} items need attention`}
                            aria-live="polite"
                          >
                            {formatBadgeCount(badgeCount)}
                          </Badge>
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroup>
          )
        })}
      </SidebarContent>
    </SidebarRoot>
  )
}
