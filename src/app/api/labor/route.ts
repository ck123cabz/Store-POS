import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const userId = searchParams.get("userId")

    const where: {
      date?: { gte?: Date; lte?: Date }
      userId?: number
    } = {}

    if (dateFrom || dateTo) {
      where.date = {}
      if (dateFrom) where.date.gte = new Date(dateFrom)
      if (dateTo) where.date.lte = new Date(dateTo + "T23:59:59.999Z")
    }

    if (userId) where.userId = parseInt(userId)

    const laborLogs = await prisma.laborLog.findMany({
      where,
      include: { user: true },
      orderBy: { date: "desc" },
      take: 100,
    })

    const formatted = laborLogs.map((l) => ({
      id: l.id,
      date: l.date,
      userId: l.userId,
      userName: l.user.fullname,
      position: l.user.position,
      hoursWorked: Number(l.hoursWorked),
      otHours: Number(l.otHours),
      hourlyRate: Number(l.hourlyRate),
      tips: Number(l.tips),
      regularPay: Number(l.hoursWorked) * Number(l.hourlyRate),
      otPay: Number(l.otHours) * Number(l.hourlyRate) * 1.5,
      totalPay: Number(l.hoursWorked) * Number(l.hourlyRate) + Number(l.otHours) * Number(l.hourlyRate) * 1.5,
    }))

    // Calculate totals
    const totalHours = formatted.reduce((sum, l) => sum + l.hoursWorked + l.otHours, 0)
    const totalPay = formatted.reduce((sum, l) => sum + l.totalPay, 0)
    const totalTips = formatted.reduce((sum, l) => sum + l.tips, 0)

    return NextResponse.json({
      items: formatted,
      summary: {
        totalEntries: formatted.length,
        totalHours: Math.round(totalHours * 10) / 10,
        totalPay: Math.round(totalPay * 100) / 100,
        totalTips: Math.round(totalTips * 100) / 100,
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch labor logs" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Get user's hourly rate if not provided
    let hourlyRate = body.hourlyRate
    if (!hourlyRate) {
      const user = await prisma.user.findUnique({
        where: { id: body.userId },
      })
      hourlyRate = user?.hourlyRate ? Number(user.hourlyRate) : 75
    }

    const laborLog = await prisma.laborLog.create({
      data: {
        date: body.date ? new Date(body.date) : new Date(),
        userId: body.userId,
        hoursWorked: body.hoursWorked,
        otHours: body.otHours || 0,
        hourlyRate,
        tips: body.tips || 0,
      },
      include: { user: true },
    })

    const regularPay = Number(laborLog.hoursWorked) * Number(laborLog.hourlyRate)
    const otPay = Number(laborLog.otHours) * Number(laborLog.hourlyRate) * 1.5

    return NextResponse.json({
      id: laborLog.id,
      date: laborLog.date,
      userId: laborLog.userId,
      userName: laborLog.user.fullname,
      hoursWorked: Number(laborLog.hoursWorked),
      otHours: Number(laborLog.otHours),
      hourlyRate: Number(laborLog.hourlyRate),
      tips: Number(laborLog.tips),
      regularPay,
      otPay,
      totalPay: regularPay + otPay,
    }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create labor log" }, { status: 500 })
  }
}
