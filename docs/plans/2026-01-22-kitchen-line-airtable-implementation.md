# Kitchen Line Financial Suite - Airtable Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a complete restaurant financial management system in Airtable with 12 linked tables, formulas, and pre-filled benchmark data.

**Architecture:** Single Airtable base with 5 modules (Foundation, Projections, Menu & Costing, Daily Operations, Financial Health). Tables are linked via relationship fields with rollups and lookups for calculated KPIs.

**Tech Stack:** Airtable (via MCP), formula fields, rollup fields, lookup fields, single/multi-select options.

**Design Document:** `docs/plans/2026-01-22-kitchen-line-financial-suite-design.md`

---

## Task 1: Create the Airtable Base

**Action:** Create new Airtable base named "Kitchen Line Financial Suite"

**Step 1: List existing bases to verify access**

Tool: `mcp__airtable__list_bases`
Expected: List of accessible bases (confirms MCP connection works)

**Step 2: Note the workflow**

Airtable bases are created by creating the first table. We'll create Business Setup first, which automatically creates the base.

---

## Task 2: Create Business Setup Table (Foundation Module)

**Action:** Create the Business Setup table with all configuration fields

**Step 1: Create table with fields**

Tool: `mcp__airtable__create_table`
```json
{
  "baseId": "<from step 1 or new>",
  "name": "Business Setup",
  "fields": [
    {"name": "Restaurant Name", "type": "singleLineText"},
    {"name": "Cuisine Type", "type": "singleSelect", "options": {"choices": [
      {"name": "American"}, {"name": "Asian"}, {"name": "Italian"},
      {"name": "Mexican"}, {"name": "French"}, {"name": "Mediterranean"},
      {"name": "Seafood"}, {"name": "Steakhouse"}, {"name": "Other"}
    ]}},
    {"name": "Service Style", "type": "singleSelect", "options": {"choices": [
      {"name": "Full-Service"}, {"name": "Fast-Casual"},
      {"name": "Counter Service"}, {"name": "Food Truck"}
    ]}},
    {"name": "Seats", "type": "number", "options": {"precision": 0}},
    {"name": "Operating Days/Week", "type": "number", "options": {"precision": 0}},
    {"name": "Monthly Rent", "type": "currency", "options": {"precision": 0, "symbol": "$"}},
    {"name": "Target Food Cost %", "type": "percent", "options": {"precision": 1}},
    {"name": "Target Labor Cost %", "type": "percent", "options": {"precision": 1}},
    {"name": "Target Net Profit %", "type": "percent", "options": {"precision": 1}}
  ]
}
```

**Step 2: Add default record with starter values**

Tool: `mcp__airtable__create_record`
```json
{
  "baseId": "<baseId>",
  "tableId": "Business Setup",
  "fields": {
    "Restaurant Name": "My Restaurant",
    "Seats": 50,
    "Operating Days/Week": 6,
    "Monthly Rent": 5000,
    "Target Food Cost %": 0.30,
    "Target Labor Cost %": 0.28,
    "Target Net Profit %": 0.06
  }
}
```

**Step 3: Verify table was created**

Tool: `mcp__airtable__list_tables`
Expected: Business Setup table appears in list

---

## Task 3: Create Benchmarks Table (Foundation Module)

**Action:** Create reference table with industry benchmarks

**Step 1: Create table**

Tool: `mcp__airtable__create_table`
```json
{
  "baseId": "<baseId>",
  "name": "Benchmarks",
  "fields": [
    {"name": "Metric", "type": "singleLineText"},
    {"name": "Low (Good)", "type": "percent", "options": {"precision": 0}},
    {"name": "Target", "type": "percent", "options": {"precision": 0}},
    {"name": "High (Warning)", "type": "percent", "options": {"precision": 0}},
    {"name": "Description", "type": "multilineText"}
  ]
}
```

**Step 2: Pre-fill benchmark data (6 records)**

