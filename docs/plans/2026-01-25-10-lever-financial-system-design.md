# 10-Lever Financial Intelligence System

## Design Document

**Date:** 2026-01-25
**Status:** Implementation Ready
**Based on:** Kitchen Line Strategic Playbook + Airtable Kitchen Line Base

---

## Overview

This design extends the Next.js POS app to include native financial intelligence based on the 10-Lever Playbook for food businesses. Instead of syncing with Airtable, we build these capabilities directly into PostgreSQL.

### The 10 Levers

| # | Lever | Core Question | Key Metric |
|---|-------|---------------|------------|
| 1 | Unit Economics | Am I actually making money on each sale? | True Margin % (target: 65%+) |
| 2 | Traffic Source | Where do customers come from? | Destination % (target: 25%+) |
| 3 | Ticket Size | How much per transaction? | Avg Ticket (increase 25% in 60 days) |
| 4 | Menu Focus | What to keep, cut, add? | 80% revenue from top 3-4 items |
| 5 | Daypart Economics | Which hours make money? | Rev/Labor Hour by daypart (min ₱250) |
| 6 | Cash Conversion | How fast does inventory become cash? | Spoilage Rate (target: <5%) |
| 7 | Repeat Rate | Are customers coming back? | Repeat Rate (target: 40%+) |
| 8 | Labor Leverage | Output per labor hour? | Rev/Labor Hour (min ₱300, healthy ₱500+) |
| 9 | Differentiation | Why choose us? | Referral Rate (target: 20%+ word-of-mouth) |
| 10 | Sequencing | What to do first? | Focus Ratio (70%+ on #1 priority) |

---

## Database Schema

### New Models

| Model | Purpose | Lever |
|-------|---------|-------|
| `Vendor` | Supplier management | 1, 6 |
| `Ingredient` | Raw materials for recipes | 1, 6 |
| `RecipeItem` | Junction: Product ↔ Ingredient | 1, 4 |
| `WasteLog` | Track spoilage | 6 |
| `Purchase` | Track expenses | 6 |
| `LaborLog` | Employee hours | 8 |
| `DailyPulse` | Quick end-of-day check-in | 10 |
| `WeeklyScorecard` | Weekly KPI tracking | 10 |
| `Benchmark` | Industry reference data | All |

### Enhanced Models

| Model | New Fields | Lever |
|-------|------------|-------|
| `Product` | prepTime, laborCost, trueCost, trueMargin, isHeroItem, menuDecision | 1, 4 |
| `Customer` | customerType, trafficSource, visitCount, lifetimeSpend, isRegular | 2, 7 |
| `Transaction` | weather, courtStatus, daypart, isDrinkOnly, isGroupOrder | 2, 3, 5 |
| `User` | position, hourlyRate, employmentStatus | 8 |
| `Settings` | All target benchmarks, business setup fields | All |

---

## Key Calculations

### True Cost (Lever 1)

```
Food Cost = SUM(RecipeItem.quantity × Ingredient.costPerUnit)
Labor Cost = Product.prepTime × (Settings.avgHourlyLaborCost / 60)
True Cost = Food Cost + Labor Cost + Product.overheadAllocation
True Margin = Product.price - True Cost
True Margin % = True Margin / Product.price
```

### Daypart Assignment (Lever 5)

| Daypart | Time Range |
|---------|------------|
| Morning | 6:00 AM - 10:00 AM |
| Midday | 10:00 AM - 2:00 PM |
| Afternoon | 2:00 PM - 6:00 PM |
| Evening | 6:00 PM - Close |

Determined at transaction creation based on `createdAt` timestamp.

### Customer Regular Status (Lever 7)

```
isRegular = visitCount >= 5
avgTicket = lifetimeSpend / visitCount
```

Updated after each completed transaction.

### Revenue per Labor Hour (Lever 8)

```
Weekly: totalRevenue / SUM(LaborLog.hoursWorked)
By Daypart: daypartRevenue / daypartLaborHours
```

---

## API Routes Needed

### Core Operations

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/ingredients` | GET, POST | List/create ingredients |
| `/api/ingredients/[id]` | GET, PUT, DELETE | Ingredient CRUD |
| `/api/vendors` | GET, POST | Vendor management |
| `/api/vendors/[id]` | GET, PUT, DELETE | Vendor CRUD |
| `/api/recipes/[productId]` | GET, PUT | Get/update recipe for product |
| `/api/waste` | GET, POST | Waste log entries |
| `/api/purchases` | GET, POST | Purchase tracking |
| `/api/labor` | GET, POST | Labor log entries |

### Analytics & Reporting

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/analytics/daily-pulse` | GET, POST | Daily check-in |
| `/api/analytics/weekly-scorecard` | GET, POST | Weekly KPIs |
| `/api/analytics/daypart` | GET | Revenue/labor by daypart |
| `/api/analytics/menu-matrix` | GET | Star/Workhorse/Puzzle/Dog analysis |
| `/api/analytics/customer-insights` | GET | Repeat rate, top customers |
| `/api/analytics/lever-dashboard` | GET | All 10 levers at a glance |

---

## UI Components Needed

### New Pages

1. **`/analytics`** - 10-Lever Dashboard
   - KPI cards for each lever
   - Traffic light indicators (green/yellow/red vs. target)
   - Trend sparklines

2. **`/analytics/daily-pulse`** - Quick end-of-day entry
   - Pre-filled with day's revenue/transactions
   - Manual fields: upsells, weather, vibe, one thing

3. **`/analytics/weekly`** - Weekly Scorecard
   - Week-over-week comparison
   - Focus selection for next week

4. **`/ingredients`** - Ingredient Management
   - List with cost per unit
   - Par levels and reorder alerts

5. **`/recipes`** - Recipe Costing
   - Assign ingredients to products
   - Auto-calculate food cost
   - Show true margin

6. **`/waste`** - Waste Log
   - Quick entry form
   - Weekly totals and spoilage %

7. **`/labor`** - Labor Tracking
   - Time entry by employee
   - Rev/Labor Hour calculation

### Enhanced Pages

1. **`/products`** - Add true cost fields, menu decision
2. **`/customers`** - Add customer type, visit history
3. **`/transactions`** - Add daypart filter, ticket analysis
4. **`/settings`** - Add benchmark targets

---

## Transaction Enhancement Logic

When a transaction is created with `status: 1` (completed):

```typescript
// 1. Assign daypart based on time
const hour = new Date().getHours()
let daypart = 'Evening'
if (hour >= 6 && hour < 10) daypart = 'Morning'
else if (hour >= 10 && hour < 14) daypart = 'Midday'
else if (hour >= 14 && hour < 18) daypart = 'Afternoon'

// 2. Analyze ticket composition
const itemCount = items.length
const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0)
const isDrinkOnly = items.every(i => isDrinkCategory(i.categoryId))
const hasFoodAttached = items.some(i => isFoodCategory(i.categoryId))
const isGroupOrder = totalQuantity >= 3 || total >= 250

// 3. Update customer metrics if customerId exists
if (customerId) {
  await prisma.customer.update({
    where: { id: customerId },
    data: {
      visitCount: { increment: 1 },
      lifetimeSpend: { increment: total },
      lastVisit: new Date(),
      firstVisit: customer.firstVisit || new Date(),
      avgTicket: (lifetimeSpend + total) / (visitCount + 1),
      isRegular: visitCount + 1 >= 5
    }
  })
}
```

---

## Seed Data: Benchmarks

```typescript
const benchmarks = [
  { metric: 'Food Cost %', lowGood: 28, target: 32, highWarning: 38, description: 'Cost of ingredients as % of food revenue' },
  { metric: 'Labor Cost %', lowGood: 25, target: 30, highWarning: 35, description: 'Labor cost as % of revenue' },
  { metric: 'Prime Cost %', lowGood: 55, target: 62, highWarning: 70, description: 'Food + Labor combined' },
  { metric: 'Net Profit %', lowGood: 15, target: 10, highWarning: 5, description: 'Bottom line profit margin' },
  { metric: 'Beverage Cost %', lowGood: 18, target: 22, highWarning: 28, description: 'Cost of beverages as % of bev revenue' },
  { metric: 'Spoilage Rate %', lowGood: 2, target: 4, highWarning: 6, description: 'Waste as % of purchases' },
  { metric: 'Repeat Rate %', lowGood: 50, target: 40, highWarning: 25, description: '% of customers who return' },
  { metric: 'Rev/Labor Hour', lowGood: 500, target: 350, highWarning: 250, description: 'Revenue generated per staff hour' },
]
```

---

## Implementation Sequence

### Phase 1: Foundation (Week 1)
1. Run Prisma migration
2. Seed benchmarks
3. Create ingredient/vendor CRUD APIs
4. Create recipe management API

### Phase 2: Tracking (Week 2)
1. Enhance transaction creation with daypart/ticket analysis
2. Add customer update logic
3. Create waste log API
4. Create labor log API

### Phase 3: Reporting (Week 3)
1. Build daily pulse API and UI
2. Build weekly scorecard API and UI
3. Create analytics dashboard

### Phase 4: Intelligence (Week 4)
1. Menu matrix analysis (Star/Workhorse/Puzzle/Dog)
2. Daypart profitability report
3. Customer insights (top spenders, at-risk regulars)
4. Lever-by-lever recommendations

---

## Success Criteria

The system is complete when:

1. **Every transaction** automatically captures daypart and ticket composition
2. **Every product** can have a recipe with calculated true cost
3. **Every customer** tracks visit count and lifetime value
4. **Daily pulse** can be completed in under 2 minutes
5. **Weekly scorecard** shows all 10 levers with traffic light status
6. **No Airtable dependency** - all data lives in PostgreSQL

---

## References

- Kitchen Line Strategic Playbook (10-Lever framework)
- Airtable Kitchen Line Base (16 tables - used as reference)
- Restaurant Industry Benchmarks (NRA, Toast data)
