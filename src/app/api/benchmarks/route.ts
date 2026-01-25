import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const benchmarks = await prisma.benchmark.findMany({
      orderBy: { metric: "asc" },
    })

    const formatted = benchmarks.map((b) => ({
      id: b.id,
      metric: b.metric,
      lowGood: b.lowGood ? Number(b.lowGood) : null,
      target: b.target ? Number(b.target) : null,
      highWarning: b.highWarning ? Number(b.highWarning) : null,
      description: b.description,
    }))

    return NextResponse.json(formatted)
  } catch {
    return NextResponse.json({ error: "Failed to fetch benchmarks" }, { status: 500 })
  }
}
