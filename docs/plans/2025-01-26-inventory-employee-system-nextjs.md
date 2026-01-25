# Inventory & Employee Dashboard System - Next.js/Prisma Adaptation

**Date:** January 26, 2025
**Status:** Ready for Implementation
**Based on:** Original design from 2025-01-25-inventory-employee-system-design.md
**Target:** web-rebuild (Next.js 16 + Prisma + PostgreSQL)

---

## 1. Overview

This document adapts the original inventory/employee system design for the Next.js/Prisma architecture. All features from the original design are preserved - only the implementation technology changes.

### Technology Mapping

| Original | Next.js Adaptation |
|----------|-------------------|
| NeDB databases | Prisma models (PostgreSQL) |
| Express.js API | Next.js App Router API routes |
| jQuery/HTML | React components (existing patterns) |
| JavaScript | TypeScript |
| Callbacks | Async/await |

---

## 2. Prisma Schema Additions

Add to `prisma/schema.prisma`:

### 2.1 Enhance Existing Ingredient Model

```prisma
model Ingredient {
  id          Int           @id @default(autoincrement())
  name        String
  category    String
  unit        String
  costPerUnit Decimal       @map("cost_per_unit") @db.Decimal(10, 2)
  parLevel    Int           @default(0) @map("par_level")
  lastUpdated DateTime?     @map("last_updated")
  vendorId    Int?          @map("vendor_id")
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")

  // NEW: Stock tracking (from original design)
  quantity          Decimal   @default(0) @db.Decimal(10, 2)
  lastRestockDate   DateTime? @map("last_restock_date")

  // NEW: Purchase unit details (from original design section 3.1)
  unitQuantity      Decimal   @default(1) @map("unit_quantity") @db.Decimal(10, 2)
  unitNote          String?   @map("unit_note")  // "8pcs per pack"

  // NEW: Conversion for recipes (from original design)
  baseUnit          String?   @map("base_unit")
  conversionFactor  Decimal?  @map("conversion_factor") @db.Decimal(10, 4)

  // NEW: Auto-sync to products (from original design)
  sellable          Boolean   @default(false)
  linkedProductId   Int?      @unique @map("linked_product_id")
  syncStatus        String    @default("synced") @map("sync_status")
  syncError         String?   @map("sync_error")
  lastSyncAt        DateTime? @map("last_sync_at")

  // NEW: Soft delete (from original design)
  isActive          Boolean   @default(true) @map("is_active")
  deactivatedAt     DateTime? @map("deactivated_at")
  deactivatedById   Int?      @map("deactivated_by_id")

  // NEW: Barcode support
  barcode           String?   @unique

  // Relations
  vendor            Vendor?   @relation(fields: [vendorId], references: [id])
  recipeItems       RecipeItem[]
  wasteLogs         WasteLog[]
  history           IngredientHistory[]
  linkedProduct     Product?  @relation("IngredientProduct", fields: [linkedProductId], references: [id])
  deactivatedBy     User?     @relation("DeactivatedIngredients", fields: [deactivatedById], references: [id])

  @@map("ingredients")
}
```

### 2.2 New: IngredientHistory Model

```prisma
model IngredientHistory {
  id              Int        @id @default(autoincrement())
  ingredientId    Int        @map("ingredient_id")
  ingredientName  String     @map("ingredient_name")
  changeId        String     @map("change_id")

  field           String                    // quantity, costPerUnit
  oldValue        String     @map("old_value")
  newValue        String     @map("new_value")

  source          String                    // manual_edit, sale, inventory_count, restock, import
  reason          String?                   // waste, breakage, theft, miscount, testing, sale, restock, adjustment, other
  reasonNote      String?    @map("reason_note")

  userId          Int        @map("user_id")
  userName        String     @map("user_name")
  createdAt       DateTime   @default(now()) @map("created_at")

  ingredient      Ingredient @relation(fields: [ingredientId], references: [id])

  @@index([ingredientId])
  @@index([createdAt])
  @@index([changeId])
  @@map("ingredient_history")
}
```

### 2.3 New: EmployeeTask Model

