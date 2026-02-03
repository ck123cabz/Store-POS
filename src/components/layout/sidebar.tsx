"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatBadgeCount, shouldShowBadge } from "@/lib/format-utils"
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
  Menu,
  X,
  CheckSquare,
  LayoutGrid,
  ChefHat,
} from "lucide-react"

// T044: Badge configuration per nav item
type BadgeKey = "ingredients" | "employee"

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

interface SidebarBadges {
  lowStockIngredients: number
  needsPricingProducts: number
  taskProgress: {
    completed: number
    total: number
  }
}

// T049: Max consecutive failures before stopping polling (NFR-E02)
const MAX_CONSECUTIVE_FAILURES = 3

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [badges, setBadges] = useState<SidebarBadges | null>(null)

  // T048: AbortController ref for canceling in-flight requests (NFR-P06, EC-11)
  const abortControllerRef = useRef<AbortController | null>(null)
  // T049: Track consecutive failures (NFR-E02)
  const consecutiveFailuresRef = useRef(0)
  // T047: Track if polling is paused due to visibility (NFR-P02, NFR-P03)
  const isPollingPausedRef = useRef(false)

  // T045, T046: Fetch badge counts with abort support
  const fetchBadges = useCallback(async () => {
    // T049: Stop polling after max consecutive failures
    if (consecutiveFailuresRef.current >= MAX_CONSECUTIVE_FAILURES) {
      return
    }

    // T048: Cancel any existing in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    try {
      const res = await fetch("/api/sidebar-badges", {
        signal: abortControllerRef.current.signal,
      })
      if (res.ok) {
        setBadges(await res.json())
        // Reset failure count on success
        consecutiveFailuresRef.current = 0
      } else {
        // T051: Keep last known count on failure (EC-10)
        consecutiveFailuresRef.current++
      }
    } catch (error) {
      // Ignore abort errors (expected when canceling)
      if (error instanceof Error && error.name === "AbortError") {
        return
      }
      // T050, T051: Log error but keep last known badges (EC-09, EC-10)
      console.error("Failed to fetch sidebar badges:", error)
      consecutiveFailuresRef.current++
    }
  }, [])

  useEffect(() => {
    // Initial fetch (T045: non-blocking, NFR-P05)
    fetchBadges()

    // T046: Poll every 30 seconds for updates (FR-017)
    const interval = setInterval(() => {
      // T047: Skip fetch if polling is paused (NFR-P02)
      if (!isPollingPausedRef.current) {
        fetchBadges()
      }
    }, 30000)

    // T047: Visibility-based polling pause/resume (NFR-P02, NFR-P03)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isPollingPausedRef.current = true
      } else {
        isPollingPausedRef.current = false
        // Resume with an immediate fetch when becoming visible
        fetchBadges()
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      // T048: Cancel any in-flight request on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchBadges])

  // T049: Get badge count for a nav item
  const getBadgeCount = (badgeKey: BadgeKey | undefined): number => {
    if (!badges || !badgeKey) return 0

    switch (badgeKey) {
      case "ingredients":
        return badges.lowStockIngredients
      case "employee":
        // For employee tasks, show remaining tasks
        return badges.taskProgress.total - badges.taskProgress.completed
      default:
        return 0
    }
  }

  // T053: Get badge color class based on badge type (Visual Design Specifications)
  // Warning (orange) for actionable items, destructive stays for critical
  const getBadgeColorClass = (badgeKey: BadgeKey | undefined): string => {
    switch (badgeKey) {
      case "ingredients":
        // Low stock = warning (orange)
        return "bg-orange-500 hover:bg-orange-500/80 text-white"
      case "employee":
        // Remaining tasks = informational (blue)
        return "bg-blue-500 hover:bg-blue-500/80 text-white"
      default:
        return ""
    }
  }

  const toggleSidebar = () => setIsOpen(!isOpen)
  const closeSidebar = () => setIsOpen(false)

  // Helper to check if nav item is active (handles nested routes)
  function isActive(href: string) {
    if (href === pathname) return true
    if (href !== "/" && pathname.startsWith(href + "/")) return true
    return false
  }

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
          "fixed md:static z-40 w-56 border-r bg-muted min-h-[calc(100vh-3.5rem)] transition-transform duration-200 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <nav className="p-2 pt-12 md:pt-2">
          {navGroups.map((group, groupIndex) => {
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
              <div key={group.label} className={cn(groupIndex > 0 && "mt-4")}>
                {/* Group label */}
                <div className="px-3 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </span>
                </div>

                {/* Group items */}
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const badgeCount = getBadgeCount(item.badgeKey)
                    const badgeColorClass = getBadgeColorClass(item.badgeKey)

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeSidebar}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                          isActive(item.href)
                            ? "bg-accent text-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        <span className="flex-1">{item.label}</span>
                        {/* T050, EC-07, EC-08: Show badge if count > 0, format 99+ */}
                        {/* T052: aria-label and aria-live for screen readers (NFR-A05, NFR-A06) */}
                        {/* T053: Color-coded badges per Visual Design Specifications */}
                        {shouldShowBadge(badgeCount) && (
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
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