Tool: `mcp__airtable__create_record` (repeat for each)

Record 1:
```json
{"Metric": "Food Cost", "Low (Good)": 0.28, "Target": 0.30, "High (Warning)": 0.35, "Description": "Cost of ingredients as percentage of food sales. Below 28% may indicate portion issues."}
```

Record 2:
```json
{"Metric": "Labor Cost", "Low (Good)": 0.25, "Target": 0.28, "High (Warning)": 0.32, "Description": "Total labor (wages + benefits) as percentage of net revenue."}
```

Record 3:
```json
{"Metric": "Prime Cost", "Low (Good)": 0.55, "Target": 0.58, "High (Warning)": 0.65, "Description": "Food + Labor combined. The two biggest controllable costs."}
```

Record 4:
```json
{"Metric": "Net Profit", "Low (Good)": 0.03, "Target": 0.06, "High (Warning)": 0.10, "Description": "Bottom line after all expenses. Restaurant industry average is 3-6%."}
```

Record 5:
```json
{"Metric": "Beverage Cost", "Low (Good)": 0.18, "Target": 0.20, "High (Warning)": 0.24, "Description": "Non-alcoholic beverage costs as percentage of beverage sales."}
```

Record 6:
```json
{"Metric": "Alcohol Cost", "Low (Good)": 0.18, "Target": 0.22, "High (Warning)": 0.25, "Description": "Beer/wine/liquor costs. Lower than food due to less waste."}
```

---

## Task 4: Create Vendors Table (Operations Module)

**Action:** Create vendor/supplier master list

**Step 1: Create table**

Tool: `mcp__airtable__create_table`
```json
{
  "baseId": "<baseId>",
  "name": "Vendors",
  "fields": [
    {"name": "Vendor Name", "type": "singleLineText"},
    {"name": "Category", "type": "singleSelect", "options": {"choices": [
      {"name": "Food - Protein", "color": "redLight"},
      {"name": "Food - Produce", "color": "greenLight"},
      {"name": "Food - Dairy", "color": "yellowLight"},
      {"name": "Food - Dry Goods", "color": "orangeLight"},
      {"name": "Food - Frozen", "color": "blueLight"},
      {"name": "Beverage", "color": "purpleLight"},
      {"name": "Alcohol", "color": "pinkLight"},
      {"name": "Supplies", "color": "grayLight"},
      {"name": "Equipment", "color": "cyanLight"},
      {"name": "Services", "color": "tealLight"}
    ]}},
    {"name": "Contact Name", "type": "singleLineText"},
    {"name": "Phone", "type": "phoneNumber"},
    {"name": "Email", "type": "email"},
    {"name": "Payment Terms", "type": "singleSelect", "options": {"choices": [
      {"name": "COD"}, {"name": "Net 7"}, {"name": "Net 15"},
      {"name": "Net 30"}, {"name": "Credit Card"}
    ]}},
    {"name": "Account Number", "type": "singleLineText"},
    {"name": "Notes", "type": "multilineText"}
  ]
}
```

**Step 2: Add sample vendors**

Create 3 sample records:
- "Sysco Foods" - Food - Protein - Net 30
- "Local Farms Co-op" - Food - Produce - COD
- "Restaurant Depot" - Supplies - Credit Card

---

## Task 5: Create Employees Table (Operations Module)

**Action:** Create employee master list

**Step 1: Create table**

