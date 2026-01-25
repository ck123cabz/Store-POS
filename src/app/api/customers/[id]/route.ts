import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(id) },
    })

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    return NextResponse.json(customer)
  } catch {
    return NextResponse.json({ error: "Failed to fetch customer" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()

    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (!name) {
      return NextResponse.json({ error: "Customer name is required" }, { status: 400 })
    }

    // Validate email format if provided
    const email = typeof body.email === "string" ? body.email.trim() : ""
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    const customer = await prisma.customer.update({
      where: { id: parseInt(id) },
      data: {
        name,
        email,
        phone: typeof body.phone === "string" ? body.phone.trim() : "",
        address: typeof body.address === "string" ? body.address.trim() : "",
      },
    })

    return NextResponse.json(customer)
  } catch (error) {
    // Check if it's a "record not found" error
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(id) },
      include: { _count: { select: { transactions: true } } },
    })

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    // Check if customer has transactions
    if (customer._count.transactions > 0) {
      return NextResponse.json(
        { error: "Cannot delete customer with existing transactions" },
        { status: 400 }
      )
    }

    await prisma.customer.delete({ where: { id: parseInt(id) } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 })
  }
}
