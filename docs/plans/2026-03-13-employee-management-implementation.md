# Employee Management — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a complete Employee Management section under Management: employee roster, shift templates, clock in/out, hours tracking, and payroll calculation with manual payment recording.

**Architecture:** New `Employee`, `ShiftTemplate`, `ShiftLog`, and `PaymentRecord` Prisma models (separate from `User`). REST API routes following existing patterns (manual validation, fire-and-forget audit logging). Client-side pages using `DataTable`, `SummaryCard`, `Dialog` patterns from the customers page. Settings extended with payroll config + shift template CRUD.

**Tech Stack:** Next.js 16 App Router, Prisma ORM 7.x, React 19, Tailwind CSS 4.x, Radix UI, Lucide icons, Zod validation, Sonner toasts

**Design doc:** `docs/plans/2026-03-13-employee-management-design.md`

---

## Task 1: Prisma Schema — New Models + Settings Fields

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add models to schema**

Add these models after the Settings model block (after line 287):

```prisma
// ═══════════════════════════════════════════════════════════════════════════════
// EMPLOYEE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

model Employee {
  id               Int      @id @default(autoincrement())
  firstName        String   @map("first_name")
  lastName         String   @map("last_name")
  phone            String   @default("")
  email            String   @default("")
  position         String   @default("")
  hourlyRate       Decimal  @default(0) @map("hourly_rate") @db.Decimal(10, 2)
  employmentStatus String   @default("Active") @map("employment_status")
  startDate        DateTime @default(now()) @map("start_date")
  endDate          DateTime? @map("end_date")
  userId           Int?     @unique @map("user_id")
  notes            String   @default("")
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  user     User?           @relation(fields: [userId], references: [id])
  shifts   ShiftLog[]
  payments PaymentRecord[]

  @@map("employees")
}

model ShiftTemplate {
  id        Int      @id @default(autoincrement())
  name      String
  startTime String   @map("start_time")
  endTime   String   @map("end_time")
  color     String   @default("#3B82F6")
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  shifts ShiftLog[]

  @@map("shift_templates")
}

model ShiftLog {
  id              Int       @id @default(autoincrement())
  employeeId      Int       @map("employee_id")
  date            DateTime
  clockIn         DateTime  @map("clock_in")
  clockOut        DateTime? @map("clock_out")
  breakMinutes    Int       @default(0) @map("break_minutes")
  shiftTemplateId Int?      @map("shift_template_id")
  notes           String    @default("")
  createdAt       DateTime  @default(now()) @map("created_at")

  employee      Employee       @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  shiftTemplate ShiftTemplate? @relation(fields: [shiftTemplateId], references: [id], onDelete: SetNull)

  @@index([employeeId])
  @@index([date])
  @@map("shift_logs")
}

model PaymentRecord {
  id               Int       @id @default(autoincrement())
  employeeId       Int       @map("employee_id")
  periodStart      DateTime  @map("period_start")
  periodEnd        DateTime  @map("period_end")
  hoursWorked      Decimal   @default(0) @map("hours_worked") @db.Decimal(10, 2)
  calculatedAmount Decimal   @default(0) @map("calculated_amount") @db.Decimal(10, 2)
  paidAmount       Decimal   @default(0) @map("paid_amount") @db.Decimal(10, 2)
  paidDate         DateTime? @map("paid_date")
  status           String    @default("Pending")
  paymentMethod    String    @default("") @map("payment_method")
  notes            String    @default("")
  createdAt        DateTime  @default(now()) @map("created_at")

  employee Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  @@index([employeeId])
  @@map("payment_records")
}
```

**Step 2: Add relation to User model**

In the `User` model, add the Employee relation field (alongside other relation fields):

```prisma
  employee Employee?
```

**Step 3: Add payroll fields to Settings model**

In the `Settings` model, after the target benchmarks block (before `@@map("settings")`):

```prisma
  // Payroll Settings
  payPeriodType    String @default("custom") @map("pay_period_type")
  payPeriodStartDay Int   @default(1) @map("pay_period_start_day")
```

**Step 4: Generate and apply migration**

Run:
```bash
npx prisma migrate dev --name add_employee_management
```
Expected: Migration created and applied successfully.

**Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(schema): add Employee, ShiftTemplate, ShiftLog, PaymentRecord models"
```

---

## Task 2: Zod Validation Schemas

**Files:**
- Create: `src/lib/validations/employee.ts`

**Step 1: Create validation schemas**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/lib/validations/employee.ts
git commit -m "feat(validation): add Zod schemas for employee management"
```

