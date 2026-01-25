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

    const streak = await prisma.userStreak.findUnique({
      where: { userId },
    })

    if (!streak) {
      return NextResponse.json({
        currentStreak: 0,
        longestStreak: 0,
        lastCompletedDate: null,
        streakStartedDate: null,
        milestones: [],
        achievedMilestones: [],
        nextMilestone: MILESTONES[0],
      })
    }

    const achievedDays = (streak.milestones as number[]) || []
    const achievedMilestones = MILESTONES.filter((m) => achievedDays.includes(m.days))
    const nextMilestone = MILESTONES.find((m) => !achievedDays.includes(m.days)) || null

    return NextResponse.json({
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastCompletedDate: streak.lastCompletedDate,
      streakStartedDate: streak.streakStartedDate,
      milestones: achievedDays,
      achievedMilestones,
      nextMilestone,
      daysToNextMilestone: nextMilestone
        ? nextMilestone.days - streak.currentStreak
        : null,
    })
  } catch (error) {
    console.error("Failed to fetch streak:", error)
    return NextResponse.json({ error: "Failed to fetch streak" }, { status: 500 })
  }
}
