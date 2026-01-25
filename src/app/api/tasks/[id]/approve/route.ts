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

    // Only admins can approve
    if (!session.user.permUsers) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 })
    }

    const { id } = await context.params
    const taskId = parseInt(id)

    if (isNaN(taskId)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 })
    }

    const userId = parseInt(session.user.id)

    const task = await prisma.employeeTask.update({
      where: { id: taskId },
      data: {
        status: "approved",
        approvedById: userId,
        approvedAt: new Date(),
        rejectionNote: null,
      },
    })

    return NextResponse.json({
      id: task.id,
      name: task.name,
      status: task.status,
      approvedAt: task.approvedAt,
    })
  } catch (error) {
    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }
    console.error("Failed to approve task:", error)
    return NextResponse.json({ error: "Failed to approve task" }, { status: 500 })
  }
}
