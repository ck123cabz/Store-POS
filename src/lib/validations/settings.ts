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
