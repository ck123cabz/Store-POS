import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay } from "date-fns"

export async function GET() {
  try {
    const today = new Date()
    const dayStart = startOfDay(today)
    const dayEnd = endOfDay(today)

    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: dayStart,
          lte: dayEnd,
        },
        status: 1,
      },
      select: {
        id: true,
        total: true,
        createdAt: true,
        daypart: true,
        itemCount: true,
        paymentType: true,
      },
    })

    const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.total), 0)
    const avgTicket = transactions.length > 0 ? totalRevenue / transactions.length : 0

    // Breakdown by payment type
    const paymentBreakdown: Record<string, { count: number; total: number }> = {}
    transactions.forEach((t) => {
      const type = t.paymentType || "Other"
      if (!paymentBreakdown[type]) {
        paymentBreakdown[type] = { count: 0, total: 0 }
      }
      paymentBreakdown[type].count += 1
      paymentBreakdown[type].total += Number(t.total)
    })

    // Breakdown by daypart
    const daypartBreakdown: Record<string, { count: number; total: number }> = {
      Morning: { count: 0, total: 0 },
      Midday: { count: 0, total: 0 },
      Afternoon: { count: 0, total: 0 },
      Evening: { count: 0, total: 0 },
    }
    transactions.forEach((t) => {
      const dp = t.daypart || "Evening"
      if (daypartBreakdown[dp]) {
        daypartBreakdown[dp].count += 1
        daypartBreakdown[dp].total += Number(t.total)
      }
    })

    // Hourly data for mini chart
    const hourlyData: Array<{ hour: number; transactions: number; revenue: number }> = []
    for (let h = 0; h < 24; h++) {
      hourlyData.push({ hour: h, transactions: 0, revenue: 0 })
    }
    transactions.forEach((t) => {
      const hour = new Date(t.createdAt).getHours()
      hourlyData[hour].transactions += 1
      hourlyData[hour].revenue += Number(t.total)
    })

    // Find peak hour
    const peakHour = hourlyData.reduce(
      (max, h) => (h.revenue > max.revenue ? h : max),
      hourlyData[0]
    )

    return NextResponse.json({
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      transactions: transactions.length,
      avgTicket: Math.round(avgTicket * 100) / 100,
      totalItems: transactions.reduce((sum, t) => sum + t.itemCount, 0),
      paymentBreakdown: Object.entries(paymentBreakdown).map(([type, data]) => ({
        type,
        count: data.count,
        total: Math.round(data.total * 100) / 100,
      })),
      daypartBreakdown: Object.entries(daypartBreakdown).map(([daypart, data]) => ({
        daypart,
        count: data.count,
        total: Math.round(data.total * 100) / 100,
      })),
      hourlyData: hourlyData.map((h) => ({
        ...h,
        revenue: Math.round(h.revenue * 100) / 100,
      })),
      peakHour: {
        hour: peakHour.hour,
        label: `${peakHour.hour}:00`,
        transactions: peakHour.transactions,
        revenue: Math.round(peakHour.revenue * 100) / 100,
      },
    })
  } catch (error) {
    console.error("Failed to fetch today's transactions:", error)
    return NextResponse.json({ error: "Failed to fetch today's data" }, { status: 500 })
  }
}
