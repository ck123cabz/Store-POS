# Kitchen Line Financial Suite - Formula Setup Guide

**Airtable Base:** https://airtable.com/appEvCJWmilOyjb7k

The Airtable API doesn't support creating formula, lookup, or rollup fields. Use this guide to add them manually in the Airtable UI.

---

## Tables Created via API

| Table | Status | Sample Data |
|-------|--------|-------------|
| Business Setup | ✅ Complete | 1 record with defaults |
| Benchmarks | ✅ Complete | 6 benchmark records |
| Vendors | ✅ Complete | 3 sample vendors |
| Employees | ✅ Complete | No records (add your staff) |
| Ingredients | ✅ Complete | 3 sample ingredients |
| Menu Items | ✅ Complete | 2 sample items |
| Recipe Items | ✅ Complete | No records (link ingredients to menu items) |
| Daily Sales | ✅ Complete | No records (start tracking!) |
| Labor Log | ✅ Complete | No records (link to employees) |
| Purchases | ✅ Complete | No records (link to vendors) |
| Monthly Projections | ✅ Complete | No records (create 12-month forecast) |
| Scenario Planner | ✅ Complete | 4 scenario templates |

---

## Formulas to Add Manually

### Daily Sales Table

Add these formula fields:

| Field Name | Type | Formula |
|------------|------|---------|
| Gross Revenue | Formula | `{Food Sales} + {Beverage Sales} + {Alcohol Sales} + {Other Revenue}` |
| Net Revenue | Formula | `{Gross Revenue} - {Discounts} - {Comps}` |
| Avg Check | Formula | `IF({Covers} = 0, 0, {Net Revenue} / {Covers})` |
| Day | Formula | `DATETIME_FORMAT({Date}, 'ddd')` |

---

### Recipe Items Table

Add these lookup and formula fields:

| Field Name | Type | Configuration |
|------------|------|---------------|
| Unit | Lookup | From **Ingredient** link → **Unit** field |
| Unit Cost | Lookup | From **Ingredient** link → **Cost per Unit** field |
| Line Cost | Formula | `{Quantity} * {Unit Cost}` |

---

### Menu Items Table

Add these rollup and formula fields:

| Field Name | Type | Configuration |
|------------|------|---------------|
| Food Cost | Rollup | From **Recipe Items** link → **Line Cost** field → SUM |
| Food Cost % | Formula | `IF({Menu Price} = 0, 0, {Food Cost} / {Menu Price})` |
| Contribution Margin | Formula | `{Menu Price} - {Food Cost}` |
| Status | Formula | `IF({Food Cost %} <= 0.30, '✅ Good', IF({Food Cost %} <= 0.35, '⚠️ Watch', '🔴 High'))` |

---

### Labor Log Table

Add these lookup and formula fields:

| Field Name | Type | Configuration |
|------------|------|---------------|
| Position | Lookup | From **Employee** link → **Position** field |
| Hourly Rate | Lookup | From **Employee** link → **Hourly Rate** field |
| Regular Pay | Formula | `{Hours Worked} * {Hourly Rate}` |
| OT Pay | Formula | `{OT Hours} * {Hourly Rate} * 1.5` |
| Total Pay | Formula | `{Regular Pay} + {OT Pay}` |

---

### Monthly Projections Table

Add these formula fields:

| Field Name | Type | Formula |
|------------|------|---------|
| Proj Food Cost | Formula | `{Projected Revenue} * 0.30` |
| Proj Labor Cost | Formula | `{Projected Revenue} * 0.28` |
| Proj Net Profit | Formula | `{Projected Revenue} - {Proj Food Cost} - {Proj Labor Cost} - {Proj Fixed Costs}` |
| Proj Net Margin | Formula | `IF({Projected Revenue} = 0, 0, {Proj Net Profit} / {Projected Revenue})` |

---

### Scenario Planner Table

Add these formula fields:

| Field Name | Type | Formula |
|------------|------|---------|
| Modified Revenue | Formula | `{Base Monthly Revenue} * (1 + {Revenue Change %})` |
| Projected Profit | Formula | `{Modified Revenue} * (1 - IF({Food Cost % Override}, {Food Cost % Override}, 0.30) - IF({Labor Cost % Override}, {Labor Cost % Override}, 0.28))` |
| Profit Margin | Formula | `IF({Modified Revenue} = 0, 0, {Projected Profit} / {Modified Revenue})` |

---

## Cleanup

- Delete **Table 1** (the default empty table) - records already removed

---

## How to Add Formulas in Airtable

1. Open the table in Airtable
2. Click the **+** button to add a new field
3. Select **Formula** (or Lookup/Rollup as needed)
4. Enter the formula from this guide
5. Click **Create field**

### For Lookups:
1. Add new field → Select **Lookup**
2. Choose the linked record field
3. Choose the field to look up

### For Rollups:
1. Add new field → Select **Rollup**
2. Choose the linked record field
3. Choose the field to summarize
4. Select aggregation function (usually SUM)

---

## Next Steps

1. Add these formulas to complete the system
2. Delete Table 1
3. Create 12 monthly projection records (Jan-Dec 2026)
4. Add your employees
5. Start entering daily sales!
