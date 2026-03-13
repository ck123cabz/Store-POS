import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()

    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (!name) {
      return NextResponse.json({ error: "Template name is required" }, { status: 400 })
    }

    const template = await prisma.shiftTemplate.update({
      where: { id: parseInt(id) },
      data: {
        name,
        startTime: typeof body.startTime === "string" ? body.startTime.trim() : undefined,
        endTime: typeof body.endTime === "string" ? body.endTime.trim() : undefined,
        color: typeof body.color === "string" ? body.color.trim() : undefined,
        ...(typeof body.isActive === "boolean" && { isActive: body.isActive }),
      },
    })

    await logAudit({
      entity: "shift_template", entityId: template.id, action: "update",
      summary: `Updated shift template '${template.name}'`,
      userId: null, userName: null,
    })

    return NextResponse.json(template)
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "Shift template not found" }, { status: 404 })
    }
    return NextResponse.json({ error: "Failed to update shift template" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const template = await prisma.shiftTemplate.findUnique({
      where: { id: parseInt(id) },
    })

    if (!template) {
      return NextResponse.json({ error: "Shift template not found" }, { status: 404 })
    }

    await prisma.shiftTemplate.delete({ where: { id: parseInt(id) } })

    await logAudit({
      entity: "shift_template", entityId: parseInt(id), action: "delete",
      summary: `Deleted shift template '${template.name}'`,
      userId: null, userName: null,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete shift template" }, { status: 500 })
  }
}
