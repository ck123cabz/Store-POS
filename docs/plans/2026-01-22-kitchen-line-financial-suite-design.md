# Kitchen Line Financial Suite - Design Document

**Date:** 2026-01-22
**Status:** Validated
**Platform:** Airtable

## Overview

A comprehensive financial management system for restaurant startups. Projection-first design that helps owners see their financial future while tracking daily operations.

### Target User
- Single owner/operator
- Full-service restaurant
- Starting fresh with financial tracking
- Manual payroll
- Hybrid data entry (manual + POS imports from Next.js Store-POS)

### Primary Goals
1. Full financial visibility (sales, costs, P&L, cash flow)
2. Forward-looking projections and scenario planning
3. Break-even analysis and runway tracking
4. Beginner-friendly with built-in guidance and benchmarks

---

## Architecture

### Modules

| Module | Purpose | Time Focus |
|--------|---------|------------|
| **Projections & Planning** | Financial model, scenarios, break-even | Future |
| **Foundation** | Setup, targets, benchmarks | Baseline |
| **Menu & Costing** | Recipes, pricing, margins | Per-item |
| **Daily Operations** | Sales, labor, purchases, cash | Present |
| **Financial Health** | P&L, KPIs, variance analysis | Past vs Plan |

### Data Flow

```
Foundation (setup)
    → Projections (model the future)
    → Daily Ops (record reality)
    → Financial Health (compare plan vs actual, adjust projections)
```

---

## Tables Specification

### Module 1: Foundation

#### Table 1: Business Setup (Single record)

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| Restaurant Name | Text | — | Required |
| Cuisine Type | Single Select | — | American, Asian, Italian, Mexican, etc. |
| Service Style | Single Select | — | Full-Service, Fast-Casual, Counter, Food Truck |
| Seats | Number | 50 | For turnover calculations |
| Operating Days/Week | Number | 6 | For break-even daily calc |
| Monthly Rent | Currency | 0 | Fixed cost |
| Target Food Cost % | Percent | 30% | Editable |
| Target Labor Cost % | Percent | 28% | Editable |
| Target Prime Cost % | Formula | `Food + Labor` | Auto-calculated |
| Target Net Profit % | Percent | 6% | Editable |

#### Table 2: Benchmarks (Pre-filled reference)

| Field | Type |
|-------|------|
| Metric Name | Text |
| Low (Good) | Percent |
| Target | Percent |
| High (Warning) | Percent |
| Description | Long Text |

**Pre-filled data:**
- Food Cost: 28% / 30% / 35%
- Labor Cost: 25% / 28% / 32%
- Prime Cost: 55% / 58% / 65%
- Net Profit: 3% / 6% / 10%
- Beverage Cost: 18% / 20% / 24%
- Alcohol Cost: 18% / 22% / 25%

---

### Module 2: Projections & Planning

#### Table 3: Monthly Projections

| Field | Type | Formula/Logic |
|-------|------|---------------|
| Month | Date | First of each month |
| Projected Revenue | Currency | Manual input or from scenario |
| Proj Food Cost | Formula | `Projected Revenue × Target Food Cost %` |
| Proj Labor Cost | Formula | `Projected Revenue × Target Labor Cost %` |
| Proj Fixed Costs | Rollup | Sum from Expenses where Recurring = Yes |
| Proj Variable Costs | Formula | `Proj Food + Proj Labor` |
| Proj Net Profit | Formula | `Revenue - Fixed - Variable` |
| Actual Revenue | Rollup | Sum Daily Sales for this month |
| Actual Food Cost | Rollup | Sum Purchases (Food) for this month |
| Actual Labor Cost | Rollup | Sum Labor Log for this month |
| Actual Net Profit | Formula | `Actual Revenue - Actual Costs` |
| Variance $ | Formula | `Actual Net - Proj Net` |
| Variance % | Formula | `Variance / Proj Net` |
| Status | Formula | Emoji indicator based on performance |

#### Table 4: Scenario Planner

| Field | Type | Logic |
|-------|------|-------|
| Scenario Name | Text | e.g., "Raise Prices 10%" |
| Base Revenue | Lookup | Current month projection |
| Revenue Modifier | Percent | +10%, -20%, etc. |
| Modified Revenue | Formula | `Base × (1 + Modifier)` |
| Food Cost % Override | Percent | Optional override |
| Labor Cost % Override | Percent | Optional override |
| Projected Profit | Formula | Full calculation |
| Profit vs Base | Formula | Comparison |
| Notes | Long Text | Strategy notes |

---

### Module 3: Menu & Costing

#### Table 5: Ingredients

| Field | Type | Notes |
|-------|------|-------|
| Ingredient Name | Text | e.g., "Chicken Breast" |
| Category | Single Select | Protein, Produce, Dairy, Dry, Frozen, Beverage |
| Unit | Single Select | lb, oz, each, case, gallon |
| Cost per Unit | Currency | Latest purchase price |
| Vendor | Link | → Vendors table |
| Last Updated | Date | Auto or manual |
| Par Level | Number | Minimum stock |

#### Table 6: Recipe Items (Junction table)

| Field | Type | Logic |
|-------|------|-------|
| Recipe | Link | → Menu Items |
| Ingredient | Link | → Ingredients |
| Quantity | Number | Amount used |
| Unit | Lookup | From Ingredient |
| Cost | Formula | `Quantity × Ingredient.Cost per Unit` |

#### Table 7: Menu Items

