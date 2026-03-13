import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const payments = await prisma.paymentRecord.findMany({
      where: { employeeId: parseInt(id) },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(payments)
  } catch {
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 })
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
    if (!body.periodStart) {
      return NextResponse.json({ error: "Period start is required" }, { status: 400 })
    }
    if (!body.periodEnd) {
      return NextResponse.json({ error: "Period end is required" }, { status: 400 })
    }
    const paidAmount = typeof body.paidAmount === "number" ? body.paidAmount : null
    if (paidAmount === null || paidAmount < 0) {
      return NextResponse.json({ error: "Paid amount must be a number >= 0" }, { status: 400 })
    }

    // Check employee exists and get hourly rate
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    })

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    const periodStart = new Date(body.periodStart)
    const periodEnd = new Date(body.periodEnd)

    // Query completed shift logs in the period
    const shifts = await prisma.shiftLog.findMany({
      where: {
        employeeId,
        clockOut: { not: null },
        date: { gte: periodStart, lte: periodEnd },
      },
    })

    // Calculate hoursWorked = sum of (clockOut - clockIn - breakMinutes) in hours
    let totalMinutes = 0
    for (const shift of shifts) {
      if (shift.clockOut && shift.clockIn) {
        const diffMs = shift.clockOut.getTime() - shift.clockIn.getTime()
        const diffMinutes = diffMs / (1000 * 60)
        totalMinutes += diffMinutes - (shift.breakMinutes || 0)
      }
    }
    const hoursWorked = Math.max(0, totalMinutes / 60)
    const roundedHours = Math.round(hoursWorked * 100) / 100

    // calculatedAmount = hoursWorked * hourlyRate
    const hourlyRate = Number(employee.hourlyRate)
    const calculatedAmount = Math.round(roundedHours * hourlyRate * 100) / 100

    // Determine status
    let status: string
    if (body.status === "Advance") {
      status = "Advance"
    } else if (paidAmount >= calculatedAmount) {
      status = "Paid"
    } else if (paidAmount > 0) {
      status = "Partial"
    } else {
      status = "Pending"
    }

    const payment = await prisma.paymentRecord.create({
      data: {
        employeeId,
        periodStart,
        periodEnd,
        hoursWorked: roundedHours,
        calculatedAmount,
        paidAmount,
        paidDate: paidAmount > 0 ? new Date() : null,
        status,
        paymentMethod: typeof body.paymentMethod === "string" ? body.paymentMethod.trim() : "",
        notes: typeof body.notes === "string" ? body.notes.trim() : "",
      },
    })

    await logAudit({
      entity: "payment_record", entityId: payment.id, action: "create",
      summary: `Created payment record for '${employee.firstName} ${employee.lastName}' - ${status} (${roundedHours}h, calculated: ${calculatedAmount}, paid: ${paidAmount})`,
      userId: null, userName: null,
    })

    return NextResponse.json(payment, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create payment record" }, { status: 500 })
  }
}
