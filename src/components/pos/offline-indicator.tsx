"use client"

import { useState, useEffect } from "react"
import { WifiOff, Wifi, CloudOff, CloudUpload, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { useNetworkStatus } from "@/hooks/use-network-status"
import { useOfflineQueue } from "@/hooks/use-offline-queue"
import { cn } from "@/lib/utils"

interface OfflineIndicatorProps {
  /** Show even when online with no pending (default: false) */
  alwaysShow?: boolean
  /** Compact mode - just icon and count (default: false) */
  compact?: boolean
  /** Show progress bar during sync (default: true) */
  showProgress?: boolean
  /** Additional className */
  className?: string
}

/**
 * Offline status indicator with pending transaction count
 * Shows network status, sync controls, and progress
 */
export function OfflineIndicator({
  alwaysShow = false,
  compact = false,
  showProgress = true,
  className,
}: OfflineIndicatorProps) {
  const { isOnline, isOffline } = useNetworkStatus()
  const { pendingCount, hasPending, isSyncing, syncAll, syncProgress } = useOfflineQueue()
  // Use layout effect timing for hydration to avoid flash
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch - use queueMicrotask to prevent cascading renders
  useEffect(() => {
    queueMicrotask(() => setMounted(true))
  }, [])

  // Calculate progress percentage - derived from state, no useMemo needed
  const progressTotal = syncProgress?.total ?? 0
  const progressCurrent = syncProgress?.current ?? 0
  const progressPercent = progressTotal > 0
    ? Math.round((progressCurrent / progressTotal) * 100)
    : 0

  if (!mounted) {
    return null
  }

  // Don't show if online and no pending (unless alwaysShow)
  if (!alwaysShow && isOnline && !hasPending && !isSyncing) {
    return null
  }

  const handleSync = async () => {
    if (!isSyncing && hasPending) {
      await syncAll()
    }
  }

  // Compact mode - just the icon and badge
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("relative", className)}
              onClick={handleSync}
              disabled={isSyncing || !hasPending}
            >
              {isOffline ? (
                <WifiOff className="h-5 w-5 text-destructive" />
              ) : isSyncing ? (
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              ) : hasPending ? (
                <CloudOff className="h-5 w-5 text-amber-500" />
              ) : (
                <Wifi className="h-5 w-5 text-green-500" />
              )}
              {hasPending && !isSyncing && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
                >
                  {pendingCount}
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isOffline
              ? `Offline - ${pendingCount} pending`
              : isSyncing && syncProgress
                ? `Syncing ${syncProgress.current}/${syncProgress.total}...`
                : hasPending
                  ? `${pendingCount} pending sync`
                  : "Online"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Full mode - detailed status
  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg",
          isOffline
            ? "bg-destructive/10"
            : isSyncing
              ? "bg-blue-500/10"
              : hasPending
                ? "bg-amber-500/10"
                : "bg-green-500/10"
        )}
      >
        {/* Status icon */}
        {isOffline ? (
          <WifiOff className="h-4 w-4 text-destructive" />
        ) : isSyncing ? (
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        ) : hasPending ? (
          <CloudOff className="h-4 w-4 text-amber-500" />
        ) : (
          <Wifi className="h-4 w-4 text-green-500" />
        )}

        {/* Status text */}
        <span
          className={cn(
            "text-sm font-medium",
            isOffline
              ? "text-destructive"
              : isSyncing
                ? "text-blue-600"
                : hasPending
                  ? "text-amber-600"
                  : "text-green-600"
          )}
        >
          {isOffline
            ? "Offline"
            : isSyncing && syncProgress
              ? `Syncing ${syncProgress.current}/${syncProgress.total}`
              : isSyncing
                ? "Syncing..."
                : hasPending
                  ? "Pending"
                  : "Online"}
        </span>

        {/* Pending count (only when not syncing) */}
        {hasPending && !isSyncing && (
          <Badge variant={isOffline ? "destructive" : "secondary"} className="ml-1">
            {pendingCount}
          </Badge>
        )}

        {/* Sync button (only when online and has pending and not syncing) */}
        {isOnline && hasPending && !isSyncing && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 ml-2"
            onClick={handleSync}
          >
            <CloudUpload className="h-4 w-4 mr-1" />
            Sync
          </Button>
        )}
      </div>

      {/* Progress bar during sync */}
      {showProgress && isSyncing && syncProgress && syncProgress.total > 0 && (
        <div className="px-3 pb-2">
          <Progress value={progressPercent} className="h-1.5" />
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>{syncProgress.synced} synced</span>
            {syncProgress.failed > 0 && (
              <span className="text-destructive">{syncProgress.failed} failed</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
