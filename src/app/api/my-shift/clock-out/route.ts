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

    const openShift = await prisma.shiftLog.findFirst({
      where: { employeeId: employee.id, clockOut: null },
    })

    if (!openShift) {
      return NextResponse.json({ error: "Not clocked in" }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const now = new Date()
    const breakMinutes = typeof body.breakMinutes === "number" ? body.breakMinutes : 0

    const updatedShift = await prisma.shiftLog.update({
      where: { id: openShift.id },
      data: {
        clockOut: now,
        breakMinutes,
        notes: typeof body.notes === "string" ? body.notes.trim() : openShift.notes,
      },
    })

    // Calculate hours worked
    const msWorked = now.getTime() - new Date(openShift.clockIn).getTime()
    const hoursWorked = Math.round((msWorked / (1000 * 60 * 60) - breakMinutes / 60) * 100) / 100

    // Fetch summary data
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const dayOfWeek = today.getDay()

    const [tasksCompletedToday, tasksTotal, streak] = await Promise.all([
      prisma.taskCompletion.count({
        where: {
          date: today,
          completedById: userId,
          status: "completed",
        },
      }),
      prisma.employeeTask.count({
        where: {
          isActive: true,
          status: "approved",
          daysOfWeek: { has: dayOfWeek },
        },
      }),
      prisma.userStreak.findUnique({
        where: { userId },
      }),
    ])

    return NextResponse.json({
      shift: {
        id: updatedShift.id,
        clockIn: updatedShift.clockIn,
        clockOut: updatedShift.clockOut,
        breakMinutes: updatedShift.breakMinutes,
        hoursWorked,
      },
      summary: {
        tasksCompletedToday,
        tasksTotal,
        currentStreak: streak?.currentStreak ?? 0,
      },
    })
  } catch (error) {
    console.error("Failed to clock out:", error)
    return NextResponse.json({ error: "Failed to clock out" }, { status: 500 })
  }
}