Tool: `mcp__airtable__create_table`
```json
{
  "baseId": "<baseId>",
  "name": "Employees",
  "fields": [
    {"name": "Name", "type": "singleLineText"},
    {"name": "Position", "type": "singleSelect", "options": {"choices": [
      {"name": "Kitchen Manager", "color": "redLight"},
      {"name": "Line Cook", "color": "orangeLight"},
      {"name": "Prep Cook", "color": "yellowLight"},
      {"name": "Dishwasher", "color": "grayLight"},
      {"name": "FOH Manager", "color": "blueLight"},
      {"name": "Server", "color": "greenLight"},
      {"name": "Bartender", "color": "purpleLight"},
      {"name": "Host", "color": "pinkLight"},
      {"name": "Busser", "color": "cyanLight"}
    ]}},
    {"name": "Hourly Rate", "type": "currency", "options": {"precision": 2, "symbol": "$"}},
    {"name": "Start Date", "type": "date"},
    {"name": "Status", "type": "singleSelect", "options": {"choices": [
      {"name": "Active", "color": "greenLight"},
      {"name": "Inactive", "color": "grayLight"}
    ]}},
    {"name": "Phone", "type": "phoneNumber"},
    {"name": "Email", "type": "email"}
  ]
}
```

---

## Task 6: Create Ingredients Table (Menu & Costing Module)

**Action:** Create ingredient master list for recipe costing

**Step 1: Create table with vendor link**

Tool: `mcp__airtable__create_table`
```json
{
  "baseId": "<baseId>",
  "name": "Ingredients",
  "fields": [
    {"name": "Ingredient Name", "type": "singleLineText"},
    {"name": "Category", "type": "singleSelect", "options": {"choices": [
      {"name": "Protein", "color": "redLight"},
      {"name": "Produce", "color": "greenLight"},
      {"name": "Dairy", "color": "yellowLight"},
      {"name": "Dry Goods", "color": "orangeLight"},
      {"name": "Frozen", "color": "blueLight"},
      {"name": "Beverage", "color": "purpleLight"},
      {"name": "Condiments", "color": "pinkLight"}
    ]}},
    {"name": "Unit", "type": "singleSelect", "options": {"choices": [
      {"name": "lb"}, {"name": "oz"}, {"name": "each"}, {"name": "case"},
      {"name": "gallon"}, {"name": "quart"}, {"name": "bunch"}, {"name": "bag"}
    ]}},
    {"name": "Cost per Unit", "type": "currency", "options": {"precision": 2, "symbol": "$"}},
    {"name": "Par Level", "type": "number", "options": {"precision": 0}},
    {"name": "Last Updated", "type": "date"}
  ]
}
```

**Step 2: Add vendor link field**

Tool: `mcp__airtable__create_field`
```json
{
  "baseId": "<baseId>",
  "tableId": "Ingredients",
  "field": {
    "name": "Vendor",
    "type": "multipleRecordLinks",
    "options": {"linkedTableId": "<Vendors table ID>"}
  }
}
```

**Step 3: Add sample ingredients**

Create 5 sample ingredients:
- Chicken Breast - Protein - lb - $3.50
- Mixed Greens - Produce - lb - $4.00
- Heavy Cream - Dairy - quart - $5.00
- Olive Oil - Condiments - gallon - $25.00
- Salmon Fillet - Protein - lb - $12.00

---

## Task 7: Create Menu Items Table (Menu & Costing Module)

**Action:** Create menu items with pricing

**Step 1: Create table**

Tool: `mcp__airtable__create_table`
```json
{
  "baseId": "<baseId>",
  "name": "Menu Items",
  "fields": [
    {"name": "Item Name", "type": "singleLineText"},
    {"name": "Category", "type": "singleSelect", "options": {"choices": [
      {"name": "Appetizer", "color": "yellowLight"},
      {"name": "Salad", "color": "greenLight"},
      {"name": "Entree", "color": "redLight"},
      {"name": "Dessert", "color": "pinkLight"},
      {"name": "Beverage", "color": "blueLight"},
      {"name": "Side", "color": "orangeLight"}
    ]}},
    {"name": "Menu Price", "type": "currency", "options": {"precision": 2, "symbol": "$"}},
    {"name": "Active", "type": "checkbox"}
  ]
}
```

Note: Food Cost and Food Cost % will be added after Recipe Items table is created (requires rollup).

---

## Task 8: Create Recipe Items Table (Menu & Costing Module)

**Action:** Create junction table linking Menu Items to Ingredients

