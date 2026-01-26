import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeCosting = searchParams.get("includeCosting") === "true"

    const products = await prisma.product.findMany({
      include: { category: true },
      orderBy: { name: "asc" },
    })

    const formatted = products.map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      categoryId: p.categoryId,
      categoryName: p.category.name,
      quantity: p.quantity,
      trackStock: p.trackStock,
      image: p.image,
      ...(includeCosting && {
        trueCost: p.trueCost ? Number(p.trueCost) : null,
        trueMargin: p.trueMargin ? Number(p.trueMargin) : null,
        trueMarginPercent: p.trueMarginPercent ? Number(p.trueMarginPercent) : null,
      }),
    }))

    return NextResponse.json(formatted)
  } catch {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const product = await prisma.product.create({
      data: {
        name: body.name,
        price: body.price,
        categoryId: body.categoryId,
        quantity: body.quantity || 0,
        trackStock: body.trackStock || false,
        image: body.image || "",
      },
    })

    return NextResponse.json({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      categoryId: product.categoryId,
      quantity: product.quantity,
      trackStock: product.trackStock,
      image: product.image,
    }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
}
