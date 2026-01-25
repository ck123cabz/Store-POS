import 'dotenv/config'
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const defaultTasks = [
  {
    name: "Open Register",
    type: "action",
    icon: "💰",
    deadlineTime: "08:30",
    deadlineType: "daily",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    required: true,
    streakBreaking: true,
    sortOrder: 1,
  },
  {
    name: "Inventory Count",
    type: "inventory",
    icon: "📦",
    deadlineTime: "10:00",
    deadlineType: "daily",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    required: true,
    streakBreaking: true,
    sortOrder: 2,
  },
  {
    name: "Restock Low Items",
    type: "action",
    icon: "🥤",
    deadlineTime: "14:00",
    deadlineType: "daily",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    required: false,
    streakBreaking: false,
    sortOrder: 3,
  },
  {
    name: "End-of-Day Count",
    type: "inventory",
    icon: "📋",
    deadlineTime: "21:00",
    deadlineType: "daily",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    required: false,
    streakBreaking: false,
    sortOrder: 4,
  },
  {
    name: "Close Register",
    type: "action",
    icon: "💰",
    deadlineTime: "21:30",
    deadlineType: "daily",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    required: true,
    streakBreaking: true,
    sortOrder: 5,
  },
]

async function main() {
  console.log("Seeding default tasks...")

  // Get admin user (id: 1)
  const admin = await prisma.user.findFirst({
    where: { id: 1 },
  })

  if (!admin) {
    console.error("Admin user not found. Please create a user first.")
    return
  }

  for (const task of defaultTasks) {
    const existing = await prisma.employeeTask.findFirst({
      where: { name: task.name },
    })

    if (existing) {
      console.log(`Task "${task.name}" already exists, skipping`)
      continue
    }

    await prisma.employeeTask.create({
      data: {
        ...task,
        status: "approved",
        createdById: admin.id,
        approvedById: admin.id,
        approvedAt: new Date(),
      },
    })
    console.log(`Created task: ${task.name}`)
  }

  console.log("Seeding complete!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
