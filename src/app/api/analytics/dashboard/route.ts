import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Get Monday of current week
function getWeekStart(): Date {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
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

export async function GET() {
  try {
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

    const weekStart = getWeekStart()
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)

    // Fetch all data in parallel
    const [
      weekTransactions,
      todayTransactions,
      laborLogs,
      wasteLogs,
      purchases,
      products,
      customers,
    ] = await Promise.all([
      prisma.transaction.findMany({
        where: { status: 1, createdAt: { gte: weekStart, lte: weekEnd } },
        include: { customer: true, items: true },
      }),
      prisma.transaction.findMany({
        where: { status: 1, createdAt: { gte: today, lte: todayEnd } },
      }),
      prisma.laborLog.findMany({
        where: { date: { gte: weekStart, lte: weekEnd } },
      }),
      prisma.wasteLog.findMany({
        where: { date: { gte: weekStart, lte: weekEnd } },
      }),
      prisma.purchase.findMany({
        where: { date: { gte: weekStart, lte: weekEnd }, category: "Food" },
      }),
      prisma.product.findMany({
        where: { trueCost: { not: null } },
      }),
      prisma.customer.findMany({
        where: { visitCount: { gt: 0 } },
      }),
    ])

    // LEVER 1: Unit Economics
    const productsWithMargin = products.filter((p) => p.trueMarginPercent !== null)
    const avgTrueMargin = productsWithMargin.length > 0
      ? productsWithMargin.reduce((sum, p) => sum + Number(p.trueMarginPercent), 0) / productsWithMargin.length
      : 0

    // LEVER 2: Traffic Source
    const destinationCustomers = weekTransactions.filter(
      (t) => t.customer?.customerType === "Destination"
    ).length
    const destinationPercent = weekTransactions.length > 0
      ? (destinationCustomers / weekTransactions.length) * 100
      : 0

    // LEVER 3: Ticket Size
    const weekRevenue = weekTransactions.reduce((sum, t) => sum + Number(t.total), 0)
    const weekTransactionCount = weekTransactions.length
    const avgTicket = weekTransactionCount > 0 ? weekRevenue / weekTransactionCount : 0

    const todayRevenue = todayTransactions.reduce((sum, t) => sum + Number(t.total), 0)
    const todayTransactionCount = todayTransactions.length
    const todayAvgTicket = todayTransactionCount > 0 ? todayRevenue / todayTransactionCount : 0

    // LEVER 4: Menu Focus - Top sellers
    const itemSales: Record<string, { name: string; quantity: number; revenue: number }> = {}
    weekTransactions.forEach((t) => {
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

    // LEVER 5: Daypart Economics
    const daypartData: Record<string, { revenue: number; transactions: number }> = {
      Morning: { revenue: 0, transactions: 0 },
      Midday: { revenue: 0, transactions: 0 },
      Afternoon: { revenue: 0, transactions: 0 },
      Evening: { revenue: 0, transactions: 0 },
    }
    weekTransactions.forEach((t) => {
      const hour = t.createdAt.getHours()
      let daypart = "Evening"
      if (hour >= 6 && hour < 10) daypart = "Morning"
      else if (hour >= 10 && hour < 14) daypart = "Midday"
      else if (hour >= 14 && hour < 18) daypart = "Afternoon"
      daypartData[daypart].revenue += Number(t.total)
      daypartData[daypart].transactions++
    })

    // LEVER 6: Cash Conversion
    const wasteCost = wasteLogs.reduce((sum, w) => sum + Number(w.estimatedCost), 0)
    const purchaseTotal = purchases.reduce((sum, p) => sum + Number(p.amount), 0)
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
    const revPerLaborHour = laborHours > 0 ? weekRevenue / laborHours : 0

    // LEVER 3 continued: Drink-only analysis
    const drinkOnlyTransactions = weekTransactions.filter((t) => t.isDrinkOnly).length
    const foodAttachmentRate = weekTransactionCount > 0
      ? ((weekTransactionCount - drinkOnlyTransactions) / weekTransactionCount) * 100
      : 0

    // Food cost % (simplified - purchases / revenue)
    const foodCostPercent = weekRevenue > 0 ? (purchaseTotal / weekRevenue) * 100 : 0

    return NextResponse.json({
      period: {
        weekStart,
        weekEnd,
        today,
      },
      summary: {
        todayRevenue: Math.round(todayRevenue * 100) / 100,
        todayTransactions: todayTransactionCount,
        weekRevenue: Math.round(weekRevenue * 100) / 100,
        weekTransactions: weekTransactionCount,
      },
      levers: {
        // Lever 1: Unit Economics
        unitEconomics: {
          avgTrueMargin: Math.round(avgTrueMargin * 10) / 10,
          target: targets.trueMarginPercent,
          status: getStatus(avgTrueMargin, targets.trueMarginPercent),
          foodCostPercent: Math.round(foodCostPercent * 10) / 10,
          foodCostTarget: targets.foodCostPercent,
          foodCostStatus: getStatus(foodCostPercent, targets.foodCostPercent, false),
        },
        // Lever 2: Traffic Source
        trafficSource: {
          destinationPercent: Math.round(destinationPercent * 10) / 10,
          target: targets.destinationPercent,
          status: getStatus(destinationPercent, targets.destinationPercent),
        },
        // Lever 3: Ticket Size
        ticketSize: {
          avgTicket: Math.round(avgTicket * 100) / 100,
          todayAvgTicket: Math.round(todayAvgTicket * 100) / 100,
          target: targets.ticketSize,
          status: getStatus(avgTicket, targets.ticketSize),
          foodAttachmentRate: Math.round(foodAttachmentRate * 10) / 10,
        },
        // Lever 4: Menu Focus
        menuFocus: {
          topItems,
          heroItemsCount: products.filter((p) => p.isHeroItem).length,
        },
        // Lever 5: Daypart Economics
        daypartEconomics: {
          dayparts: Object.entries(daypartData).map(([name, data]) => ({
            name,
            revenue: Math.round(data.revenue * 100) / 100,
            transactions: data.transactions,
            avgTicket: data.transactions > 0
              ? Math.round((data.revenue / data.transactions) * 100) / 100
              : 0,
          })),
        },
        // Lever 6: Cash Conversion
        cashConversion: {
          wasteCost: Math.round(wasteCost * 100) / 100,
          spoilageRate: Math.round(spoilageRate * 10) / 10,
          target: 5,
          status: getStatus(spoilageRate, 5, false),
        },
        // Lever 7: Repeat Rate
        repeatRate: {
          repeatRate: Math.round(repeatRate * 10) / 10,
          repeatCustomers,
          totalCustomers,
          target: targets.repeatRate,
          status: getStatus(repeatRate, targets.repeatRate),
        },
        // Lever 8: Labor Leverage
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
