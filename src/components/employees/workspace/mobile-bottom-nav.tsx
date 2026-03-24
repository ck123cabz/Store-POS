"use client"

import { useRouter, useSearchParams } from "next/navigation"
import {
  Sun,
  Users,
  Calendar,
  CheckSquare,
  Wallet,
  BarChart3,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { WorkspaceTab } from "./workspace-tabs"

const NAV_ITEMS: { key: WorkspaceTab; label: string; icon: React.ElementType }[] = [
  { key: "today", label: "Today", icon: Sun },
  { key: "team", label: "Team", icon: Users },
  { key: "schedule", label: "Schedule", icon: Calendar },
  { key: "tasks", label: "Tasks", icon: CheckSquare },
  { key: "payroll", label: "Payroll", icon: Wallet },
  { key: "reports", label: "Reports", icon: BarChart3 },
]

interface MobileBottomNavProps {
  activeTab: WorkspaceTab
}

function MobileBottomNav({ activeTab }: MobileBottomNavProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function switchTab(tab: WorkspaceTab) {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === "today") {
      params.delete("tab")
    } else {
      params.set("tab", tab)
    }
    if (tab !== "team") {
      params.delete("id")
    }
    const qs = params.toString()
    router.replace(`/employees${qs ? `?${qs}` : ""}`)
  }

  return (
    <nav
      data-slot="mobile-bottom-nav"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background safe-area-pb md:hidden"
    >
      <div className="flex items-center justify-around h-14">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => switchTab(key)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs transition-colors",
              activeTab === key
                ? "text-foreground font-medium"
                : "text-muted-foreground"
            )}
          >
            <Icon className="size-5" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

export { MobileBottomNav }
