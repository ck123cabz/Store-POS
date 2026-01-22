# Kitchen Line Financial Suite - Formula Setup Guide

**Airtable Base:** https://airtable.com/appEvCJWmilOyjb7k

**Updated:** 2026-01-22 (10-Lever Playbook Integration)

The Airtable API doesn't support creating formula, lookup, or rollup fields. Use this guide to add them manually in the Airtable UI.

---

## Tables Summary

| Table | Status | Sample Data | Lever |
|-------|--------|-------------|-------|
| Business Setup | ✅ Complete | Kitchen Line defaults | Foundation |
| Benchmarks | ✅ Complete | 14 benchmarks (incl. 10-Lever targets) | Foundation |
| Vendors | ✅ Complete | 3 sample vendors | — |
| Employees | ✅ Complete | Add your staff | — |
| Ingredients | ✅ Complete | 3 sample ingredients | — |
| Menu Items | ✅ Complete | 6 Kitchen Line items | Lever 1, 4 |
| Recipe Items | ✅ Complete | Link ingredients to menu items | Lever 1 |
| Daily Sales | ✅ Complete | Daypart + Traffic tracking | Lever 2, 3, 5 |
| Labor Log | ✅ Complete | Link to employees | Lever 8 |
| Purchases | ✅ Complete | Link to vendors | Lever 6 |
| **Waste Log** | ✅ NEW | 3 sample waste records | Lever 6 |
| **Customers** | ✅ NEW | 3 sample regulars | Lever 7 |
| Monthly Projections | ✅ Complete | Create 12-month forecast | — |
| Scenario Planner | ✅ Complete | 4 scenario templates | Lever 10 |

---

## 10-Lever Quick Reference

| # | Lever | Key Metric | Target | Table |
|---|-------|------------|--------|-------|
| 1 | Unit Economics | True Margin % | 65%+ food, 50%+ drinks | Menu Items |
| 2 | Traffic Source | Destination % | 25%+ in 6 months | Daily Sales |
| 3 | Ticket Size | Avg Transaction | +25% in 60 days | Daily Sales |
| 4 | Menu Focus | Revenue from top 4 | 80%+ | Menu Items |
| 5 | Daypart Economics | Rev/Labor Hour by daypart | ₱250+ minimum | Daily Sales |
| 6 | Cash Conversion | Spoilage Rate | <5% | Waste Log |
| 7 | Repeat Rate | Returning Customers | 40%+ in 90 days | Customers |
| 8 | Labor Leverage | Rev/Labor Hour | ₱300 target, ₱500+ healthy | Daily Sales |
| 9 | Differentiation | Referral Rate | 20%+ word-of-mouth | Customers |
| 10 | Sequencing | Focus Ratio | 70%+ on #1 priority | Scenario Planner |

---

## Formulas to Add Manually

### Daily Sales Table

**Basic Revenue Formulas (existing):**

| Field Name | Type | Formula |
|------------|------|---------|
| Gross Revenue | Formula | `{Food Sales} + {Beverage Sales} + {Alcohol Sales} + {Other Revenue}` |
| Net Revenue | Formula | `{Gross Revenue} - {Discounts} - {Comps}` |
| Avg Check | Formula | `IF({Covers} = 0, 0, {Net Revenue} / {Covers})` |
| Day | Formula | `DATETIME_FORMAT({Date}, 'ddd')` |

**NEW: 10-Lever Formulas:**

