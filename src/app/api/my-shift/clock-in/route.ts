import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = parseInt(session.user.id)

    const employee = await prisma.employee.findFirst({
      where: { userId },
    })

    if (!employee) {
      return NextResponse.json({ error: "No linked employee record" }, { status: 404 })
    }

    // Check for any open shift
    const openShift = await prisma.shiftLog.findFirst({
      where: { employeeId: employee.id, clockOut: null },
    })

    if (openShift) {
      // Check if it's stale (from a previous day)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const clockInDate = new Date(openShift.clockIn)
      clockInDate.setHours(0, 0, 0, 0)

      if (clockInDate < today) {
        return NextResponse.json(
          { error: "Must close stale shift before clocking in" },
          { status: 400 }
        )
      }

      return NextResponse.json({ error: "Already clocked in" }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const now = new Date()

    const shift = await prisma.shiftLog.create({
      data: {
        employeeId: employee.id,
        date: now,
        clockIn: now,
        shiftTemplateId: typeof body.shiftTemplateId === "number" ? body.shiftTemplateId : null,
        notes: typeof body.notes === "string" ? body.notes.trim() : "",
      },
    })

    return NextResponse.json(shift, { status: 201 })
  } catch (error) {
    console.error("Failed to clock in:", error)
    return NextResponse.json({ error: "Failed to clock in" }, { status: 500 })
  }
}
