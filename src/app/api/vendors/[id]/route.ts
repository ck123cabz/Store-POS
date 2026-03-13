import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logAudit, auditUser } from "@/lib/audit"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const vendor = await prisma.vendor.findUnique({
      where: { id: parseInt(id) },
      include: {
        ingredients: {
          include: { baseUnit: { select: { name: true } } },
        },
        purchases: { orderBy: { date: "desc" }, take: 10 },
      },
    })

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 })
    }

    return NextResponse.json({
      ...vendor,
      ingredients: vendor.ingredients.map((i) => ({
        id: i.id,
        name: i.name,
        avgCostPerBaseUnit: Number(i.avgCostPerBaseUnit),
        unit: i.baseUnit.name,
      })),
      purchases: vendor.purchases.map((p) => ({
        id: p.id,
        date: p.date,
        amount: Number(p.amount),
        category: p.category,
        description: p.description,
      })),
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch vendor" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const vendor = await prisma.vendor.update({
      where: { id: parseInt(id) },
      data: {
        name: body.name,
        category: body.category,
        contactName: body.contactName,
        phone: body.phone,
        email: body.email,
        paymentTerms: body.paymentTerms,
        accountNumber: body.accountNumber,
        notes: body.notes,
      },
    })

    await logAudit({
      entity: "vendor", entityId: vendor.id, action: "update",
      summary: `Updated vendor '${vendor.name}'`,
      userId: null, userName: null,
    })

    return NextResponse.json(vendor)
  } catch {
    return NextResponse.json({ error: "Failed to update vendor" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.vendor.delete({
      where: { id: parseInt(id) },
    })

    await logAudit({
      entity: "vendor", entityId: parseInt(id), action: "delete",
      summary: `Deleted vendor (id: ${id})`,
      userId: null, userName: null,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete vendor" }, { status: 500 })
  }
}
