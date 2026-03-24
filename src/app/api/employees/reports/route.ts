import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const fromParam = request.nextUrl.searchParams.get("from")
  const toParam = request.nextUrl.searchParams.get("to")

  if (!fromParam || !toParam) {
    return NextResponse.json(
      { error: "Missing required query parameters: from, to" },
      { status: 400 }
    )
  }

  const from = new Date(fromParam)
  const to = new Date(toParam)

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 })
  }

  from.setHours(0, 0, 0, 0)
  to.setHours(23, 59, 59, 999)

  try {
    const [employees, shifts, payments, taskCompletions, streaks, shiftTemplates] =
      await Promise.all([
        prisma.employee.findMany({
          where: { employmentStatus: { not: "Terminated" } },
          select: { id: true, firstName: true, lastName: true, position: true, hourlyRate: true, userId: true },
        }),
        prisma.shiftLog.findMany({
          where: {
            date: { gte: from, lte: to },
            clockOut: { not: null },
          },
          select: {
            employeeId: true,
            clockIn: true,
            clockOut: true,
            breakMinutes: true,
            shiftTemplateId: true,
          },
        }),
        prisma.paymentRecord.findMany({
          where: {
            OR: [
              { periodStart: { gte: from, lte: to } },
              { periodEnd: { gte: from, lte: to } },
            ],
          },
          select: {
            paidAmount: true,
            calculatedAmount: true,
            status: true,
          },
        }),
        prisma.taskCompletion.findMany({
          where: {
            date: { gte: from, lte: to },
          },
          select: {
            completedById: true,
            status: true,
          },
        }),
        prisma.userStreak.findMany({
          orderBy: { currentStreak: "desc" },
          include: { user: { select: { fullname: true } } },
        }),
        prisma.shiftTemplate.findMany({
          where: { isActive: true },
          select: { id: true, name: true, startTime: true },
        }),
      ])

    // --- Hours by Employee ---
    const hoursMap = new Map<number, number>()
    for (const shift of shifts) {
      if (!shift.clockOut) continue
      const ms = shift.clockOut.getTime() - shift.clockIn.getTime()
      const hours = Math.max(0, ms / (1000 * 60 * 60) - (shift.breakMinutes || 0) / 60)
      hoursMap.set(shift.employeeId, (hoursMap.get(shift.employeeId) || 0) + hours)
    }

    const hoursByEmployee = employees
      .map((e) => ({
        employeeId: e.id,
        name: `${e.firstName} ${e.lastName}`,
        position: e.position || "",
        hours: Math.round((hoursMap.get(e.id) || 0) * 10) / 10,
      }))
      .filter((e) => e.hours > 0)
      .sort((a, b) => b.hours - a.hours)

    // --- Team Avg Hours ---
    const teamAvgHours =
      hoursByEmployee.length > 0
        ? Math.round(
            (hoursByEmployee.reduce((sum, e) => sum + e.hours, 0) / hoursByEmployee.length) * 10
          ) / 10
        : 0

    // --- Labor Cost by Position ---
    const costByPosition = new Map<string, number>()
    for (const emp of employees) {
      const hours = hoursMap.get(emp.id) || 0
      if (hours === 0) continue
      const cost = hours * Number(emp.hourlyRate || 0)
      const pos = emp.position || "Unassigned"
      costByPosition.set(pos, (costByPosition.get(pos) || 0) + cost)
    }
    const totalCost = Array.from(costByPosition.values()).reduce((a, b) => a + b, 0)
    const laborCostByPosition = Array.from(costByPosition.entries())
      .map(([position, totalCostVal]) => ({
        position,
        totalCost: Math.round(totalCostVal * 100) / 100,
        percentage: totalCost > 0 ? Math.round((totalCostVal / totalCost) * 100) : 0,
      }))
      .sort((a, b) => b.totalCost - a.totalCost)

    // --- Task Completion Rates ---
    const taskCountMap = new Map<number, { completed: number; total: number }>()
    for (const tc of taskCompletions) {
      if (!tc.completedById) continue
      const entry = taskCountMap.get(tc.completedById) || { completed: 0, total: 0 }
      entry.total++
      if (tc.status === "completed") entry.completed++
      taskCountMap.set(tc.completedById, entry)
    }

    // Map user IDs to employee names
    const userIdToEmployee = new Map<number, { name: string }>()
    for (const emp of employees) {
      if (emp.userId) {
        userIdToEmployee.set(emp.userId, { name: `${emp.firstName} ${emp.lastName}` })
      }
    }

    const taskCompletionRates = Array.from(taskCountMap.entries())
      .map(([userId, counts]) => {
        const emp = userIdToEmployee.get(userId)
        return {
          employeeId: userId,
          name: emp?.name || `User #${userId}`,
          completed: counts.completed,
          total: counts.total,
          rate: counts.total > 0 ? Math.round((counts.completed / counts.total) * 1000) / 10 : 0,
        }
      })
      .sort((a, b) => b.rate - a.rate)

    // --- Streak Leaderboard ---
    const streakLeaderboard = streaks
      .filter((s) => s.currentStreak > 0)
      .map((s) => ({
        userId: s.userId,
        name: s.user?.fullname || s.userName,
        currentStreak: s.currentStreak,
        longestStreak: s.longestStreak,
      }))

    // --- Payment Summary ---
    let totalPaid = 0
    let totalPending = 0
    for (const p of payments) {
      if (p.status === "Paid" || p.status === "Partial") {
        totalPaid += Number(p.paidAmount || 0)
      }
      if (p.status === "Pending") {
        totalPending += Number(p.calculatedAmount || 0)
      }
    }
    const paymentSummary = {
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalPending: Math.round(totalPending * 100) / 100,
      totalAmount: Math.round((totalPaid + totalPending) * 100) / 100,
    }

    // --- Attendance Patterns ---
    const templateStartTimes = new Map(shiftTemplates.map((t) => [t.id, t]))
    const attendanceMap = new Map<number, { clockInMinutes: number[]; lateCount: number }>()

    for (const shift of shifts) {
      if (!shift.shiftTemplateId) continue
      const tmpl = templateStartTimes.get(shift.shiftTemplateId)
      if (!tmpl) continue

      const entry = attendanceMap.get(shift.shiftTemplateId) || { clockInMinutes: [], lateCount: 0 }

      const clockInMinutes = shift.clockIn.getHours() * 60 + shift.clockIn.getMinutes()
      entry.clockInMinutes.push(clockInMinutes)

      // Late = clock-in > template start + 15 minutes
      const [sh, sm] = tmpl.startTime.split(":").map(Number)
      const templateMinutes = sh * 60 + sm + 15
      if (clockInMinutes > templateMinutes) {
        entry.lateCount++
      }

      attendanceMap.set(shift.shiftTemplateId, entry)
    }

    const attendancePatterns = Array.from(attendanceMap.entries())
      .map(([templateId, data]) => {
        const tmpl = templateStartTimes.get(templateId)
        const avgMinutes =
          data.clockInMinutes.length > 0
            ? Math.round(
                data.clockInMinutes.reduce((a, b) => a + b, 0) / data.clockInMinutes.length
              )
            : 0

        return {
          templateId,
          templateName: tmpl?.name || `Template #${templateId}`,
          avgClockInMinutes: avgMinutes,
          lateCount: data.lateCount,
        }
      })

    return NextResponse.json({
      hoursByEmployee,
      laborCostByPosition,
      taskCompletionRates,
      streakLeaderboard,
      paymentSummary,
      attendancePatterns,
      teamAvgHours,
    })
  } catch (error) {
    console.error("Failed to generate reports:", error)
    return NextResponse.json(
      { error: "Failed to generate reports" },
      { status: 500 }
    )
  }
}
