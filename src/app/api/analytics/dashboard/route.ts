import { NextRequest, NextResponse } from "next/server"
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

// Traffic light status based on value vs target
function getStatus(value: number, target: number, higherIsBetter: boolean = true): "green" | "yellow" | "red" {
  const ratio = value / target
  if (higherIsBetter) {
    if (ratio >= 1) return "green"
    if (ratio >= 0.7) return "yellow"
    return "red"
  } else {
    if (ratio <= 1) return "green"
    if (ratio <= 1.3) return "yellow"
    return "red"
  }
}

interface PeriodMetrics {
  revenue: number
  transactionCount: number
  avgTicket: number
  foodCostPercent: number
  dayparts: Array<{ name: string; revenue: number; transactions: number; avgTicket: number }>
  topItems: Array<{ name: string; quantity: number; revenue: number }>
  // Extended fields for lever calculations (only computed for current period)
  destinationPercent: number
  drinkOnlyCount: number
}

async function computeMetrics(start: Date, end: Date): Promise<PeriodMetrics> {
  const [transactions, purchases] = await Promise.all([
    prisma.transaction.findMany({
      where: { status: 1, createdAt: { gte: start, lte: end } },
      include: { customer: true, items: true },
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
    t.items.forEach((item) => {
      if (!itemSales[item.productId]) {
        itemSales[item.productId] = { name: item.productName, quantity: 0, revenue: 0 }
      }
      itemSales[item.productId].quantity += item.quantity
      itemSales[item.productId].revenue += Number(item.price) * item.quantity
    })
  })
  const topItems = Object.values(itemSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // Traffic source / drink-only for lever calculations
  const destinationCustomers = transactions.filter(
    (t) => t.customer?.customerType === "Destination"
  ).length
  const destinationPercent = transactionCount > 0
    ? (destinationCustomers / transactionCount) * 100
    : 0
  const drinkOnlyCount = transactions.filter((t) => t.isDrinkOnly).length

  return {
    revenue: Math.round(revenue * 100) / 100,
    transactionCount,
    avgTicket: Math.round(avgTicket * 100) / 100,
    foodCostPercent: Math.round(foodCostPercent * 10) / 10,
    dayparts,
    topItems,
    destinationPercent,
    drinkOnlyCount,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = (searchParams.get("period") || "week") as PeriodType

    // Validate period param
    if (!["today", "week", "month", "quarter"].includes(period)) {
      return NextResponse.json({ error: "Invalid period. Use: today, week, month, quarter" }, { status: 400 })
    }

    // Get settings for targets
    const settings = await prisma.settings.findFirst()
    const targets = {
      foodCostPercent: settings?.targetFoodCostPercent ? Number(settings.targetFoodCostPercent) : 32,
      laborCostPercent: settings?.targetLaborCostPercent ? Number(settings.targetLaborCostPercent) : 30,
      ticketSize: settings?.targetTicketSize ? Number(settings.targetTicketSize) : 85,
      revPerLaborHour: settings?.targetRevPerLaborHour ? Number(settings.targetRevPerLaborHour) : 350,
      repeatRate: settings?.targetRepeatRate ? Number(settings.targetRepeatRate) : 40,
      destinationPercent: settings?.targetDestinationPercent ? Number(settings.targetDestinationPercent) : 25,
      trueMarginPercent: settings?.targetTrueMarginPercent ? Number(settings.targetTrueMarginPercent) : 65,
    }

    const now = new Date()
    const currentRange = getPeriodRange(period, now)
    const previousRef = getPreviousPeriodRef(period, now)
    const previousRange = getPeriodRange(period, previousRef)

    // Compute current and previous period metrics in parallel, plus other data
    const [currentMetrics, previousMetrics, products, customers, laborLogs, wasteLogs, weekPurchases] = await Promise.all([
      computeMetrics(currentRange.start, currentRange.end),
      computeMetrics(previousRange.start, previousRange.end),
      prisma.product.findMany({ where: { trueCost: { not: null } } }),
      prisma.customer.findMany({ where: { visitCount: { gt: 0 } } }),
      prisma.laborLog.findMany({
        where: { date: { gte: currentRange.start, lte: currentRange.end } },
      }),
      prisma.wasteLog.findMany({
        where: { date: { gte: currentRange.start, lte: currentRange.end } },
      }),
      prisma.purchase.findMany({
        where: { date: { gte: currentRange.start, lte: currentRange.end }, category: "Food" },
      }),
    ])

    // LEVER 1: Unit Economics
    const productsWithMargin = products.filter((p) => p.trueMarginPercent !== null)
    const avgTrueMargin = productsWithMargin.length > 0
      ? productsWithMargin.reduce((sum, p) => sum + Number(p.trueMarginPercent), 0) / productsWithMargin.length
      : 0

    // LEVER 2: Traffic Source (computed inside computeMetrics)
    const destinationPercent = currentMetrics.destinationPercent

    // LEVER 3: Ticket Size
    const foodAttachmentRate = currentMetrics.transactionCount > 0
      ? ((currentMetrics.transactionCount - currentMetrics.drinkOnlyCount) / currentMetrics.transactionCount) * 100
      : 0

    // LEVER 6: Cash Conversion
    const wasteCost = wasteLogs.reduce((sum, w) => sum + Number(w.estimatedCost), 0)
    const purchaseTotal = weekPurchases.reduce((sum, p) => sum + Number(p.amount), 0)
    const spoilageRate = purchaseTotal > 0 ? (wasteCost / purchaseTotal) * 100 : 0

    // LEVER 7: Repeat Rate
    const repeatCustomers = customers.filter((c) => c.visitCount >= 2).length
    const totalCustomers = customers.length
    const repeatRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0

    // LEVER 8: Labor Leverage
    const laborHours = laborLogs.reduce(
      (sum, l) => sum + Number(l.hoursWorked) + Number(l.otHours),
      0
    )
    const revPerLaborHour = laborHours > 0 ? currentMetrics.revenue / laborHours : 0

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
      levers: {
        unitEconomics: {
          avgTrueMargin: Math.round(avgTrueMargin * 10) / 10,
          target: targets.trueMarginPercent,
          status: getStatus(avgTrueMargin, targets.trueMarginPercent),
          foodCostPercent: currentMetrics.foodCostPercent,
          foodCostTarget: targets.foodCostPercent,
          foodCostStatus: getStatus(currentMetrics.foodCostPercent, targets.foodCostPercent, false),
        },
        trafficSource: {
          destinationPercent: Math.round(destinationPercent * 10) / 10,
          target: targets.destinationPercent,
          status: getStatus(destinationPercent, targets.destinationPercent),
        },
        ticketSize: {
          avgTicket: currentMetrics.avgTicket,
          target: targets.ticketSize,
          status: getStatus(currentMetrics.avgTicket, targets.ticketSize),
          foodAttachmentRate: Math.round(foodAttachmentRate * 10) / 10,
        },
        menuFocus: {
          topItems: currentMetrics.topItems,
          heroItemsCount: products.filter((p) => p.isHeroItem).length,
        },
        daypartEconomics: {
          dayparts: currentMetrics.dayparts,
        },
        cashConversion: {
          wasteCost: Math.round(wasteCost * 100) / 100,
          spoilageRate: Math.round(spoilageRate * 10) / 10,
          target: 5,
          status: getStatus(spoilageRate, 5, false),
        },
        repeatRate: {
          repeatRate: Math.round(repeatRate * 10) / 10,
          repeatCustomers,
          totalCustomers,
          target: targets.repeatRate,
          status: getStatus(repeatRate, targets.repeatRate),
        },
        laborLeverage: {
          laborHours: Math.round(laborHours * 10) / 10,
          revPerLaborHour: Math.round(revPerLaborHour * 100) / 100,
          target: targets.revPerLaborHour,
          status: getStatus(revPerLaborHour, targets.revPerLaborHour),
        },
      },
      targets,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 })
  }
}
