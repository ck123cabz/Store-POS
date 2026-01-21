# Store POS Web Rebuild - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the Electron POS app as a modern Next.js web application with all existing functionality preserved.

**Architecture:** Next.js App Router with shadcn/ui components, PostgreSQL database via Prisma ORM, NextAuth.js for authentication. Server Actions for mutations, polling for multi-terminal sync.

**Tech Stack:** Next.js 14+, React, TypeScript, Tailwind CSS, shadcn/ui, Prisma, PostgreSQL, NextAuth.js, @react-pdf/renderer, Resend

---

## Phase 1: Project Setup

### Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tailwind.config.ts`
- Create: `next.config.js`

**Step 1: Create Next.js app with TypeScript and Tailwind**

```bash
cd /Users/s0mebody/Desktop/dev/projects/Store-POS/.worktrees/web-rebuild
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

When prompted, accept defaults (Yes to all).

**Step 2: Verify installation**

Run: `npm run dev`
Expected: Server starts at http://localhost:3000

**Step 3: Stop server and commit**

```bash
git add -A
git commit -m "feat: initialize Next.js project with TypeScript and Tailwind"
```

---

### Task 2: Install and Configure shadcn/ui

**Files:**
- Modify: `tailwind.config.ts`
- Create: `src/lib/utils.ts`
- Create: `components.json`

**Step 1: Initialize shadcn/ui**

```bash
npx shadcn@latest init
```

When prompted:
- Style: Default
- Base color: Slate
- CSS variables: Yes

**Step 2: Install core shadcn components**

```bash
npx shadcn@latest add button card input label table dialog dropdown-menu select tabs toast badge form
```

**Step 3: Verify components exist**

Run: `ls src/components/ui/`
Expected: `button.tsx card.tsx input.tsx label.tsx table.tsx dialog.tsx dropdown-menu.tsx select.tsx tabs.tsx toast.tsx badge.tsx form.tsx`

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add shadcn/ui with core components"
```

---

### Task 3: Install Project Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install Prisma and database dependencies**

```bash
npm install prisma @prisma/client
npm install -D prisma
```

**Step 2: Install auth dependencies**

```bash
npm install next-auth@beta @auth/prisma-adapter bcryptjs
npm install -D @types/bcryptjs
```

**Step 3: Install utility dependencies**

```bash
npm install @react-pdf/renderer resend date-fns zod react-hook-form @hookform/resolvers
```

**Step 4: Verify package.json has all dependencies**

Run: `npm ls --depth=0`
Expected: All packages listed without errors

**Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add Prisma, NextAuth, and utility dependencies"
```

---

### Task 4: Configure Prisma Schema

**Files:**
- Create: `prisma/schema.prisma`

**Step 1: Initialize Prisma**

```bash
npx prisma init
```

**Step 2: Replace schema with our data models**

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id               Int           @id @default(autoincrement())
  username         String        @unique
  password         String
  fullname         String
  permProducts     Boolean       @default(false) @map("perm_products")
  permCategories   Boolean       @default(false) @map("perm_categories")
  permTransactions Boolean       @default(false) @map("perm_transactions")
  permUsers        Boolean       @default(false) @map("perm_users")
  permSettings     Boolean       @default(false) @map("perm_settings")
  status           String        @default("")
  createdAt        DateTime      @default(now()) @map("created_at")
  updatedAt        DateTime      @updatedAt @map("updated_at")
  transactions     Transaction[]

  @@map("users")
}

model Category {
  id        Int       @id @default(autoincrement())
  name      String
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  products  Product[]

  @@map("categories")
}

model Product {
  id         Int      @id @default(autoincrement())
  name       String
  price      Decimal  @db.Decimal(10, 2)
  categoryId Int      @map("category_id")
  quantity   Int      @default(0)
  trackStock Boolean  @default(false) @map("track_stock")
  image      String   @default("")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")
  category   Category @relation(fields: [categoryId], references: [id])

  @@map("products")
}

model Customer {
  id           Int           @id @default(autoincrement())
  name         String
  phone        String        @default("")
  email        String        @default("")
  address      String        @default("")
  createdAt    DateTime      @default(now()) @map("created_at")
  updatedAt    DateTime      @updatedAt @map("updated_at")
  transactions Transaction[]

  @@map("customers")
}

model Transaction {
  id            Int               @id @default(autoincrement())
  orderNumber   Int               @unique @map("order_number")
  refNumber     String            @default("") @map("ref_number")
  discount      Decimal           @default(0) @db.Decimal(10, 2)
  customerId    Int?              @map("customer_id")
  userId        Int               @map("user_id")
  status        Int               @default(0) // 0 = pending, 1 = completed
  subtotal      Decimal           @db.Decimal(10, 2)
  taxAmount     Decimal           @default(0) @map("tax_amount") @db.Decimal(10, 2)
  total         Decimal           @db.Decimal(10, 2)
  paidAmount    Decimal?          @map("paid_amount") @db.Decimal(10, 2)
  changeAmount  Decimal?          @map("change_amount") @db.Decimal(10, 2)
  paymentType   String            @default("") @map("payment_type")
  paymentInfo   String            @default("") @map("payment_info")
  tillNumber    Int               @default(1) @map("till_number")
  macAddress    String            @default("") @map("mac_address")
  createdAt     DateTime          @default(now()) @map("created_at")
  updatedAt     DateTime          @updatedAt @map("updated_at")
  customer      Customer?         @relation(fields: [customerId], references: [id])
  user          User              @relation(fields: [userId], references: [id])
  items         TransactionItem[]

  @@map("transactions")
}

model TransactionItem {
  id            Int         @id @default(autoincrement())
  transactionId Int         @map("transaction_id")
  productId     Int         @map("product_id")
  productName   String      @map("product_name")
  sku           String      @default("")
  price         Decimal     @db.Decimal(10, 2)
  quantity      Int
  transaction   Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)

  @@map("transaction_items")
}

model Settings {
  id            Int      @id @default(1)
  appMode       String   @default("Point of Sale") @map("app_mode")
  storeName     String   @default("") @map("store_name")
  addressLine1  String   @default("") @map("address_line_1")
  addressLine2  String   @default("") @map("address_line_2")
  phone         String   @default("")
  taxNumber     String   @default("") @map("tax_number")
  currencySymbol String  @default("$") @map("currency_symbol")
  taxPercentage Decimal  @default(0) @map("tax_percentage") @db.Decimal(5, 2)
  chargeTax     Boolean  @default(false) @map("charge_tax")
  receiptFooter String   @default("") @map("receipt_footer")
  logo          String   @default("")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@map("settings")
}
```

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add Prisma schema with all data models"
```

---

### Task 5: Setup Environment and Database

**Files:**
- Create: `.env`
- Create: `.env.example`
- Modify: `.gitignore`

**Step 1: Create .env.example (safe to commit)**

Create `.env.example`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/store_pos"

# NextAuth
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

**Step 2: Create .env with actual values**

Create `.env`:

```env
# Database - use your local PostgreSQL or a cloud provider
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/store_pos"

