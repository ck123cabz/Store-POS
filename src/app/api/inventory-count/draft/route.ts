import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET: Retrieve current user's draft
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const draft = await prisma.inventoryCountDraft.findFirst({
      where: { userId: Number(session.user.id) },
      orderBy: { lastUpdatedAt: "desc" },
    })

    if (!draft) {
      return NextResponse.json(null)
    }

    return NextResponse.json({
      id: draft.id,
      counts: draft.counts,
      startedAt: draft.startedAt,
      lastUpdatedAt: draft.lastUpdatedAt,
    })
  } catch (error) {
    console.error("Failed to get draft:", error)
    return NextResponse.json({ error: "Failed to get draft" }, { status: 500 })
  }
}

// POST: Save/update draft
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { counts } = body

    if (!Array.isArray(counts)) {
      return NextResponse.json(
        { error: "counts must be an array" },
        { status: 400 }
      )
    }

    const userId = Number(session.user.id)

    // Upsert: update existing draft or create new one
    const existingDraft = await prisma.inventoryCountDraft.findFirst({
      where: { userId },
    })

    let draft
    if (existingDraft) {
      draft = await prisma.inventoryCountDraft.update({
        where: { id: existingDraft.id },
        data: { counts },
      })
    } else {
      draft = await prisma.inventoryCountDraft.create({
        data: {
          userId,
          userName: session.user.name || session.user.username,
          counts,
        },
      })
    }

    return NextResponse.json({
      id: draft.id,
      counts: draft.counts,
      startedAt: draft.startedAt,
      lastUpdatedAt: draft.lastUpdatedAt,
    })
  } catch (error) {
    console.error("Failed to save draft:", error)
    return NextResponse.json({ error: "Failed to save draft" }, { status: 500 })
  }
}

// DELETE: Discard draft
export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.inventoryCountDraft.deleteMany({
      where: { userId: Number(session.user.id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete draft:", error)
    return NextResponse.json(
      { error: "Failed to delete draft" },
      { status: 500 }
    )
  }
}