---

## Task 3: API Routes — Shift Templates CRUD

**Files:**
- Create: `src/app/api/shift-templates/route.ts`
- Create: `src/app/api/shift-templates/[id]/route.ts`

**Step 1: Create list + create route**

`src/app/api/shift-templates/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"

export async function GET() {
  try {
    const templates = await prisma.shiftTemplate.findMany({
      orderBy: { name: "asc" },
    })
    return NextResponse.json(templates)
  } catch {
    return NextResponse.json({ error: "Failed to fetch shift templates" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (!name) {
      return NextResponse.json({ error: "Template name is required" }, { status: 400 })
    }

    const startTime = typeof body.startTime === "string" ? body.startTime.trim() : ""
    const endTime = typeof body.endTime === "string" ? body.endTime.trim() : ""
    if (!startTime || !endTime) {
      return NextResponse.json({ error: "Start and end times are required" }, { status: 400 })
    }

    const template = await prisma.shiftTemplate.create({
      data: {
        name,
        startTime,
        endTime,
        color: typeof body.color === "string" ? body.color.trim() : "#3B82F6",
        isActive: typeof body.isActive === "boolean" ? body.isActive : true,
      },
    })

    await logAudit({
      entity: "shift_template", entityId: template.id, action: "create",
      summary: `Created shift template '${template.name}' (${template.startTime}–${template.endTime})`,
      userId: null, userName: null,
    })

    return NextResponse.json(template, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create shift template" }, { status: 500 })
  }
}
```

**Step 2: Create single template route**

`src/app/api/shift-templates/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()

    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (!name) {
      return NextResponse.json({ error: "Template name is required" }, { status: 400 })
    }

    const template = await prisma.shiftTemplate.update({
      where: { id: parseInt(id) },
      data: {
        name,
        startTime: typeof body.startTime === "string" ? body.startTime.trim() : undefined,
        endTime: typeof body.endTime === "string" ? body.endTime.trim() : undefined,
        color: typeof body.color === "string" ? body.color.trim() : undefined,
        ...(typeof body.isActive === "boolean" && { isActive: body.isActive }),
      },
    })

    await logAudit({
      entity: "shift_template", entityId: template.id, action: "update",
      summary: `Updated shift template '${template.name}'`,
      userId: null, userName: null,
    })

    return NextResponse.json(template)
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "Shift template not found" }, { status: 404 })
    }
    return NextResponse.json({ error: "Failed to update shift template" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const template = await prisma.shiftTemplate.findUnique({
      where: { id: parseInt(id) },
    })

    if (!template) {
      return NextResponse.json({ error: "Shift template not found" }, { status: 404 })
    }

    await prisma.shiftTemplate.delete({ where: { id: parseInt(id) } })

    await logAudit({
      entity: "shift_template", entityId: parseInt(id), action: "delete",
      summary: `Deleted shift template '${template.name}'`,
      userId: null, userName: null,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete shift template" }, { status: 500 })
  }
}
```

**Step 3: Commit**

```bash
git add src/app/api/shift-templates/
git commit -m "feat(api): add shift template CRUD routes"
```

---

## Task 4: API Routes — Employees CRUD

**Files:**
- Create: `src/app/api/employees/route.ts`
- Create: `src/app/api/employees/[id]/route.ts`

**Step 1: Create list + create route**

