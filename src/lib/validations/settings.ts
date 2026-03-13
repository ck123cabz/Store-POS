import { z } from "zod"

export const settingsFormSchema = z
  .object({
    storeName: z.string().min(1, "Store name is required").max(100),
    addressLine1: z.string().max(200).default(""),
    addressLine2: z.string().max(200).default(""),
    phone: z.string().max(30).default(""),
    currencySymbol: z.string().min(1, "Currency symbol is required").max(5),
    chargeTax: z.boolean().default(false),
    taxPercentage: z.coerce
      .number()
      .min(0, "Tax rate cannot be negative")
      .max(100, "Tax rate cannot exceed 100%")
      .default(0),
    taxNumber: z.string().max(50).default(""),
    receiptFooter: z.string().max(500).default(""),
  })
  .refine(
    (data) => !data.chargeTax || data.taxNumber.trim().length > 0,
    {
      message: "Tax number is required when tax is enabled",
      path: ["taxNumber"],
    }
  )

export type SettingsFormValues = z.infer<typeof settingsFormSchema>

export const businessRulesSchema = z
  .object({
    voidWindowDays: z.coerce.number().int().min(1).max(365),
    voidReasons: z.array(z.string().min(1).max(100)).min(1).max(20),
    wasteReasons: z.array(z.string().min(1).max(100)).min(1).max(20),
    daypartMorningStart: z.coerce.number().int().min(0).max(23),
    daypartMiddayStart: z.coerce.number().int().min(0).max(23),
    daypartAfternoonStart: z.coerce.number().int().min(0).max(23),
    daypartEveningStart: z.coerce.number().int().min(0).max(23),
    kitchenWarningMinutes: z.coerce.number().int().min(1).max(60),
    kitchenDangerMinutes: z.coerce.number().int().min(1).max(120),
    lowStockCriticalRatio: z.coerce.number().min(0.01).max(0.99),
    lowStockWarningRatio: z.coerce.number().min(0.01).max(0.99),
    stockCriticalMax: z.coerce.number().int().min(1).max(1000),
    stockLowMax: z.coerce.number().int().min(1).max(10000),
    creditWarningThreshold: z.coerce.number().min(0.01).max(0.99),
    suggestedPriceMarkup: z.coerce.number().min(1).max(10),
  })
  .refine(
    (data) =>
      data.daypartMorningStart < data.daypartMiddayStart &&
      data.daypartMiddayStart < data.daypartAfternoonStart &&
      data.daypartAfternoonStart < data.daypartEveningStart,
    {
      message: "Daypart hours must be in ascending order",
      path: ["daypartMorningStart"],
    }
  )
  .refine(
    (data) => data.kitchenWarningMinutes < data.kitchenDangerMinutes,
    {
      message: "Warning minutes must be less than danger minutes",
      path: ["kitchenWarningMinutes"],
    }
  )
  .refine(
    (data) => data.lowStockCriticalRatio < data.lowStockWarningRatio,
    {
      message: "Critical ratio must be less than warning ratio",
      path: ["lowStockCriticalRatio"],
    }
  )
  .refine(
    (data) => data.stockCriticalMax < data.stockLowMax,
    {
      message: "Critical max must be less than low max",
      path: ["stockCriticalMax"],
    }
  )

export type BusinessRulesValues = z.infer<typeof businessRulesSchema>
