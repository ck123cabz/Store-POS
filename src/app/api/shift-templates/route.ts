import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"

export async function GET() {
  try {
    const templates = await prisma.shiftTemplate.findMany({
      orderBy: { name: "asc" },
    })
    return NextResponse.json(templates)
  } catch {
    return NextResponse.json({ error: "Failed to fetch shift templates" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (!name) {
      return NextResponse.json({ error: "Template name is required" }, { status: 400 })
    }

    const startTime = typeof body.startTime === "string" ? body.startTime.trim() : ""
    const endTime = typeof body.endTime === "string" ? body.endTime.trim() : ""
    if (!startTime || !endTime) {
      return NextResponse.json({ error: "Start and end times are required" }, { status: 400 })
    }

    const template = await prisma.shiftTemplate.create({
      data: {
        name,
        startTime,
        endTime,
        color: typeof body.color === "string" ? body.color.trim() : "#3B82F6",
        isActive: typeof body.isActive === "boolean" ? body.isActive : true,
      },
    })

    await logAudit({
      entity: "shift_template", entityId: template.id, action: "create",
      summary: `Created shift template '${template.name}' (${template.startTime}–${template.endTime})`,
      userId: null, userName: null,
    })

    return NextResponse.json(template, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create shift template" }, { status: 500 })
  }
}
