import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from "date-fns"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const yearParam = searchParams.get("year")
    const monthParam = searchParams.get("month")

    const year = yearParam ? parseInt(yearParam) : new Date().getFullYear()
    const month = monthParam ? parseInt(monthParam) : new Date().getMonth()

    const startDate = startOfMonth(new Date(year, month))
    const endDate = endOfMonth(new Date(year, month))

    // Get all transactions for the month
    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: 1, // Only completed transactions
      },
      select: {
        id: true,
        total: true,
        createdAt: true,
        daypart: true,
        itemCount: true,
      },
    })

    // Get daily pulse data for the month
    const dailyPulses = await prisma.dailyPulse.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    // Aggregate by day
    const days = eachDayOfInterval({ start: startDate, end: endDate })
    const calendarData = days.map((day) => {
      const dateStr = format(day, "yyyy-MM-dd")
      const dayTransactions = transactions.filter(
        (t) => format(new Date(t.createdAt), "yyyy-MM-dd") === dateStr
      )
      const pulse = dailyPulses.find(
        (p) => format(new Date(p.date), "yyyy-MM-dd") === dateStr
      )

      const revenue = dayTransactions.reduce(
        (sum, t) => sum + Number(t.total),
        0
      )
      const transactionCount = dayTransactions.length
      const avgTicket = transactionCount > 0 ? revenue / transactionCount : 0

      return {
        date: dateStr,
        dayOfMonth: day.getDate(),
        dayOfWeek: day.getDay(),
        revenue: Math.round(revenue * 100) / 100,
        transactions: transactionCount,
        avgTicket: Math.round(avgTicket * 100) / 100,
        vibe: pulse?.vibe || null,
        bestSeller: pulse?.bestSeller || null,
        weather: pulse?.weather || null,
        hasPulse: !!pulse,
      }
    })

    // Calculate month summary
    const totalRevenue = calendarData.reduce((sum, d) => sum + d.revenue, 0)
    const totalTransactions = calendarData.reduce((sum, d) => sum + d.transactions, 0)
    const daysWithSales = calendarData.filter((d) => d.transactions > 0).length

    return NextResponse.json({
      year,
      month,
      monthName: format(startDate, "MMMM yyyy"),
      days: calendarData,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalTransactions,
        avgDailyRevenue: daysWithSales > 0
          ? Math.round((totalRevenue / daysWithSales) * 100) / 100
          : 0,
        avgTicket: totalTransactions > 0
          ? Math.round((totalRevenue / totalTransactions) * 100) / 100
          : 0,
        daysWithSales,
      },
    })
  } catch (error) {
    console.error("Failed to fetch calendar data:", error)
    return NextResponse.json({ error: "Failed to fetch calendar data" }, { status: 500 })
  }
}
