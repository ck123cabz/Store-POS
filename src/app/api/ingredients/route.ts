import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const ingredients = await prisma.ingredient.findMany({
      include: { vendor: true },
      orderBy: { name: "asc" },
    })

    const formatted = ingredients.map((i) => ({
      id: i.id,
      name: i.name,
      category: i.category,
      unit: i.unit,
      costPerUnit: Number(i.costPerUnit),
      parLevel: i.parLevel,
      lastUpdated: i.lastUpdated,
      vendorId: i.vendorId,
      vendorName: i.vendor?.name || null,
    }))

    return NextResponse.json(formatted)
  } catch {
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
        vendorId: body.vendorId || null,
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
      vendorId: ingredient.vendorId,
      vendorName: ingredient.vendor?.name || null,
    }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create ingredient" }, { status: 500 })
  }
}
