import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(request: NextRequest) {
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

    const openShift = await prisma.shiftLog.findFirst({
      where: { employeeId: employee.id, clockOut: null },
    })

    if (!openShift) {
      return NextResponse.json({ error: "No stale shift found" }, { status: 400 })
    }

    const body = await request.json()
    const clockOutTime = new Date(body.clockOutTime)

    // Validate clockOutTime is after clockIn
    if (clockOutTime <= new Date(openShift.clockIn)) {
      return NextResponse.json(
        { error: "Clock out time must be after clock in time" },
        { status: 400 }
      )
    }

    // Validate clockOutTime is not in the future
    if (clockOutTime > new Date()) {
      return NextResponse.json(
        { error: "Clock out time cannot be in the future" },
        { status: 400 }
      )
    }

    const updatedShift = await prisma.shiftLog.update({
      where: { id: openShift.id },
      data: { clockOut: clockOutTime },
    })

    const msWorked = clockOutTime.getTime() - new Date(openShift.clockIn).getTime()
    const hoursWorked = Math.round((msWorked / (1000 * 60 * 60)) * 100) / 100

    return NextResponse.json({
      id: updatedShift.id,
      clockIn: updatedShift.clockIn,
      clockOut: updatedShift.clockOut,
      hoursWorked,
    })
  } catch (error) {
    console.error("Failed to close stale shift:", error)
    return NextResponse.json({ error: "Failed to close stale shift" }, { status: 500 })
  }
}
