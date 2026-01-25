import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can reject
    if (!session.user.permUsers) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 })
    }

    const { id } = await context.params
    const taskId = parseInt(id)

    if (isNaN(taskId)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))

    const task = await prisma.employeeTask.update({
      where: { id: taskId },
      data: {
        status: "rejected",
        rejectionNote: body.note || null,
      },
    })

    return NextResponse.json({
      id: task.id,
      name: task.name,
      status: task.status,
      rejectionNote: task.rejectionNote,
    })
  } catch (error) {
    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }
    console.error("Failed to reject task:", error)
    return NextResponse.json({ error: "Failed to reject task" }, { status: 500 })
  }
}
