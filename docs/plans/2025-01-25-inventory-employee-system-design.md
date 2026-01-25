# Inventory & Employee Dashboard System Design

**Date:** January 25, 2025
**Status:** Ready for Implementation
**Estimated Duration:** 12 weeks (6 phases)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Data Architecture](#2-data-architecture)
3. [Database Schemas](#3-database-schemas)
4. [API Routes](#4-api-routes)
5. [UI Components](#5-ui-components)
6. [Settings & Admin Views](#6-settings--admin-views)
7. [Implementation Plan](#7-implementation-plan)
8. [Technical Considerations](#8-technical-considerations)

---

## 1. Overview

### Goals

1. **Ingredient Tracking** - Track raw materials with costs, thresholds, and history
2. **Threshold Alerts** - Low-stock warnings with priority levels, shown on dashboard and during sales
3. **Stock Tracking** - Auto-decrement inventory when sales are made
4. **Pricing Calculator** - Cost + markup % = selling price
5. **History Tracking** - Audit trail for all changes
6. **Employee Dashboard** - Simplified daily operations view with task tracking
7. **Habit System** - Daily checklists with streak tracking

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data model | Separate databases (ingredients + products) | Cleaner separation, supports recipes later |
| Beverages | Auto-sync from ingredients to products | Sold as-is, one source of truth |
| Inventory count | Exception-based | Faster for employees |
| Expected quantities | Manual until recipes configured | Phased approach |
| Alerts during sale | Subtle badge (non-blocking) | Don't interrupt flow |
| Dashboard access | Toggle in sidebar, anyone can switch | Flexible |
| Discrepancy reasons | Optional with quick-picks | Balance speed and data |
| Calendar view | Overview + tap for details | Both quick glance and deep dive |
| Pricing calculator | Inline + dedicated tool | Available where needed |
| Streak scope | Configurable deadline per task | Flexible for different operations |
| Threshold | Required when adding ingredient | Enforce good data |
| Unit conversion | Support it for recipe precision | Future-ready |
| Existing products | Start fresh via auto-sync | Clean slate |
| Layout | Responsive (mobile + desktop) | Works everywhere |

---

## 2. Data Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      DATA ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐         auto-sync        ┌─────────────┐  │
│  │ ingredients  │ ─────────────────────▶   │  products   │  │
│  │     .db      │   (if sellable=true)     │    .db      │  │
│  └──────────────┘                          └─────────────┘  │
│         │                                        │          │
│         │ logs changes                          │ sales     │
│         ▼                                        ▼          │
│  ┌──────────────┐                          ┌─────────────┐  │
│  │ ingredients  │                          │transactions │  │
│  │  _history.db │                          │    .db      │  │
│  └──────────────┘                          └─────────────┘  │
│                                                             │
│  ┌──────────────┐         logs             ┌─────────────┐  │
│  │ daily_tasks  │ ─────────────────────▶   │ daily_logs  │  │
│  │     .db      │                          │    .db      │  │
│  └──────────────┘                          └─────────────┘  │
│                                                             │
│  ┌──────────────┐                                           │
│  │  streaks.db  │  (efficient streak queries)               │
│  └──────────────┘                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### New Databases

| Database | Purpose |
|----------|---------|
| `ingredients.db` | Raw materials with cost, stock, thresholds |
| `ingredients_history.db` | Audit trail for all changes |
| `daily_tasks.db` | Task templates (configurable) |
| `daily_logs.db` | Completion history per day |
| `streaks.db` | User streak tracking |

### Modified Databases

| Database | Changes |
|----------|---------|
| `inventory.db` (products) | Add `cost`, `recipe[]`, `needs_pricing`, `linked_ingredient_id` |

---

## 3. Database Schemas

### 3.1 ingredients.db

```javascript
{
  _id: 1737849600,              // timestamp ID
  name: "Pork",
  barcode: "",                  // for scanner input

  // Purchase unit (separated for calculations)
  unit_quantity: 1,
  unit_type: "Kilo",            // Kilo, Gram, Liter, ML, Pack, Piece, Bundle, Box
  unit_note: "",                // "8pcs per pack"

  // Conversion (for recipes)
  base_unit: "Gram",
  conversion_factor: 1000,      // 1 Kilo = 1000 Grams

  // Financials
  cost: 270,
  supplier: "",                 // optional

  // Stock
  quantity: 10,
  threshold: 3,                 // required - warn below this
  priority: 1,                  // 1=urgent, 2=normal, 3=low
  last_restock_date: null,

  // Auto-sync to products
  sellable: false,
  linked_product_id: null,
  sync_status: "synced",        // synced, pending, failed
  sync_error: null,
  last_sync_at: null,

  // Metadata
  category: "meat",
  is_active: true,              // soft delete
  deactivated_at: null,
  deactivated_by: null,
  created_at: "2025-01-24T00:00:00Z",
  updated_at: "2025-01-24T00:00:00Z"
}
```

### 3.2 ingredients_history.db

```javascript
{
  _id: 1737849601,
  change_id: "chg_1737849601",  // groups related changes
  ingredient_id: 1737849600,
  ingredient_name: "Pork",      // denormalized

  field: "quantity",
  old_value: 10,
  new_value: 8,

  source: "inventory_count",    // manual_edit, sale, inventory_count, restock, import
  reason: "waste",              // waste, breakage, theft, miscount, testing, sale, restock, adjustment, other
  reason_note: "",

  user_id: 1,
  user_name: "Juan",            // denormalized
  timestamp: "2025-01-24T10:30:00Z"
}
```

### 3.3 inventory.db (products) - Updated

```javascript
{
  _id: 1737849700,
  name: "Water 1L",
  barcode: "",

  price: 20,                    // selling price
  cost: 14.50,                  // NEW: from ingredient
  markup_percent: 38,           // NEW: calculated

  category: "beverages",
  quantity: 80,
  stock: 0,                     // 0=track, 1=don't (legacy)
  img: "",

  // NEW: Ingredient link
  needs_pricing: false,         // true = show red border in POS
  linked_ingredient_id: 1737849600,

  // NEW: Recipe (future)
  recipe: [],                   // [{ ingredient_id, amount, base_unit }]

  // NEW: Metadata
  is_active: true,
  created_at: "2025-01-24T00:00:00Z",
  updated_at: "2025-01-24T00:00:00Z"
}
```

### 3.4 daily_tasks.db

```javascript
{
  _id: 1,
  name: "Inventory Count",
  type: "inventory",            // action, inventory, custom
  description: "Count all ingredients and report discrepancies",
  icon: "📦",
  order: 2,

  // Schedule
  deadline_time: "10:00",
  deadline_type: "daily",       // daily, weekly, monthly
  days_of_week: [1,2,3,4,5,6,0], // which days (0=Sun)

  // Assignment
  assignment_type: "anyone",    // anyone, role, person, rotating
  assigned_to: null,            // role name, user_id, or rotation array
  allow_delegation: false,

  // Rules
  required: true,
  streak_breaking: true,
  notify_if_overdue: false,
  notify_after_minutes: 30,

  // Approval workflow
  status: "approved",           // draft, pending_approval, approved, rejected
  created_by: 1,
  approved_by: null,
  approved_at: null,
  rejection_note: "",

  is_active: true,
  created_at: "2025-01-24T00:00:00Z",
  updated_at: "2025-01-24T00:00:00Z"
}
```

### 3.5 daily_logs.db

```javascript
{
  _id: 1737849800,
  date: "2025-01-25",
  task_id: 1,
  task_name: "Inventory Count",   // denormalized
  task_type: "inventory",

  // Completion
  status: "completed",            // pending, in_progress, completed, skipped
  started_at: "2025-01-25T08:00:00Z",
  completed_at: "2025-01-25T08:30:00Z",
  completed_by: 3,
  completed_by_name: "Juan",      // denormalized

  // Streak tracking
  deadline_time: "10:00",
  was_on_time: true,

  // Task-specific data (varies by type)
  data: {
    // For inventory type:
    discrepancies: [
      {
        ingredient_id: 123,
        ingredient_name: "Water 1L",
        expected: 72,
        actual: 68,
        difference: -4,
        reason: "waste",
        reason_note: ""
      }
    ],
    total_items_checked: 45,
    items_with_discrepancy: 1
  }
}
```

### 3.6 streaks.db

```javascript
{
  _id: 1,
  user_id: 3,
  user_name: "Juan",

  current_streak: 12,
  longest_streak: 24,
  last_completed_date: "2025-01-25",
  streak_started_date: "2025-01-14",

  // Milestones earned
  milestones: [
    { days: 7, earned_at: "2025-01-21T00:00:00Z" },
    { days: 30, earned_at: null }  // not yet earned
  ]
}
```

---

## 4. API Routes

### 4.1 api/ingredients.js

| Method | Endpoint | Access | Purpose |
|--------|----------|--------|---------|
| GET | `/ingredients` | All | List all active |
| GET | `/ingredients/:id` | All | Get single |
| POST | `/ingredients` | All | Create (auto-sync if sellable) |
| PUT | `/ingredients/:id` | All | Update (logs history) |
| DELETE | `/ingredients/:id` | Admin | Soft delete |
| GET | `/ingredients/low-stock` | All | Below threshold (priority sorted) |
| GET | `/ingredients/history/:id` | All | Change history (paginated) |
| POST | `/ingredients/:id/restock` | All | Add stock + update cost |
| POST | `/ingredients/import` | Admin | CSV bulk import |
| GET | `/ingredients/export` | Admin | CSV export |
| GET | `/ingredients/count/prepare` | All | Get expected quantities |
| GET | `/ingredients/count/draft` | All | Resume partial count |
| POST | `/ingredients/count/draft` | All | Save partial count |
| POST | `/ingredients/count/submit` | All | Finalize count |
| DELETE | `/ingredients/count/draft` | All | Discard draft |

### 4.2 api/tasks.js

| Method | Endpoint | Access | Purpose |
|--------|----------|--------|---------|
| GET | `/tasks` | All | List all active |
| GET | `/tasks/today` | All | Today's tasks + status |
| POST | `/tasks` | All | Create (pending approval) |
| PUT | `/tasks/:id` | Admin | Update task |
| PUT | `/tasks/:id/approve` | Admin | Approve task |
| PUT | `/tasks/:id/reject` | Admin | Reject task |
| DELETE | `/tasks/:id` | Admin | Soft delete |
| POST | `/tasks/:id/start` | All | Mark in_progress |
| POST | `/tasks/:id/complete` | All | Mark completed |
| GET | `/tasks/calendar` | All | History by date range (paginated) |
| GET | `/tasks/calendar/:date` | All | Single day detail |
| GET | `/tasks/calendar/export` | Admin | CSV export |

### 4.3 api/streaks.js

| Method | Endpoint | Access | Purpose |
|--------|----------|--------|---------|
| GET | `/streaks/me` | All | Current user's streak |
| GET | `/streaks/team` | All | All team members' streaks |
| GET | `/streaks/leaderboard` | All | Top streaks |

### 4.4 api/dashboard.js

| Method | Endpoint | Access | Purpose |
|--------|----------|--------|---------|
| GET | `/dashboard/employee` | All | Aggregate dashboard data |
| GET | `/dashboard/admin` | Admin | Admin-specific summary |

### 4.5 api/pricing.js

| Method | Endpoint | Access | Purpose |
|--------|----------|--------|---------|
| POST | `/pricing/calculate` | All | Calculate selling price |
| GET | `/pricing/needs-pricing` | All | Products needing prices |
| PUT | `/pricing/bulk` | Admin | Update multiple prices |

### 4.6 api/audit.js

| Method | Endpoint | Access | Purpose |
|--------|----------|--------|---------|
| GET | `/audit` | Admin | Query audit log (paginated) |
| GET | `/audit/export` | Admin | CSV export |

### 4.7 Modified: api/inventory.js

| Change | Purpose |
|--------|---------|
| Add `GET /products/needs-pricing` | List products with needs_pricing=true |
| Update `POST /product` | Support new fields |
| Add sync trigger | When linked ingredient changes |

### 4.8 Modified: api/transactions.js

| Change | Purpose |
|--------|---------|
| Update `decrementInventory` | Also decrement linked ingredients + log history |

---

## 5. UI Components

### 5.1 Employee Dashboard (Timeline + Andon)

```
┌───────────────────────────────────────────────────┐
│  Juan's Shift                 🔥 12-day streak    │
│  Jan 25, 2025                                     │
├───────────────────────────────────────────────────┤
│                                                   │
│  🟢 OPENING ─────────────────────────────────     │
│  │                                                │
│  8:00 ──●── Open Register ✅         Maria ✅     │
│  │                                                │
│  8:30 ──●── Inventory Count ✅       Pedro ✅     │
│  │                                                │
│  🟡 SERVICE ─────────────────────────────────     │
│  │                                                │
│  NOW ──◐── Restock Beverages ⚠️      Maria 🟡    │
│  │        3 items below threshold                 │
│  │        [Water 1L, Coke, Pocari]                │
│  │                                                │
│  ⚪ CLOSING ─────────────────────────────────     │
│  │                                                │
│  5:00 ──○── End-of-day Count                      │
│  │                                                │
│  5:30 ──○── Close Register                        │
│                                                   │
├───────────────────────────────────────────────────┤
│  TEAM STATUS                                      │
│  Juan ●● 2/4    Maria ●●● 3/4    Pedro ●●●● ✅    │
├───────────────────────────────────────────────────┤
│  ⚠️ 2 tasks left to keep your streak             │
│                                                   │
│  [📦 Jump to POS]    [📅 Calendar]    [⚙️ More]   │
└───────────────────────────────────────────────────┘
```

### 5.2 POS View Updates

**Product Tile States:**

| State | Visual |
|-------|--------|
| Normal | Standard tile |
| Low stock | Orange ⚠️ badge + "X left" text |
| Needs pricing | Red dashed border + "SET PRICE" label |
| Out of stock | Grayed out + disabled |

**Alert Bell (🔔):**
- Shows count of low-stock + needs-pricing items
- Dropdown lists items grouped by type
- Link to full inventory view

### 5.3 Inventory Count Flow

1. **Prepare screen** - Shows all items sorted by priority
2. **Quick confirm** - Tap ✓ if matches expected
3. **Discrepancy modal** - Enter actual + select reason
4. **Draft save** - Progress persisted, can resume later
5. **Submit** - Finalizes count, logs to history

### 5.4 Calendar View

- Month overview with status icons per day
- ✅ All done | ⚠️ Partial | 🔥 Milestone | ●● In progress
- Tap day for detailed breakdown

### 5.5 Transactions History (Updated)

- Today at-a-glance card
- On-hold orders section
- Quick date filters (Today, Yesterday, This Week, etc.)
- Period comparison toggle
- Peak hours heatmap
- Product drill-down (click product name)
- Customer history (click customer)
- Void with reason + manager PIN

### 5.6 Sidebar Menu

```
┌────────────────────┐
│  ☰ STORE POS       │
├────────────────────┤
│  VIEW              │
│  ● Employee        │
│  ○ Admin           │
├────────────────────┤
│  MENU              │
│  📦 POS            │
│  📋 Tasks      2/4 │
│  📦 Inventory  ⚠️3 │
│  📅 Calendar       │
│  💰 Pricing    ⚠️2 │
├────────────────────┤
│  ADMIN ONLY        │
│  👥 Users          │
│  📊 Reports        │
│  ⚙️ Settings       │
├────────────────────┤
│  🔥 12-day streak  │
│  👤 Juan (Logout)  │
└────────────────────┘
```

---

## 6. Settings & Admin Views

### 6.1 Settings Sections

| Section | Features |
|---------|----------|
| Store Information | Name, logo, tax settings |
| Payment Methods | Cash, card, GCash, etc. |
| Receipt Settings | Format, footer, logo |
| Categories | Product/ingredient categories |
| Unit Types | Kilo, Gram, Pack, etc. |
| Recipes | Link ingredients to products |
| Pricing Defaults | Markup %, rounding, min margin |
| Alert Thresholds | Default low-stock warnings |
| Import / Export | CSV import, templates, backup |
| Daily Tasks | Configure employee checklists |
| Discrepancy Reasons | Customize adjustment reasons |
| Streak Settings | Milestones, notifications, rules |
| Users & Permissions | Staff accounts & access |
| Audit Log | View all system changes |
| Network Mode | Multi-terminal setup |
| Backup & Restore | Database backup |

### 6.2 Setup Wizard (First-Time)

5-step guided setup:
1. Store Info
2. Categories
3. Ingredients (import or manual)
4. Products
5. Daily Tasks

### 6.3 User Permissions

| Area | Permissions |
|------|-------------|
| POS & Sales | Process sales, apply discounts, void, view all |
| Inventory | View, count, add/edit, import, adjust directly |
| Tasks | View/complete, suggest, approve, edit/delete |
| Reports | View own, view all, view usage, export |
| Settings | Access, manage users, view audit |

---

## 7. Implementation Plan

### 7.1 Phase 0: Preparation (Before Week 1)

- [ ] Backup existing system (all .db files)
- [ ] Create git branch: `feature/inventory-system`
- [ ] Save this design document
- [ ] Prepare test data (convert Friday inventory to CSV)
- [ ] List menu items with prices
- [ ] Define initial categories
- [ ] Review existing code (inventory.js, transactions.js)

### 7.2 Phase 1: Foundation (Week 1-2)

- [ ] Create ingredients.db, ingredients_history.db schemas
- [ ] Modify inventory.db schema
- [ ] Create daily_tasks.db, daily_logs.db, streaks.db
- [ ] API endpoints - Ingredients (CRUD, history, low-stock, import/export)
- [ ] API endpoints - Dashboard (aggregate endpoint)
- [ ] Basic ingredient management UI
- [ ] CSV import with preview

### 7.3 Phase 2: Employee Dashboard (Week 3-4)

- [ ] API endpoints - Tasks (CRUD, approval, completion)
- [ ] API endpoints - Streaks (calculate, update, team)
- [ ] Employee dashboard UI (Timeline + Andon)
- [ ] Task completion flow
- [ ] Streak display
- [ ] Team status
- [ ] View toggle (Admin ↔ Employee)

### 7.4 Phase 3: Inventory Count (Week 5-6)

- [ ] API endpoints - Count (prepare, draft, submit)
- [ ] Inventory count UI
- [ ] Priority sorting
- [ ] Quick confirm (tap ✓)
- [ ] Discrepancy entry modal
- [ ] Reason quick-picks
- [ ] Draft save/resume
- [ ] History tracking

### 7.5 Phase 4: POS Integration (Week 7-8)

- [ ] Auto-sync ingredients → products
- [ ] needs_pricing flag handling
- [ ] POS UI updates (badges, alerts, bell)
- [ ] Quick price set modal
- [ ] Transaction updates (decrement linked ingredients)
- [ ] Log to ingredients_history

### 7.6 Phase 5: Recipes & Pricing (Week 9-10)

- [ ] Recipe builder UI
- [ ] Portion sizes
- [ ] Cost calculation
- [ ] Margin warnings
- [ ] Inline ingredient creation
- [ ] Pricing calculator (quick + bulk)
- [ ] Recipe-based decrement

### 7.7 Phase 6: Reporting & Polish (Week 11-12)

- [ ] Calendar view (overview + detail)
- [ ] Transaction history improvements
- [ ] Ingredient usage report
- [ ] Audit log viewer
- [ ] All settings views
- [ ] User permissions update
- [ ] Setup wizard
- [ ] Mobile responsiveness
- [ ] First-time user tour

---

## 8. Technical Considerations

### 8.1 Dependencies

```json
{
  "dependencies": {
    "csv-parser": "^3.0.0",
    "json2csv": "^6.0.0",
    "moment": "^2.29.4",
    "node-cron": "^3.0.0",
    "bcryptjs": "^2.4.3"
  }
}
```

### 8.2 Database Indexes

```javascript
// ingredients.js
ingredientsDB.ensureIndex({ fieldName: '_id', unique: true });
ingredientsDB.ensureIndex({ fieldName: 'name' });
ingredientsDB.ensureIndex({ fieldName: 'category' });
ingredientsDB.ensureIndex({ fieldName: 'is_active' });

// ingredients_history.js
historyDB.ensureIndex({ fieldName: 'ingredient_id' });
historyDB.ensureIndex({ fieldName: 'timestamp' });
historyDB.ensureIndex({ fieldName: 'change_id' });

// daily_logs.js
logsDB.ensureIndex({ fieldName: 'date' });
logsDB.ensureIndex({ fieldName: 'task_id' });
logsDB.ensureIndex({ fieldName: 'completed_by' });

// streaks.js
streaksDB.ensureIndex({ fieldName: 'user_id', unique: true });
```

### 8.3 Scheduled Tasks

```javascript
const cron = require('node-cron');

// Daily at midnight - check for broken streaks
cron.schedule('0 0 * * *', () => {
  checkMissedTasks();
  updateBrokenStreaks();
  resetDailyTaskStatus();
});

// Every hour - cleanup stale drafts
cron.schedule('0 * * * *', () => {
  cleanupStaleDrafts();
});

// Daily at 6 AM - admin summary
cron.schedule('0 6 * * *', () => {
  generateDailySummary();
});
```

### 8.4 Error Handling

**API Error Response Format:**
```javascript
{
  "success": false,
  "error": {
    "code": "INGREDIENT_NOT_FOUND",
    "message": "Ingredient with ID 123 not found",
    "details": {}
  }
}
```

**Error Codes:**
| Code | HTTP | Meaning |
|------|------|---------|
| VALIDATION_ERROR | 400 | Invalid input data |
| NOT_FOUND | 404 | Resource doesn't exist |
| PERMISSION_DENIED | 403 | User lacks permission |
| DUPLICATE_ENTRY | 409 | Already exists |
| SYNC_FAILED | 500 | Ingredient→product sync error |
| DATABASE_ERROR | 500 | NeDB operation failed |

### 8.5 Data Validation Rules

**Ingredients:**
| Field | Rules |
|-------|-------|
| name | Required, 1-100 chars, unique when active |
| unit_quantity | Required, number > 0, max 2 decimal places |
| unit_type | Required, must be in allowed list |
| cost | Required, number >= 0, max 2 decimal places |
| quantity | Required, number >= 0, max 2 decimal places |
| threshold | Required, number >= 0 |
| priority | Required, 1-3 |
| category | Required, must exist |
| barcode | Optional, unique if provided |

### 8.6 Security

**Manager PIN:**
- Store hashed (bcrypt) in users.db
- Required for: void, theft report, bulk delete
- Lock out after 3 failed attempts (5 min cooldown)
- Log all attempts

**Session Management:**
- Auto-logout after 30 min inactivity
- Log session start/end
- Track device/terminal

### 8.7 Rollback Strategy

**Before each phase:**
- Create database backup
- Tag git commit as "pre-phase-X"
- Document current state

**If issues occur:**
- Revert to previous git tag
- Restore database backup
- Document what went wrong

### 8.8 Testing Strategy

**Manual Testing Checklist (per phase):**
- [ ] Happy path - feature works as designed
- [ ] Edge cases - empty data, max values, special characters
- [ ] Error handling - invalid input, network failure
- [ ] Permission checks - admin vs employee access
- [ ] Mobile responsiveness
- [ ] Cross-browser (Chrome, Firefox, Safari)

**Critical Paths:**
- [ ] Sale → ingredient decrement → history log
- [ ] Inventory count → discrepancy → expected quantity update
- [ ] Task complete → streak update → milestone trigger
- [ ] Ingredient create (sellable) → product auto-create
- [ ] Recipe change → cost recalculation → margin warning
- [ ] CSV import → validation → preview → actual import

### 8.9 Default Data

**Default Daily Tasks:**
```javascript
[
  { name: "Open Register", type: "action", icon: "💰", deadline: "08:30", required: true, streak_breaking: true },
  { name: "Inventory Count", type: "inventory", icon: "📦", deadline: "10:00", required: true, streak_breaking: true },
  { name: "Restock Low Items", type: "action", icon: "🥤", deadline: "14:00", required: false, streak_breaking: false },
  { name: "End-of-Day Count", type: "inventory", icon: "📋", deadline: "21:00", required: false, streak_breaking: false },
  { name: "Close Register", type: "action", icon: "💰", deadline: "21:30", required: true, streak_breaking: true }
]
```

**Default Discrepancy Reasons:**
```javascript
[
  { name: "Waste / Spoilage", icon: "🗑️", requires_note: false },
  { name: "Breakage / Damaged", icon: "💔", requires_note: false },
  { name: "Theft Suspected", icon: "🚨", requires_note: true, requires_approval: true },
  { name: "Miscount (previous)", icon: "🔢", requires_note: false },
  { name: "Testing / Samples", icon: "🧪", requires_note: false },
  { name: "Given Away / Promo", icon: "🎁", requires_note: false },
  { name: "Other", icon: "✏️", requires_note: true }
]
```

**Default Streak Milestones:**
```javascript
[
  { days: 7, badge: "🏅", title: "One Week Strong" },
  { days: 14, badge: "🏅", title: "Two Week Champion" },
  { days: 30, badge: "🏆", title: "Monthly Master" },
  { days: 60, badge: "🏆", title: "Consistency King" },
  { days: 90, badge: "👑", title: "Legendary" }
]
```

---

## Appendix: File Structure

```
Store-POS/
├── api/
│   ├── users.js              # Existing - add new permissions
│   ├── inventory.js          # Existing - add cost, recipe fields
│   ├── categories.js         # Existing
│   ├── transactions.js       # Existing - update decrement logic
│   ├── customers.js          # Existing
│   ├── settings.js           # Existing - extend for new settings
│   ├── ingredients.js        # NEW
│   ├── tasks.js              # NEW
│   ├── streaks.js            # NEW
│   ├── dashboard.js          # NEW
│   ├── pricing.js            # NEW
│   └── audit.js              # NEW
│
├── server/databases/
│   ├── (existing files)
│   ├── ingredients.db        # NEW
│   ├── ingredients_history.db # NEW
│   ├── daily_tasks.db        # NEW
│   ├── daily_logs.db         # NEW
│   └── streaks.db            # NEW
│
├── assets/
│   ├── css/
│   │   ├── pos.css           # Existing
│   │   └── employee.css      # NEW
│   └── js/
│       ├── pos.js            # Existing - modify
│       ├── employee-dashboard.js  # NEW
│       ├── inventory-count.js     # NEW
│       ├── calendar-view.js       # NEW
│       ├── ingredients.js         # NEW
│       ├── recipes.js             # NEW
│       ├── tasks-admin.js         # NEW
│       └── pricing-calc.js        # NEW
│
├── views/                    # NEW
│   ├── employee-dashboard.html
│   ├── inventory-count.html
│   ├── calendar.html
│   ├── ingredients.html
│   ├── recipes.html
│   ├── tasks-settings.html
│   ├── pricing.html
│   ├── audit-log.html
│   └── setup-wizard.html
│
├── templates/                # NEW
│   └── ingredients-import-template.csv
│
└── docs/plans/
    └── 2025-01-25-inventory-employee-system-design.md
```

---

## Migration Checklist

Since starting fresh with products:

- [ ] Export current inventory.db
- [ ] Export current transactions.db
- [ ] Save backups with timestamp
- [ ] Import Friday inventory as ingredients
- [ ] Set thresholds and priorities
- [ ] Create beverages as sellable (auto-sync to products)
- [ ] Create menu items manually or via CSV
- [ ] Set selling prices
- [ ] Build recipes for menu items
- [ ] Configure default daily tasks
- [ ] Go live (keep old data in backup)
