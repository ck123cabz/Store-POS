import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    const where = status ? { employmentStatus: status } : {}

    const employees = await prisma.employee.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, fullname: true } },
      },
      orderBy: { firstName: "asc" },
    })
    return NextResponse.json(employees)
  } catch {
    return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : ""
    if (!firstName) {
      return NextResponse.json({ error: "First name is required" }, { status: 400 })
    }

    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : ""
    if (!lastName) {
      return NextResponse.json({ error: "Last name is required" }, { status: 400 })
    }

    const position = typeof body.position === "string" ? body.position.trim() : ""
    if (!position) {
      return NextResponse.json({ error: "Position is required" }, { status: 400 })
    }

    const hourlyRate = typeof body.hourlyRate === "number" ? body.hourlyRate : null
    if (hourlyRate === null || hourlyRate < 0) {
      return NextResponse.json({ error: "Hourly rate must be a number >= 0" }, { status: 400 })
    }

    // Check userId uniqueness if provided
    const userId = typeof body.userId === "number" ? body.userId : null
    if (userId !== null) {
      const existing = await prisma.employee.findUnique({ where: { userId } })
      if (existing) {
        return NextResponse.json({ error: "This user is already linked to another employee" }, { status: 400 })
      }
    }

    const employee = await prisma.employee.create({
      data: {
        firstName,
        lastName,
        phone: typeof body.phone === "string" ? body.phone.trim() : "",
        email: typeof body.email === "string" ? body.email.trim() : "",
        position,
        hourlyRate,
        employmentStatus: typeof body.employmentStatus === "string" ? body.employmentStatus.trim() : "Active",
        startDate: body.startDate ? new Date(body.startDate) : new Date(),
        endDate: body.endDate ? new Date(body.endDate) : null,
        userId,
        notes: typeof body.notes === "string" ? body.notes.trim() : "",
      },
    })

    await logAudit({
      entity: "employee", entityId: employee.id, action: "create",
      summary: `Created employee '${employee.firstName} ${employee.lastName}'`,
      userId: null, userName: null,
    })

    return NextResponse.json(employee, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 })
  }
}
