import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { Prisma } from "@prisma/client"

interface TransactionItem {
  id: number
  productName: string
  sku?: string
  price: number
  quantity: number
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const onHold = searchParams.get("onHold")
    const customerOrders = searchParams.get("customerOrders")
    const userId = searchParams.get("userId")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const till = searchParams.get("till")

    const where: Prisma.TransactionWhereInput = {}

    if (onHold === "true") {
      where.status = 0
      where.refNumber = { not: "" }
    } else if (customerOrders === "true") {
      where.status = 0
      where.customerId = { not: null }
      where.refNumber = ""
    } else if (status !== null && status !== "") {
      where.status = parseInt(status)
    }

    // Additional filters for transaction history
    if (userId) {
      where.userId = parseInt(userId)
    }

    if (till) {
      where.tillNumber = parseInt(till)
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        // Include the entire end day
        where.createdAt.lte = new Date(dateTo + "T23:59:59.999Z")
      }
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        items: true,
        customer: true,
        user: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    return NextResponse.json(transactions)
  } catch {
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const orderNumber = Math.floor(Date.now() / 1000)

    const transaction = await prisma.transaction.create({
      data: {
        orderNumber,
        refNumber: body.refNumber || "",
        discount: body.discount || 0,
        customerId: body.customerId,
        userId: parseInt(session.user.id),
        status: body.status,
        subtotal: body.subtotal,
        taxAmount: body.taxAmount || 0,
        total: body.total,
        paidAmount: body.paidAmount,
        changeAmount: body.changeAmount,
        paymentType: body.paymentType || "",
        paymentInfo: body.paymentInfo || "",
        tillNumber: body.tillNumber || 1,
        macAddress: body.macAddress || "",
        items: {
          create: body.items.map((item: TransactionItem) => ({
            productId: item.id,
            productName: item.productName,
            sku: item.sku || String(item.id),
            price: item.price,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: true,
      },
    })

    // Decrement stock if paid
    if (body.status === 1 && body.paidAmount >= body.total) {
      for (const item of body.items) {
        const product = await prisma.product.findUnique({
          where: { id: item.id },
        })
        if (product?.trackStock) {
          await prisma.product.update({
            where: { id: item.id },
            data: {
              quantity: { decrement: item.quantity },
            },
          })
        }
      }
    }

    return NextResponse.json(transaction)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 })
  }
}