# NextAuth - generate with: openssl rand -base64 32
NEXTAUTH_SECRET="generate-a-real-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

**Step 3: Update .gitignore**

Add to `.gitignore`:

```
.env
.env.local
```

**Step 4: Create Prisma client utility**

Create `src/lib/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**Step 5: Push schema to database**

```bash
npx prisma db push
```

Expected: "Your database is now in sync with your Prisma schema."

**Step 6: Generate Prisma client**

```bash
npx prisma generate
```

**Step 7: Commit**

```bash
git add .env.example .gitignore src/lib/prisma.ts prisma/
git commit -m "feat: configure database connection and Prisma client"
```

---

### Task 6: Setup NextAuth.js Authentication

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`

**Step 1: Create auth configuration**

Create `src/lib/auth.ts`:

```typescript
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
        })

        if (!user) {
          return null
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!passwordMatch) {
          return null
        }

        // Update login status
        await prisma.user.update({
          where: { id: user.id },
          data: { status: `Logged In_${new Date().toISOString()}` },
        })

        return {
          id: String(user.id),
          name: user.fullname,
          username: user.username,
          permProducts: user.permProducts,
          permCategories: user.permCategories,
          permTransactions: user.permTransactions,
          permUsers: user.permUsers,
          permSettings: user.permSettings,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = user.username
        token.permProducts = user.permProducts
        token.permCategories = user.permCategories
        token.permTransactions = user.permTransactions
        token.permUsers = user.permUsers
        token.permSettings = user.permSettings
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.username = token.username as string
        session.user.permProducts = token.permProducts as boolean
        session.user.permCategories = token.permCategories as boolean
        session.user.permTransactions = token.permTransactions as boolean
        session.user.permUsers = token.permUsers as boolean
        session.user.permSettings = token.permSettings as boolean
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
}
```

**Step 2: Create NextAuth API route**

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
```

**Step 3: Create types for NextAuth**

Create `src/types/next-auth.d.ts`:

```typescript
import { DefaultSession, DefaultUser } from "next-auth"
import { JWT, DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      username: string
      permProducts: boolean
      permCategories: boolean
      permTransactions: boolean
      permUsers: boolean
      permSettings: boolean
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    username: string
    permProducts: boolean
    permCategories: boolean
    permTransactions: boolean
    permUsers: boolean
    permSettings: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string
    username: string
    permProducts: boolean
    permCategories: boolean
    permTransactions: boolean
    permUsers: boolean
    permSettings: boolean
  }
}
```

**Step 4: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth/ src/types/
git commit -m "feat: configure NextAuth.js with credentials provider"
```

---

