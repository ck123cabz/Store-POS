import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tasks = await prisma.employeeTask.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { deadlineTime: "asc" }],
      include: {
        createdBy: { select: { id: true, fullname: true } },
        approvedBy: { select: { id: true, fullname: true } },
        assignedTo: { select: { id: true, fullname: true } },
      },
    })

    const formatted = tasks.map((t) => ({
      id: t.id,
      name: t.name,
      type: t.type,
      description: t.description,
      icon: t.icon,
      sortOrder: t.sortOrder,
      deadlineTime: t.deadlineTime,
      deadlineType: t.deadlineType,
      daysOfWeek: t.daysOfWeek,
      assignmentType: t.assignmentType,
      assignedToId: t.assignedToId,
      assignedToName: t.assignedTo?.fullname || null,
      allowDelegation: t.allowDelegation,
      required: t.required,
      streakBreaking: t.streakBreaking,
      notifyIfOverdue: t.notifyIfOverdue,
      notifyAfterMins: t.notifyAfterMins,
      status: t.status,
      createdById: t.createdById,
      createdByName: t.createdBy.fullname,
      approvedById: t.approvedById,
      approvedByName: t.approvedBy?.fullname || null,
      approvedAt: t.approvedAt,
      rejectionNote: t.rejectionNote,
      createdAt: t.createdAt,
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Failed to fetch tasks:", error)
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.type || !body.deadlineTime) {
      return NextResponse.json(
        { error: "Missing required fields: name, type, deadlineTime" },
        { status: 400 }
      )
    }

    // Validate type
    const validTypes = ["action", "inventory", "custom"]
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be: action, inventory, or custom" },
        { status: 400 }
      )
    }

    // Validate deadlineTime format (HH:MM)
    if (!/^\d{2}:\d{2}$/.test(body.deadlineTime)) {
      return NextResponse.json(
        { error: "Invalid deadlineTime format. Use HH:MM (e.g., 08:30)" },
        { status: 400 }
      )
    }

    const userId = parseInt(session.user.id)
    const isAdmin = session.user.permUsers

    const task = await prisma.employeeTask.create({
      data: {
        name: body.name,
        type: body.type,
        description: body.description || null,
        icon: body.icon || "📋",
        sortOrder: body.sortOrder ?? 0,
        deadlineTime: body.deadlineTime,
        deadlineType: body.deadlineType || "daily",
        daysOfWeek: body.daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
        assignmentType: body.assignmentType || "anyone",
        assignedToId: body.assignedToId || null,
        allowDelegation: body.allowDelegation || false,
        required: body.required || false,
        streakBreaking: body.streakBreaking || false,
        notifyIfOverdue: body.notifyIfOverdue || false,
        notifyAfterMins: body.notifyAfterMins ?? 30,
        status: isAdmin ? "approved" : "pending",
        createdById: userId,
        approvedById: isAdmin ? userId : null,
        approvedAt: isAdmin ? new Date() : null,
      },
      include: {
        createdBy: { select: { id: true, fullname: true } },
        assignedTo: { select: { id: true, fullname: true } },
      },
    })

    return NextResponse.json({
      id: task.id,
      name: task.name,
      type: task.type,
      description: task.description,
      icon: task.icon,
      sortOrder: task.sortOrder,
      deadlineTime: task.deadlineTime,
      deadlineType: task.deadlineType,
      daysOfWeek: task.daysOfWeek,
      status: task.status,
      createdByName: task.createdBy.fullname,
      assignedToName: task.assignedTo?.fullname || null,
    }, { status: 201 })
  } catch (error) {
    console.error("Failed to create task:", error)
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 })
  }
}
