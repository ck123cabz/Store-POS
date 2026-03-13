import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const [activeCount, clockedIn, todayShifts, pendingPayments] = await Promise.all([
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
    ])

    return NextResponse.json({ activeCount, clockedIn, todayShifts, pendingPayments })
  } catch {
    return NextResponse.json({ error: "Failed to fetch employee stats" }, { status: 500 })
  }
}