`src/app/api/employees/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    const employees = await prisma.employee.findMany({
      where: status ? { employmentStatus: status } : undefined,
      include: {
        user: { select: { id: true, username: true, fullname: true } },
        shifts: {
          where: { clockOut: { not: null } },
          orderBy: { date: "desc" },
          take: 1,
        },
      },
      orderBy: { firstName: "asc" },
    })

    return NextResponse.json(employees)
  } catch {
    return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : ""
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : ""
    if (!firstName || !lastName) {
      return NextResponse.json({ error: "First and last name are required" }, { status: 400 })
    }

    const position = typeof body.position === "string" ? body.position.trim() : ""
    if (!position) {
      return NextResponse.json({ error: "Position is required" }, { status: 400 })
    }

    const hourlyRate = typeof body.hourlyRate === "number" ? body.hourlyRate : 0
    if (hourlyRate < 0) {
      return NextResponse.json({ error: "Hourly rate must be positive" }, { status: 400 })
    }

    // Check userId uniqueness if linking to a user
    const userId = typeof body.userId === "number" ? body.userId : null
    if (userId) {
      const existing = await prisma.employee.findUnique({ where: { userId } })
      if (existing) {
        return NextResponse.json({ error: "This user is already linked to another employee" }, { status: 400 })
      }
    }

    const employee = await prisma.employee.create({
      data: {
        firstName,
        lastName,
        phone: typeof body.phone === "string" ? body.phone.trim() : "",
        email: typeof body.email === "string" ? body.email.trim() : "",
        position,
        hourlyRate,
        employmentStatus: typeof body.employmentStatus === "string" ? body.employmentStatus : "Active",
        startDate: body.startDate ? new Date(body.startDate) : new Date(),
        userId,
        notes: typeof body.notes === "string" ? body.notes.trim() : "",
      },
    })

    await logAudit({
      entity: "employee", entityId: employee.id, action: "create",
      summary: `Created employee '${employee.firstName} ${employee.lastName}' (${employee.position})`,
      userId: null, userName: null,
    })

    return NextResponse.json(employee, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 })
  }
}
```

**Step 2: Create single employee route**

`src/app/api/employees/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: { select: { id: true, username: true, fullname: true } },
      },
    })

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    return NextResponse.json(employee)
  } catch {
    return NextResponse.json({ error: "Failed to fetch employee" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()

    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : ""
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : ""
    if (!firstName || !lastName) {
      return NextResponse.json({ error: "First and last name are required" }, { status: 400 })
    }

    // Check userId uniqueness if changing link
    const userId = typeof body.userId === "number" ? body.userId : null
    if (userId) {
      const existing = await prisma.employee.findUnique({ where: { userId } })
      if (existing && existing.id !== parseInt(id)) {
        return NextResponse.json({ error: "This user is already linked to another employee" }, { status: 400 })
      }
    }

    const employee = await prisma.employee.update({
      where: { id: parseInt(id) },
      data: {
        firstName,
        lastName,
        phone: typeof body.phone === "string" ? body.phone.trim() : "",
        email: typeof body.email === "string" ? body.email.trim() : "",
        position: typeof body.position === "string" ? body.position.trim() : undefined,
        hourlyRate: typeof body.hourlyRate === "number" ? body.hourlyRate : undefined,
        employmentStatus: typeof body.employmentStatus === "string" ? body.employmentStatus : undefined,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : body.endDate === null ? null : undefined,
        userId,
        notes: typeof body.notes === "string" ? body.notes.trim() : undefined,
      },
    })

    await logAudit({
      entity: "employee", entityId: employee.id, action: "update",
      summary: `Updated employee '${employee.firstName} ${employee.lastName}'`,
      userId: null, userName: null,
    })

    return NextResponse.json(employee)
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }
    return NextResponse.json({ error: "Failed to update employee" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(id) },
      include: { _count: { select: { payments: true } } },
    })

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    // Check for pending payments
    const pendingPayments = await prisma.paymentRecord.count({
      where: { employeeId: parseInt(id), status: "Pending" },
    })
    if (pendingPayments > 0) {
      return NextResponse.json(
        { error: "Cannot delete employee with pending payments" },
        { status: 400 }
      )
    }

    await prisma.employee.delete({ where: { id: parseInt(id) } })

    await logAudit({
      entity: "employee", entityId: parseInt(id), action: "delete",
      summary: `Deleted employee '${employee.firstName} ${employee.lastName}'`,
      userId: null, userName: null,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 })
  }
}
```

**Step 3: Commit**

```bash
git add src/app/api/employees/
git commit -m "feat(api): add employee CRUD routes"
```

---

## Task 5: API Routes — Clock In/Out + Shift Logs

**Files:**
- Create: `src/app/api/employees/[id]/clock-in/route.ts`
- Create: `src/app/api/employees/[id]/clock-out/route.ts`
- Create: `src/app/api/employees/[id]/shifts/route.ts`

**Step 1: Clock-in route**

`src/app/api/employees/[id]/clock-in/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const employeeId = parseInt(id)

  try {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    // Check if already clocked in (has an open shift)
    const openShift = await prisma.shiftLog.findFirst({
      where: { employeeId, clockOut: null },
    })
    if (openShift) {
      return NextResponse.json({ error: "Employee is already clocked in" }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const now = new Date()

    const shift = await prisma.shiftLog.create({
      data: {
        employeeId,
        date: now,
        clockIn: now,
        shiftTemplateId: typeof body.shiftTemplateId === "number" ? body.shiftTemplateId : null,
        notes: typeof body.notes === "string" ? body.notes.trim() : "",
      },
    })

    return NextResponse.json(shift, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to clock in" }, { status: 500 })
  }
}
```

