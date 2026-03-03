import { z } from "zod"

export const userFormSchema = z.object({
  username: z
    .string()
    .min(1, "Username is required")
    .max(50, "Username must be 50 characters or fewer")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Username can only contain letters, numbers, dots, hyphens, and underscores"),
  fullname: z
    .string()
    .min(1, "Full name is required")
    .max(100, "Full name must be 100 characters or fewer"),
  password: z
    .string()
    .min(4, "Password must be at least 4 characters"),
  permProducts: z.boolean(),
  permCategories: z.boolean(),
  permTransactions: z.boolean(),
  permUsers: z.boolean(),
  permSettings: z.boolean(),
  permReports: z.boolean(),
  permAuditLog: z.boolean(),
  permVoid: z.boolean(),
})

/** Schema for editing — password is optional (only set if changing) */
export const userEditSchema = userFormSchema.extend({
  password: z
    .string()
    .min(4, "Password must be at least 4 characters")
    .or(z.literal(""))
    .optional(),
})

export type UserFormValues = z.infer<typeof userFormSchema>
export type UserEditValues = z.infer<typeof userEditSchema>
