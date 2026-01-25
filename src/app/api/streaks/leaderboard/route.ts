import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "10")

    const streaks = await prisma.userStreak.findMany({
      where: { currentStreak: { gt: 0 } },
      orderBy: { currentStreak: "desc" },
      take: limit,
      include: {
        user: { select: { id: true, fullname: true, position: true } },
      },
    })

    const formatted = streaks.map((s, index) => ({
      rank: index + 1,
      userId: s.userId,
      userName: s.userName,
      fullname: s.user.fullname,
      position: s.user.position,
      currentStreak: s.currentStreak,
      longestStreak: s.longestStreak,
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Failed to fetch leaderboard:", error)
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 })
  }
}
