# Unified Menu Page Design

> Consolidates Products, Recipes, Pricing, and Categories into a single view with enhanced ingredient shortage observability.

## Problem Statement

Current pain points:
1. **Too many separate views** - Products, Categories, Recipes list, Recipe Builder, Pricing are all separate pages
2. **Not enough context** - Can't see pricing, recipe, and stock status together to make decisions
3. **Poor shortage visibility** - Only shows the limiting ingredient, not ALL missing ingredients

## Solution Overview

A unified **Menu** page with:
- **Hybrid layout**: Scannable table + slide-out panel for details
- **Tabbed views**: Products tab and Categories tab
- **Enhanced observability**: Shows all missing ingredients with per-unit shortage amounts

## Navigation Changes

### Sidebar Updates
- **Remove**: Products, Recipes, Pricing, Categories links
- **Add**: Single "Menu" link

### Routes
| Old Route | Action |
|-----------|--------|
| `/dashboard/products` | Delete |
| `/dashboard/recipes` | Delete |
| `/dashboard/recipes/[productId]` | Delete |
| `/dashboard/pricing` | Delete |
| `/dashboard/categories` | Delete |
| `/dashboard/menu` | **New** - Unified Menu page |

### Kept Separate
- `/dashboard/ingredients` - Stays for inventory operations (restocking, counts)

---

## Products Tab Design

### Layout Structure

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ HEADER: "Menu"                                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│ TABS: [ Products (active) ]  [ Categories ]              [+ Add Product]     │
├──────────────────────────────────────────────────────────────────────────────┤
│ TOOLBAR: Search | Category filter | Status filter | Sort dropdown            │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TABLE                               │  SLIDE-OUT PANEL (when row selected)  │
│  - All products in rows              │  - Full product details               │
│  - Click row to open panel           │  - Recipe with ingredient status      │
│                                      │  - Edit mode toggle                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Table Columns

| Column | Width | Content |
|--------|-------|---------|
| **Image** | 48px | Product thumbnail |
| **Product** | flex | Name (primary), Category badge (secondary) |
| **Price** | 80px | Selling price (e.g., ₱150) |
| **Cost** | 80px | True cost from recipe (e.g., ₱45) |
| **Margin** | 70px | Percentage + warning icon if below target |
| **Recipe** | 80px | Ingredient count badge or "None" |
| **Stock** | 150px | Status badge + shortage summary |

### Stock Column Display

```
✅ Available                 ← Green, no issues

⚠️ 6 left · 1 low           ← Yellow, shows producible count + # of low ingredients
   └─ hover tooltip

🔴 OUT · 3 missing          ← Red, shows count of missing ingredients
   └─ hover tooltip
```

### Hover Tooltip for Missing Ingredients

When hovering on ⚠️ or 🔴 status badges:

```
┌─────────────────────────────┐
│ Missing Ingredients (7)     │
│ ─────────────────────────── │
│ • Cheese      need 2/unit   │
│ • Lettuce     need 1/unit   │
│ • Tomato      need 0.5/unit │
│ • Buns        need 2/unit   │
│ • Onions      need 0.25/unit│
│ + 2 more...                 │
│                             │
│ [View all in panel →]       │
└─────────────────────────────┘
```

- Shows **max 5 ingredients** in tooltip
- Shows per-unit shortage amounts
- "View all in panel" link opens slide-out with complete list
- Keeps table scannable while providing full detail on demand

---

## Slide-Out Panel Design

### View Mode (Default)

```
┌─────────────────────────────────────────────────────────────────┐
│  [×]                                              [Edit] button │
│                                                                 │
│  🍔 BURGER                                                      │
│  Category: Mains                                                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ PRICING                                                  │   │
│  │  Price      Cost       Margin                           │   │
│  │  ₱150       ₱45        70% ✓                            │   │
│  │                        (target: 65%)                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ RECIPE · 5 ingredients                 Food Cost: ₱32   │   │
│  │                                                         │   │
│  │  Ingredient     Qty    Unit Cost   Status               │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  Patty          1      ₱25         ✅ 24 avail          │   │
│  │  Buns           2      ₱4          ⚠️ 12 left           │   │
│  │  Lettuce        1      ₱3          🔴 Missing 1/unit    │   │
│  │  Cheese         1      ₱5          🔴 Missing 1/unit    │   │
│  │  Sauce          1      ₱4          ✅ 100 avail         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ STOCK SUMMARY                                           │   │
│  │  Can make: 6 units                                      │   │
│  │  Limited by: Buns (12 left, need 2/unit)                │   │
│  │                                                         │   │
│  │  Missing to produce (per unit):                         │   │
│  │  • Lettuce: 1                                           │   │
│  │  • Cheese: 1                                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ LABOR & OVERHEAD                                        │   │
│  │  Prep time: 5 min     Labor: ₱8                         │   │
│  │  Overhead: ₱5                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Delete Product]                                               │
└─────────────────────────────────────────────────────────────────┘
```

### Edit Mode (Toggled)