### Task 7: Create Database Seed Script

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json`

**Step 1: Create seed script with admin user and sample data**

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create admin user (password: admin)
  const hashedPassword = await bcrypt.hash('admin', 10)

  const admin = await prisma.user.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      username: 'admin',
      password: hashedPassword,
      fullname: 'Administrator',
      permProducts: true,
      permCategories: true,
      permTransactions: true,
      permUsers: true,
      permSettings: true,
      status: '',
    },
  })

  // Create default settings
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      appMode: 'Point of Sale',
      storeName: 'My Store',
      addressLine1: '',
      addressLine2: '',
      phone: '',
      taxNumber: '',
      currencySymbol: '$',
      taxPercentage: 0,
      chargeTax: false,
      receiptFooter: 'Thank you for your purchase!',
      logo: '',
    },
  })

  // Create sample categories
  const category1 = await prisma.category.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: 'Food' },
  })

  const category2 = await prisma.category.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, name: 'Beverages' },
  })

  // Create sample products
  await prisma.product.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Burger',
      price: 8.99,
      categoryId: 1,
      quantity: 50,
      trackStock: true,
      image: '',
    },
  })

  await prisma.product.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      name: 'Fries',
      price: 3.99,
      categoryId: 1,
      quantity: 100,
      trackStock: true,
      image: '',
    },
  })

  await prisma.product.upsert({
    where: { id: 3 },
    update: {},
    create: {
      id: 3,
      name: 'Cola',
      price: 2.50,
      categoryId: 2,
      quantity: 200,
      trackStock: true,
      image: '',
    },
  })

  console.log('Database seeded successfully!')
  console.log({ admin, settings, category1, category2 })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

**Step 2: Add seed script to package.json**

Add to `package.json`:

```json
{
  "prisma": {
    "seed": "npx ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

**Step 3: Install ts-node for seeding**

```bash
npm install -D ts-node
```

**Step 4: Run seed**

```bash
npx prisma db seed
```

Expected: "Database seeded successfully!"

**Step 5: Commit**

```bash
git add prisma/seed.ts package.json package-lock.json
git commit -m "feat: add database seed script with admin user and sample data"
```

---

## Phase 2: Core Layout and Pages

### Task 8: Create App Layout Structure

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/app/(auth)/layout.tsx`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(dashboard)/layout.tsx`
- Create: `src/components/layout/header.tsx`
- Create: `src/components/layout/sidebar.tsx`

**Step 1: Update root layout**

Replace `src/app/layout.tsx`:

```typescript
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Store POS",
  description: "Point of Sale System",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
```

**Step 2: Create auth layout**

Create `src/app/(auth)/layout.tsx`:

```typescript
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      {children}
    </div>
  )
}
```

**Step 3: Create login page**

Create `src/app/(auth)/login/page.tsx`:

```typescript
"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username || !password) {
      toast({
        title: "Error",
        description: "Please enter username and password",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      toast({
        title: "Error",
        description: "Incorrect username or password",
        variant: "destructive",
      })
    } else {
      router.push("/pos")
      router.refresh()
    }
  }

  return (
    <Card className="w-[400px]">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Store POS</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

**Step 4: Create header component**

Create `src/components/layout/header.tsx`:

```typescript
"use client"

import { signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Settings, LogOut, User } from "lucide-react"
import Link from "next/link"

export function Header() {
  const { data: session } = useSession()

  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-4">
      <div className="font-semibold text-lg">Store POS</div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          {session?.user?.name}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {session?.user?.permSettings && (
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
```

**Step 5: Create sidebar component**

Create `src/components/layout/sidebar.tsx`:

```typescript
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  ShoppingCart,
  Package,
  FolderTree,
  Users,
  Receipt,
  Settings,
  UserCircle,
} from "lucide-react"

const navItems = [
  { href: "/pos", label: "POS", icon: ShoppingCart, permission: null },
  { href: "/transactions", label: "Transactions", icon: Receipt, permission: "permTransactions" },
  { href: "/products", label: "Products", icon: Package, permission: "permProducts" },
  { href: "/categories", label: "Categories", icon: FolderTree, permission: "permCategories" },
  { href: "/customers", label: "Customers", icon: UserCircle, permission: null },
  { href: "/users", label: "Users", icon: Users, permission: "permUsers" },
  { href: "/settings", label: "Settings", icon: Settings, permission: "permSettings" },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <aside className="w-56 border-r bg-gray-50 min-h-[calc(100vh-3.5rem)]">
      <nav className="p-2 space-y-1">
        {navItems.map((item) => {
          // Check permission
          if (item.permission && session?.user) {
            const hasPermission = session.user[item.permission as keyof typeof session.user]
            if (!hasPermission) return null
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-gray-200 text-gray-900"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
```

**Step 6: Create dashboard layout**

Create `src/app/(dashboard)/layout.tsx`:

```typescript
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { SessionProvider } from "@/components/providers/session-provider"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  return (
    <SessionProvider session={session}>
      <div className="min-h-screen bg-gray-100">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-4">{children}</main>
        </div>
      </div>
    </SessionProvider>
  )
}
```

**Step 7: Create session provider**

Create `src/components/providers/session-provider.tsx`:

```typescript
"use client"

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"
import { Session } from "next-auth"

export function SessionProvider({
  children,
  session,
}: {
  children: React.ReactNode
  session: Session | null
}) {
  return (
    <NextAuthSessionProvider session={session}>
      {children}
    </NextAuthSessionProvider>
  )
}
```

**Step 8: Install lucide-react icons**

```bash
npm install lucide-react
```

**Step 9: Update root page to redirect**

Replace `src/app/page.tsx`:

```typescript
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (session) {
    redirect("/pos")
  } else {
    redirect("/login")
  }
}
```

**Step 10: Create placeholder POS page**

Create `src/app/(dashboard)/pos/page.tsx`:

```typescript
export default function POSPage() {
  return (
    <div className="text-center py-10">
      <h1 className="text-2xl font-bold">POS Terminal</h1>
      <p className="text-gray-500 mt-2">Coming soon...</p>
    </div>
  )
}
```

**Step 11: Install use-toast hook if missing**

```bash
npx shadcn@latest add toast
```

**Step 12: Test login flow**

Run: `npm run dev`
Navigate to: http://localhost:3000
Expected: Redirects to /login, can login with admin/admin

**Step 13: Commit**

```bash
git add -A
git commit -m "feat: add app layout with auth, header, sidebar navigation"
```

---

## Phase 3: POS Terminal (Core Feature)

### Task 9: Create Product Grid Component

**Files:**
- Create: `src/components/pos/product-grid.tsx`
- Create: `src/components/pos/product-card.tsx`

**Step 1: Create product card**

Create `src/components/pos/product-card.tsx`:

```typescript
"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"

interface ProductCardProps {
  product: {
    id: number
    name: string
    price: number
    quantity: number
    trackStock: boolean
    image: string
  }
  currencySymbol: string
  onAddToCart: () => void
}

export function ProductCard({ product, currencySymbol, onAddToCart }: ProductCardProps) {
  const isOutOfStock = product.trackStock && product.quantity <= 0

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isOutOfStock ? "opacity-50" : ""
      }`}
      onClick={() => !isOutOfStock && onAddToCart()}
    >
      <CardContent className="p-3">
        <div className="aspect-square relative bg-gray-100 rounded-md mb-2">
          {product.image ? (
            <Image
              src={`/uploads/${product.image}`}
              alt={product.name}
              fill
              className="object-cover rounded-md"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No Image
            </div>
          )}
        </div>
        <div className="text-center">
          <p className="font-medium text-sm truncate">{product.name}</p>
          <p className="text-green-600 font-bold">
            {currencySymbol}{product.price.toFixed(2)}
          </p>
          <div className="mt-1">
            {product.trackStock ? (
              <Badge variant={product.quantity > 0 ? "secondary" : "destructive"}>
                Stock: {product.quantity}
              </Badge>
            ) : (
              <Badge variant="outline">N/A</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

**Step 2: Create product grid**

Create `src/components/pos/product-grid.tsx`:

```typescript
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ProductCard } from "./product-card"
import { useToast } from "@/components/ui/use-toast"

interface Product {
  id: number
  name: string
  price: number
  quantity: number
  trackStock: boolean
  image: string
  categoryId: number
}

interface Category {
  id: number
  name: string
}

interface ProductGridProps {
  products: Product[]
  categories: Category[]
  currencySymbol: string
  onAddToCart: (product: Product) => void
}

export function ProductGrid({
  products,
  categories,
  currencySymbol,
  onAddToCart,
}: ProductGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [searchSku, setSearchSku] = useState("")
  const { toast } = useToast()

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.categoryId === selectedCategory)
    : products

  const handleSkuSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const product = products.find((p) => p.id === parseInt(searchSku))

    if (product) {
      if (product.trackStock && product.quantity <= 0) {
        toast({
          title: "Out of stock!",
          description: "This item is currently unavailable",
          variant: "destructive",
        })
      } else {
        onAddToCart(product)
        setSearchSku("")
      }
    } else {
      toast({
        title: "Not Found!",
        description: `${searchSku} is not a valid barcode!`,
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          onClick={() => setSelectedCategory(null)}
          size="sm"
        >
          All
        </Button>
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? "default" : "outline"}
            onClick={() => setSelectedCategory(category.id)}
            size="sm"
          >
            {category.name}
          </Button>
        ))}
      </div>

      {/* Barcode Search */}
      <form onSubmit={handleSkuSearch} className="flex gap-2">
        <Input
          placeholder="Scan barcode or enter SKU..."
          value={searchSku}
          onChange={(e) => setSearchSku(e.target.value)}
          className="max-w-xs"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {/* Product Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {filteredProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            currencySymbol={currencySymbol}
            onAddToCart={() => onAddToCart(product)}
          />
        ))}
      </div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/components/pos/
git commit -m "feat: add product grid and product card components"
```

---

### Task 10: Create Cart Component

**Files:**
- Create: `src/components/pos/cart.tsx`
- Create: `src/hooks/use-cart.ts`

**Step 1: Create cart hook**

Create `src/hooks/use-cart.ts`:

```typescript
"use client"

import { useState, useCallback } from "react"

export interface CartItem {
  id: number
  productName: string
  sku: string
  price: number
  quantity: number
  maxQuantity: number | null // null if stock not tracked
}

export interface Cart {
  items: CartItem[]
  discount: number
  customerId: number | null
  customerName: string
  refNumber: string
}

export function useCart() {
  const [cart, setCart] = useState<Cart>({
    items: [],
    discount: 0,
    customerId: null,
    customerName: "Walk in customer",
    refNumber: "",
  })

  const addToCart = useCallback((product: {
    id: number
    name: string
    price: number
    quantity: number
    trackStock: boolean
  }) => {
    setCart((prev) => {
      const existingIndex = prev.items.findIndex((item) => item.id === product.id)

      if (existingIndex >= 0) {
        // Increment quantity
        const items = [...prev.items]
        const item = items[existingIndex]

        // Check stock limit
        if (item.maxQuantity !== null && item.quantity >= item.maxQuantity) {
          return prev // Don't exceed stock
        }

        items[existingIndex] = { ...item, quantity: item.quantity + 1 }
        return { ...prev, items }
      } else {
        // Add new item
        const newItem: CartItem = {
          id: product.id,
          productName: product.name,
          sku: String(product.id),
          price: product.price,
          quantity: 1,
          maxQuantity: product.trackStock ? product.quantity : null,
        }
        return { ...prev, items: [...prev.items, newItem] }
      }
    })
  }, [])

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    setCart((prev) => {
      const items = prev.items.map((item) => {
        if (item.id === productId) {
          const newQty = Math.max(1, quantity)
          const finalQty = item.maxQuantity !== null
            ? Math.min(newQty, item.maxQuantity)
            : newQty
          return { ...item, quantity: finalQty }
        }
        return item
      })
      return { ...prev, items }
    })
  }, [])

  const removeFromCart = useCallback((productId: number) => {
    setCart((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== productId),
    }))
  }, [])

  const setDiscount = useCallback((discount: number) => {
    setCart((prev) => ({ ...prev, discount: Math.max(0, discount) }))
  }, [])

  const setCustomer = useCallback((customerId: number | null, customerName: string) => {
    setCart((prev) => ({ ...prev, customerId, customerName }))
  }, [])

  const setRefNumber = useCallback((refNumber: string) => {
    setCart((prev) => ({ ...prev, refNumber }))
  }, [])

  const clearCart = useCallback(() => {
    setCart({
      items: [],
      discount: 0,
      customerId: null,
      customerName: "Walk in customer",
      refNumber: "",
    })
  }, [])

  const loadOrder = useCallback((order: {
    items: CartItem[]
    discount: number
    customerId: number | null
    customerName: string
    refNumber: string
  }) => {
    setCart(order)
  }, [])

  // Calculate totals
  const subtotal = cart.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )
  const discountedSubtotal = Math.max(0, subtotal - cart.discount)

  return {
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    setDiscount,
    setCustomer,
    setRefNumber,
    clearCart,
    loadOrder,
    subtotal,
    discountedSubtotal,
    itemCount: cart.items.length,
  }
}
```

**Step 2: Create cart component**

Create `src/components/pos/cart.tsx`:

```typescript
"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Minus, Plus, X } from "lucide-react"
import { Cart as CartType, CartItem } from "@/hooks/use-cart"

interface Customer {
  id: number
  name: string
}

interface CartProps {
  cart: CartType
  subtotal: number
  discountedSubtotal: number
  taxPercentage: number
  chargeTax: boolean
  currencySymbol: string
  customers: Customer[]
  onUpdateQuantity: (productId: number, quantity: number) => void
  onRemoveItem: (productId: number) => void
  onSetDiscount: (discount: number) => void
  onSetCustomer: (customerId: number | null, customerName: string) => void
  onCancel: () => void
  onHold: () => void
  onPay: () => void
}

export function Cart({
  cart,
  subtotal,
  discountedSubtotal,
  taxPercentage,
  chargeTax,
  currencySymbol,
  customers,
  onUpdateQuantity,
  onRemoveItem,
  onSetDiscount,
  onSetCustomer,
  onCancel,
  onHold,
  onPay,
}: CartProps) {
  const taxAmount = chargeTax ? discountedSubtotal * (taxPercentage / 100) : 0
  const total = discountedSubtotal + taxAmount

  const handleCustomerChange = (value: string) => {
    if (value === "0") {
      onSetCustomer(null, "Walk in customer")
    } else {
      const customer = customers.find((c) => c.id === parseInt(value))
      if (customer) {
        onSetCustomer(customer.id, customer.name)
      }
    }
  }

  return (
    <div className="bg-white rounded-lg shadow h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg">Cart ({cart.items.length})</h2>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-auto p-4">
        {cart.items.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Cart is empty</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Price</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cart.items.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">{item.productName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          onUpdateQuantity(item.id, parseInt(e.target.value) || 1)
                        }
                        className="w-12 h-6 text-center p-1"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    {currencySymbol}
                    {(item.price * item.quantity).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-500"
                      onClick={() => onRemoveItem(item.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Totals and Actions */}
      <div className="p-4 border-t space-y-3">
        <div className="flex justify-between text-sm">
          <span>Subtotal:</span>
          <span>{currencySymbol}{subtotal.toFixed(2)}</span>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-sm">Discount:</Label>
          <Input
            type="number"
            value={cart.discount || ""}
            onChange={(e) => onSetDiscount(parseFloat(e.target.value) || 0)}
            className="w-20 h-8"
            placeholder="0.00"
          />
        </div>

        {chargeTax && (
          <div className="flex justify-between text-sm">
            <span>Tax ({taxPercentage}%):</span>
            <span>{currencySymbol}{taxAmount.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between font-bold text-lg border-t pt-2">
          <span>Total:</span>
          <span className="text-green-600">{currencySymbol}{total.toFixed(2)}</span>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Customer:</Label>
          <Select
            value={cart.customerId?.toString() || "0"}
            onValueChange={handleCustomerChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Walk in customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Walk in customer</SelectItem>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id.toString()}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2">
          <Button variant="destructive" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={onHold}>
            Hold
          </Button>
          <Button onClick={onPay} disabled={cart.items.length === 0}>
            Pay
          </Button>
        </div>
      </div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/hooks/use-cart.ts src/components/pos/cart.tsx
git commit -m "feat: add cart hook and cart component"
```

---

### Task 11: Create Payment Modal

**Files:**
- Create: `src/components/pos/payment-modal.tsx`

**Step 1: Create payment modal**

Create `src/components/pos/payment-modal.tsx`:

```typescript
"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PaymentModalProps {
  open: boolean
  onClose: () => void
  total: number
  currencySymbol: string
  onConfirm: (data: {
    paidAmount: number
    changeAmount: number
    paymentType: string
    paymentInfo: string
  }) => void
}

export function PaymentModal({
  open,
  onClose,
  total,
  currencySymbol,
  onConfirm,
}: PaymentModalProps) {
  const [paymentType, setPaymentType] = useState("Cash")
  const [paidAmount, setPaidAmount] = useState("")
  const [paymentInfo, setPaymentInfo] = useState("")

  const paid = parseFloat(paidAmount) || 0
  const change = paid - total

  useEffect(() => {
    if (open) {
      setPaidAmount("")
      setPaymentInfo("")
      setPaymentType("Cash")
    }
  }, [open])

  const handleConfirm = () => {
    if (paid < total) return

    onConfirm({
      paidAmount: paid,
      changeAmount: change,
      paymentType,
      paymentInfo,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center py-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Total Amount</p>
            <p className="text-3xl font-bold text-green-600">
              {currencySymbol}{total.toFixed(2)}
            </p>
          </div>

          <Tabs value={paymentType} onValueChange={setPaymentType}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="Cash">Cash</TabsTrigger>
              <TabsTrigger value="Card">Card</TabsTrigger>
              <TabsTrigger value="Cheque">Cheque</TabsTrigger>
            </TabsList>

            <TabsContent value="Cash" className="space-y-4">
              <div>
                <Label>Amount Received</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="text-lg"
                  autoFocus
                />
              </div>
            </TabsContent>

            <TabsContent value="Card" className="space-y-4">
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="text-lg"
                />
              </div>
              <div>
                <Label>Reference (optional)</Label>
                <Input
                  placeholder="Card reference..."
                  value={paymentInfo}
                  onChange={(e) => setPaymentInfo(e.target.value)}
                />
              </div>
            </TabsContent>

            <TabsContent value="Cheque" className="space-y-4">
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="text-lg"
                />
              </div>
              <div>
                <Label>Cheque Number</Label>
                <Input
                  placeholder="Cheque number..."
                  value={paymentInfo}
                  onChange={(e) => setPaymentInfo(e.target.value)}
                />
              </div>
            </TabsContent>
          </Tabs>

          {paid > 0 && (
            <div className="text-center py-2 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-500">Change</p>
              <p className={`text-2xl font-bold ${change >= 0 ? "text-blue-600" : "text-red-600"}`}>
                {currencySymbol}{Math.abs(change).toFixed(2)}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirm}
              disabled={paid < total}
            >
              Confirm Payment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/pos/payment-modal.tsx
git commit -m "feat: add payment modal with cash/card/cheque support"
```

---

### Task 12: Create Hold Order Modal

**Files:**
- Create: `src/components/pos/hold-modal.tsx`

**Step 1: Create hold order modal**

Create `src/components/pos/hold-modal.tsx`:

```typescript
"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Customer {
  id: number
  name: string
}

interface HoldModalProps {
  open: boolean
  onClose: () => void
  customers: Customer[]
  currentCustomerId: number | null
  onConfirm: (data: {
    refNumber: string
    customerId: number | null
    customerName: string
  }) => void
}

export function HoldModal({
  open,
  onClose,
  customers,
  currentCustomerId,
  onConfirm,
}: HoldModalProps) {
  const [refNumber, setRefNumber] = useState("")
  const [customerId, setCustomerId] = useState<string>(
    currentCustomerId?.toString() || "0"
  )

  useEffect(() => {
    if (open) {
      setRefNumber("")
      setCustomerId(currentCustomerId?.toString() || "0")
    }
  }, [open, currentCustomerId])

  const handleConfirm = () => {
    // Must have either ref number or customer
    if (!refNumber && customerId === "0") {
      return
    }

    const customer = customers.find((c) => c.id === parseInt(customerId))

    onConfirm({
      refNumber,
      customerId: customerId === "0" ? null : parseInt(customerId),
      customerName: customer?.name || "Walk in customer",
    })
  }

  const isValid = refNumber || customerId !== "0"

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hold Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Enter a reference number or select a customer to hold this order.
          </p>

          <div>
            <Label>Reference Number</Label>
            <Input
              placeholder="Enter reference..."
              value={refNumber}
              onChange={(e) => setRefNumber(e.target.value)}
              autoFocus
            />
          </div>

          <div className="text-center text-sm text-gray-400">OR</div>

          <div>
            <Label>Customer</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Walk in customer</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id.toString()}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirm}
              disabled={!isValid}
            >
              Hold Order
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/pos/hold-modal.tsx
git commit -m "feat: add hold order modal"
```

---

### Task 13: Create API Routes for POS Data

**Files:**
- Create: `src/app/api/products/route.ts`
- Create: `src/app/api/categories/route.ts`
- Create: `src/app/api/customers/route.ts`
- Create: `src/app/api/transactions/route.ts`
- Create: `src/app/api/settings/route.ts`

**Step 1: Create products API**

Create `src/app/api/products/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: { category: true },
      orderBy: { name: "asc" },
    })

    const formatted = products.map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      categoryId: p.categoryId,
      categoryName: p.category.name,
      quantity: p.quantity,
      trackStock: p.trackStock,
      image: p.image,
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}
```

**Step 2: Create categories API**

Create `src/app/api/categories/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    })
    return NextResponse.json(categories)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
  }
}
```

**Step 3: Create customers API**

Create `src/app/api/customers/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { name: "asc" },
    })
    return NextResponse.json(customers)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const customer = await prisma.customer.create({
      data: {
        name: body.name,
        phone: body.phone || "",
        email: body.email || "",
        address: body.address || "",
      },
    })

    return NextResponse.json(customer)
  } catch (error) {
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 })
  }
}
```

**Step 4: Create settings API**

Create `src/app/api/settings/route.ts`:

```typescript
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
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}
```

**Step 5: Create transactions API**

Create `src/app/api/transactions/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const onHold = searchParams.get("onHold")
    const customerOrders = searchParams.get("customerOrders")

    let where: any = {}

    if (onHold === "true") {
      where = {
        status: 0,
        refNumber: { not: "" },
      }
    } else if (customerOrders === "true") {
      where = {
        status: 0,
        customerId: { not: null },
        refNumber: "",
      }
    } else if (status !== null) {
      where.status = parseInt(status)
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        items: true,
        customer: true,
        user: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(transactions)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const orderNumber = Math.floor(Date.now() / 1000)

    const transaction = await prisma.transaction.create({
      data: {
        orderNumber,
        refNumber: body.refNumber || "",
        discount: body.discount || 0,
        customerId: body.customerId,
        userId: parseInt(session.user.id),
        status: body.status,
        subtotal: body.subtotal,
        taxAmount: body.taxAmount || 0,
        total: body.total,
        paidAmount: body.paidAmount,
        changeAmount: body.changeAmount,
        paymentType: body.paymentType || "",
        paymentInfo: body.paymentInfo || "",
        tillNumber: body.tillNumber || 1,
        macAddress: body.macAddress || "",
        items: {
          create: body.items.map((item: any) => ({
            productId: item.id,
            productName: item.productName,
            sku: item.sku || String(item.id),
            price: item.price,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: true,
      },
    })

    // Decrement stock if paid
    if (body.status === 1 && body.paidAmount >= body.total) {
      for (const item of body.items) {
        const product = await prisma.product.findUnique({
          where: { id: item.id },
        })
        if (product?.trackStock) {
          await prisma.product.update({
            where: { id: item.id },
            data: {
              quantity: { decrement: item.quantity },
            },
          })
        }
      }
    }

    return NextResponse.json(transaction)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 })
  }
}
```

**Step 6: Commit**

```bash
git add src/app/api/
git commit -m "feat: add API routes for products, categories, customers, settings, transactions"
```

---

### Task 14: Assemble Complete POS Page

**Files:**
- Modify: `src/app/(dashboard)/pos/page.tsx`

**Step 1: Create complete POS page**

Replace `src/app/(dashboard)/pos/page.tsx`:

```typescript
"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { ProductGrid } from "@/components/pos/product-grid"
import { Cart } from "@/components/pos/cart"
import { PaymentModal } from "@/components/pos/payment-modal"
import { HoldModal } from "@/components/pos/hold-modal"
import { useCart } from "@/hooks/use-cart"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Product {
  id: number
  name: string
  price: number
  quantity: number
  trackStock: boolean
  image: string
  categoryId: number
}

interface Category {
  id: number
  name: string
}

interface Customer {
  id: number
  name: string
}

interface Settings {
  currencySymbol: string
  taxPercentage: number
  chargeTax: boolean
}

interface HoldOrder {
  id: number
  orderNumber: number
  refNumber: string
  total: number
  items: any[]
  customer: { id: number; name: string } | null
}

export default function POSPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const {
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    setDiscount,
    setCustomer,
    clearCart,
    loadOrder,
    subtotal,
    discountedSubtotal,
  } = useCart()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [settings, setSettings] = useState<Settings>({
    currencySymbol: "$",
    taxPercentage: 0,
    chargeTax: false,
  })
  const [holdOrders, setHoldOrders] = useState<HoldOrder[]>([])
  const [customerOrders, setCustomerOrders] = useState<HoldOrder[]>([])

  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [holdModalOpen, setHoldModalOpen] = useState(false)
  const [holdOrdersModalOpen, setHoldOrdersModalOpen] = useState(false)
  const [customerOrdersModalOpen, setCustomerOrdersModalOpen] = useState(false)
  const [currentOrderId, setCurrentOrderId] = useState<number | null>(null)

  const taxAmount = settings.chargeTax
    ? discountedSubtotal * (settings.taxPercentage / 100)
    : 0
  const total = discountedSubtotal + taxAmount

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const [productsRes, categoriesRes, customersRes, settingsRes] =
        await Promise.all([
          fetch("/api/products"),
          fetch("/api/categories"),
          fetch("/api/customers"),
          fetch("/api/settings"),
        ])

      setProducts(await productsRes.json())
      setCategories(await categoriesRes.json())
      setCustomers(await customersRes.json())
      setSettings(await settingsRes.json())
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      })
    }
  }, [toast])

  const fetchHoldOrders = useCallback(async () => {
    try {
      const [holdRes, customerRes] = await Promise.all([
        fetch("/api/transactions?onHold=true"),
        fetch("/api/transactions?customerOrders=true"),
      ])
      setHoldOrders(await holdRes.json())
      setCustomerOrders(await customerRes.json())
    } catch (error) {
      console.error("Failed to fetch orders:", error)
    }
  }, [])

  useEffect(() => {
    fetchData()
    fetchHoldOrders()

    // Polling every 30 seconds
    const interval = setInterval(() => {
      fetchData()
      fetchHoldOrders()
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchData, fetchHoldOrders])

  const handleAddToCart = (product: Product) => {
    if (product.trackStock && product.quantity <= 0) {
      toast({
        title: "Out of stock!",
        description: "This item is currently unavailable",
        variant: "destructive",
      })
      return
    }
    addToCart(product)
  }

  const handleCancel = () => {
    if (cart.items.length > 0) {
      clearCart()
      setCurrentOrderId(null)
      toast({ title: "Cart cleared" })
    }
  }

  const handleHold = () => {
    if (cart.items.length === 0) {
      toast({
        title: "Empty cart",
        description: "Add items before holding",
        variant: "destructive",
      })
      return
    }
    setHoldModalOpen(true)
  }

  const handleHoldConfirm = async (data: {
    refNumber: string
    customerId: number | null
    customerName: string
  }) => {
    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refNumber: data.refNumber,
          customerId: data.customerId,
          status: 0,
          subtotal: discountedSubtotal,
          taxAmount,
          total,
          discount: cart.discount,
          items: cart.items,
          tillNumber: 1,
        }),
      })

      if (!response.ok) throw new Error("Failed to hold order")

      setHoldModalOpen(false)
      clearCart()
      setCurrentOrderId(null)
      fetchHoldOrders()
      toast({ title: "Order held successfully" })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to hold order",
        variant: "destructive",
      })
    }
  }

  const handlePay = () => {
    if (cart.items.length === 0) {
      toast({
        title: "Empty cart",
        description: "Add items before paying",
        variant: "destructive",
      })
      return
    }
    setPaymentModalOpen(true)
  }

  const handlePaymentConfirm = async (data: {
    paidAmount: number
    changeAmount: number
    paymentType: string
    paymentInfo: string
  }) => {
    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refNumber: cart.refNumber,
          customerId: cart.customerId,
          status: 1,
          subtotal: discountedSubtotal,
          taxAmount,
          total,
          discount: cart.discount,
          paidAmount: data.paidAmount,
          changeAmount: data.changeAmount,
          paymentType: data.paymentType,
          paymentInfo: data.paymentInfo,
          items: cart.items,
          tillNumber: 1,
        }),
      })

      if (!response.ok) throw new Error("Failed to process payment")

      setPaymentModalOpen(false)
      clearCart()
      setCurrentOrderId(null)
      fetchData()
      fetchHoldOrders()
      toast({ title: "Payment successful!" })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process payment",
        variant: "destructive",
      })
    }
  }

  const handleLoadOrder = (order: HoldOrder) => {
    loadOrder({
      items: order.items.map((item: any) => ({
        id: item.productId,
        productName: item.productName,
        sku: item.sku,
        price: Number(item.price),
        quantity: item.quantity,
        maxQuantity: null,
      })),
      discount: Number(order.total) - order.items.reduce((sum: number, item: any) =>
        sum + Number(item.price) * item.quantity, 0),
      customerId: order.customer?.id || null,
      customerName: order.customer?.name || "Walk in customer",
      refNumber: order.refNumber,
    })
    setCurrentOrderId(order.id)
    setHoldOrdersModalOpen(false)
    setCustomerOrdersModalOpen(false)
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-7rem)]">
      {/* Product Grid */}
      <div className="flex-1 overflow-auto">
        <ProductGrid
          products={products}
          categories={categories}
          currencySymbol={settings.currencySymbol}
          onAddToCart={handleAddToCart}
        />

        {/* Hold/Customer Orders Buttons */}
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => setHoldOrdersModalOpen(true)}
          >
            Hold Orders ({holdOrders.length})
          </Button>
          <Button
            variant="outline"
            onClick={() => setCustomerOrdersModalOpen(true)}
          >
            Customer Orders ({customerOrders.length})
          </Button>
        </div>
      </div>

      {/* Cart */}
      <div className="w-96">
        <Cart
          cart={cart}
          subtotal={subtotal}
          discountedSubtotal={discountedSubtotal}
          taxPercentage={settings.taxPercentage}
          chargeTax={settings.chargeTax}
          currencySymbol={settings.currencySymbol}
          customers={customers}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeFromCart}
          onSetDiscount={setDiscount}
          onSetCustomer={setCustomer}
          onCancel={handleCancel}
          onHold={handleHold}
          onPay={handlePay}
        />
      </div>

      {/* Modals */}
      <PaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        total={total}
        currencySymbol={settings.currencySymbol}
        onConfirm={handlePaymentConfirm}
      />

      <HoldModal
        open={holdModalOpen}
        onClose={() => setHoldModalOpen(false)}
        customers={customers}
        currentCustomerId={cart.customerId}
        onConfirm={handleHoldConfirm}
      />

      {/* Hold Orders Modal */}
      <Dialog open={holdOrdersModalOpen} onOpenChange={setHoldOrdersModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Hold Orders</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 max-h-96 overflow-auto">
            {holdOrders.map((order) => (
              <div
                key={order.id}
                className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => handleLoadOrder(order)}
              >
                <p className="font-medium">Ref: {order.refNumber}</p>
                <p className="text-sm text-gray-500">
                  {order.items.length} items
                </p>
                <p className="text-green-600 font-bold">
                  {settings.currencySymbol}{Number(order.total).toFixed(2)}
                </p>
              </div>
            ))}
            {holdOrders.length === 0 && (
              <p className="col-span-2 text-center text-gray-500 py-8">
                No hold orders
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Orders Modal */}
      <Dialog open={customerOrdersModalOpen} onOpenChange={setCustomerOrdersModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customer Orders</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 max-h-96 overflow-auto">
            {customerOrders.map((order) => (
              <div
                key={order.id}
                className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => handleLoadOrder(order)}
              >
                <p className="font-medium">{order.customer?.name}</p>
                <p className="text-sm text-gray-500">
                  {order.items.length} items
                </p>
                <p className="text-green-600 font-bold">
                  {settings.currencySymbol}{Number(order.total).toFixed(2)}
                </p>
              </div>
            ))}
            {customerOrders.length === 0 && (
              <p className="col-span-2 text-center text-gray-500 py-8">
                No customer orders
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

**Step 2: Test the POS page**

Run: `npm run dev`
Navigate to: http://localhost:3000/pos
Expected: Full POS interface with product grid, cart, and modals

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/pos/page.tsx
git commit -m "feat: complete POS terminal page with full functionality"
```

---

## Phase 4: Remaining Pages (Summary)

The implementation plan continues with these remaining tasks:

### Task 15-18: CRUD Pages
- **Task 15:** Products management page (`/products`)
- **Task 16:** Categories management page (`/categories`)
- **Task 17:** Customers management page (`/customers`)
- **Task 18:** Users management page (`/users`)

### Task 19-20: Transactions & Settings
- **Task 19:** Transactions history page with filters (`/transactions`)
- **Task 20:** Settings page (`/settings`)

### Task 21-22: Receipts
- **Task 21:** Receipt PDF component
- **Task 22:** Email receipt functionality

### Task 23: Final Polish
- **Task 23:** Responsive design tweaks, error handling, loading states

---

**Each of these follows the same pattern:**
1. Create API route (if not exists)
2. Create form component
3. Create list/table component
4. Create page component
5. Test manually
6. Commit

---

## Summary

**Total Tasks:** 23

**Phase 1 (Setup):** Tasks 1-7
**Phase 2 (Layout):** Task 8
**Phase 3 (POS Core):** Tasks 9-14
**Phase 4 (CRUD Pages):** Tasks 15-20
**Phase 5 (Receipts):** Tasks 21-22
**Phase 6 (Polish):** Task 23

**Estimated commits:** 23+

After completing all tasks, the web POS will have feature parity with the Electron version.
