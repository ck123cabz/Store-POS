import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
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
    }))

    return NextResponse.json(formatted)
  } catch {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}
