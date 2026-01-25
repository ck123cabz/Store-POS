import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const category = searchParams.get("category")
    const status = searchParams.get("status")

    const where: {
      date?: { gte?: Date; lte?: Date }
      category?: string
      paymentStatus?: string
    } = {}

    if (dateFrom || dateTo) {
      where.date = {}
      if (dateFrom) where.date.gte = new Date(dateFrom)
      if (dateTo) where.date.lte = new Date(dateTo + "T23:59:59.999Z")
    }

    if (category) where.category = category
    if (status) where.paymentStatus = status

    const purchases = await prisma.purchase.findMany({
      where,
      include: { vendor: true },
      orderBy: { date: "desc" },
      take: 100,
    })

    const formatted = purchases.map((p) => ({
      id: p.id,
      date: p.date,
      vendorId: p.vendorId,
      vendorName: p.vendor?.name || null,
      category: p.category,
      description: p.description,
      amount: Number(p.amount),
      paymentMethod: p.paymentMethod,
      paymentStatus: p.paymentStatus,
      dueDate: p.dueDate,
    }))

    // Calculate totals by category
    const byCategory = formatted.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + p.amount
      return acc
    }, {} as Record<string, number>)

    const totalAmount = formatted.reduce((sum, p) => sum + p.amount, 0)

    return NextResponse.json({
      items: formatted,
      summary: {
        totalEntries: formatted.length,
        totalAmount: Math.round(totalAmount * 100) / 100,
        byCategory,
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch purchases" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const purchase = await prisma.purchase.create({
      data: {
        date: body.date ? new Date(body.date) : new Date(),
        vendorId: body.vendorId || null,
        category: body.category,
        description: body.description,
        amount: body.amount,
        paymentMethod: body.paymentMethod || null,
        paymentStatus: body.paymentStatus || "Paid",
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
      },
      include: { vendor: true },
    })

    return NextResponse.json({
      id: purchase.id,
      date: purchase.date,
      vendorId: purchase.vendorId,
      vendorName: purchase.vendor?.name || null,
      category: purchase.category,
      description: purchase.description,
      amount: Number(purchase.amount),
      paymentMethod: purchase.paymentMethod,
      paymentStatus: purchase.paymentStatus,
      dueDate: purchase.dueDate,
    }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create purchase" }, { status: 500 })
  }
}
