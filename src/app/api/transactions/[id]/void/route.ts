import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { logAudit, auditUser } from "@/lib/audit"
import { getSettings } from "@/lib/settings-server"
import {
  validateVoidReason,
  validateVoidWindow,
  validateNotAlreadyVoided,
  formatVoidReason,
} from "@/lib/void-validation"

/**
 * PATCH /api/transactions/[id]/void
 *
 * Voids a transaction, restores stock/ingredients, reverses customer metrics,
 * and creates audit trail records.
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

    // Find transaction with items
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { items: true },
    })

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    // Validate not already voided
    const voidedCheck = validateNotAlreadyVoided(transaction.isVoided)
    if (!voidedCheck.valid) {
      return NextResponse.json({ error: voidedCheck.error }, { status: 400 })
    }

    // Load settings for configurable void window and reasons
    const settings = await getSettings()

    // Validate within void window
    const windowCheck = validateVoidWindow(transaction.createdAt, settings.voidWindowDays)
    if (!windowCheck.valid) {
      return NextResponse.json({ error: windowCheck.error }, { status: 400 })
    }

    // Parse and validate request body
    const body = await request.json()
    const { reason, customReason } = body

    if (!reason) {
      return NextResponse.json({ error: "Reason is required" }, { status: 400 })
    }

    const voidReasons = settings.voidReasons as string[]
    const reasonCheck = validateVoidReason(reason, customReason, voidReasons)
    if (!reasonCheck.valid) {
      return NextResponse.json({ error: reasonCheck.error }, { status: 400 })
    }

    const formattedReason = formatVoidReason(reason, customReason)
    const { nanoid } = await import("nanoid")
    const voidChangeId = nanoid(10)
    const userId = parseInt(session.user.id, 10)
    const userName = session.user.name || session.user.username || "Unknown"

    // Perform void + stock restoration atomically
    const voidedTransaction = await prisma.$transaction(async (tx) => {
      // 1. Mark transaction as voided
      const updated = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          isVoided: true,
          voidedAt: new Date(),
          voidedById: userId,
          voidedByName: userName,
          voidReason: formattedReason,
        },
        include: {
          customer: { select: { id: true, name: true } },
          user: { select: { id: true, fullname: true } },
          items: true,
        },
      })

      // 2. Cancel non-served kitchen orders
      await tx.kitchenOrder.updateMany({
        where: {
          transactionId: transactionId,
          status: { not: "served" },
        },
        data: { status: "cancelled" },
      })

      // 3. Restore stock if transaction was paid (status=1)
      if (transaction.status === 1) {
        const orderNumber = transaction.orderNumber

        for (const item of transaction.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            include: {
              linkedVariant: {
                include: {
                  ingredient: {
                    include: { baseUnit: true },
                  },
                },
              },
              recipeItems: {
                include: {
                  ingredient: {
                    include: { baseUnit: true },
                  },
                },
              },
            },
          })

          if (!product) continue

          // 3a. Restore product stock if tracked
          if (product.trackStock) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                quantity: { increment: item.quantity },
                weeklyUnitsSold: { decrement: item.quantity },
              },
            })
          }

          // 3b. Restore linked variant ingredient stock
          if (product.linkedVariantId && product.linkedVariant) {
            const ingredient = product.linkedVariant.ingredient
            const baseUnitsToRestore = Number(product.linkedVariant.baseUnitsPerVariant) * item.quantity
            const oldStockQty = Number(ingredient.stockQty)
            const newStockQty = oldStockQty + baseUnitsToRestore

            await tx.ingredient.update({
              where: { id: ingredient.id },
              data: {
                stockQty: newStockQty,
                lastUpdated: new Date(),
              },
            })

            await tx.ingredientHistory.create({
              data: {
                ingredientId: ingredient.id,
                ingredientName: ingredient.name,
                changeId: voidChangeId,
                field: "stockQty",
                oldValue: oldStockQty.toString(),
                newValue: newStockQty.toString(),
                source: "void_reversal",
                reason: "transaction_void",
                reasonNote: `Voided ${item.quantity}x ${product.name} (Order #${orderNumber}) — ${formattedReason}`,
                purchaseVariantId: product.linkedVariant.id,
                userId,
                userName,
              },
            })
          }

          // 3c. Restore recipe ingredient stock
          if (product.recipeItems.length > 0) {
            for (const recipeItem of product.recipeItems) {
              const ingredient = recipeItem.ingredient
              const baseUnitsToRestore = Number(recipeItem.baseQuantity) * item.quantity
              const oldStockQty = Number(ingredient.stockQty)
              const newStockQty = oldStockQty + baseUnitsToRestore

              await tx.ingredient.update({
                where: { id: ingredient.id },
                data: {
                  stockQty: newStockQty,
                  lastUpdated: new Date(),
                },
              })

              await tx.ingredientHistory.create({
                data: {
                  ingredientId: ingredient.id,
                  ingredientName: ingredient.name,
                  changeId: voidChangeId,
                  field: "stockQty",
                  oldValue: oldStockQty.toString(),
                  newValue: newStockQty.toString(),
                  source: "void_reversal",
                  reason: "transaction_void",
                  reasonNote: `Voided ${item.quantity}x ${product.name} restored ${baseUnitsToRestore} ${ingredient.baseUnit.name} (Order #${orderNumber})`,
                  userId,
                  userName,
                },
              })
            }
          }
        }

        // 4. Reverse customer metrics if customer was associated
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
    }, { timeout: 15000 })

    await logAudit({
      entity: "transaction", entityId: transactionId, action: "void",
      changes: { isVoided: { old: false, new: true }, voidReason: { old: null, new: formattedReason } },
      summary: `Voided transaction #${transaction.orderNumber} — ${formattedReason}`,
      ...auditUser(session),
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
