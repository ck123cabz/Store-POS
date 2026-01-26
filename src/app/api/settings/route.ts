import { NextRequest, NextResponse } from "next/server"
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
      appMode: settings.appMode,
      storeName: settings.storeName,
      addressLine1: settings.addressLine1,
      addressLine2: settings.addressLine2,
      phone: settings.phone,
      taxNumber: settings.taxNumber,
      currencySymbol: settings.currencySymbol,
      taxPercentage: Number(settings.taxPercentage),
      chargeTax: settings.chargeTax,
      receiptFooter: settings.receiptFooter,
      logo: settings.logo,
      targetTrueMarginPercent: settings.targetTrueMarginPercent ? Number(settings.targetTrueMarginPercent) : null,
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Upsert settings (create if not exists, update if exists)
    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        appMode: body.appMode ?? "Point of Sale",
        storeName: body.storeName ?? "",
        addressLine1: body.addressLine1 ?? "",
        addressLine2: body.addressLine2 ?? "",
        phone: body.phone ?? "",
        taxNumber: body.taxNumber ?? "",
        currencySymbol: body.currencySymbol ?? "$",
        taxPercentage: body.taxPercentage ?? 0,
        chargeTax: body.chargeTax ?? false,
        receiptFooter: body.receiptFooter ?? "",
        logo: body.logo ?? "",
      },
      update: {
        appMode: body.appMode,
        storeName: body.storeName,
        addressLine1: body.addressLine1,
        addressLine2: body.addressLine2,
        phone: body.phone,
        taxNumber: body.taxNumber,
        currencySymbol: body.currencySymbol,
        taxPercentage: body.taxPercentage,
        chargeTax: body.chargeTax,
        receiptFooter: body.receiptFooter,
        ...(body.logo !== undefined && { logo: body.logo }),
      },
    })

    return NextResponse.json({
      appMode: settings.appMode,
      storeName: settings.storeName,
      addressLine1: settings.addressLine1,
      addressLine2: settings.addressLine2,
      phone: settings.phone,
      taxNumber: settings.taxNumber,
      currencySymbol: settings.currencySymbol,
      taxPercentage: Number(settings.taxPercentage),
      chargeTax: settings.chargeTax,
      receiptFooter: settings.receiptFooter,
      logo: settings.logo,
    })
  } catch {
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 })
  }
}
