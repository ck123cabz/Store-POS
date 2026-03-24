"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"

const TABS = [
  { key: "today", label: "Today" },
  { key: "team", label: "Team" },
  { key: "schedule", label: "Schedule" },
  { key: "tasks", label: "Tasks" },
  { key: "payroll", label: "Payroll" },
  { key: "reports", label: "Reports" },
] as const

export type WorkspaceTab = (typeof TABS)[number]["key"]

interface WorkspaceTabsProps {
  activeTab: WorkspaceTab
}

function WorkspaceTabs({ activeTab }: WorkspaceTabsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()

  function switchTab(tab: WorkspaceTab) {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === "today") {
      params.delete("tab")
    } else {
      params.set("tab", tab)
    }
    // Clear employee selection when switching tabs (except team)
    if (tab !== "team") {
      params.delete("id")
    }
    const qs = params.toString()
    router.replace(`/employees${qs ? `?${qs}` : ""}`)
  }

  // On mobile, tabs are hidden (bottom nav handles navigation)
  if (isMobile) return null

  return (
    <div
      data-slot="workspace-tabs"
      className="inline-flex h-9 w-fit items-center justify-center gap-1 rounded-lg bg-muted/60 p-[3px]"
    >
      {TABS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => switchTab(key)}
          className={cn(
            "inline-flex h-[calc(100%-1px)] items-center justify-center rounded-md border border-transparent px-3 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow]",
            activeTab === key
              ? "bg-background font-semibold border-border text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export { WorkspaceTabs, TABS }