**Step 1: Create table with links**

Tool: `mcp__airtable__create_table`
```json
{
  "baseId": "<baseId>",
  "name": "Recipe Items",
  "fields": [
    {"name": "Quantity", "type": "number", "options": {"precision": 2}}
  ]
}
```

**Step 2: Add Menu Item link**

Tool: `mcp__airtable__create_field`
```json
{
  "field": {
    "name": "Menu Item",
    "type": "multipleRecordLinks",
    "options": {"linkedTableId": "<Menu Items table ID>"}
  }
}
```

**Step 3: Add Ingredient link**

Tool: `mcp__airtable__create_field`
```json
{
  "field": {
    "name": "Ingredient",
    "type": "multipleRecordLinks",
    "options": {"linkedTableId": "<Ingredients table ID>"}
  }
}
```

**Step 4: Add Unit lookup**

Tool: `mcp__airtable__create_field`
```json
{
  "field": {
    "name": "Unit",
    "type": "multipleLookupValues",
    "options": {
      "recordLinkFieldId": "<Ingredient field ID>",
      "fieldIdInLinkedTable": "<Unit field ID in Ingredients>"
    }
  }
}
```

**Step 5: Add Cost per Unit lookup**

Tool: `mcp__airtable__create_field`
```json
{
  "field": {
    "name": "Unit Cost",
    "type": "multipleLookupValues",
    "options": {
      "recordLinkFieldId": "<Ingredient field ID>",
      "fieldIdInLinkedTable": "<Cost per Unit field ID>"
    }
  }
}
```

**Step 6: Add Line Cost formula**

Tool: `mcp__airtable__create_field`
```json
{
  "field": {
    "name": "Line Cost",
    "type": "formula",
    "options": {"formula": "Quantity * {Unit Cost}"}
  }
}
```

---

## Task 9: Add Rollup Fields to Menu Items

**Action:** Add Food Cost rollup and Food Cost % formula to Menu Items

**Step 1: Add Recipe Items link (reverse of Task 8)**

This should already exist from Task 8. Verify with `describe_table`.

**Step 2: Add Food Cost rollup**

Tool: `mcp__airtable__create_field`
```json
{
  "baseId": "<baseId>",
  "tableId": "Menu Items",
  "field": {
    "name": "Food Cost",
    "type": "rollup",
    "options": {
      "recordLinkFieldId": "<Recipe Items link field ID>",
      "fieldIdInLinkedTable": "<Line Cost field ID>",
      "result": {"type": "number", "options": {"precision": 2}}
    }
  }
}
```

**Step 3: Add Food Cost % formula**

Tool: `mcp__airtable__create_field`
```json
{
  "field": {
    "name": "Food Cost %",
    "type": "formula",
    "options": {"formula": "IF({Menu Price} = 0, 0, {Food Cost} / {Menu Price})"}
  }
}
```

**Step 4: Add Contribution Margin formula**

Tool: `mcp__airtable__create_field`
```json
{
  "field": {
    "name": "Contribution Margin",
    "type": "formula",
    "options": {"formula": "{Menu Price} - {Food Cost}"}
  }
}
```

**Step 5: Add Status formula**

Tool: `mcp__airtable__create_field`
```json
{
  "field": {
    "name": "Status",
    "type": "formula",
    "options": {"formula": "IF({Food Cost %} <= 0.30, '✅ Good', IF({Food Cost %} <= 0.35, '⚠️ Watch', '🔴 High'))"}
  }
}
```

---

## Task 10: Create Daily Sales Table (Daily Operations Module)

**Action:** Create the primary daily tracking table

**Step 1: Create table**

