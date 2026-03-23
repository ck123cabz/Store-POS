import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = parseInt(session.user.id)

    const employee = await prisma.employee.findFirst({
      where: { userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        position: true,
        hourlyRate: true,
        employmentStatus: true,
      },
    })

    if (!employee) {
      return NextResponse.json({
        employee: null,
        activeShift: null,
        isStaleShift: false,
      })
    }

    const activeShift = await prisma.shiftLog.findFirst({
      where: { employeeId: employee.id, clockOut: null },
      include: {
        shiftTemplate: { select: { name: true, color: true } },
      },
    })

    let isStaleShift = false
    if (activeShift) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const clockInDate = new Date(activeShift.clockIn)
      clockInDate.setHours(0, 0, 0, 0)
      isStaleShift = clockInDate < today
    }

    return NextResponse.json({
      employee,
      activeShift,
      isStaleShift,
    })
  } catch (error) {
    console.error("Failed to fetch my-shift data:", error)
    return NextResponse.json({ error: "Failed to fetch shift data" }, { status: 500 })
  }
}
