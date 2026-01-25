import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Get Monday of the week for a given date
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const weekStart = searchParams.get("weekStart")

    if (weekStart) {
      // Get specific week
      const weekStartDate = new Date(weekStart)
      const weekEndDate = new Date(weekStartDate)
      weekEndDate.setDate(weekEndDate.getDate() + 6)
      weekEndDate.setHours(23, 59, 59, 999)

      const scorecard = await prisma.weeklyScorecard.findUnique({
        where: { weekStarting: weekStartDate },
      })

      if (!scorecard) {
        // Calculate from data
        const transactions = await prisma.transaction.findMany({
          where: {
            status: 1,
            createdAt: { gte: weekStartDate, lte: weekEndDate },
          },
          include: { customer: true },
        })

        const laborLogs = await prisma.laborLog.findMany({
          where: {
            date: { gte: weekStartDate, lte: weekEndDate },
          },
        })

        const wasteLogs = await prisma.wasteLog.findMany({
          where: {
            date: { gte: weekStartDate, lte: weekEndDate },
          },
        })

        const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.total), 0)
        const totalTransactions = transactions.length
        const avgTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

        const laborHours = laborLogs.reduce(
          (sum, l) => sum + Number(l.hoursWorked) + Number(l.otHours),
          0
        )
        const revPerLaborHour = laborHours > 0 ? totalRevenue / laborHours : 0

        const wasteCost = wasteLogs.reduce((sum, w) => sum + Number(w.estimatedCost), 0)

        // Count repeat customers
        const customerIds = transactions
          .filter((t) => t.customerId)
          .map((t) => t.customerId)
        const uniqueCustomers = new Set(customerIds).size
        const repeatCustomers = transactions.filter(
          (t) => t.customer && t.customer.visitCount > 1
        ).length

        // Daypart analysis
        const daypartRevenue: Record<string, number> = {
          Morning: 0,
          Midday: 0,
          Afternoon: 0,
          Evening: 0,
        }

        transactions.forEach((t) => {
          const hour = t.createdAt.getHours()
          let daypart = "Evening"
          if (hour >= 6 && hour < 10) daypart = "Morning"
          else if (hour >= 10 && hour < 14) daypart = "Midday"
          else if (hour >= 14 && hour < 18) daypart = "Afternoon"
          daypartRevenue[daypart] += Number(t.total)
        })

        const sortedDayparts = Object.entries(daypartRevenue).sort(([, a], [, b]) => b - a)

        return NextResponse.json({
          weekStarting: weekStartDate,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalTransactions,
          avgTicket: Math.round(avgTicket * 100) / 100,
          laborHours: Math.round(laborHours * 10) / 10,
          revPerLaborHour: Math.round(revPerLaborHour * 100) / 100,
          wasteCost: Math.round(wasteCost * 100) / 100,
          repeatCustomers,
          repeatRatePercent: uniqueCustomers > 0
            ? Math.round((repeatCustomers / uniqueCustomers) * 100)
            : 0,
          bestDaypart: sortedDayparts[0]?.[0] || null,
          worstDaypart: sortedDayparts[sortedDayparts.length - 1]?.[0] || null,
          isNew: true,
        })
      }

      return NextResponse.json({
        ...scorecard,
        totalRevenue: Number(scorecard.totalRevenue),
        avgTicket: Number(scorecard.avgTicket),
        laborHours: scorecard.laborHours ? Number(scorecard.laborHours) : null,
        revPerLaborHour: scorecard.revPerLaborHour ? Number(scorecard.revPerLaborHour) : null,
        wasteCost: scorecard.wasteCost ? Number(scorecard.wasteCost) : null,
        isNew: false,
      })
    }

    // Get recent scorecards
    const scorecards = await prisma.weeklyScorecard.findMany({
      orderBy: { weekStarting: "desc" },
      take: 12,
    })

    return NextResponse.json(
      scorecards.map((s) => ({
        ...s,
        totalRevenue: Number(s.totalRevenue),
        avgTicket: Number(s.avgTicket),
        laborHours: s.laborHours ? Number(s.laborHours) : null,
        revPerLaborHour: s.revPerLaborHour ? Number(s.revPerLaborHour) : null,
        wasteCost: s.wasteCost ? Number(s.wasteCost) : null,
      }))
    )
  } catch {
    return NextResponse.json({ error: "Failed to fetch weekly scorecard" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const weekStarting = getWeekStart(new Date(body.weekStarting))

    const scorecard = await prisma.weeklyScorecard.upsert({
      where: { weekStarting },
      update: {
        totalRevenue: body.totalRevenue,
        totalTransactions: body.totalTransactions,
        avgTicket: body.avgTicket,
        foodCostPercent: body.foodCostPercent,
        laborHours: body.laborHours,
        revPerLaborHour: body.revPerLaborHour,
        wasteCost: body.wasteCost,
        spoilagePercent: body.spoilagePercent,
        repeatCustomers: body.repeatCustomers,
        repeatRatePercent: body.repeatRatePercent,
        destinationPercent: body.destinationPercent,
        upsellAttempts: body.upsellAttempts,
        upsellConversions: body.upsellConversions,
        upsellRatePercent: body.upsellRatePercent,
        bestDaypart: body.bestDaypart,
        worstDaypart: body.worstDaypart,
        weekFocus: body.weekFocus,
        heroItemPushed: body.heroItemPushed,
        winOfWeek: body.winOfWeek,
        problemToSolve: body.problemToSolve,
        overallHealth: body.overallHealth,
      },
      create: {
        weekStarting,
        totalRevenue: body.totalRevenue,
        totalTransactions: body.totalTransactions,
        avgTicket: body.avgTicket,
        foodCostPercent: body.foodCostPercent,
        laborHours: body.laborHours,
        revPerLaborHour: body.revPerLaborHour,
        wasteCost: body.wasteCost,
        spoilagePercent: body.spoilagePercent,
        repeatCustomers: body.repeatCustomers,
        repeatRatePercent: body.repeatRatePercent,
        destinationPercent: body.destinationPercent,
        upsellAttempts: body.upsellAttempts,
        upsellConversions: body.upsellConversions,
        upsellRatePercent: body.upsellRatePercent,
        bestDaypart: body.bestDaypart,
        worstDaypart: body.worstDaypart,
        weekFocus: body.weekFocus,
        heroItemPushed: body.heroItemPushed,
        winOfWeek: body.winOfWeek,
        problemToSolve: body.problemToSolve,
        overallHealth: body.overallHealth,
      },
    })

    return NextResponse.json({
      ...scorecard,
      totalRevenue: Number(scorecard.totalRevenue),
      avgTicket: Number(scorecard.avgTicket),
    })
  } catch {
    return NextResponse.json({ error: "Failed to save weekly scorecard" }, { status: 500 })
  }
}
