import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const streaks = await prisma.userStreak.findMany({
      orderBy: { currentStreak: "desc" },
      include: {
        user: { select: { id: true, fullname: true, position: true } },
      },
    })

    const formatted = streaks.map((s) => ({
      userId: s.userId,
      userName: s.userName,
      fullname: s.user.fullname,
      position: s.user.position,
      currentStreak: s.currentStreak,
      longestStreak: s.longestStreak,
      lastCompletedDate: s.lastCompletedDate,
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Failed to fetch team streaks:", error)
    return NextResponse.json({ error: "Failed to fetch team streaks" }, { status: 500 })
  }
}
