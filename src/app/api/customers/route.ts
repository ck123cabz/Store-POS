import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { name: "asc" },
    })
    return NextResponse.json(customers)
  } catch {
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (!name) {
      return NextResponse.json({ error: "Customer name is required" }, { status: 400 })
    }

    // Validate email format if provided
    const email = typeof body.email === "string" ? body.email.trim() : ""
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        phone: typeof body.phone === "string" ? body.phone.trim() : "",
        email,
        address: typeof body.address === "string" ? body.address.trim() : "",
      },
    })

    return NextResponse.json(customer, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 })
  }
}