```prisma
model EmployeeTask {
  id              Int       @id @default(autoincrement())
  name            String
  type            String                    // action, inventory, custom
  description     String?
  icon            String    @default("📋")
  sortOrder       Int       @default(0) @map("sort_order")

  // Schedule (from original design section 3.4)
  deadlineTime    String    @map("deadline_time")
  deadlineType    String    @default("daily") @map("deadline_type")
  daysOfWeek      Int[]     @default([0,1,2,3,4,5,6]) @map("days_of_week")

  // Assignment (from original design)
  assignmentType  String    @default("anyone") @map("assignment_type")
  assignedToId    Int?      @map("assigned_to_id")
  allowDelegation Boolean   @default(false) @map("allow_delegation")

  // Rules (from original design)
  required        Boolean   @default(false)
  streakBreaking  Boolean   @default(false) @map("streak_breaking")
  notifyIfOverdue Boolean   @default(false) @map("notify_if_overdue")
  notifyAfterMins Int       @default(30) @map("notify_after_mins")

  // Approval workflow (from original design)
  status          String    @default("approved")
  createdById     Int       @map("created_by_id")
  approvedById    Int?      @map("approved_by_id")
  approvedAt      DateTime? @map("approved_at")
  rejectionNote   String?   @map("rejection_note")

  isActive        Boolean   @default(true) @map("is_active")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  // Relations
  completions     TaskCompletion[]
  createdBy       User      @relation("CreatedTasks", fields: [createdById], references: [id])
  approvedBy      User?     @relation("ApprovedTasks", fields: [approvedById], references: [id])
  assignedTo      User?     @relation("AssignedTasks", fields: [assignedToId], references: [id])

  @@map("employee_tasks")
}
```

### 2.4 New: TaskCompletion Model

```prisma
model TaskCompletion {
  id              Int       @id @default(autoincrement())
  date            DateTime  @db.Date
  taskId          Int       @map("task_id")
  taskName        String    @map("task_name")
  taskType        String    @map("task_type")

  // Completion (from original design section 3.5)
  status          String    @default("pending")
  startedAt       DateTime? @map("started_at")
  completedAt     DateTime? @map("completed_at")
  completedById   Int?      @map("completed_by_id")
  completedByName String?   @map("completed_by_name")

  // Streak tracking
  deadlineTime    String    @map("deadline_time")
  wasOnTime       Boolean?  @map("was_on_time")

  // Task-specific data (from original design - varies by type)
  data            Json?

  createdAt       DateTime  @default(now()) @map("created_at")

  // Relations
  task            EmployeeTask @relation(fields: [taskId], references: [id])
  completedBy     User?     @relation(fields: [completedById], references: [id])

  @@unique([date, taskId])
  @@index([date])
  @@index([completedById])
  @@map("task_completions")
}
```

### 2.5 New: UserStreak Model

```prisma
model UserStreak {
  id                Int       @id @default(autoincrement())
  userId            Int       @unique @map("user_id")
  userName          String    @map("user_name")

  currentStreak     Int       @default(0) @map("current_streak")
  longestStreak     Int       @default(0) @map("longest_streak")
  lastCompletedDate DateTime? @map("last_completed_date") @db.Date
  streakStartedDate DateTime? @map("streak_started_date") @db.Date

  // Milestones (from original design section 3.6)
  milestones        Json      @default("[]")

  updatedAt         DateTime  @updatedAt @map("updated_at")

  user              User      @relation(fields: [userId], references: [id])

  @@map("user_streaks")
}
```

### 2.6 New: InventoryCountDraft Model

```prisma
model InventoryCountDraft {
  id              Int       @id @default(autoincrement())
  userId          Int       @map("user_id")
  userName        String    @map("user_name")

  // Draft data
  counts          Json                      // [{ingredientId, expected, actual, reason, reasonNote}]
  startedAt       DateTime  @default(now()) @map("started_at")
  lastUpdatedAt   DateTime  @updatedAt @map("last_updated_at")

  user            User      @relation(fields: [userId], references: [id])

  @@map("inventory_count_drafts")
}
```

### 2.7 Update Existing User Model

```prisma
model User {
  // ... existing fields ...

  // NEW: Relations for employee system
  streak              UserStreak?
  taskCompletions     TaskCompletion[]
  createdTasks        EmployeeTask[]    @relation("CreatedTasks")
  approvedTasks       EmployeeTask[]    @relation("ApprovedTasks")
  assignedTasks       EmployeeTask[]    @relation("AssignedTasks")
  deactivatedIngredients Ingredient[]   @relation("DeactivatedIngredients")
  countDrafts         InventoryCountDraft[]

  @@map("users")
}
```

### 2.8 Update Existing Product Model

