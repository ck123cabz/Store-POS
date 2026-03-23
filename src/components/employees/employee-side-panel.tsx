"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Phone, Mail, Calendar, DollarSign, UserCheck, StickyNote } from "lucide-react"

interface Employee {
  id: number
  firstName: string
  lastName: string
  phone: string
  email: string
  position: string
  hourlyRate: number | string
  employmentStatus: string
  startDate: string
  userId: number | null
  notes: string
  user?: { id: number; username: string; fullname: string } | null
}

interface EmployeeSidePanelProps {
  employee: Employee | null
  open: boolean
  onOpenChange: (open: boolean) => void
  formatCurrency: (value: string | number | null | undefined) => string
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase()
}

function getStatusBadge(status: string) {
  switch (status) {
    case "Active":
      return (
        <Badge className="border-transparent bg-status-ok/15 text-status-ok">
          Active
        </Badge>
      )
    case "Inactive":
      return (
        <Badge className="border-transparent bg-muted text-muted-foreground">
          Inactive
        </Badge>
      )
    case "Terminated":
      return (
        <Badge className="border-transparent bg-status-critical/15 text-status-critical">
          Terminated
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function EmployeeSidePanel({
  employee,
  open,
  onOpenChange,
  formatCurrency,
}: EmployeeSidePanelProps) {
  if (!employee) return null

  const fullName = `${employee.firstName} ${employee.lastName}`

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[360px] sm:w-[400px]">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 text-base">
              <AvatarFallback>
                {getInitials(employee.firstName, employee.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <SheetTitle className="text-left truncate">{fullName}</SheetTitle>
              <span className="text-sm text-muted-foreground">
                {employee.position || "No position"}
              </span>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* Status */}
          <div>{getStatusBadge(employee.employmentStatus)}</div>

          {/* Contact Info */}
          {(employee.phone || employee.email) && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium uppercase text-muted-foreground tracking-wider">
                Contact
              </h3>
              {employee.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{employee.phone}</span>
                </div>
              )}
              {employee.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate">{employee.email}</span>
                </div>
              )}
            </div>
          )}

          {/* Employment Details */}
          <div className="space-y-2">
            <h3 className="text-xs font-medium uppercase text-muted-foreground tracking-wider">
              Employment
            </h3>
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-mono tabular-nums">
                {formatCurrency(employee.hourlyRate)}/hr
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Since {formatDate(employee.startDate)}</span>
            </div>
          </div>

          {/* Linked User Account */}
          <div className="space-y-2">
            <h3 className="text-xs font-medium uppercase text-muted-foreground tracking-wider">
              Login Account
            </h3>
            {employee.user ? (
              <div className="flex items-center gap-2 text-sm">
                <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                <span>
                  {employee.user.fullname}{" "}
                  <span className="text-muted-foreground">
                    ({employee.user.username})
                  </span>
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No login account</p>
            )}
          </div>

          {/* Notes */}
          {employee.notes && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium uppercase text-muted-foreground tracking-wider">
                Notes
              </h3>
              <div className="flex items-start gap-2 text-sm">
                <StickyNote className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                <p className="text-sm whitespace-pre-wrap">{employee.notes}</p>
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-border/60">
          <Link href={`/employees/${employee.id}`}>
            <Button className="w-full">View Full Profile</Button>
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  )
}
