import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

/**
 * DELETE /api/transactions/[id]
 *
 * Deletes a held order (status=0). Only unpaid/on-hold transactions
 * can be deleted — paid transactions must be voided instead.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const transactionId = parseInt(id, 10)
    if (isNaN(transactionId)) {
      return NextResponse.json({ error: "Invalid transaction ID" }, { status: 400 })
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    })

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    // Only allow deleting hold orders (status=0, unpaid)
    if (transaction.status !== 0) {
      return NextResponse.json(
        { error: "Only held orders can be deleted. Use void for paid transactions." },
        { status: 400 }
      )
    }

    // Delete items first, then the transaction
    await prisma.$transaction(async (tx) => {
      await tx.transactionItem.deleteMany({
        where: { transactionId },
      })
      await tx.transaction.delete({
        where: { id: transactionId },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete hold order:", error)
    return NextResponse.json(
      { error: "Failed to delete hold order" },
      { status: 500 }
    )
  }
}