| Field | Type | Formula/Logic |
|-------|------|---------------|
| Item Name | Text | e.g., "Grilled Chicken Salad" |
| Category | Single Select | Appetizer, Entree, Dessert, Beverage |
| Menu Price | Currency | Customer price |
| Recipe Items | Link | → Recipe Items (multiple) |
| Food Cost | Rollup | Sum of Recipe Items.Cost |
| Food Cost % | Formula | `Food Cost / Menu Price` |
| Status | Formula | Emoji based on cost % thresholds |
| Contribution Margin | Formula | `Menu Price - Food Cost` |
| Active | Checkbox | Currently on menu? |

---

### Module 4: Daily Operations

#### Table 8: Daily Sales

| Field | Type | Notes |
|-------|------|-------|
| Date | Date | Primary key |
| Food Sales | Currency | From POS or manual |
| Beverage Sales | Currency | Non-alcoholic |
| Alcohol Sales | Currency | Beer/wine/liquor |
| Other Revenue | Currency | Catering, merch |
| Gross Revenue | Formula | Sum of above |
| Discounts | Currency | Promos, staff meals |
| Comps | Currency | Manager comps |
| Net Revenue | Formula | `Gross - Discounts - Comps` |
| Tax Collected | Currency | Sales tax |
| Covers | Number | Guest count |
| Avg Check | Formula | `Net Revenue / Covers` |
| Day of Week | Formula | Auto from Date |
| Week Number | Formula | For weekly rollups |
| Month | Formula | For monthly rollups |

#### Table 9: Labor Log

| Field | Type | Formula/Logic |
|-------|------|---------------|
| Date | Date | Work date |
| Employee | Link | → Employees |
| Position | Lookup | From Employee |
| Hours Worked | Number | Regular hours |
| OT Hours | Number | Over 40/week |
| Hourly Rate | Lookup | From Employee |
| Regular Pay | Formula | `Hours × Rate` |
| OT Pay | Formula | `OT Hours × Rate × 1.5` |
| Total Pay | Formula | `Regular + OT` |
| Tips | Currency | If tracked |

#### Table 10: Employees

| Field | Type |
|-------|------|
| Name | Text |
| Position | Single Select |
| Hourly Rate | Currency |
| Start Date | Date |
| Status | Single Select |
| Phone | Phone |
| Email | Email |

**Position options:** Kitchen Manager, Line Cook, Prep Cook, Dishwasher, FOH Manager, Server, Bartender, Host, Busser

#### Table 11: Purchases

| Field | Type | Notes |
|-------|------|-------|
| Date | Date | Invoice date |
| Vendor | Link | → Vendors |
| Category | Single Select | Food, Beverage, Supplies, Equipment |
| Description | Text | What was purchased |
| Amount | Currency | Total cost |
| Payment Method | Single Select | Cash, Check, Card, Account |
| Payment Status | Single Select | Paid, Pending, Due |
| Due Date | Date | If on terms |
| Receipt | Attachment | Photo/PDF |

#### Table 12: Vendors

| Field | Type |
|-------|------|
| Vendor Name | Text |
| Category | Single Select |
| Contact Name | Text |
| Phone | Phone |
| Email | Email |
| Payment Terms | Single Select |
| Account Number | Text |
| Notes | Long Text |

---

## Key Formulas

### Real-time KPIs

**Food Cost %**
```
SUM(Purchases where Category="Food" AND Month=Current) / SUM(Daily Sales.Food Sales where Month=Current)
```

**Labor Cost %**
```
SUM(Labor Log.Total Pay where Month=Current) / SUM(Daily Sales.Net Revenue where Month=Current)
```

**Prime Cost %**
```
Food Cost % + Labor Cost %
```

**Break-Even Daily Revenue**
```
Monthly Fixed Costs / Operating Days / (1 - Variable Cost %)
```

**Menu Item Profitability**
```
(Menu Price - Food Cost) / Menu Price
```

---

## Implementation Sequence

| Step | Table | Dependencies |
|------|-------|--------------|
| 1 | Create Base | — |
| 2 | Business Setup | — |
| 3 | Benchmarks | — |
| 4 | Vendors | — |
| 5 | Employees | — |
| 6 | Ingredients | Vendors |
| 7 | Menu Items | — |
| 8 | Recipe Items | Ingredients, Menu Items |
| 9 | Daily Sales | — |
| 10 | Labor Log | Employees |
| 11 | Purchases | Vendors |
| 12 | Monthly Projections | Daily Sales, Purchases, Labor Log |
| 13 | Scenario Planner | Monthly Projections |

---

## Views to Create

| Table | View | Purpose |
|-------|------|---------|
| Daily Sales | This Week | Quick daily entry |
| Daily Sales | Monthly Summary | Grouped by week |
| Labor Log | Today's Schedule | Filter by today |
| Labor Log | Payroll Export | Grouped by employee |
| Purchases | Unpaid Bills | Filter: Payment Status = Pending |
| Menu Items | Cost Alerts | Filter: Food Cost % > 35% |
| Monthly Projections | Dashboard | Current + next 3 months |

---

## Pre-filled Data

### Benchmarks Table
| Metric | Low | Target | High | Description |
|--------|-----|--------|------|-------------|
| Food Cost | 28% | 30% | 35% | Cost of ingredients as % of food sales |
| Labor Cost | 25% | 28% | 32% | Total labor as % of net revenue |
| Prime Cost | 55% | 58% | 65% | Food + Labor combined |
| Net Profit | 3% | 6% | 10% | Bottom line after all expenses |
| Beverage Cost | 18% | 20% | 24% | Non-alcoholic beverage costs |
| Alcohol Cost | 18% | 22% | 25% | Beer/wine/liquor costs |

---

## Future Enhancements (Not in v1)

- POS API integration with Next.js Store-POS
- Automated inventory tracking
- Scheduling integration
- Multi-location support
- Bank feed integration
