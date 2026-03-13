"use client"

import { useState, useEffect } from "react"
import { signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Settings, LogOut, User } from "lucide-react"
import Link from "next/link"
import { OfflineIndicator } from "@/components/pos/offline-indicator"

export function Header() {
  const { data: session } = useSession()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <header className="sticky top-0 z-40 h-16 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/80 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 !h-4" />
      </div>

      <nav aria-label="User menu" className="flex items-center gap-4">
        <span className="text-sm font-medium text-muted-foreground">
          {mounted ? session?.user?.name : null}
        </span>

        <OfflineIndicator compact />

        {mounted ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="User options">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 [box-shadow:var(--shadow-float)]">
              {session?.user?.permSettings && (
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="ghost" size="icon" aria-label="User options">
            <User className="h-5 w-5" />
          </Button>
        )}
      </nav>
    </header>
  )
}