**Step 2: Clock-out route**

`src/app/api/employees/[id]/clock-out/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const employeeId = parseInt(id)

  try {
    const openShift = await prisma.shiftLog.findFirst({
      where: { employeeId, clockOut: null },
    })
    if (!openShift) {
      return NextResponse.json({ error: "Employee is not clocked in" }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const now = new Date()

    const shift = await prisma.shiftLog.update({
      where: { id: openShift.id },
      data: {
        clockOut: now,
        breakMinutes: typeof body.breakMinutes === "number" ? body.breakMinutes : 0,
        notes: typeof body.notes === "string" ? body.notes.trim() : openShift.notes,
      },
    })

    return NextResponse.json(shift)
  } catch {
    return NextResponse.json({ error: "Failed to clock out" }, { status: 500 })
  }
}
```

**Step 3: Shift logs route (list + manual entry)**

`src/app/api/employees/[id]/shifts/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    const shifts = await prisma.shiftLog.findMany({
      where: {
        employeeId: parseInt(id),
        ...(from && to && {
          date: { gte: new Date(from), lte: new Date(to) },
        }),
      },
      include: {
        shiftTemplate: { select: { name: true, color: true } },
      },
      orderBy: { date: "desc" },
    })

    return NextResponse.json(shifts)
  } catch {
    return NextResponse.json({ error: "Failed to fetch shifts" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const employeeId = parseInt(id)

  try {
    const body = await request.json()

    if (!body.date || !body.clockIn) {
      return NextResponse.json({ error: "Date and clock-in time are required" }, { status: 400 })
    }

    const shift = await prisma.shiftLog.create({
      data: {
        employeeId,
        date: new Date(body.date),
        clockIn: new Date(body.clockIn),
        clockOut: body.clockOut ? new Date(body.clockOut) : null,
        breakMinutes: typeof body.breakMinutes === "number" ? body.breakMinutes : 0,
        shiftTemplateId: typeof body.shiftTemplateId === "number" ? body.shiftTemplateId : null,
        notes: typeof body.notes === "string" ? body.notes.trim() : "",
      },
    })

    return NextResponse.json(shift, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create shift log" }, { status: 500 })
  }
}
```

**Step 4: Commit**

```bash
git add src/app/api/employees/[id]/clock-in/ src/app/api/employees/[id]/clock-out/ src/app/api/employees/[id]/shifts/
git commit -m "feat(api): add clock in/out and shift log routes"
```

---

## Task 6: API Routes — Payment Records

**Files:**
- Create: `src/app/api/employees/[id]/payments/route.ts`

**Step 1: Create payments route**

`src/app/api/employees/[id]/payments/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const payments = await prisma.paymentRecord.findMany({
      where: { employeeId: parseInt(id) },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(payments)
  } catch {
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const employeeId = parseInt(id)

  try {
    const body = await request.json()

    if (!body.periodStart || !body.periodEnd) {
      return NextResponse.json({ error: "Period start and end are required" }, { status: 400 })
    }

    const paidAmount = typeof body.paidAmount === "number" ? body.paidAmount : 0
    if (paidAmount < 0) {
      return NextResponse.json({ error: "Paid amount must be positive" }, { status: 400 })
    }

    // Calculate hours worked in this period
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    const periodStart = new Date(body.periodStart)
    const periodEnd = new Date(body.periodEnd)

    const shifts = await prisma.shiftLog.findMany({
      where: {
        employeeId,
        date: { gte: periodStart, lte: periodEnd },
        clockOut: { not: null },
      },
    })

    const hoursWorked = shifts.reduce((sum, shift) => {
      if (!shift.clockOut) return sum
      const ms = shift.clockOut.getTime() - shift.clockIn.getTime()
      const hours = ms / (1000 * 60 * 60) - shift.breakMinutes / 60
      return sum + Math.max(0, hours)
    }, 0)

    const calculatedAmount = hoursWorked * Number(employee.hourlyRate)

    // Determine status
    let status = "Pending"
    if (paidAmount > 0) {
      if (paidAmount >= calculatedAmount) {
        status = "Paid"
      } else {
        status = "Partial"
      }
      // If payment is before period end, it's an advance
      if (body.paidDate && new Date(body.paidDate) < periodEnd) {
        const now = new Date()
        if (now < periodEnd) {
          status = "Advance"
        }
      }
    }
    // Allow explicit advance status
    if (body.status === "Advance") {
      status = "Advance"
    }

    const payment = await prisma.paymentRecord.create({
      data: {
        employeeId,
        periodStart,
        periodEnd,
        hoursWorked: parseFloat(hoursWorked.toFixed(2)),
        calculatedAmount: parseFloat(calculatedAmount.toFixed(2)),
        paidAmount,
        paidDate: body.paidDate ? new Date(body.paidDate) : paidAmount > 0 ? new Date() : null,
        status,
        paymentMethod: typeof body.paymentMethod === "string" ? body.paymentMethod : "",
        notes: typeof body.notes === "string" ? body.notes.trim() : "",
      },
    })

    await logAudit({
      entity: "payment", entityId: payment.id, action: "create",
      summary: `Recorded ${status.toLowerCase()} payment of ₱${paidAmount.toFixed(2)} for ${employee.firstName} ${employee.lastName}`,
      userId: null, userName: null,
    })

    return NextResponse.json(payment, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 })
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/employees/[id]/payments/
git commit -m "feat(api): add payment record routes with auto-calculation"
```

