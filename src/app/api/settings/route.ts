import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
import { businessRulesSchema } from "@/lib/validations/settings"

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
      avgHourlyLaborCost: settings.avgHourlyLaborCost ? Number(settings.avgHourlyLaborCost) : 75,
      payPeriodType: settings.payPeriodType,
      payPeriodStartDay: settings.payPeriodStartDay,
      // Business Rules
      voidWindowDays: settings.voidWindowDays,
      voidReasons: settings.voidReasons,
      wasteReasons: settings.wasteReasons,
      daypartMorningStart: settings.daypartMorningStart,
      daypartMiddayStart: settings.daypartMiddayStart,
      daypartAfternoonStart: settings.daypartAfternoonStart,
      daypartEveningStart: settings.daypartEveningStart,
      kitchenWarningMinutes: settings.kitchenWarningMinutes,
      kitchenDangerMinutes: settings.kitchenDangerMinutes,
      lowStockCriticalRatio: Number(settings.lowStockCriticalRatio),
      lowStockWarningRatio: Number(settings.lowStockWarningRatio),
      stockCriticalMax: settings.stockCriticalMax,
      stockLowMax: settings.stockLowMax,
      creditWarningThreshold: Number(settings.creditWarningThreshold),
      suggestedPriceMarkup: Number(settings.suggestedPriceMarkup),
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Detect if this is a business rules update
    if (body.section === "businessRules") {
      const parsed = businessRulesSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message || "Invalid business rules" },
          { status: 400 }
        )
      }

      const settings = await prisma.settings.upsert({
        where: { id: 1 },
        create: { id: 1, ...parsed.data },
        update: parsed.data,
      })

      await logAudit({
        entity: "setting", entityId: null, action: "update",
        summary: "Updated business rules settings",
        userId: null, userName: null,
      })

      return NextResponse.json({
        voidWindowDays: settings.voidWindowDays,
        voidReasons: settings.voidReasons,
        wasteReasons: settings.wasteReasons,
        daypartMorningStart: settings.daypartMorningStart,
        daypartMiddayStart: settings.daypartMiddayStart,
        daypartAfternoonStart: settings.daypartAfternoonStart,
        daypartEveningStart: settings.daypartEveningStart,
        kitchenWarningMinutes: settings.kitchenWarningMinutes,
        kitchenDangerMinutes: settings.kitchenDangerMinutes,
        lowStockCriticalRatio: Number(settings.lowStockCriticalRatio),
        lowStockWarningRatio: Number(settings.lowStockWarningRatio),
        stockCriticalMax: settings.stockCriticalMax,
        stockLowMax: settings.stockLowMax,
        creditWarningThreshold: Number(settings.creditWarningThreshold),
        suggestedPriceMarkup: Number(settings.suggestedPriceMarkup),
      })
    }

    // General settings update (existing behavior)
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
        payPeriodType: body.payPeriodType ?? "custom",
        payPeriodStartDay: body.payPeriodStartDay ?? 1,
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
        ...(body.payPeriodType !== undefined && { payPeriodType: body.payPeriodType }),
        ...(body.payPeriodStartDay !== undefined && { payPeriodStartDay: body.payPeriodStartDay }),
      },
    })

    await logAudit({
      entity: "setting", entityId: null, action: "update",
      summary: "Updated store settings",
      userId: null, userName: null,
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
      payPeriodType: settings.payPeriodType,
      payPeriodStartDay: settings.payPeriodStartDay,
    })
  } catch (error) {
    console.error("Settings save error:", error)
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 })
  }
}
