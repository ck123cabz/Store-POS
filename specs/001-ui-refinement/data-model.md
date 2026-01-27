# Data Model: UI/UX Refinement

**Feature**: 001-ui-refinement | **Date**: 2026-01-27

## Overview

This feature is primarily CSS/styling work. **No database schema changes required.**

All required data already exists in the database. This document maps the UI features to existing entities.

---

## Existing Entities Used

### Product (for POS tile indicators)

```prisma
model Product {
  quantity           Int         // Used for: "X left" badge, out-of-stock detection
  trackStock         Boolean     // Used for: determining if stock tracking enabled
  needsPricing       Boolean     // Used for: "SET PRICE" overlay
  linkedIngredientId Int?        // Used for: fetching linked ingredient status
  linkedIngredient   Ingredient? // Used for: ingredient stock percentage badge
}
```

**UI Mappings**:
| Field | UI Element | Condition |
|-------|------------|-----------|
| `quantity` | "X left" badge | `quantity > 0 && quantity <= parLevel` |
| `quantity` | Out of stock overlay | `trackStock && quantity <= 0` |
| `needsPricing` | "SET PRICE" overlay | `needsPricing === true` |
| `linkedIngredient` | Ingredient % badge | `linkedIngredient !== null` |

---

### Ingredient (for sidebar badge counts)

```prisma
model Ingredient {
  quantity    Decimal     // Current stock level
  parLevel    Int         // Minimum threshold
  isActive    Boolean     // Soft delete flag
}
```

**Query for low-stock count**:
```sql
SELECT COUNT(*) FROM ingredients
WHERE quantity <= par_level
  AND is_active = true
  AND par_level > 0
```

---

### EmployeeTask & TaskCompletion (for task progress badge)

```prisma
model EmployeeTask {
  isActive      Boolean   // Active task definition
  daysOfWeek    Int[]     // Which days task applies
}

model TaskCompletion {
  date          DateTime  // Completion date
  taskId        Int       // Reference to task
  status        String    // pending, in_progress, completed, missed
  completedById Int?      // Who completed it
}
```

**Query for task progress**:
```sql
-- Total tasks due today for current user
SELECT COUNT(*) as total FROM employee_tasks
WHERE is_active = true
  AND (assignment_type = 'anyone' OR assigned_to_id = :userId)
  AND :dayOfWeek = ANY(days_of_week)

-- Completed tasks today
SELECT COUNT(*) as completed FROM task_completions
WHERE date = CURRENT_DATE
  AND (completed_by_id = :userId OR completed_by_id IS NOT NULL)
  AND status = 'completed'
```

---

### DailyPulse (for calendar vibe colors)

```prisma
model DailyPulse {
  date   DateTime  @unique   // Calendar date
  vibe   String?             // "Crushed it", "Good", "Meh", "Rough"
}
```

**Query for month view**:
```sql
SELECT date, vibe FROM daily_pulse
WHERE date >= :monthStart AND date < :monthEnd
```

**Vibe to Color Mapping**:
| Vibe Value | CSS Classes |
|------------|-------------|
| "Crushed it" | `bg-green-100 border-green-400` |
| "Good" | `bg-green-50 border-green-200` |
| "Meh" | `bg-amber-50 border-amber-200` |
| "Rough" | `bg-orange-100 border-orange-400` |
| `null` | `bg-background border-muted` |

---

## New API Endpoint Data Flow

### GET /api/sidebar-badges

**Data Sources**:
1. `Ingredient` table → low stock count
2. `Product` table → needs pricing count
3. `EmployeeTask` + `TaskCompletion` tables → task progress

**Response Type**:
```typescript
interface SidebarBadgesResponse {
  lowStockIngredients: number;
  needsPricingProducts: number;
  taskProgress: {
    completed: number;
    total: number;
  };
}
```

**Prisma Queries**:
```typescript
// Low stock ingredients
const lowStock = await prisma.ingredient.count({
  where: {
    isActive: true,
    parLevel: { gt: 0 },
    quantity: { lte: prisma.raw('par_level') } // quantity <= parLevel
  }
});

// Needs pricing products
const needsPricing = await prisma.product.count({
  where: { needsPricing: true }
});

// Task progress (more complex, see contracts)
```

---

## Validation Rules

No new validation required. This feature reads existing data.

---

## State Transitions

No state transitions. This feature is display-only.

---

## Indexes

Existing indexes should be sufficient:
- `ingredients.is_active` - Already indexed via common queries
- `products.needs_pricing` - May benefit from index if slow (monitor)
- `task_completions.date` - Already indexed (@@index([date]))

**Recommendation**: Monitor `/api/sidebar-badges` response time. If > 100ms, add:
```prisma
@@index([needsPricing])  // On Product model
```
