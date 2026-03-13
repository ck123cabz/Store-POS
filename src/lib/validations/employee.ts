import { z } from "zod"

export const employeeFormSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  phone: z.string().max(20).optional().default(""),
  email: z.string().email("Invalid email").or(z.literal("")).optional().default(""),
  position: z.string().min(1, "Position is required").max(100),
  hourlyRate: z.coerce.number().min(0, "Rate must be positive"),
  startDate: z.string().min(1, "Start date is required"),
  employmentStatus: z.enum(["Active", "Inactive", "Terminated"]).default("Active"),
  userId: z.coerce.number().nullable().optional().default(null),
  notes: z.string().max(500).optional().default(""),
})

export const shiftTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required").max(100),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").default("#3B82F6"),
  isActive: z.boolean().default(true),
})

export const shiftLogSchema = z.object({
  date: z.string().min(1, "Date is required"),
  clockIn: z.string().min(1, "Clock-in time is required"),
  clockOut: z.string().optional().default(""),
  breakMinutes: z.coerce.number().min(0).default(0),
  shiftTemplateId: z.coerce.number().nullable().optional().default(null),
  notes: z.string().max(500).optional().default(""),
})

export const paymentRecordSchema = z.object({
  periodStart: z.string().min(1, "Period start is required"),
  periodEnd: z.string().min(1, "Period end is required"),
  paidAmount: z.coerce.number().min(0, "Amount must be positive"),
  paidDate: z.string().optional().default(""),
  paymentMethod: z.enum(["Cash", "Bank Transfer", "Other"]).default("Cash"),
  notes: z.string().max(500).optional().default(""),
})

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>
export type ShiftTemplateValues = z.infer<typeof shiftTemplateSchema>
export type ShiftLogValues = z.infer<typeof shiftLogSchema>
export type PaymentRecordValues = z.infer<typeof paymentRecordSchema>
