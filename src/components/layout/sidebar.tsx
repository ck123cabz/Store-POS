"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { useSettings } from "@/hooks/use-settings"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatBadgeCount, shouldShowBadge } from "@/lib/format-utils"
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
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
  Sun,
  Moon,
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

function getBadgeVariant(badgeKey: BadgeKey | undefined): string {
  switch (badgeKey) {
    case "ingredients":
      return "bg-status-warning text-white"
    case "employee":
      return "bg-status-info text-white"
    default:
      return ""
  }
}

export function AppSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { setOpenMobile } = useSidebar()
  const { getBadgeCount } = useSidebarBadges()
  const { theme, setTheme } = useTheme()
  const { settings } = useSettings()

  function isActive(href: string) {
    if (href === pathname) return true
    if (href !== "/" && pathname.startsWith(href + "/")) return true
    return false
  }

  return (
    <SidebarRoot>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          {settings?.logo ? (
            <div className="size-9 rounded-lg overflow-hidden shrink-0 bg-muted">
              <Image
                src={`/uploads/${settings.logo}`}
                alt=""
                width={36}
                height={36}
                className="size-full object-cover"
              />
            </div>
          ) : (
            <div className="size-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <ShoppingCart className="size-5" />
            </div>
          )}
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="font-semibold text-sm tracking-tight">
              {settings?.storeName || "Store POS"}
            </span>
            <span className="text-xs text-muted-foreground">
              {settings?.appMode || "Point of Sale"}
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent aria-label="Main navigation">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => {
            if (item.permission && session?.user) {
              const hasPermission = session.user[item.permission as keyof typeof session.user]
              return hasPermission
            }
            return true
          })

          if (visibleItems.length === 0) return null

          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 font-medium">
                {group.label}
              </SidebarGroupLabel>
              <SidebarMenu>
                {visibleItems.map((item) => {
                  const badgeCount = getBadgeCount(item.badgeKey)
                  const badgeVariant = getBadgeVariant(item.badgeKey)

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.href)}
                        tooltip={item.label}
                        className="h-10 font-medium"
                      >
                        <Link
                          href={item.href}
                          onClick={() => setOpenMobile(false)}
                        >
                          <item.icon className="size-5" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                      {shouldShowBadge(badgeCount) && (
                        <SidebarMenuBadge>
                          <Badge
                            className={cn(
                              "h-5 min-w-[1.25rem] px-1.5 text-xs font-semibold",
                              badgeVariant
                            )}
                            aria-label={`${badgeCount} items need attention`}
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
      <SidebarFooter className="p-3 space-y-2">
        {session?.user && (
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Avatar size="sm">
              <AvatarFallback>
                {(session.user.name || session.user.username || "U")
                  .split(" ")
                  .map((w: string) => w[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-medium truncate">{session.user.name || session.user.username}</span>
              <span className="text-xs text-muted-foreground truncate">
                {session.user.permUsers ? "Admin" : "Staff"}
              </span>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          <Sun className="size-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
          <span className="text-sm">Toggle theme</span>
        </Button>
      </SidebarFooter>
    </SidebarRoot>
  )
}
