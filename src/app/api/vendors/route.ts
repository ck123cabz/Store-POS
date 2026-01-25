import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const vendors = await prisma.vendor.findMany({
      include: {
        _count: {
          select: { ingredients: true, purchases: true },
        },
      },
      orderBy: { name: "asc" },
    })

    const formatted = vendors.map((v) => ({
      id: v.id,
      name: v.name,
      category: v.category,
      contactName: v.contactName,
      phone: v.phone,
      email: v.email,
      paymentTerms: v.paymentTerms,
      accountNumber: v.accountNumber,
      notes: v.notes,
      ingredientCount: v._count.ingredients,
      purchaseCount: v._count.purchases,
    }))

    return NextResponse.json(formatted)
  } catch {
    return NextResponse.json({ error: "Failed to fetch vendors" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const vendor = await prisma.vendor.create({
      data: {
        name: body.name,
        category: body.category,
        contactName: body.contactName || null,
        phone: body.phone || null,
        email: body.email || null,
        paymentTerms: body.paymentTerms || null,
        accountNumber: body.accountNumber || null,
        notes: body.notes || null,
      },
    })

    return NextResponse.json(vendor, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create vendor" }, { status: 500 })
  }
}
