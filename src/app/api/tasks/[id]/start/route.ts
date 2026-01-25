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

    const { id } = await context.params
    const taskId = parseInt(id)

    if (isNaN(taskId)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 })
    }

    // Get the task
    const task = await prisma.employeeTask.findUnique({
      where: { id: taskId },
    })

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    if (!task.isActive || task.status !== "approved") {
      return NextResponse.json({ error: "Task is not active" }, { status: 400 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Upsert completion record
    const completion = await prisma.taskCompletion.upsert({
      where: {
        date_taskId: { date: today, taskId },
      },
      create: {
        date: today,
        taskId,
        taskName: task.name,
        taskType: task.type,
        deadlineTime: task.deadlineTime,
        status: "in_progress",
        startedAt: new Date(),
      },
      update: {
        status: "in_progress",
        startedAt: new Date(),
      },
    })

    return NextResponse.json({
      id: completion.id,
      taskId: completion.taskId,
      status: completion.status,
      startedAt: completion.startedAt,
    })
  } catch (error) {
    console.error("Failed to start task:", error)
    return NextResponse.json({ error: "Failed to start task" }, { status: 500 })
  }
}
