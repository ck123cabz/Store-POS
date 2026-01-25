import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import bcrypt from "bcryptjs"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!session.user.permUsers) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 })
    }
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        username: true,
        fullname: true,
        permProducts: true,
        permCategories: true,
        permTransactions: true,
        permUsers: true,
        permSettings: true,
        status: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch {
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!session.user.permUsers) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 })
    }

    const body = await request.json()

    // Validate required fields
    const fullname = typeof body.fullname === "string" ? body.fullname.trim() : ""
    if (!fullname) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 })
    }

    // Prepare update data
    const updateData: {
      fullname: string
      permProducts: boolean
      permCategories: boolean
      permTransactions: boolean
      permUsers: boolean
      permSettings: boolean
      password?: string
    } = {
      fullname,
      permProducts: body.permProducts === true,
      permCategories: body.permCategories === true,
      permTransactions: body.permTransactions === true,
      permUsers: body.permUsers === true,
      permSettings: body.permSettings === true,
    }

    // Only update password if provided
    const password = typeof body.password === "string" ? body.password : ""
    if (password) {
      if (password.length < 4) {
        return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 })
      }
      updateData.password = await bcrypt.hash(password, 10)
    }

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        username: true,
        fullname: true,
        permProducts: true,
        permCategories: true,
        permTransactions: true,
        permUsers: true,
        permSettings: true,
        status: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    // Check if it's a "record not found" error
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = parseInt(id)

  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!session.user.permUsers) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 })
    }

    // Prevent deleting admin user (id: 1)
    if (userId === 1) {
      return NextResponse.json({ error: "Cannot delete the admin user" }, { status: 400 })
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { _count: { select: { transactions: true } } },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if user has transactions
    if (user._count.transactions > 0) {
      return NextResponse.json(
        { error: "Cannot delete user with existing transactions" },
        { status: 400 }
      )
    }

    await prisma.user.delete({ where: { id: userId } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
