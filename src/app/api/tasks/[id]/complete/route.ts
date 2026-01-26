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

    const body = await request.json().catch(() => ({}))
    const userId = parseInt(session.user.id)

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

    const now = new Date()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Check if completed on time
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
    const wasOnTime = currentTime <= task.deadlineTime

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
        status: "completed",
        completedAt: now,
        completedById: userId,
        completedByName: session.user.name || null,
        wasOnTime,
        data: body.data || null,
      },
      update: {
        status: "completed",
        completedAt: now,
        completedById: userId,
        completedByName: session.user.name || null,
        wasOnTime,
        data: body.data || null,
      },
    })

    // Update user streak if task is streak-breaking
    if (task.streakBreaking && wasOnTime) {
      await updateUserStreak(userId, session.user.name || "Unknown", today)
    }

    return NextResponse.json({
      id: completion.id,
      taskId: completion.taskId,
      status: completion.status,
      completedAt: completion.completedAt,
      wasOnTime: completion.wasOnTime,
    })
  } catch (error) {
    console.error("Failed to complete task:", error)
    return NextResponse.json({ error: "Failed to complete task" }, { status: 500 })
  }
}

async function updateUserStreak(userId: number, userName: string, today: Date) {
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const existingStreak = await prisma.userStreak.findUnique({
    where: { userId },
  })

  if (!existingStreak) {
    // Create new streak
    await prisma.userStreak.create({
      data: {
        userId,
        userName,
        currentStreak: 1,
        longestStreak: 1,
        lastCompletedDate: today,
        streakStartedDate: today,
        milestones: [],
      },
    })
    return
  }

  // Check if continuing streak (completed yesterday or today already)
  const lastDate = existingStreak.lastCompletedDate
  const isConsecutive =
    lastDate &&
    (lastDate.getTime() === yesterday.getTime() || lastDate.getTime() === today.getTime())

  if (isConsecutive && lastDate.getTime() !== today.getTime()) {
    // Continue streak
    const newStreak = existingStreak.currentStreak + 1
    const newLongest = Math.max(newStreak, existingStreak.longestStreak)

    // Check milestones
    const milestoneThresholds = [7, 14, 30, 60, 90]
    const currentMilestones = (existingStreak.milestones as number[]) || []
    const newMilestones = [...currentMilestones]

    for (const threshold of milestoneThresholds) {
      if (newStreak >= threshold && !currentMilestones.includes(threshold)) {
        newMilestones.push(threshold)
      }
    }

    await prisma.userStreak.update({
      where: { userId },
      data: {
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastCompletedDate: today,
        milestones: newMilestones,
      },
    })
  } else if (lastDate?.getTime() !== today.getTime()) {
    // Streak broken, start new
    await prisma.userStreak.update({
      where: { userId },
      data: {
        currentStreak: 1,
        lastCompletedDate: today,
        streakStartedDate: today,
      },
    })
  }
}
