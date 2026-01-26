import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay, parseISO } from "date-fns"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params
    const targetDate = parseISO(date)
    const dayStart = startOfDay(targetDate)
    const dayEnd = endOfDay(targetDate)

    // Get all transactions for the day
    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: dayStart,
          lte: dayEnd,
        },
        status: 1,
      },
      include: {
        items: true,
        user: {
          select: { id: true, fullname: true },
        },
        customer: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    // Get daily pulse for this day
    const pulse = await prisma.dailyPulse.findUnique({
      where: { date: dayStart },
    })

    // Aggregate by hour for peak hours
    const hourlyData: Record<number, { transactions: number; revenue: number }> = {}
    for (let h = 0; h < 24; h++) {
      hourlyData[h] = { transactions: 0, revenue: 0 }
    }
    transactions.forEach((t) => {
      const hour = new Date(t.createdAt).getHours()
      hourlyData[hour].transactions += 1
      hourlyData[hour].revenue += Number(t.total)
    })

    // Aggregate by daypart
    const daypartData: Record<string, { transactions: number; revenue: number }> = {
      Morning: { transactions: 0, revenue: 0 },
      Midday: { transactions: 0, revenue: 0 },
      Afternoon: { transactions: 0, revenue: 0 },
      Evening: { transactions: 0, revenue: 0 },
    }
    transactions.forEach((t) => {
      const dp = t.daypart || "Evening"
      if (daypartData[dp]) {
        daypartData[dp].transactions += 1
        daypartData[dp].revenue += Number(t.total)
      }
    })

    // Top products
    const productCounts: Record<string, { name: string; quantity: number; revenue: number }> = {}
    transactions.forEach((t) => {
      t.items.forEach((item) => {
        if (!productCounts[item.productName]) {
          productCounts[item.productName] = { name: item.productName, quantity: 0, revenue: 0 }
        }
        productCounts[item.productName].quantity += item.quantity
        productCounts[item.productName].revenue += Number(item.price) * item.quantity
      })
    })
    const topProducts = Object.values(productCounts)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.total), 0)
    const avgTicket = transactions.length > 0 ? totalRevenue / transactions.length : 0

    return NextResponse.json({
      date,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        transactions: transactions.length,
        avgTicket: Math.round(avgTicket * 100) / 100,
      },
      hourlyBreakdown: Object.entries(hourlyData).map(([hour, data]) => ({
        hour: parseInt(hour),
        ...data,
        revenue: Math.round(data.revenue * 100) / 100,
      })),
      daypartBreakdown: Object.entries(daypartData).map(([daypart, data]) => ({
        daypart,
        ...data,
        revenue: Math.round(data.revenue * 100) / 100,
      })),
      topProducts,
      pulse: pulse
        ? {
            vibe: pulse.vibe,
            weather: pulse.weather,
            courtStatus: pulse.courtStatus,
            bestSeller: pulse.bestSeller,
            waste: pulse.waste,
            oneThing: pulse.oneThing,
          }
        : null,
      transactions: transactions.map((t) => ({
        id: t.id,
        orderNumber: t.orderNumber,
        total: Number(t.total),
        itemCount: t.itemCount,
        daypart: t.daypart,
        paymentType: t.paymentType,
        createdAt: t.createdAt,
        cashier: t.user?.fullname || "Unknown",
        customer: t.customer?.name || "Walk-in",
      })),
    })
  } catch (error) {
    console.error("Failed to fetch day detail:", error)
    return NextResponse.json({ error: "Failed to fetch day detail" }, { status: 500 })
  }
}