Tool: `mcp__airtable__create_table`
```json
{
  "baseId": "<baseId>",
  "name": "Daily Sales",
  "fields": [
    {"name": "Date", "type": "date"},
    {"name": "Food Sales", "type": "currency", "options": {"precision": 0, "symbol": "$"}},
    {"name": "Beverage Sales", "type": "currency", "options": {"precision": 0, "symbol": "$"}},
    {"name": "Alcohol Sales", "type": "currency", "options": {"precision": 0, "symbol": "$"}},
    {"name": "Other Revenue", "type": "currency", "options": {"precision": 0, "symbol": "$"}},
    {"name": "Discounts", "type": "currency", "options": {"precision": 0, "symbol": "$"}},
    {"name": "Comps", "type": "currency", "options": {"precision": 0, "symbol": "$"}},
    {"name": "Tax Collected", "type": "currency", "options": {"precision": 0, "symbol": "$"}},
    {"name": "Covers", "type": "number", "options": {"precision": 0}}
  ]
}
```

**Step 2: Add Gross Revenue formula**

Tool: `mcp__airtable__create_field`
```json
{
  "field": {
    "name": "Gross Revenue",
    "type": "formula",
    "options": {"formula": "{Food Sales} + {Beverage Sales} + {Alcohol Sales} + {Other Revenue}"}
  }
}
```

**Step 3: Add Net Revenue formula**

Tool: `mcp__airtable__create_field`
```json
{
  "field": {
    "name": "Net Revenue",
    "type": "formula",
    "options": {"formula": "{Gross Revenue} - {Discounts} - {Comps}"}
  }
}
```

**Step 4: Add Avg Check formula**

Tool: `mcp__airtable__create_field`
```json
{
  "field": {
    "name": "Avg Check",
    "type": "formula",
    "options": {"formula": "IF({Covers} = 0, 0, {Net Revenue} / {Covers})"}
  }
}
```

**Step 5: Add Day of Week formula**

Tool: `mcp__airtable__create_field`
```json
{
  "field": {
    "name": "Day",
    "type": "formula",
    "options": {"formula": "DATETIME_FORMAT({Date}, 'ddd')"}
  }
}
```

---

## Task 11: Create Labor Log Table (Daily Operations Module)

**Action:** Create labor tracking with employee links

**Step 1: Create table**

Tool: `mcp__airtable__create_table`
```json
{
  "baseId": "<baseId>",
  "name": "Labor Log",
  "fields": [
    {"name": "Date", "type": "date"},
    {"name": "Hours Worked", "type": "number", "options": {"precision": 2}},
    {"name": "OT Hours", "type": "number", "options": {"precision": 2}},
    {"name": "Tips", "type": "currency", "options": {"precision": 2, "symbol": "$"}}
  ]
}
```

**Step 2: Add Employee link**

Tool: `mcp__airtable__create_field`
```json
{
  "field": {
    "name": "Employee",
    "type": "multipleRecordLinks",
    "options": {"linkedTableId": "<Employees table ID>"}
  }
}
```

**Step 3: Add Position lookup**

Tool: `mcp__airtable__create_field`
```json
{
  "field": {
    "name": "Position",
    "type": "multipleLookupValues",
    "options": {
      "recordLinkFieldId": "<Employee field ID>",
      "fieldIdInLinkedTable": "<Position field ID>"
    }
  }
}
```

**Step 4: Add Hourly Rate lookup**

Tool: `mcp__airtable__create_field`
```json
{
  "field": {
    "name": "Hourly Rate",
    "type": "multipleLookupValues",
    "options": {
      "recordLinkFieldId": "<Employee field ID>",
      "fieldIdInLinkedTable": "<Hourly Rate field ID>"
    }
  }
}
```

**Step 5: Add Regular Pay formula**

Tool: `mcp__airtable__create_field`
```json
{
  "field": {
    "name": "Regular Pay",
    "type": "formula",
    "options": {"formula": "{Hours Worked} * {Hourly Rate}"}
  }
}
```

**Step 6: Add OT Pay formula**

Tool: `mcp__airtable__create_field`
```json
{
  "field": {
    "name": "OT Pay",
    "type": "formula",
    "options": {"formula": "{OT Hours} * {Hourly Rate} * 1.5"}
  }
}
```

