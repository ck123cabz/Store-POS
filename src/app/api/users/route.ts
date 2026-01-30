import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import bcrypt from "bcryptjs"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!session.user.permUsers) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 })
    }
    const users = await prisma.user.findMany({
      orderBy: { fullname: "asc" },
      select: {
        id: true,
        username: true,
        fullname: true,
        permProducts: true,
        permCategories: true,
        permTransactions: true,
        permUsers: true,
        permSettings: true,
        permVoid: true,
        status: true,
      },
    })
    return NextResponse.json(users)
  } catch {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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
    const username = typeof body.username === "string" ? body.username.trim() : ""
    const password = typeof body.password === "string" ? body.password : ""
    const fullname = typeof body.fullname === "string" ? body.fullname.trim() : ""

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 })
    }

    if (!password || password.length < 4) {
      return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 })
    }

    if (!fullname) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 })
    }

    // Check if username already exists
    const existing = await prisma.user.findUnique({
      where: { username },
    })

    if (existing) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        fullname,
        permProducts: body.permProducts === true,
        permCategories: body.permCategories === true,
        permTransactions: body.permTransactions === true,
        permUsers: body.permUsers === true,
        permSettings: body.permSettings === true,
        permVoid: body.permVoid === true,
        status: "Logged Out",
      },
      select: {
        id: true,
        username: true,
        fullname: true,
        permProducts: true,
        permCategories: true,
        permTransactions: true,
        permUsers: true,
        permSettings: true,
        permVoid: true,
        status: true,
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