| Field Name | Type | Formula | Lever |
|------------|------|---------|-------|
| Total Transactions | Formula | `{Transaction Count}` | 3 |
| Attachment Rate | Formula | `IF({Transaction Count} = 0, 0, {Food Attached Transactions} / {Transaction Count})` | 3 |
| Upsell Rate | Formula | `IF({Upsells Attempted} = 0, 0, {Upsells Converted} / {Upsells Attempted})` | 3 |
| Repeat Rate | Formula | `IF({Repeat Customers} + {First-Time Customers} = 0, 0, {Repeat Customers} / ({Repeat Customers} + {First-Time Customers}))` | 7 |
| Total Labor Hours | Formula | `{Morning Labor Hours} + {Midday Labor Hours} + {Afternoon Labor Hours} + {Evening Labor Hours}` | 5, 8 |
| Rev per Labor Hour | Formula | `IF({Total Labor Hours} = 0, 0, {Net Revenue} / {Total Labor Hours})` | 5, 8 |
| Morning Rev/Hour | Formula | `IF({Morning Labor Hours} = 0, 0, {Morning Revenue (6-10am)} / {Morning Labor Hours})` | 5 |
| Midday Rev/Hour | Formula | `IF({Midday Labor Hours} = 0, 0, {Midday Revenue (10am-2pm)} / {Midday Labor Hours})` | 5 |
| Afternoon Rev/Hour | Formula | `IF({Afternoon Labor Hours} = 0, 0, {Afternoon Revenue (2-6pm)} / {Afternoon Labor Hours})` | 5 |
| Evening Rev/Hour | Formula | `IF({Evening Labor Hours} = 0, 0, {Evening Revenue (6pm+)} / {Evening Labor Hours})` | 5 |
| Daypart Status | Formula | `IF({Rev per Labor Hour} >= 300, '✅ Healthy', IF({Rev per Labor Hour} >= 250, '⚠️ Minimum', '🔴 Unprofitable'))` | 5, 8 |

---

### Menu Items Table

**Existing formulas:**

| Field Name | Type | Configuration |
|------------|------|---------------|
| Food Cost | Rollup | From **Recipe Items** link → **Line Cost** field → SUM |
| Food Cost % | Formula | `IF({Menu Price} = 0, 0, {Food Cost} / {Menu Price})` |
| Contribution Margin | Formula | `{Menu Price} - {Food Cost}` |

**NEW: True Margin Formulas (Lever 1):**

| Field Name | Type | Formula |
|------------|------|---------|
| True Cost | Formula | `{Food Cost} + {Labor Cost} + {Overhead Allocation}` |
| True Margin | Formula | `{Menu Price} - {True Cost}` |
| True Margin % | Formula | `IF({Menu Price} = 0, 0, {True Margin} / {Menu Price})` |
| Margin Status | Formula | `IF({True Margin %} >= 0.65, '⭐ Star', IF({True Margin %} >= 0.50, '✅ Good', IF({True Margin %} >= 0.35, '⚠️ Watch', '🔴 Fix')))` |
| Weekly Revenue | Formula | `{Weekly Sales} * {Menu Price}` |
| Weekly Profit | Formula | `{Weekly Sales} * {True Margin}` |

**Note:** Labor Cost should be calculated as: `{Prep Time (mins)} * ({Avg Hourly Labor Cost from Business Setup} / 60)`
Since cross-table formulas are limited, enter Labor Cost manually or use a lookup.

---

### Recipe Items Table

| Field Name | Type | Configuration |
|------------|------|---------------|
| Unit | Lookup | From **Ingredient** link → **Unit** field |
| Unit Cost | Lookup | From **Ingredient** link → **Cost per Unit** field |
| Line Cost | Formula | `{Quantity} * {Unit Cost}` |

---

### Waste Log Table (NEW - Lever 6)

| Field Name | Type | Formula |
|------------|------|---------|
| Unit Cost | Lookup | From **Ingredient** link → **Cost per Unit** field |
| Waste Cost | Formula | `{Quantity Wasted} * {Unit Cost}` |

**Note:** If you entered Estimated Cost manually, you can skip Waste Cost formula.

---

### Customers Table (NEW - Lever 7)

| Field Name | Type | Formula |
|------------|------|---------|
| Average Ticket | Formula | `IF({Visit Count} = 0, 0, {Lifetime Spend} / {Visit Count})` |
| Days Since Visit | Formula | `DATETIME_DIFF(TODAY(), {Last Visit}, 'days')` |
| Customer Status | Formula | `IF({Days Since Visit} > 30, '😴 Inactive', IF({Visit Count} >= 10, '⭐ VIP', IF({Visit Count} >= 5, '💚 Regular', '👋 New')))` |

---

### Labor Log Table

