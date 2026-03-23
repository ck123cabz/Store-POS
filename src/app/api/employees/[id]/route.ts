import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
import { isValidTransition } from "@/lib/employee-status"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: { select: { id: true, username: true, fullname: true } },
      },
    })

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    return NextResponse.json(employee)
  } catch {
    return NextResponse.json({ error: "Failed to fetch employee" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()

    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : ""
    if (!firstName) {
      return NextResponse.json({ error: "First name is required" }, { status: 400 })
    }

    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : ""
    if (!lastName) {
      return NextResponse.json({ error: "Last name is required" }, { status: 400 })
    }

    const position = typeof body.position === "string" ? body.position.trim() : ""
    if (!position) {
      return NextResponse.json({ error: "Position is required" }, { status: 400 })
    }

    const hourlyRate = typeof body.hourlyRate === "number" ? body.hourlyRate : null
    if (hourlyRate === null || hourlyRate < 0) {
      return NextResponse.json({ error: "Hourly rate must be a number >= 0" }, { status: 400 })
    }

    // Check userId uniqueness if provided (excluding self)
    const userId = typeof body.userId === "number" ? body.userId : null
    if (userId !== null) {
      const existing = await prisma.employee.findUnique({ where: { userId } })
      if (existing && existing.id !== parseInt(id)) {
        return NextResponse.json({ error: "This user is already linked to another employee" }, { status: 400 })
      }
    }

    // Fetch current employee to check status transitions
    const currentEmployee = await prisma.employee.findUnique({
      where: { id: parseInt(id) },
    })

    if (!currentEmployee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    const newStatus = typeof body.employmentStatus === "string" ? body.employmentStatus.trim() : "Active"
    const statusChanging = currentEmployee.employmentStatus !== newStatus

    // Validate status transition
    if (statusChanging) {
      if (!isValidTransition(currentEmployee.employmentStatus, newStatus)) {
        return NextResponse.json(
          { error: `Invalid status transition from ${currentEmployee.employmentStatus} to ${newStatus}` },
          { status: 400 }
        )
      }

      // Block status change if employee has active shift
      if (currentEmployee.employmentStatus === "Active" && newStatus !== "Active") {
        const activeShift = await prisma.shiftLog.findFirst({
          where: { employeeId: parseInt(id), clockOut: null },
        })
        if (activeShift) {
          return NextResponse.json(
            { error: "Cannot change status while employee has an active shift. Please clock out first." },
            { status: 400 }
          )
        }
      }
    }

    const employee = await prisma.employee.update({
      where: { id: parseInt(id) },
      data: {
        firstName,
        lastName,
        phone: typeof body.phone === "string" ? body.phone.trim() : "",
        email: typeof body.email === "string" ? body.email.trim() : "",
        position,
        hourlyRate,
        employmentStatus: newStatus,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : null,
        userId,
        notes: typeof body.notes === "string" ? body.notes.trim() : "",
      },
    })

    // Auto-manage linked user account on status change
    if (statusChanging && employee.userId) {
      try {
        if (newStatus !== "Active") {
          await prisma.user.update({
            where: { id: employee.userId },
            data: { status: "Disabled" },
          })
        } else {
          await prisma.user.update({
            where: { id: employee.userId },
            data: { status: "Logged Out" },
          })
        }
      } catch {
        // User may have been independently deleted — log warning but don't fail
        console.warn(`[employee-update] Could not update linked user ${employee.userId} status`)
      }
    }

    if (statusChanging) {
      await logAudit({
        entity: "employee", entityId: employee.id, action: "status_change",
        changes: { employmentStatus: { old: currentEmployee.employmentStatus, new: newStatus } },
        summary: `Changed employee '${employee.firstName} ${employee.lastName}' status from ${currentEmployee.employmentStatus} to ${newStatus}`,
        userId: null, userName: null,
      })
    } else {
      await logAudit({
        entity: "employee", entityId: employee.id, action: "update",
        summary: `Updated employee '${employee.firstName} ${employee.lastName}'`,
        userId: null, userName: null,
      })
    }

    return NextResponse.json(employee)
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }
    return NextResponse.json({ error: "Failed to update employee" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(id) },
      include: {
        payments: { where: { status: "Pending" } },
      },
    })

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    // Check for pending payments before allowing delete
    if (employee.payments.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete employee with pending payments" },
        { status: 400 }
      )
    }

    await prisma.employee.delete({ where: { id: parseInt(id) } })

    await logAudit({
      entity: "employee", entityId: parseInt(id), action: "delete",
      summary: `Deleted employee '${employee.firstName} ${employee.lastName}'`,
      userId: null, userName: null,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 })
  }
}