**Step 7: Add Total Pay formula**

Tool: `mcp__airtable__create_field`
```json
{
  "field": {
    "name": "Total Pay",
    "type": "formula",
    "options": {"formula": "{Regular Pay} + {OT Pay}"}
  }
}
```

---

## Task 12: Create Purchases Table (Daily Operations Module)

**Action:** Create purchase/invoice tracking with vendor links

**Step 1: Create table**

Tool: `mcp__airtable__create_table`
```json
{
  "baseId": "<baseId>",
  "name": "Purchases",
  "fields": [
    {"name": "Date", "type": "date"},
    {"name": "Description", "type": "singleLineText"},
    {"name": "Category", "type": "singleSelect", "options": {"choices": [
      {"name": "Food", "color": "greenLight"},
      {"name": "Beverage", "color": "blueLight"},
      {"name": "Alcohol", "color": "purpleLight"},
      {"name": "Supplies", "color": "orangeLight"},
      {"name": "Equipment", "color": "grayLight"}
    ]}},
    {"name": "Amount", "type": "currency", "options": {"precision": 2, "symbol": "$"}},
    {"name": "Payment Method", "type": "singleSelect", "options": {"choices": [
      {"name": "Cash"}, {"name": "Check"}, {"name": "Credit Card"}, {"name": "Account"}
    ]}},
    {"name": "Payment Status", "type": "singleSelect", "options": {"choices": [
      {"name": "Paid", "color": "greenLight"},
      {"name": "Pending", "color": "yellowLight"},
      {"name": "Due", "color": "redLight"}
    ]}},
    {"name": "Due Date", "type": "date"},
    {"name": "Receipt", "type": "multipleAttachments"}
  ]
}
```

**Step 2: Add Vendor link**

Tool: `mcp__airtable__create_field`
```json
{
  "field": {
    "name": "Vendor",
    "type": "multipleRecordLinks",
    "options": {"linkedTableId": "<Vendors table ID>"}
  }
}
```

---

## Task 13: Create Monthly Projections Table (Projections Module)

**Action:** Create projections table with rollups from operations

**Step 1: Create table**

Tool: `mcp__airtable__create_table`
```json
{
  "baseId": "<baseId>",
  "name": "Monthly Projections",
  "fields": [
    {"name": "Month", "type": "date"},
    {"name": "Projected Revenue", "type": "currency", "options": {"precision": 0, "symbol": "$"}},
    {"name": "Proj Fixed Costs", "type": "currency", "options": {"precision": 0, "symbol": "$"}},
    {"name": "Notes", "type": "multilineText"}
  ]
}
```

**Step 2: Add Proj Food Cost formula**

Tool: `mcp__airtable__create_field`
```json
{
  "field": {
    "name": "Proj Food Cost",
    "type": "formula",
    "options": {"formula": "{Projected Revenue} * 0.30"}
  }
}
```

**Step 3: Add Proj Labor Cost formula**

Tool: `mcp__airtable__create_field`
```json
{
  "field": {
    "name": "Proj Labor Cost",
    "type": "formula",
    "options": {"formula": "{Projected Revenue} * 0.28"}
  }
}
```

**Step 4: Add Proj Net Profit formula**

Tool: `mcp__airtable__create_field`
```json
{
  "field": {
    "name": "Proj Net Profit",
    "type": "formula",
    "options": {"formula": "{Projected Revenue} - {Proj Food Cost} - {Proj Labor Cost} - {Proj Fixed Costs}"}
  }
}
```

**Step 5: Add Proj Net Margin formula**

Tool: `mcp__airtable__create_field`
```json
{
  "field": {
    "name": "Proj Net Margin",
    "type": "formula",
    "options": {"formula": "IF({Projected Revenue} = 0, 0, {Proj Net Profit} / {Projected Revenue})"}
  }
}
```

**Step 6: Create 12 months of projection records**

