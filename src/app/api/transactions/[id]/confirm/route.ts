import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

/**
 * POST /api/transactions/[id]/confirm
 * Confirm a pending GCash payment
 *
 * Updates the transaction's paymentStatus from "pending" to "confirmed"
 * and optionally adds a GCash photo proof path
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const transactionId = parseInt(id)

    if (isNaN(transactionId)) {
      return NextResponse.json(
        { error: "Invalid transaction ID" },
        { status: 400 }
      )
    }

    // Get the transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      )
    }

    // Verify it's a GCash transaction
    if (transaction.paymentType !== "GCash") {
      return NextResponse.json(
        { error: "Only GCash transactions can be confirmed" },
        { status: 400 }
      )
    }

    // Verify it's pending
    if (transaction.paymentStatus !== "pending") {
      return NextResponse.json(
        { error: `Transaction is already ${transaction.paymentStatus}` },
        { status: 400 }
      )
    }

    // Parse request body for optional photo path
    let gcashPhotoPath: string | null = null
    try {
      const body = await request.json()
      gcashPhotoPath = body.gcashPhotoPath || null
    } catch {
      // No body or invalid JSON - that's okay, photo is optional
    }

    // Update transaction to confirmed
    const updatedTransaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        paymentStatus: "confirmed",
        ...(gcashPhotoPath && { gcashPhotoPath }),
      },
      include: {
        items: true,
        customer: true,
        user: true,
      },
    })

    return NextResponse.json(updatedTransaction)
  } catch (error) {
    console.error("Confirm transaction error:", error)
    return NextResponse.json(
      { error: "Failed to confirm transaction" },
      { status: 500 }
    )
  }
}
