import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

/**
 * GET /api/customers/[id]/tab
 * Returns customer's tab history (TabSettlement records) and current balance.
 *
 * Response: { customer: { id, name, tabBalance }, settlements: TabSettlement[] }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const customerId = parseInt(id)

    if (isNaN(customerId)) {
      return NextResponse.json({ error: "Invalid customer ID" }, { status: 400 })
    }

    // Fetch customer with tab settlements
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        tabBalance: true,
        creditLimit: true,
        tabStatus: true,
        tabSettlements: {
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        tabBalance: Number(customer.tabBalance),
        creditLimit: Number(customer.creditLimit),
        tabStatus: customer.tabStatus,
      },
      settlements: customer.tabSettlements.map((settlement) => ({
        id: settlement.id,
        amount: Number(settlement.amount),
        paymentType: settlement.paymentType,
        paymentInfo: settlement.paymentInfo,
        previousBalance: Number(settlement.previousBalance),
        newBalance: Number(settlement.newBalance),
        createdAt: settlement.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error("Failed to fetch tab history:", error)
    return NextResponse.json({ error: "Failed to fetch tab history" }, { status: 500 })
  }
}

/**
 * POST /api/customers/[id]/tab
 * Creates a new tab settlement (payment against balance).
 *
 * Request body: { amount: number, paymentMethod: "Cash" | "GCash", paymentInfo?: string }
 *
 * Validations:
 * - amount must be > 0
 * - amount must be <= customer's current tabBalance
 * - customer must exist
 *
 * Response: { success: true, newBalance: number, settlement: TabSettlement }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const customerId = parseInt(id)

    if (isNaN(customerId)) {
      return NextResponse.json({ error: "Invalid customer ID" }, { status: 400 })
    }

    const body = await request.json()
    const { amount, paymentMethod, paymentInfo } = body

    // ═══════════════════════════════════════════════════════════════════════════
    // VALIDATION (T056)
    // ═══════════════════════════════════════════════════════════════════════════

    // Validate amount is a positive number
    const parsedAmount = Number(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      )
    }

    // Validate payment method
    const validPaymentMethods = ["Cash", "GCash"]
    if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { error: "Payment method must be 'Cash' or 'GCash'" },
        { status: 400 }
      )
    }

    // GCash requires reference number
    if (paymentMethod === "GCash") {
      const reference = typeof paymentInfo === "string" ? paymentInfo.trim() : ""
      if (!reference || reference.length < 10) {
        return NextResponse.json(
          { error: "GCash reference number must be at least 10 characters" },
          { status: 400 }
        )
      }
    }

    // Fetch customer to validate existence and balance
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        tabBalance: true,
      },
    })

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    const currentBalance = Number(customer.tabBalance)

    // Validate amount does not exceed current balance
    if (parsedAmount > currentBalance) {
      return NextResponse.json(
        {
          error: `Amount (${parsedAmount}) exceeds current tab balance (${currentBalance})`,
          currentBalance,
        },
        { status: 400 }
      )
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ATOMIC TRANSACTION (Principle IV: Data Integrity)
    // ═══════════════════════════════════════════════════════════════════════════

    const result = await prisma.$transaction(async (tx) => {
      const newBalance = currentBalance - parsedAmount

      // Create TabSettlement record
      const settlement = await tx.tabSettlement.create({
        data: {
          customerId,
          amount: parsedAmount,
          paymentType: paymentMethod,
          paymentInfo: paymentMethod === "GCash" ? paymentInfo?.trim() : null,
          previousBalance: currentBalance,
          newBalance,
          userId: parseInt(session.user.id),
        },
      })

      // Decrement customer's tabBalance
      await tx.customer.update({
        where: { id: customerId },
        data: {
          tabBalance: newBalance,
        },
      })

      return { settlement, newBalance }
    })

    return NextResponse.json({
      success: true,
      newBalance: result.newBalance,
      settlement: {
        id: result.settlement.id,
        customerId: result.settlement.customerId,
        amount: Number(result.settlement.amount),
        paymentType: result.settlement.paymentType,
        paymentInfo: result.settlement.paymentInfo,
        previousBalance: Number(result.settlement.previousBalance),
        newBalance: Number(result.settlement.newBalance),
        createdAt: result.settlement.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("Failed to create tab settlement:", error)
    return NextResponse.json({ error: "Failed to create tab settlement" }, { status: 500 })
  }
}
