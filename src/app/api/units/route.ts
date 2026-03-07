import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/units
 * Returns all units and conversions. Used by forms for dropdowns.
 */
export async function GET() {
  try {
    const [units, conversions] = await Promise.all([
      prisma.unit.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.unitConversion.findMany(),
    ])

    return NextResponse.json({
      units: units.map((u) => ({
        id: u.id,
        name: u.name,
        abbr: u.abbr,
        dimension: u.dimension,
        isDiscrete: u.isDiscrete,
        sortOrder: u.sortOrder,
      })),
      conversions: conversions.map((c) => ({
        id: c.id,
        fromUnitId: c.fromUnitId,
        toUnitId: c.toUnitId,
        factor: Number(c.factor),
      })),
    })
  } catch (error) {
    console.error("Failed to fetch units:", error)
    return NextResponse.json({ error: "Failed to fetch units" }, { status: 500 })
  }
}