---

## Task 7: Update Settings API

**Files:**
- Modify: `src/app/api/settings/route.ts`

**Step 1: Add payroll fields to GET response**

In the GET handler's return object, add:

```typescript
payPeriodType: settings.payPeriodType,
payPeriodStartDay: settings.payPeriodStartDay,
```

**Step 2: Add payroll fields to POST handler**

In the `upsert` create block, add:

```typescript
payPeriodType: body.payPeriodType ?? "custom",
payPeriodStartDay: body.payPeriodStartDay ?? 1,
```

In the `upsert` update block, add:

```typescript
...(body.payPeriodType !== undefined && { payPeriodType: body.payPeriodType }),
...(body.payPeriodStartDay !== undefined && { payPeriodStartDay: body.payPeriodStartDay }),
```

In the POST response object, add:

```typescript
payPeriodType: settings.payPeriodType,
payPeriodStartDay: settings.payPeriodStartDay,
```

**Step 3: Commit**

```bash
git add src/app/api/settings/route.ts
git commit -m "feat(api): add payroll settings fields to settings route"
```

---

## Task 8: Sidebar — Add Employees Nav Item

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

**Step 1: Add Briefcase import**

In the lucide-react import block (line 29-46), add `Briefcase`:

```typescript
import {
  ShoppingCart,
  Users,
  Receipt,
  Settings,
  UserCircle,
  BarChart3,
  Carrot,
  Trash2,
  ClipboardList,
  Calendar,
  History,
  CheckSquare,
  LayoutGrid,
  ChefHat,
  Sun,
  Moon,
  Briefcase,
} from "lucide-react"
```

**Step 2: Add Employees nav item**

In the Management section items array (line 89-94), add before Settings:

```typescript
{ href: "/employees", label: "Employees", icon: Briefcase, permission: "permUsers" },
```

So the Management items become:

```typescript
{
  label: "Management",
  items: [
    { href: "/customers", label: "Customers", icon: UserCircle, permission: null },
    { href: "/users", label: "Users", icon: Users, permission: "permUsers" },
    { href: "/employees", label: "Employees", icon: Briefcase, permission: "permUsers" },
    { href: "/employee", label: "Tasks", icon: CheckSquare, permission: null, badgeKey: "employee" },
    { href: "/settings", label: "Settings", icon: Settings, permission: "permSettings" },
  ],
},
```

