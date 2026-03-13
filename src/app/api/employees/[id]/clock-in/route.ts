import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const employeeId = parseInt(id)

    // Check employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    })

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    // Check not already clocked in (open shift where clockOut is null)
    const openShift = await prisma.shiftLog.findFirst({
      where: { employeeId, clockOut: null },
    })

    if (openShift) {
      return NextResponse.json({ error: "Employee is already clocked in" }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const now = new Date()

    const shiftTemplateId = typeof body.shiftTemplateId === "number" ? body.shiftTemplateId : null

    const shift = await prisma.shiftLog.create({
      data: {
        employeeId,
        date: now,
        clockIn: now,
        shiftTemplateId,
        notes: typeof body.notes === "string" ? body.notes.trim() : "",
      },
    })

    return NextResponse.json(shift, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to clock in" }, { status: 500 })
  }
}
