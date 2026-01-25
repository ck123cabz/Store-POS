import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const MILESTONES = [
  { days: 7, badge: "🏅", title: "One Week Strong" },
  { days: 14, badge: "🏅", title: "Two Week Champion" },
  { days: 30, badge: "🏆", title: "Monthly Master" },
  { days: 60, badge: "🏆", title: "Consistency King" },
  { days: 90, badge: "👑", title: "Legendary" },
]

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = parseInt(session.user.id)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dayOfWeek = today.getDay()
    const now = new Date()
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`

    // Fetch all data in parallel
    const [tasks, completions, streak, lowStockIngredients, teamStreaks] = await Promise.all([
      // Today's tasks
      prisma.employeeTask.findMany({
        where: {
          isActive: true,
          status: "approved",
          daysOfWeek: { has: dayOfWeek },
        },
        orderBy: [{ sortOrder: "asc" }, { deadlineTime: "asc" }],
        include: {
          assignedTo: { select: { id: true, fullname: true } },
        },
      }),
      // Today's completions
      prisma.taskCompletion.findMany({
        where: { date: today },
        include: {
          completedBy: { select: { id: true, fullname: true } },
        },
      }),
      // User's streak
      prisma.userStreak.findUnique({
        where: { userId },
      }),
      // Count low stock (parLevel > 0 and quantity below 50% of parLevel)
      prisma.ingredient.findMany({
        where: {
          isActive: true,
          parLevel: { gt: 0 },
        },
        select: { id: true, quantity: true, parLevel: true },
      }),
      // Team streaks for comparison
      prisma.userStreak.findMany({
        take: 5,
        orderBy: { currentStreak: "desc" },
        include: {
          user: { select: { id: true, fullname: true } },
        },
      }),
    ])

    // Calculate low stock count by filtering in JavaScript
    const lowStockCount = lowStockIngredients.filter(i =>
      Number(i.quantity) <= i.parLevel * 0.5
    ).length

    // Build completion map
    const completionMap = new Map(completions.map((c) => [c.taskId, c]))

    // Format tasks with status
    const formattedTasks = tasks.map((t) => {
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
        icon: t.icon,
        deadlineTime: t.deadlineTime,
        required: t.required,
        streakBreaking: t.streakBreaking,
        assignedToName: t.assignedTo?.fullname || null,
        status,
        completedByName: completion?.completedBy?.fullname || null,
        completedAt: completion?.completedAt || null,
        wasOnTime: completion?.wasOnTime ?? null,
      }
    })

    // Task summary
    const taskSummary = {
      total: formattedTasks.length,
      completed: formattedTasks.filter((t) => t.status === "completed").length,
      inProgress: formattedTasks.filter((t) => t.status === "in_progress").length,
      pending: formattedTasks.filter((t) => t.status === "pending").length,
      overdue: formattedTasks.filter((t) => t.status === "overdue").length,
    }

    // Format streak
    const achievedDays = (streak?.milestones as number[]) || []
    const achievedMilestones = MILESTONES.filter((m) => achievedDays.includes(m.days))
    const nextMilestone = MILESTONES.find((m) => !achievedDays.includes(m.days)) || null

    const streakInfo = {
      currentStreak: streak?.currentStreak || 0,
      longestStreak: streak?.longestStreak || 0,
      lastCompletedDate: streak?.lastCompletedDate || null,
      achievedMilestones,
      nextMilestone,
      daysToNextMilestone: nextMilestone && streak
        ? nextMilestone.days - streak.currentStreak
        : nextMilestone?.days || null,
    }

    // Team leaderboard
    const leaderboard = teamStreaks.map((s, index) => ({
      rank: index + 1,
      userId: s.userId,
      fullname: s.user.fullname,
      currentStreak: s.currentStreak,
      isCurrentUser: s.userId === userId,
    }))

    // Alerts
    const alerts = []
    if (taskSummary.overdue > 0) {
      alerts.push({
        type: "warning",
        icon: "⏰",
        message: `${taskSummary.overdue} task${taskSummary.overdue > 1 ? "s" : ""} overdue`,
      })
    }
    if (lowStockCount > 0) {
      alerts.push({
        type: "info",
        icon: "📦",
        message: `${lowStockCount} ingredient${lowStockCount > 1 ? "s" : ""} low on stock`,
      })
    }

    return NextResponse.json({
      date: today.toISOString(),
      currentTime,
      user: {
        id: userId,
        name: session.user.name,
      },
      tasks: formattedTasks,
      taskSummary,
      streak: streakInfo,
      leaderboard,
      alerts,
    })
  } catch (error) {
    console.error("Failed to fetch employee dashboard:", error)
    return NextResponse.json({ error: "Failed to fetch employee dashboard" }, { status: 500 })
  }
}