```prisma
model Product {
  // ... existing fields ...

  // NEW: Ingredient link (from original design section 3.3)
  linkedIngredientId  Int?      @unique @map("linked_ingredient_id")
  needsPricing        Boolean   @default(false) @map("needs_pricing")

  // Relations
  linkedIngredient    Ingredient? @relation("IngredientProduct")

  @@map("products")
}
```

---

## 3. API Routes

All routes in `src/app/api/`. Follow existing patterns from the codebase.

### 3.1 Ingredients API (Enhanced)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/ingredients` | GET | List all active (include quantity, threshold status) |
| `/api/ingredients` | POST | Create (auto-sync if sellable) |
| `/api/ingredients/[id]` | GET | Get single with history summary |
| `/api/ingredients/[id]` | PUT | Update (logs history for quantity/cost changes) |
| `/api/ingredients/[id]` | DELETE | Soft delete |
| `/api/ingredients/low-stock` | GET | Below threshold, sorted by priority ratio |
| `/api/ingredients/[id]/history` | GET | Paginated audit trail |
| `/api/ingredients/[id]/restock` | POST | Add stock + optionally update cost |

### 3.2 Inventory Count API (New)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/inventory-count/prepare` | GET | Get all ingredients with expected quantities |
| `/api/inventory-count/draft` | GET | Get current user's draft (if any) |
| `/api/inventory-count/draft` | POST | Save/update draft |
| `/api/inventory-count/draft` | DELETE | Discard draft |
| `/api/inventory-count/submit` | POST | Finalize count, log history, update quantities |

### 3.3 Tasks API (New)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/tasks` | GET | List all active task definitions |
| `/api/tasks` | POST | Create task (pending approval) |
| `/api/tasks/[id]` | GET | Get single task |
| `/api/tasks/[id]` | PUT | Update task |
| `/api/tasks/[id]` | DELETE | Soft delete |
| `/api/tasks/[id]/approve` | POST | Approve task (admin) |
| `/api/tasks/[id]/reject` | POST | Reject task (admin) |
| `/api/tasks/today` | GET | Today's tasks with completion status |
| `/api/tasks/[id]/start` | POST | Mark in_progress |
| `/api/tasks/[id]/complete` | POST | Mark completed, update streak |
| `/api/tasks/calendar` | GET | History by date range |

### 3.4 Streaks API (New)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/streaks/me` | GET | Current user's streak |
| `/api/streaks/team` | GET | All team members' streaks |
| `/api/streaks/leaderboard` | GET | Top streaks |

### 3.5 Dashboard API (New)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/dashboard/employee` | GET | Aggregated: tasks, streak, alerts, team status |

### 3.6 Modified Existing APIs

**`/api/transactions` (POST /new)**
- After successful sale, decrement linked ingredient quantities
- Log to IngredientHistory with source="sale"

---

## 4. UI Pages

All pages in `src/app/(dashboard)/`.

### 4.1 Enhanced Existing Pages

| Page | Changes |
|------|---------|
| `/ingredients` | Add quantity column, low-stock badge, restock button |

### 4.2 New Pages

| Page | Purpose | Key Components |
|------|---------|----------------|
| `/ingredients/count` | Inventory count flow | Count form, discrepancy modal, draft indicator |
| `/employee` | Employee dashboard | Timeline, Andon board, streak display, team status |
| `/tasks` | Task management (admin) | Task list, create/edit dialog, approval workflow |
| `/calendar` | Task completion history | Month view, day detail modal |

### 4.3 Sidebar Updates

Add view toggle (Employee/Admin) and new menu items per original design section 5.6.

---

## 5. Implementation Phases

Adapted from original design section 7.

### Phase 1: Foundation (Prisma + Enhanced Ingredients)
- [ ] Add new Prisma models
- [ ] Run migration
- [ ] Enhance ingredients API (quantity, history, low-stock, restock)
- [ ] Update ingredients UI (quantity display, restock dialog)

### Phase 2: Employee Dashboard
- [ ] Tasks API (CRUD, today, complete)
- [ ] Streaks API
- [ ] Dashboard API
- [ ] Employee dashboard page (Timeline + Andon)
- [ ] View toggle in sidebar

### Phase 3: Inventory Count
- [ ] Count API (prepare, draft, submit)
- [ ] Inventory count page
- [ ] Discrepancy modal with reason quick-picks
- [ ] Draft save/resume

