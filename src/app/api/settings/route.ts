import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    let settings = await prisma.settings.findUnique({
      where: { id: 1 },
    })

    if (!settings) {
      settings = await prisma.settings.create({
        data: { id: 1 },
      })
    }

    return NextResponse.json({
      currencySymbol: settings.currencySymbol,
      taxPercentage: Number(settings.taxPercentage),
      chargeTax: settings.chargeTax,
      storeName: settings.storeName,
      addressLine1: settings.addressLine1,
      addressLine2: settings.addressLine2,
      phone: settings.phone,
      taxNumber: settings.taxNumber,
      receiptFooter: settings.receiptFooter,
      logo: settings.logo,
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}
