import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import {
  validateVoidReason,
  validateVoidWindow,
  validateNotAlreadyVoided,
  formatVoidReason,
} from "@/lib/void-validation"

/**
 * PATCH /api/transactions/[id]/void
 *
 * Marks a transaction as voided.
 * Requires permVoid permission.
 * Transaction must be within 7-day window and not already voided.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check permission
    if (!session.user.permVoid) {
      return NextResponse.json(
        { error: "Permission denied - void permission required" },
        { status: 403 }
      )
    }

    // Parse transaction ID
    const { id } = await params
    const transactionId = parseInt(id, 10)
    if (isNaN(transactionId)) {
      return NextResponse.json({ error: "Invalid transaction ID" }, { status: 400 })
    }

    // Find transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    })

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    // Validate not already voided
    const voidedCheck = validateNotAlreadyVoided(transaction.isVoided)
    if (!voidedCheck.valid) {
      return NextResponse.json({ error: voidedCheck.error }, { status: 400 })
    }

    // Validate within void window
    const windowCheck = validateVoidWindow(transaction.createdAt)
    if (!windowCheck.valid) {
      return NextResponse.json({ error: windowCheck.error }, { status: 400 })
    }

    // Parse and validate request body
    const body = await request.json()
    const { reason, customReason } = body

    if (!reason) {
      return NextResponse.json({ error: "Reason is required" }, { status: 400 })
    }

    const reasonCheck = validateVoidReason(reason, customReason)
    if (!reasonCheck.valid) {
      return NextResponse.json({ error: reasonCheck.error }, { status: 400 })
    }

    // Perform void
    const voidedTransaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        isVoided: true,
        voidedAt: new Date(),
        voidedById: parseInt(session.user.id, 10),
        voidedByName: session.user.name || session.user.username,
        voidReason: formatVoidReason(reason, customReason),
      },
      include: {
        customer: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, fullname: true },
        },
        items: true,
      },
    })

    return NextResponse.json(voidedTransaction)
  } catch (error) {
    console.error("Failed to void transaction:", error)
    return NextResponse.json(
      { error: "Failed to void transaction" },
      { status: 500 }
    )
  }
}