Create records for current month through 12 months out with empty Projected Revenue.

---

## Task 14: Create Scenario Planner Table (Projections Module)

**Action:** Create what-if scenario table

**Step 1: Create table**

Tool: `mcp__airtable__create_table`
```json
{
  "baseId": "<baseId>",
  "name": "Scenario Planner",
  "fields": [
    {"name": "Scenario Name", "type": "singleLineText"},
    {"name": "Base Monthly Revenue", "type": "currency", "options": {"precision": 0, "symbol": "$"}},
    {"name": "Revenue Change %", "type": "percent", "options": {"precision": 0}},
    {"name": "Food Cost % Override", "type": "percent", "options": {"precision": 1}},
    {"name": "Labor Cost % Override", "type": "percent", "options": {"precision": 1}},
    {"name": "Notes", "type": "multilineText"}
  ]
}
```

**Step 2: Add Modified Revenue formula**

Tool: `mcp__airtable__create_field`
```json
{
  "field": {
    "name": "Modified Revenue",
    "type": "formula",
    "options": {"formula": "{Base Monthly Revenue} * (1 + {Revenue Change %})"}
  }
}
```

**Step 3: Add Projected Profit formula**

Tool: `mcp__airtable__create_field`
```json
{
  "field": {
    "name": "Projected Profit",
    "type": "formula",
    "options": {"formula": "{Modified Revenue} * (1 - IF({Food Cost % Override}, {Food Cost % Override}, 0.30) - IF({Labor Cost % Override}, {Labor Cost % Override}, 0.28))"}
  }
}
```

**Step 4: Pre-fill scenario templates**

Create 4 scenario records:
- "Base Case" - 0% change, no overrides
- "Price Increase 10%" - +10% revenue, 27% food cost
- "Add Staff" - 0% revenue, 32% labor
- "Slow Season" - -20% revenue, no overrides

---

## Task 15: Verify and Test

**Action:** Validate all tables, links, and formulas

**Step 1: List all tables**

Tool: `mcp__airtable__list_tables`
Expected: 12 tables listed

**Step 2: Verify each table structure**

Tool: `mcp__airtable__describe_table` for each table
Check: All fields present, correct types

**Step 3: Test formula calculations**

- Add a sample menu item with recipe items → verify Food Cost % calculates
- Add a daily sales record → verify Gross/Net Revenue calculates
- Add a labor log entry → verify Total Pay calculates

**Step 4: Test cross-table links**

- Link a purchase to a vendor → verify relationship works
- Link labor log to employee → verify lookups work

---

## Task 16: Commit Completion

**Action:** Update design doc and commit

**Step 1: Update design doc with base ID**

Add the Airtable base ID and URL to the design document for reference.

**Step 2: Commit**

```bash
git add docs/plans/
git commit -m "Complete Kitchen Line Financial Suite Airtable implementation

12 tables created across 5 modules:
- Foundation: Business Setup, Benchmarks
- Menu & Costing: Ingredients, Menu Items, Recipe Items
- Daily Operations: Daily Sales, Labor Log, Purchases, Vendors, Employees
- Projections: Monthly Projections, Scenario Planner

All formulas, rollups, and lookups configured.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

| Task | Table/Action | Dependencies |
|------|--------------|--------------|
| 1 | Create Base | - |
| 2 | Business Setup | - |
| 3 | Benchmarks | - |
| 4 | Vendors | - |
| 5 | Employees | - |
| 6 | Ingredients | Vendors |
| 7 | Menu Items | - |
| 8 | Recipe Items | Menu Items, Ingredients |
| 9 | Menu Items rollups | Recipe Items |
| 10 | Daily Sales | - |
| 11 | Labor Log | Employees |
| 12 | Purchases | Vendors |
| 13 | Monthly Projections | - |
| 14 | Scenario Planner | - |
| 15 | Verify & Test | All |
| 16 | Commit | - |

**Total: 16 tasks, ~45-60 minutes execution time**
