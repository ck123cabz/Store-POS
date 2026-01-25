import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")

    if (date) {
      // Get specific date
      const pulse = await prisma.dailyPulse.findUnique({
        where: { date: new Date(date) },
      })

      if (!pulse) {
        // Return empty template with calculated data from transactions
        const dayStart = new Date(date)
        const dayEnd = new Date(date + "T23:59:59.999Z")

        const transactions = await prisma.transaction.findMany({
          where: {
            status: 1,
            createdAt: { gte: dayStart, lte: dayEnd },
          },
        })

        const revenue = transactions.reduce((sum, t) => sum + Number(t.total), 0)
        const transactionCount = transactions.length
        const avgTicket = transactionCount > 0 ? revenue / transactionCount : 0

        return NextResponse.json({
          date,
          revenue: Math.round(revenue * 100) / 100,
          transactions: transactionCount,
          avgTicket: Math.round(avgTicket * 100) / 100,
          upsellsAttempted: 0,
          upsellsConverted: 0,
          weather: null,
          courtStatus: null,
          bestSeller: null,
          waste: null,
          vibe: null,
          oneThing: null,
          isNew: true,
        })
      }

      return NextResponse.json({
        ...pulse,
        revenue: Number(pulse.revenue),
        avgTicket: Number(pulse.avgTicket),
        isNew: false,
      })
    }

    // Get recent entries
    const pulses = await prisma.dailyPulse.findMany({
      orderBy: { date: "desc" },
      take: 30,
    })

    return NextResponse.json(
      pulses.map((p) => ({
        ...p,
        revenue: Number(p.revenue),
        avgTicket: Number(p.avgTicket),
      }))
    )
  } catch {
    return NextResponse.json({ error: "Failed to fetch daily pulse" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const date = new Date(body.date)

    // Upsert - create or update
    const pulse = await prisma.dailyPulse.upsert({
      where: { date },
      update: {
        revenue: body.revenue,
        transactions: body.transactions,
        avgTicket: body.avgTicket,
        upsellsAttempted: body.upsellsAttempted || 0,
        upsellsConverted: body.upsellsConverted || 0,
        weather: body.weather,
        courtStatus: body.courtStatus,
        bestSeller: body.bestSeller,
        waste: body.waste,
        vibe: body.vibe,
        oneThing: body.oneThing,
      },
      create: {
        date,
        revenue: body.revenue,
        transactions: body.transactions,
        avgTicket: body.avgTicket,
        upsellsAttempted: body.upsellsAttempted || 0,
        upsellsConverted: body.upsellsConverted || 0,
        weather: body.weather,
        courtStatus: body.courtStatus,
        bestSeller: body.bestSeller,
        waste: body.waste,
        vibe: body.vibe,
        oneThing: body.oneThing,
      },
    })

    return NextResponse.json({
      ...pulse,
      revenue: Number(pulse.revenue),
      avgTicket: Number(pulse.avgTicket),
    })
  } catch {
    return NextResponse.json({ error: "Failed to save daily pulse" }, { status: 500 })
  }
}
