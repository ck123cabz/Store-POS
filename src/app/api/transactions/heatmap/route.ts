import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { subDays, startOfDay, endOfDay } from "date-fns"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const daysBack = parseInt(searchParams.get("days") || "30")

    const endDate = endOfDay(new Date())
    const startDate = startOfDay(subDays(new Date(), daysBack))

    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: 1,
      },
      select: {
        createdAt: true,
        total: true,
      },
    })

    // Build heatmap: day of week (0-6) x hour (0-23)
    const heatmap: Array<Array<{ transactions: number; revenue: number }>> = []
    for (let day = 0; day < 7; day++) {
      heatmap[day] = []
      for (let hour = 0; hour < 24; hour++) {
        heatmap[day][hour] = { transactions: 0, revenue: 0 }
      }
    }

    transactions.forEach((t) => {
      const date = new Date(t.createdAt)
      const day = date.getDay()
      const hour = date.getHours()
      heatmap[day][hour].transactions += 1
      heatmap[day][hour].revenue += Number(t.total)
    })

    // Flatten for easier consumption
    const data: Array<{
      day: number
      dayName: string
      hour: number
      transactions: number
      revenue: number
    }> = []

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        data.push({
          day,
          dayName: dayNames[day],
          hour,
          transactions: heatmap[day][hour].transactions,
          revenue: Math.round(heatmap[day][hour].revenue * 100) / 100,
        })
      }
    }

    // Find peak times
    const sortedByTransactions = [...data].sort((a, b) => b.transactions - a.transactions)
    const peakTimes = sortedByTransactions.slice(0, 5)

    // Find slowest times (with at least some activity)
    const activeTimes = data.filter((d) => d.transactions > 0)
    const slowestTimes = activeTimes
      .sort((a, b) => a.transactions - b.transactions)
      .slice(0, 5)

    return NextResponse.json({
      period: {
        days: daysBack,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      data,
      peakTimes,
      slowestTimes,
      maxTransactions: Math.max(...data.map((d) => d.transactions)),
      maxRevenue: Math.max(...data.map((d) => d.revenue)),
    })
  } catch (error) {
    console.error("Failed to fetch heatmap data:", error)
    return NextResponse.json({ error: "Failed to fetch heatmap data" }, { status: 500 })
  }
}