### Phase 4: POS Integration
- [ ] Auto-sync sellable ingredients to products
- [ ] needs_pricing flag handling
- [ ] Update transaction to decrement ingredients
- [ ] Low-stock alerts in POS

### Phase 5: Recipes & Pricing
- [ ] Recipe builder (enhance existing)
- [ ] Pricing calculator
- [ ] Margin warnings

### Phase 6: Reporting & Polish
- [ ] Calendar view
- [ ] Enhanced transaction history
- [ ] Audit log viewer
- [ ] Mobile responsiveness

---

## 6. Default Data

From original design section 8.9.

### Default Tasks (seed data)
```typescript
const defaultTasks = [
  { name: "Open Register", type: "action", icon: "💰", deadlineTime: "08:30", required: true, streakBreaking: true },
  { name: "Inventory Count", type: "inventory", icon: "📦", deadlineTime: "10:00", required: true, streakBreaking: true },
  { name: "Restock Low Items", type: "action", icon: "🥤", deadlineTime: "14:00", required: false, streakBreaking: false },
  { name: "End-of-Day Count", type: "inventory", icon: "📋", deadlineTime: "21:00", required: false, streakBreaking: false },
  { name: "Close Register", type: "action", icon: "💰", deadlineTime: "21:30", required: true, streakBreaking: true }
]
```

### Default Discrepancy Reasons
```typescript
const discrepancyReasons = [
  { name: "Waste / Spoilage", icon: "🗑️", requiresNote: false },
  { name: "Breakage / Damaged", icon: "💔", requiresNote: false },
  { name: "Theft Suspected", icon: "🚨", requiresNote: true },
  { name: "Miscount (previous)", icon: "🔢", requiresNote: false },
  { name: "Testing / Samples", icon: "🧪", requiresNote: false },
  { name: "Given Away / Promo", icon: "🎁", requiresNote: false },
  { name: "Other", icon: "✏️", requiresNote: true }
]
```

### Default Streak Milestones
```typescript
const streakMilestones = [
  { days: 7, badge: "🏅", title: "One Week Strong" },
  { days: 14, badge: "🏅", title: "Two Week Champion" },
  { days: 30, badge: "🏆", title: "Monthly Master" },
  { days: 60, badge: "🏆", title: "Consistency King" },
  { days: 90, badge: "👑", title: "Legendary" }
]
```

---

## 7. File Structure

```
src/app/
├── api/
│   ├── ingredients/
│   │   ├── route.ts                 # GET (enhanced), POST
│   │   ├── [id]/
│   │   │   ├── route.ts             # GET, PUT, DELETE
│   │   │   ├── history/route.ts     # GET (paginated)
│   │   │   └── restock/route.ts     # POST
│   │   └── low-stock/route.ts       # GET
│   ├── inventory-count/
│   │   ├── prepare/route.ts         # GET
│   │   ├── draft/route.ts           # GET, POST, DELETE
│   │   └── submit/route.ts          # POST
│   ├── tasks/
│   │   ├── route.ts                 # GET, POST
│   │   ├── [id]/
│   │   │   ├── route.ts             # GET, PUT, DELETE
│   │   │   ├── approve/route.ts     # POST
│   │   │   ├── reject/route.ts      # POST
│   │   │   ├── start/route.ts       # POST
│   │   │   └── complete/route.ts    # POST
│   │   ├── today/route.ts           # GET
│   │   └── calendar/route.ts        # GET
│   ├── streaks/
│   │   ├── me/route.ts              # GET
│   │   ├── team/route.ts            # GET
│   │   └── leaderboard/route.ts     # GET
│   └── dashboard/
│       └── employee/route.ts        # GET
├── (dashboard)/
│   ├── ingredients/
│   │   ├── page.tsx                 # Enhanced with quantity
│   │   └── count/page.tsx           # NEW: Inventory count
│   ├── employee/page.tsx            # NEW: Employee dashboard
│   ├── tasks/page.tsx               # NEW: Task management
│   └── calendar/page.tsx            # NEW: Completion calendar
└── ...

prisma/
├── schema.prisma                    # Updated with new models
├── migrations/                      # New migration
└── seed.ts                          # Add default tasks, milestones
```

---

## References

- Original design: `docs/plans/2025-01-25-inventory-employee-system-design.md`
- Existing patterns: See `/api/products`, `/api/vendors` for API structure
- UI patterns: See `/(dashboard)/ingredients/page.tsx` for component patterns
