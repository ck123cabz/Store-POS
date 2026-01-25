import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dayOfWeek = today.getDay()

    // Get all active, approved tasks for today's day of week
    const tasks = await prisma.employeeTask.findMany({
      where: {
        isActive: true,
        status: "approved",
        daysOfWeek: { has: dayOfWeek },
      },
      orderBy: [{ sortOrder: "asc" }, { deadlineTime: "asc" }],
      include: {
        assignedTo: { select: { id: true, fullname: true } },
      },
    })

    // Get today's completions
    const completions = await prisma.taskCompletion.findMany({
      where: { date: today },
      include: {
        completedBy: { select: { id: true, fullname: true } },
      },
    })

    // Build completion map
    const completionMap = new Map(
      completions.map((c) => [c.taskId, c])
    )

    // Get current time for deadline comparison
    const now = new Date()
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`

    // Format response with completion status
    const formatted = tasks.map((t) => {
      const completion = completionMap.get(t.id)
      const isPastDeadline = currentTime > t.deadlineTime

      let status: "pending" | "in_progress" | "completed" | "overdue"
      if (completion?.status === "completed") {
        status = "completed"
      } else if (completion?.status === "in_progress") {
        status = "in_progress"
      } else if (isPastDeadline) {
        status = "overdue"
      } else {
        status = "pending"
      }

      return {
        id: t.id,
        name: t.name,
        type: t.type,
        description: t.description,
        icon: t.icon,
        deadlineTime: t.deadlineTime,
        assignedToId: t.assignedToId,
        assignedToName: t.assignedTo?.fullname || null,
        required: t.required,
        streakBreaking: t.streakBreaking,
        // Completion info
        status,
        completionId: completion?.id || null,
        startedAt: completion?.startedAt || null,
        completedAt: completion?.completedAt || null,
        completedById: completion?.completedById || null,
        completedByName: completion?.completedBy?.fullname || null,
        wasOnTime: completion?.wasOnTime ?? null,
      }
    })

    // Summary counts
    const summary = {
      total: formatted.length,
      completed: formatted.filter((t) => t.status === "completed").length,
      inProgress: formatted.filter((t) => t.status === "in_progress").length,
      pending: formatted.filter((t) => t.status === "pending").length,
      overdue: formatted.filter((t) => t.status === "overdue").length,
    }

    return NextResponse.json({ tasks: formatted, summary, date: today.toISOString() })
  } catch (error) {
    console.error("Failed to fetch today's tasks:", error)
    return NextResponse.json({ error: "Failed to fetch today's tasks" }, { status: 500 })
  }
}
