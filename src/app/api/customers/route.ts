import { NextResponse } from "next/server"
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

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const customer = await prisma.customer.create({
      data: {
        name: body.name,
        phone: body.phone || "",
        email: body.email || "",
        address: body.address || "",
      },
    })

    return NextResponse.json(customer)
  } catch {
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 })
  }
}
