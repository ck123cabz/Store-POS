import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
    fourteenDaysAgo.setHours(0, 0, 0, 0)

    const [activeCount, clockedIn, todayShifts, pendingPayments, completedShifts, payrollDueResult] = await Promise.all([
      prisma.employee.count({ where: { employmentStatus: "Active" } }),
      prisma.shiftLog.findMany({
        where: { clockOut: null },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, position: true } },
          shiftTemplate: { select: { name: true, color: true } },
        },
      }),
      prisma.shiftLog.findMany({
        where: {
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
        include: {
          employee: { select: { firstName: true, lastName: true } },
          shiftTemplate: { select: { name: true, color: true } },
        },
      }),
      prisma.paymentRecord.count({ where: { status: "Pending" } }),
      // Sum completed shift hours for active employees in last 14 days
      prisma.shiftLog.findMany({
        where: {
          clockOut: { not: null },
          date: { gte: fourteenDaysAgo },
          employee: { employmentStatus: "Active" },
        },
        select: { clockIn: true, clockOut: true, breakMinutes: true },
      }),
      // Sum calculatedAmount from Pending/Partial payment records
      prisma.paymentRecord.aggregate({
        where: { status: { in: ["Pending", "Partial"] } },
        _sum: { calculatedAmount: true },
      }),
    ])

    // Calculate total hours from completed shifts
    let totalMinutes = 0
    for (const shift of completedShifts) {
      if (shift.clockOut && shift.clockIn) {
        const diffMs = shift.clockOut.getTime() - shift.clockIn.getTime()
        totalMinutes += diffMs / (1000 * 60) - (shift.breakMinutes || 0)
      }
    }
    const hoursThisPeriod = Math.round(Math.max(0, totalMinutes / 60) * 10) / 10
    const payrollDue = Math.round(Number(payrollDueResult._sum.calculatedAmount || 0) * 100) / 100

    return NextResponse.json({ activeCount, clockedIn, todayShifts, pendingPayments, hoursThisPeriod, payrollDue })
  } catch {
    return NextResponse.json({ error: "Failed to fetch employee stats" }, { status: 500 })
  }
}
