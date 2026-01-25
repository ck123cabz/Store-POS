import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const taskId = parseInt(id)

    if (isNaN(taskId)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 })
    }

    const task = await prisma.employeeTask.findUnique({
      where: { id: taskId },
      include: {
        createdBy: { select: { id: true, fullname: true } },
        approvedBy: { select: { id: true, fullname: true } },
        assignedTo: { select: { id: true, fullname: true } },
      },
    })

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

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
      assignmentType: task.assignmentType,
      assignedToId: task.assignedToId,
      assignedToName: task.assignedTo?.fullname || null,
      allowDelegation: task.allowDelegation,
      required: task.required,
      streakBreaking: task.streakBreaking,
      notifyIfOverdue: task.notifyIfOverdue,
      notifyAfterMins: task.notifyAfterMins,
      status: task.status,
      createdById: task.createdById,
      createdByName: task.createdBy.fullname,
      approvedById: task.approvedById,
      approvedByName: task.approvedBy?.fullname || null,
      approvedAt: task.approvedAt,
      rejectionNote: task.rejectionNote,
      isActive: task.isActive,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    })
  } catch (error) {
    console.error("Failed to fetch task:", error)
    return NextResponse.json({ error: "Failed to fetch task" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
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

    const body = await request.json()

    // Validate type if provided
    if (body.type) {
      const validTypes = ["action", "inventory", "custom"]
      if (!validTypes.includes(body.type)) {
        return NextResponse.json(
          { error: "Invalid type. Must be: action, inventory, or custom" },
          { status: 400 }
        )
      }
    }

    // Validate deadlineTime format if provided
    if (body.deadlineTime && !/^\d{2}:\d{2}$/.test(body.deadlineTime)) {
      return NextResponse.json(
        { error: "Invalid deadlineTime format. Use HH:MM (e.g., 08:30)" },
        { status: 400 }
      )
    }

    const task = await prisma.employeeTask.update({
      where: { id: taskId },
      data: {
        name: body.name,
        type: body.type,
        description: body.description,
        icon: body.icon,
        sortOrder: body.sortOrder,
        deadlineTime: body.deadlineTime,
        deadlineType: body.deadlineType,
        daysOfWeek: body.daysOfWeek,
        assignmentType: body.assignmentType,
        assignedToId: body.assignedToId,
        allowDelegation: body.allowDelegation,
        required: body.required,
        streakBreaking: body.streakBreaking,
        notifyIfOverdue: body.notifyIfOverdue,
        notifyAfterMins: body.notifyAfterMins,
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
      deadlineTime: task.deadlineTime,
      status: task.status,
      createdByName: task.createdBy.fullname,
      assignedToName: task.assignedTo?.fullname || null,
    })
  } catch (error) {
    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }
    console.error("Failed to update task:", error)
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can delete tasks
    if (!session.user.permUsers) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 })
    }

    const { id } = await context.params
    const taskId = parseInt(id)

    if (isNaN(taskId)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 })
    }

    // Soft delete
    await prisma.employeeTask.update({
      where: { id: taskId },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }
    console.error("Failed to delete task:", error)
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 })
  }
}