| Field Name | Type | Configuration |
|------------|------|---------------|
| Position | Lookup | From **Employee** link → **Position** field |
| Hourly Rate | Lookup | From **Employee** link → **Hourly Rate** field |
| Regular Pay | Formula | `{Hours Worked} * {Hourly Rate}` |
| OT Pay | Formula | `{OT Hours} * {Hourly Rate} * 1.5` |
| Total Pay | Formula | `{Regular Pay} + {OT Pay}` |

---

### Monthly Projections Table

| Field Name | Type | Formula |
|------------|------|---------|
| Proj Food Cost | Formula | `{Projected Revenue} * 0.30` |
| Proj Labor Cost | Formula | `{Projected Revenue} * 0.28` |
| Proj Net Profit | Formula | `{Projected Revenue} - {Proj Food Cost} - {Proj Labor Cost} - {Proj Fixed Costs}` |
| Proj Net Margin | Formula | `IF({Projected Revenue} = 0, 0, {Proj Net Profit} / {Projected Revenue})` |

---

### Scenario Planner Table

| Field Name | Type | Formula |
|------------|------|---------|
| Modified Revenue | Formula | `{Base Monthly Revenue} * (1 + {Revenue Change %})` |
| Projected Profit | Formula | `{Modified Revenue} * (1 - IF({Food Cost % Override}, {Food Cost % Override}, 0.30) - IF({Labor Cost % Override}, {Labor Cost % Override}, 0.28))` |
| Profit Margin | Formula | `IF({Modified Revenue} = 0, 0, {Projected Profit} / {Modified Revenue})` |

---

## Views to Create

### Daily Sales Views
| View Name | Filter/Group | Purpose |
|-----------|--------------|---------|
| This Week | Date = This Week | Quick daily entry |
| By Daypart | Group by Day Type | Compare weekday vs weekend |
| Unprofitable Days | Rev/Labor Hour < 250 | Find problem days |
| Tournament Days | Court Status = Tournament | Analyze whale days |

### Menu Items Views
| View Name | Filter/Group | Purpose |
|-----------|--------------|---------|
| Hero Items | Is Hero Item = ✓ | Items to push |
| Margin Alerts | True Margin % < 50% | Items needing attention |
| By Decision | Group by Menu Decision | Star/Workhorse/Puzzle/Dog matrix |
| Top Sellers | Sort by Weekly Sales desc | Your revenue drivers |

### Customers Views
| View Name | Filter/Group | Purpose |
|-----------|--------------|---------|
| VIP Regulars | Is Regular = ✓ | Your profit drivers |
| Win Back | Days Since Visit > 30 | Inactive customers |
| By Type | Group by Customer Type | Traffic source analysis |

### Waste Log Views
| View Name | Filter/Group | Purpose |
|-----------|--------------|---------|
| This Week | Date = This Week | Current waste |
| By Reason | Group by Reason | Pattern analysis |
| Preventable | Preventable = ✓ | Focus on fixable waste |

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

## Next Steps (Playbook Phase 1)

Based on the 10-Lever Playbook, prioritize:

### Week 1-2: Foundation
- [ ] Add all formulas from this guide
- [ ] Complete margin audit on all menu items
- [ ] Start tracking daily sales with daypart breakdown
- [ ] Log waste daily

### Week 3-4: Optimize
- [ ] Implement upsell prompt ("Add fries for ₱40?")
- [ ] Track upsell attempts and conversions
- [ ] Learn customer names, note usual orders
- [ ] Identify unprofitable dayparts

### Month 2: Scale
- [ ] Launch simple loyalty program
- [ ] Explore court partnership
- [ ] Review and adjust based on data

---

## Key Targets Quick Reference

| Metric | Current Est. | Target | Timeline |
|--------|--------------|--------|----------|
| True Margin (Food) | Unknown | 65%+ | Immediate |
| Avg Ticket | ₱55-70 | ₱85+ | 60 days |
| Destination Traffic | ~5% | 25%+ | 6 months |
| Repeat Rate | Unknown | 40%+ | 90 days |
| Rev/Labor Hour | Unknown | ₱300+ | Immediate |
| Spoilage Rate | Unknown | <5% | Immediate |
| Attachment Rate | Unknown | 25%+ | 60 days |