```
┌─────────────────────────────────────────────────────────────────┐
│  [×]                                      [Cancel] [Save]       │
│                                                                 │
│  Name: [Burger____________]                                     │
│  Category: [Mains ▼]                                            │
│  Image: [Change image]                                          │
│                                                                 │
│  PRICING                                                        │
│  Price: [₱ 150____]                                             │
│                                                                 │
│  RECIPE                                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Ingredient        Qty        [×]                         │  │
│  │ [Patty ▼]         [1___]     [remove]                    │  │
│  │ [Buns ▼]          [2___]     [remove]                    │  │
│  │ ...                                                      │  │
│  │ [+ Add ingredient]                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  LABOR & OVERHEAD                                               │
│  Prep time: [5___] min    Overhead: [₱ 5____]                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Panel Behaviors
- **View mode**: Read-only, shows all details with live stock status
- **Edit mode**: All fields become editable, Save/Cancel buttons appear
- **Recipe editing**: Dropdown to select ingredients, quantity inputs
- **Real-time cost**: Margin recalculates as you edit price or recipe
- **Close**: Click × or click outside panel

---

## Categories Tab Design

### Layout with Enhanced Features

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ HEADER: "Menu"                                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│ TABS: [ Products ]  [ Categories (active) ]              [+ Add Category]    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ⋮⋮ Category     Products  Revenue   Avg Margin  Stock Health    Actions    │
│  ─────────────────────────────────────────────────────────────────────────   │
│  ⋮⋮ ▶ Mains     8         ₱12,450   68%         ⚠️ 2 low, 1 out  [Edit][×]  │
│  ⋮⋮ ▶ Sides     4         ₱4,200    75%         ✅ All available  [Edit][×]  │
│  ⋮⋮ ▼ Drinks    6         ₱8,100    82%         🔴 3 out         [Edit][×]  │
│     │                                                                        │
│     │  ┌─────────────────────────────────────────────────────────────────┐  │
│     │  │ Product       Price    Margin   Stock         [View in Products]│  │
│     │  ├─────────────────────────────────────────────────────────────────┤  │
│     │  │ Iced Tea      ₱45      82%      🔴 OUT                          │  │
│     │  │ Coffee        ₱55      78%      ✅ Available                     │  │
│     │  │ Juice         ₱40      80%      🔴 OUT                          │  │
│     │  │ ...                                                             │  │
│     │  └─────────────────────────────────────────────────────────────────┘  │
│     │                                                                        │
│  ⋮⋮ ▶ Desserts  3         ₱2,800    70%         ✅ All available  [Edit][×]  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Columns

| Column | Content |
|--------|---------|
| **Drag Handle** | `⋮⋮` for reordering |
| **Expand** | `▶/▼` chevron to show/hide products |
| **Category** | Category name |
| **Products** | Count of products in category |
| **Revenue** | Sum of 30-day transaction revenue |
| **Avg Margin** | Average margin % across products |
| **Stock Health** | Aggregate status of products |
| **Actions** | Edit, Delete |

### Features

| Feature | Behavior |
|---------|----------|
| **Drag to reorder** | Grab `⋮⋮` handle, drag rows to change display order. Persists to database. |
| **Expandable products** | Click `▶` to expand inline product list |
| **Click to filter** | `[View in Products]` button switches to Products tab with category filter |
| **Category-level stats** | Revenue (30-day sum), Avg Margin (mean of product margins) |

### Expanded Row Details
Mini-table showing:
- Product name
- Price
- Margin %
- Stock status (compact badge)
- "View in Products" link to switch tabs with filter

### Stock Health Display
- `✅ All available` - every product can be made
- `⚠️ 2 low, 1 out` - summary of issues across products
- `🔴 3 out` - multiple products unavailable

---

## API Changes Required

### New/Modified Endpoints

| Endpoint | Change |
|----------|--------|
| `GET /api/products` | Add `allMissingIngredients` array with per-unit shortage |
| `GET /api/categories` | Add `revenue`, `avgMargin`, `stockHealth`, `displayOrder` |
| `PUT /api/categories/reorder` | New endpoint for drag-to-reorder |

### Product Availability Response Enhancement

Current:
```json
{
  "availability": {
    "status": "low",
    "maxProducible": 6,
    "limitingIngredient": "Buns"
  }
}
```

New:
```json
{
  "availability": {
    "status": "low",
    "maxProducible": 6,
    "limitingIngredient": { "name": "Buns", "have": 12, "needPerUnit": 2 },
    "missingIngredients": [
      { "name": "Lettuce", "have": 0, "needPerUnit": 1 },
      { "name": "Cheese", "have": 0, "needPerUnit": 1 }
    ],
    "lowIngredients": [
      { "name": "Buns", "have": 12, "needPerUnit": 2 }
    ]
  }
}
```

---

## Component Structure

```
src/app/(dashboard)/menu/
├── page.tsx                    # Main Menu page with tabs
├── components/
│   ├── products-tab.tsx        # Products table + filters
│   ├── product-table.tsx       # Table component
│   ├── product-row.tsx         # Single row with hover tooltip
│   ├── stock-badge.tsx         # Status badge with tooltip
│   ├── stock-tooltip.tsx       # Hover tooltip for missing ingredients
│   ├── product-panel.tsx       # Slide-out panel
│   ├── product-panel-view.tsx  # View mode content
│   ├── product-panel-edit.tsx  # Edit mode content
│   ├── categories-tab.tsx      # Categories table
│   ├── category-row.tsx        # Expandable row with drag handle
│   └── category-products.tsx   # Expanded product mini-table
```

---

## Migration Plan

1. Create new `/dashboard/menu` page with components
2. Update sidebar navigation
3. Enhance API responses with missing ingredient details
4. Add category reorder endpoint and `displayOrder` field
5. Delete old pages: `/products`, `/recipes`, `/pricing`, `/categories`
6. Update any internal links pointing to old routes

---

## Design Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Layout | Hybrid table + slide-out | Best balance of scannability and detail |
| Missing ingredients | Hover tooltip, max 5 | Keeps table clean, full detail on demand |
| Shortage display | Per-unit amounts | Simple, actionable information |
| Categories integration | Tab within Menu | Reduces navigation, keeps related context together |
| Category features | All four (reorder, expand, filter, stats) | Full category management without separate page |
| Editing | Edit mode toggle | Prevents accidental changes |
| Kept separate | Ingredients page | Different purpose (inventory operations) |
