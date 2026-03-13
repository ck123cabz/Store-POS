import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { logAudit, auditUser } from "@/lib/audit"
import { ProductStatus } from "@prisma/client"

const VALID_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  DRAFT: [ProductStatus.ACTIVE, ProductStatus.DISCONTINUED],
  ACTIVE: [ProductStatus.UNAVAILABLE, ProductStatus.DISCONTINUED],
  UNAVAILABLE: [ProductStatus.ACTIVE, ProductStatus.DISCONTINUED],
  DISCONTINUED: [ProductStatus.ACTIVE],
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!session.user.permProducts) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 })
    }

    const { id } = await params
    const productId = parseInt(id)
    const body = await request.json()
    const newStatus = body.status as ProductStatus

    if (!Object.values(ProductStatus).includes(newStatus)) {
      return NextResponse.json(
        { error: `Invalid status: ${newStatus}` },
        { status: 400 }
      )
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, status: true },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const allowed = VALID_TRANSITIONS[product.status]
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Cannot transition from ${product.status} to ${newStatus}`,
          currentStatus: product.status,
          allowedTransitions: allowed,
        },
        { status: 400 }
      )
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        status: newStatus,
        statusChangedAt: new Date(),
        statusChangedBy: session.user.name ?? session.user.username,
      },
      select: {
        id: true,
        name: true,
        status: true,
        statusChangedAt: true,
        statusChangedBy: true,
      },
    })

    await logAudit({
      entity: "product", entityId: productId, action: "status_change",
      changes: { status: { old: product.status, new: newStatus } },
      summary: `Changed product '${product.name}' status: ${product.status} → ${newStatus}`,
      ...auditUser(session),
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json(
      { error: "Failed to update product status" },
      { status: 500 }
    )
  }
}
