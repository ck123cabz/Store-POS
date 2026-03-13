import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const employeeId = parseInt(id)

    // Find open shift (clockOut is null)
    const openShift = await prisma.shiftLog.findFirst({
      where: { employeeId, clockOut: null },
    })

    if (!openShift) {
      return NextResponse.json({ error: "Employee is not clocked in" }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const now = new Date()

    const breakMinutes = typeof body.breakMinutes === "number" ? body.breakMinutes : 0

    const shift = await prisma.shiftLog.update({
      where: { id: openShift.id },
      data: {
        clockOut: now,
        breakMinutes,
        notes: typeof body.notes === "string" ? body.notes.trim() : openShift.notes,
      },
    })

    return NextResponse.json(shift)
  } catch {
    return NextResponse.json({ error: "Failed to clock out" }, { status: 500 })
  }
}