**Step 3: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat(nav): add Employees link to sidebar under Management"
```

---

## Task 9: UI — Employees Page (Dashboard + List)

**Files:**
- Create: `src/app/(dashboard)/employees/page.tsx`

**Step 1: Create the employees page**

This is the largest UI file. It includes:
- Tab toggle between Dashboard and List views
- Dashboard: 4 summary cards, clocked-in panel, today's shifts panel
- List: DataTable with search, Add Employee dialog
- Delete confirmation dialog

Follow the exact patterns from `src/app/(dashboard)/customers/page.tsx`:
- `"use client"` directive
- State: `employees[]`, `loading`, `formOpen`, `editEmployee`, `deleteId`, `submitting`, `deleting`, `view` (dashboard/list)
- `useCallback` + `useEffect` for data fetching
- `fetchEmployees()` from `/api/employees`
- `fetchShiftTemplates()` from `/api/shift-templates`
- Summary calculations inline
- DataTable columns: Name (avatar+name+phone), Position, Status badge, Rate, Hours, Actions
- Dialog form: firstName, lastName, position, hourlyRate, phone, email, startDate, userId (combobox), notes
- Clock in/out buttons that call `/api/employees/[id]/clock-in` or `/api/employees/[id]/clock-out`

Use these components (already exist in project):
- `DataTable` + `DataTableColumn` from `@/components/ui/data-table`
- `SummaryCard` + `SummaryCardGrid` from `@/components/ui/summary-card`
- `StatusDot` from `@/components/ui/status-dot`
- `Avatar` + `AvatarFallback` from `@/components/ui/avatar`
- `Dialog`, `AlertDialog` from Radix
- `Button`, `Input`, `Label`, `Select` from shadcn
- `toast` from `sonner`
- `formatCurrency` from `@/lib/format-currency`
- `useSettings` from `@/hooks/use-settings`
- Lucide icons: `Briefcase`, `Plus`, `Pencil`, `Trash2`, `Eye`, `Clock`, `Users`, `Banknote`, `CircleAlert`, `LogIn`, `LogOut`

**Key dashboard sections:**
- Currently Clocked In: Filter employees with open shift (clockOut === null on latest shift)
- Today's Shifts: Fetch shift templates and show count of employees assigned per template today
- Summary cards: count active, sum hours this period, sum pending payroll

**Step 2: Commit**

```bash
git add src/app/(dashboard)/employees/page.tsx
git commit -m "feat(ui): add employees page with dashboard and list views"
```

---

## Task 10: UI — Employee Detail Page

**Files:**
- Create: `src/app/(dashboard)/employees/[id]/page.tsx`

**Step 1: Create the detail page**

This page shows a single employee's profile with three sections:

**Profile header:**
- Avatar with initials, full name, position, rate, start date
- Status badge (Active/Inactive/Terminated)
- Edit button (opens edit dialog), Clock In/Out button

**Recent Shifts section (left column):**
- Fetch from `/api/employees/[id]/shifts`
- List: date, template name + color, clock in/out times, calculated hours
- "View All" link (or date range picker)
- "Add Shift" button for manual entry dialog

**Hours Summary + Payments (right column):**
- Hours Summary card: total hours, shifts count, avg hours/shift, calculated pay
- Payment History: fetch from `/api/employees/[id]/payments`
- List: date, period, amount, status badge (Paid/Partial/Advance/Pending)
- "Record Payment" button → dialog with: period start/end, amount, method, notes

Use date calculations:
```typescript
// Calculate hours from shift log
const calcHours = (shift: { clockIn: string; clockOut: string | null; breakMinutes: number }) => {
  if (!shift.clockOut) return 0
  const ms = new Date(shift.clockOut).getTime() - new Date(shift.clockIn).getTime()
  return Math.max(0, ms / (1000 * 60 * 60) - shift.breakMinutes / 60)
}
```

Follow patterns from customers detail page at `src/app/(dashboard)/customers/[id]/page.tsx` if it exists, otherwise use the list page patterns with `useEffect` fetching and state management.

**Step 2: Commit**

```bash
git add src/app/(dashboard)/employees/[id]/page.tsx
git commit -m "feat(ui): add employee detail page with shifts, hours, and payments"
```

---

## Task 11: UI — Settings Sections (Payroll + Shift Templates)

**Files:**
- Modify: `src/app/(dashboard)/settings/page.tsx`

**Step 1: Add Payroll Settings section**

Add a new Card section after the existing settings sections. Pattern matches existing settings form sections:

```tsx
{/* Payroll Settings */}
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Wallet className="h-5 w-5" /> Payroll Settings
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="space-y-2">
      <Label htmlFor="payPeriodType">Pay Period Type</Label>
      <Select value={formData.payPeriodType} onValueChange={(v) => handleInputChange("payPeriodType", v)}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="custom">Custom</SelectItem>
          <SelectItem value="weekly">Weekly</SelectItem>
          <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
          <SelectItem value="monthly">Monthly</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Custom allows you to manually set date ranges for each payment
      </p>
    </div>
    <div className="space-y-2">
      <Label htmlFor="payPeriodStartDay">Pay Period Start Day</Label>
      <Select
        value={String(formData.payPeriodStartDay)}
        onValueChange={(v) => handleInputChange("payPeriodStartDay", v)}
        disabled={formData.payPeriodType === "custom" || formData.payPeriodType === "monthly"}
      >
        {/* Monday through Sunday options */}
      </Select>
      <p className="text-xs text-muted-foreground">
        Only applies to Weekly or Bi-weekly pay periods
      </p>
    </div>
  </CardContent>
