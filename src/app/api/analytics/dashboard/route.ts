import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type PeriodType = "today" | "week" | "month" | "quarter"

// Get Monday of the week containing the given date
function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// Get the first day of the month containing the given date
function getMonthStart(date: Date = new Date()): Date {
  const d = new Date(date)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

// Get the first day of the quarter containing the given date
function getQuarterStart(date: Date = new Date()): Date {
  const d = new Date(date)
  const quarterMonth = Math.floor(d.getMonth() / 3) * 3
  d.setMonth(quarterMonth, 1)
  d.setHours(0, 0, 0, 0)
  return d
}

// Compute date range for a period
function getPeriodRange(period: PeriodType, referenceDate: Date = new Date()): { start: Date; end: Date } {
  const now = new Date(referenceDate)

  switch (period) {
    case "today": {
      const start = new Date(now)
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setHours(23, 59, 59, 999)
      return { start, end }
    }
    case "week": {
      const start = getWeekStart(now)
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      return { start, end }
    }
    case "month": {
      const start = getMonthStart(now)
      const end = new Date(start)
      end.setMonth(end.getMonth() + 1)
      end.setDate(0) // last day of the month
      end.setHours(23, 59, 59, 999)
      return { start, end }
    }
    case "quarter": {
      const start = getQuarterStart(now)
      const end = new Date(start)
      end.setMonth(end.getMonth() + 3)
      end.setDate(0) // last day of the quarter
      end.setHours(23, 59, 59, 999)
      return { start, end }
    }
  }
}

// Get the reference date for the "previous" equivalent period
function getPreviousPeriodRef(period: PeriodType, referenceDate: Date = new Date()): Date {
  const d = new Date(referenceDate)

  switch (period) {
    case "today":
      d.setDate(d.getDate() - 1)
      return d
    case "week":
      d.setDate(d.getDate() - 7)
      return d
    case "month":
      d.setMonth(d.getMonth() - 1)
      return d
    case "quarter":
      d.setMonth(d.getMonth() - 3)
      return d
  }
}

interface PeriodMetrics {
  revenue: number
  transactionCount: number
  avgTicket: number
  foodCostPercent: number
  dayparts: Array<{ name: string; revenue: number; transactions: number; avgTicket: number }>
  topItems: Array<{ name: string; quantity: number; revenue: number }>
}

async function computeMetrics(start: Date, end: Date, summaryOnly?: boolean): Promise<PeriodMetrics> {
  const [transactions, purchases] = await Promise.all([
    prisma.transaction.findMany({
      where: { status: 1, createdAt: { gte: start, lte: end } },
      include: summaryOnly ? undefined : { customer: true, items: true },
    }),
    prisma.purchase.findMany({
      where: { date: { gte: start, lte: end }, category: "Food" },
    }),
  ])

  const revenue = transactions.reduce((sum, t) => sum + Number(t.total), 0)
  const transactionCount = transactions.length
  const avgTicket = transactionCount > 0 ? revenue / transactionCount : 0

  const purchaseTotal = purchases.reduce((sum, p) => sum + Number(p.amount), 0)
  const foodCostPercent = revenue > 0 ? (purchaseTotal / revenue) * 100 : 0

  // For previous period comparisons, skip detailed calculations
  if (summaryOnly) {
    return {
      revenue: Math.round(revenue * 100) / 100,
      transactionCount,
      avgTicket: Math.round(avgTicket * 100) / 100,
      foodCostPercent: Math.round(foodCostPercent * 10) / 10,
      dayparts: [],
      topItems: [],
    }
  }

  // Daypart economics
  const daypartData: Record<string, { revenue: number; transactions: number }> = {
    Morning: { revenue: 0, transactions: 0 },
    Midday: { revenue: 0, transactions: 0 },
    Afternoon: { revenue: 0, transactions: 0 },
    Evening: { revenue: 0, transactions: 0 },
  }
  transactions.forEach((t) => {
    const hour = t.createdAt.getHours()
    let daypart = "Evening"
    if (hour >= 6 && hour < 10) daypart = "Morning"
    else if (hour >= 10 && hour < 14) daypart = "Midday"
    else if (hour >= 14 && hour < 18) daypart = "Afternoon"
    daypartData[daypart].revenue += Number(t.total)
    daypartData[daypart].transactions++
  })

  const dayparts = Object.entries(daypartData).map(([name, data]) => ({
    name,
    revenue: Math.round(data.revenue * 100) / 100,
    transactions: data.transactions,
    avgTicket: data.transactions > 0
      ? Math.round((data.revenue / data.transactions) * 100) / 100
      : 0,
  }))

  // Top items
  const itemSales: Record<string, { name: string; quantity: number; revenue: number }> = {}
  transactions.forEach((t) => {
    if ('items' in t && Array.isArray(t.items)) {
      t.items.forEach((item: { productId: number; productName: string; quantity: number; price: number | string }) => {
        const key = String(item.productId)
        if (!itemSales[key]) {
          itemSales[key] = { name: item.productName, quantity: 0, revenue: 0 }
        }
        itemSales[key].quantity += item.quantity
        itemSales[key].revenue += Number(item.price) * item.quantity
      })
    }
  })
  const topItems = Object.values(itemSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  return {
    revenue: Math.round(revenue * 100) / 100,
    transactionCount,
    avgTicket: Math.round(avgTicket * 100) / 100,
    foodCostPercent: Math.round(foodCostPercent * 10) / 10,
    dayparts,
    topItems,
  }
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const period = (searchParams.get("period") || "week") as PeriodType

    // Validate period param
    if (!["today", "week", "month", "quarter"].includes(period)) {
      return NextResponse.json({ error: "Invalid period. Use: today, week, month, quarter" }, { status: 400 })
    }

    const now = new Date()
    const currentRange = getPeriodRange(period, now)
    const previousRef = getPreviousPeriodRef(period, now)
    const previousRange = getPeriodRange(period, previousRef)

    // Compute current and previous period metrics in parallel
    const [currentMetrics, previousMetrics] = await Promise.all([
      computeMetrics(currentRange.start, currentRange.end),
      computeMetrics(previousRange.start, previousRange.end, true),
    ])

    return NextResponse.json({
      period: {
        type: period,
        start: currentRange.start,
        end: currentRange.end,
        today: new Date().toISOString(),
      },
      summary: {
        revenue: currentMetrics.revenue,
        transactions: currentMetrics.transactionCount,
        avgTicket: currentMetrics.avgTicket,
        foodCostPercent: currentMetrics.foodCostPercent,
      },
      previousPeriod: {
        revenue: previousMetrics.revenue,
        transactions: previousMetrics.transactionCount,
        avgTicket: previousMetrics.avgTicket,
        foodCostPercent: previousMetrics.foodCostPercent,
      },
      dayparts: currentMetrics.dayparts,
      topItems: currentMetrics.topItems,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 })
  }
}
