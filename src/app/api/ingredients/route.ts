import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const ingredients = await prisma.ingredient.findMany({
      where: { isActive: true },
      include: { vendor: true },
      orderBy: { name: "asc" },
    })

    const formatted = ingredients.map((i) => {
      const quantity = Number(i.quantity)
      const parLevel = i.parLevel
      const ratio = parLevel > 0 ? quantity / parLevel : 1

      let stockStatus: "ok" | "low" | "critical" | "out"
      if (quantity <= 0) stockStatus = "out"
      else if (ratio <= 0.25) stockStatus = "critical"
      else if (ratio <= 0.5) stockStatus = "low"
      else stockStatus = "ok"

      return {
        id: i.id,
        name: i.name,
        category: i.category,
        unit: i.unit,
        costPerUnit: Number(i.costPerUnit),
        parLevel: i.parLevel,
        quantity,
        stockStatus,
        stockRatio: parLevel > 0 ? Math.round(ratio * 100) : null,
        lastRestockDate: i.lastRestockDate,
        lastUpdated: i.lastUpdated,
        vendorId: i.vendorId,
        vendorName: i.vendor?.name || null,
        barcode: i.barcode,
      }
    })

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Failed to fetch ingredients:", error)
    return NextResponse.json({ error: "Failed to fetch ingredients" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const ingredient = await prisma.ingredient.create({
      data: {
        name: body.name,
        category: body.category,
        unit: body.unit,
        costPerUnit: body.costPerUnit,
        parLevel: body.parLevel || 0,
        quantity: body.quantity || 0,
        vendorId: body.vendorId || null,
        barcode: body.barcode || null,
        lastUpdated: new Date(),
      },
      include: { vendor: true },
    })

    return NextResponse.json({
      id: ingredient.id,
      name: ingredient.name,
      category: ingredient.category,
      unit: ingredient.unit,
      costPerUnit: Number(ingredient.costPerUnit),
      parLevel: ingredient.parLevel,
      quantity: Number(ingredient.quantity),
      vendorId: ingredient.vendorId,
      vendorName: ingredient.vendor?.name || null,
      barcode: ingredient.barcode,
    }, { status: 201 })
  } catch (error) {
    console.error("Failed to create ingredient:", error)
    return NextResponse.json({ error: "Failed to create ingredient" }, { status: 500 })
  }
}
