import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

/**
 * POST /api/transactions/[id]/cancel
 * Cancel a pending GCash payment
 *
 * Updates the transaction's paymentStatus from "pending" to "cancelled"
 * and restores any stock that was decremented
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

    // Get the transaction with items
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        items: true,
      },
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
        { error: "Only GCash transactions can be cancelled via this endpoint" },
        { status: 400 }
      )
    }

    // Verify it's pending
    if (transaction.paymentStatus !== "pending") {
      return NextResponse.json(
        { error: `Cannot cancel: transaction is already ${transaction.paymentStatus}` },
        { status: 400 }
      )
    }

    // Parse request body for optional cancellation reason
    let reason = "GCash payment not received"
    try {
      const body = await request.json()
      reason = body.reason || reason
    } catch {
      // No body or invalid JSON - use default reason
    }

    // Use transaction to atomically:
    // 1. Update payment status to cancelled
    // 2. Restore stock for items (if stock was decremented)
    const updatedTransaction = await prisma.$transaction(async (tx) => {
      // Update the transaction status
      const updated = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          paymentStatus: "cancelled",
          // Store cancellation reason in paymentInfo
          paymentInfo: JSON.stringify({
            originalReference: transaction.paymentInfo,
            cancelledAt: new Date().toISOString(),
            cancelledBy: session.user.id,
            reason,
          }),
        },
      })

      // If the transaction was marked as paid (status=1), restore stock
      if (transaction.status === 1) {
        for (const item of transaction.items) {
          // Restore product stock
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            include: {
              linkedIngredient: true,
              recipeItems: {
                include: { ingredient: true },
              },
            },
          })

          if (!product) continue

          // Restore product stock if tracked
          if (product.trackStock) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                quantity: { increment: item.quantity },
                weeklyUnitsSold: { decrement: item.quantity },
              },
            })
          }

          // Restore linked ingredient stock
          if (product.linkedIngredientId && product.linkedIngredient) {
            await tx.ingredient.update({
              where: { id: product.linkedIngredientId },
              data: {
                quantity: { increment: item.quantity },
                lastUpdated: new Date(),
              },
            })
          }

          // Restore recipe ingredient stock
          if (product.recipeItems.length > 0) {
            for (const recipeItem of product.recipeItems) {
              const totalUsage = Number(recipeItem.quantity) * item.quantity
              await tx.ingredient.update({
                where: { id: recipeItem.ingredientId },
                data: {
                  quantity: { increment: totalUsage },
                  lastUpdated: new Date(),
                },
              })
            }
          }
        }

        // If customer was associated, reverse their metrics
        if (transaction.customerId) {
          const customer = await tx.customer.findUnique({
            where: { id: transaction.customerId },
          })

          if (customer && customer.visitCount > 0) {
            const newVisitCount = customer.visitCount - 1
            const newLifetimeSpend = Math.max(
              0,
              Number(customer.lifetimeSpend) - Number(transaction.total)
            )
            const newAvgTicket = newVisitCount > 0
              ? newLifetimeSpend / newVisitCount
              : 0

            await tx.customer.update({
              where: { id: transaction.customerId },
              data: {
                visitCount: newVisitCount,
                lifetimeSpend: newLifetimeSpend,
                avgTicket: Math.round(newAvgTicket * 100) / 100,
                isRegular: newVisitCount >= 5,
              },
            })
          }
        }
      }

      return updated
    })

    return NextResponse.json({
      ...updatedTransaction,
      message: "Transaction cancelled successfully",
    })
  } catch (error) {
    console.error("Cancel transaction error:", error)
    return NextResponse.json(
      { error: "Failed to cancel transaction" },
      { status: 500 }
    )
  }
}
