import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const employeeId = parseInt(id)
    const { searchParams } = new URL(request.url)
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    const where: Record<string, unknown> = { employeeId }

    if (from || to) {
      const dateFilter: Record<string, Date> = {}
      if (from) dateFilter.gte = new Date(from)
      if (to) dateFilter.lte = new Date(to)
      where.date = dateFilter
    }

    const shifts = await prisma.shiftLog.findMany({
      where,
      include: {
        shiftTemplate: { select: { name: true, color: true } },
      },
      orderBy: { date: "desc" },
    })

    return NextResponse.json(shifts)
  } catch {
    return NextResponse.json({ error: "Failed to fetch shifts" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const employeeId = parseInt(id)
    const body = await request.json()

    // Validate required fields
    if (!body.date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 })
    }

    if (!body.clockIn) {
      return NextResponse.json({ error: "Clock in time is required" }, { status: 400 })
    }

    // Check employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    })

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    const shift = await prisma.shiftLog.create({
      data: {
        employeeId,
        date: new Date(body.date),
        clockIn: new Date(body.clockIn),
        clockOut: body.clockOut ? new Date(body.clockOut) : null,
        breakMinutes: typeof body.breakMinutes === "number" ? body.breakMinutes : 0,
        shiftTemplateId: typeof body.shiftTemplateId === "number" ? body.shiftTemplateId : null,
        notes: typeof body.notes === "string" ? body.notes.trim() : "",
      },
    })

    return NextResponse.json(shift, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create shift" }, { status: 500 })
  }
}