</Card>
```

**Step 2: Add Shift Templates section**

Add inline shift template management (list + add/edit/delete) as another Card section. This fetches from `/api/shift-templates` independently from the main settings form:

- State: `templates[]`, `templateFormOpen`, `editTemplate`, `templateForm { name, startTime, endTime, color, isActive }`
- CRUD handlers that call `/api/shift-templates` and `/api/shift-templates/[id]`
- Each template row shows: color dot, name, times, active badge, edit/delete icons
- Add Template button opens dialog
- Color input using `<Input type="color" />`

**Step 3: Update formData state and save handler**

Add `payPeriodType` and `payPeriodStartDay` to the form state, initial load from API, and include in POST body.

**Step 4: Commit**

```bash
git add src/app/(dashboard)/settings/page.tsx
git commit -m "feat(ui): add payroll settings and shift template management to settings page"
```

---

## Task 12: Dashboard API — Employee Stats Endpoint

**Files:**
- Create: `src/app/api/employees/stats/route.ts`

**Step 1: Create stats endpoint**

This endpoint powers the dashboard summary cards efficiently in one call:

```typescript
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const [activeCount, clockedIn, todayShifts, pendingPayments] = await Promise.all([
      // Active employees count
      prisma.employee.count({ where: { employmentStatus: "Active" } }),

      // Currently clocked in (open shifts)
      prisma.shiftLog.findMany({
        where: { clockOut: null },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, position: true } },
          shiftTemplate: { select: { name: true, color: true } },
        },
      }),

      // Today's completed shifts for hours calculation
      prisma.shiftLog.findMany({
        where: {
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
        include: {
          employee: { select: { firstName: true, lastName: true } },
          shiftTemplate: { select: { name: true, color: true } },
        },
      }),

      // Pending payment count
      prisma.paymentRecord.count({ where: { status: "Pending" } }),
    ])

    return NextResponse.json({
      activeCount,
      clockedIn,
      todayShifts,
      pendingPayments,
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch employee stats" }, { status: 500 })
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/employees/stats/
git commit -m "feat(api): add employee stats endpoint for dashboard"
```

---

## Task 13: Seed Data — Default Shift Templates

**Files:**
- Modify: `prisma/seed.ts`

**Step 1: Add default shift templates to seed**

Add after existing seed data:

```typescript
// Seed default shift templates
const shiftTemplates = [
  { name: "Morning", startTime: "06:00", endTime: "14:00", color: "#F59E0B" },
  { name: "Evening", startTime: "14:00", endTime: "22:00", color: "#3B82F6" },
  { name: "Night", startTime: "22:00", endTime: "06:00", color: "#6366F1" },
]

for (const template of shiftTemplates) {
  await prisma.shiftTemplate.upsert({
    where: { id: shiftTemplates.indexOf(template) + 1 },
    update: {},
    create: template,
  })
}
```

**Step 2: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat(seed): add default shift templates"
```

---

## Task 14: Final Build Verification

**Step 1: Run build**

```bash
npm run build
```
Expected: Build succeeds with no type errors.

**Step 2: Run lint**

```bash
npm run lint
```
Expected: No lint errors.

**Step 3: Run dev server and test manually**

```bash
npm run dev
```

Manual test checklist:
- [ ] Navigate to `/employees` — dashboard view loads with summary cards
- [ ] Switch to list view — table renders (empty state initially)
- [ ] Add an employee via dialog — appears in list
- [ ] Click employee row — detail page loads
- [ ] Clock in from detail page — appears in dashboard's "Clocked In" panel
- [ ] Clock out — shift logged with hours calculated
- [ ] Record a payment — shows in payment history with correct status
- [ ] Settings page — payroll section visible, shift templates CRUD works
- [ ] Sidebar — "Employees" link visible under Management

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete employee management system

Adds employee roster, shift templates, clock in/out, hours tracking,
and payroll calculation with manual payment recording."
```
