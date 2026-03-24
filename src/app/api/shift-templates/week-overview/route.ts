import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const weekStartParam = request.nextUrl.searchParams.get("weekStart")

  if (!weekStartParam) {
    return NextResponse.json(
      { error: "Missing required query parameter: weekStart" },
      { status: 400 }
    )
  }

  const weekStart = new Date(weekStartParam)
  if (isNaN(weekStart.getTime())) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 })
  }

  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  try {
    const [templates, shifts] = await Promise.all([
      prisma.shiftTemplate.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      prisma.shiftLog.findMany({
        where: {
          date: { gte: weekStart, lte: weekEnd },
          shiftTemplateId: { not: null },
        },
        select: { shiftTemplateId: true, date: true },
      }),
    ])

    // Count shifts per template per day
    const countMap = new Map<number, number[]>()
    for (const template of templates) {
      countMap.set(template.id, [0, 0, 0, 0, 0, 0, 0])
    }

    for (const shift of shifts) {
      if (!shift.shiftTemplateId) continue
      const days = countMap.get(shift.shiftTemplateId)
      if (!days) continue

      const shiftDate = new Date(shift.date)
      // Calculate day index: 0=Mon, 1=Tue, ..., 6=Sun
      const jsDay = shiftDate.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
      const dayIndex = jsDay === 0 ? 6 : jsDay - 1
      days[dayIndex]++
    }

    const grid = templates.map((t) => ({
      templateId: t.id,
      templateName: t.name,
      color: t.color,
      days: countMap.get(t.id) || [0, 0, 0, 0, 0, 0, 0],
    }))

    // Calculate totals per day
    const totals = [0, 0, 0, 0, 0, 0, 0]
    for (const row of grid) {
      for (let i = 0; i < 7; i++) {
        totals[i] += row.days[i]
      }
    }

    return NextResponse.json({
      weekStart: weekStart.toISOString().split("T")[0],
      weekEnd: weekEnd.toISOString().split("T")[0],
      grid,
      totals,
    })
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch week overview" },
      { status: 500 }
    )
  }
}
