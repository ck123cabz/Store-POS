# API Contract: Ingredients

**Feature**: 004-ingredient-unit-system
**Base Path**: `/api/ingredients`

---

## Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ingredients` | List all ingredients |
| POST | `/api/ingredients` | Create ingredient |
| GET | `/api/ingredients/:id` | Get single ingredient |
| PUT | `/api/ingredients/:id` | Update ingredient |
| DELETE | `/api/ingredients/:id` | Delete ingredient |
| POST | `/api/ingredients/:id/restock` | Restock ingredient |
| GET | `/api/ingredients/low-stock` | Get low stock alerts |

---

## GET /api/ingredients

List all active ingredients with computed fields.

### Response 200

```typescript
interface IngredientListItem {
  id: number;
  name: string;
  category: string;

  // Unit system
  baseUnit: string;
  packageSize: number;
  packageUnit: string;
  costPerPackage: number;
  costPerBaseUnit: number;      // COMPUTED: costPerPackage / packageSize

  // Stock
  quantity: number;             // packages
  totalBaseUnits: number;       // COMPUTED: quantity * packageSize
  parLevel: number;
  stockStatus: 'ok' | 'low' | 'critical' | 'out';
  stockRatio: number | null;    // quantity / parLevel

  // Metadata
  vendorId: number | null;
  vendorName: string | null;
  lastRestockDate: string | null;
  lastUpdated: string;

  // Special flags
  sellable: boolean;
  isOverhead: boolean;
  countByBaseUnit: boolean;

  // Legacy (for backward compatibility)
  unit: string;                 // @deprecated
  costPerUnit: number;          // @deprecated
}

type Response = IngredientListItem[];
```

### Example Response

```json
[
  {
    "id": 1,
    "name": "Burger Patties",
    "category": "Protein",
    "baseUnit": "pcs",
    "packageSize": 8,
    "packageUnit": "pack",
    "costPerPackage": 420.00,
    "costPerBaseUnit": 52.50,
    "quantity": 3.5,
    "totalBaseUnits": 28,
    "parLevel": 2,
    "stockStatus": "ok",
    "stockRatio": 1.75,
    "vendorId": null,
    "vendorName": null,
    "lastRestockDate": "2026-01-28T08:00:00Z",
    "lastUpdated": "2026-01-28T08:00:00Z",
    "sellable": false,
    "isOverhead": false,
    "countByBaseUnit": false,
    "unit": "pack",
    "costPerUnit": 420.00
  }
]
```

---

## POST /api/ingredients

Create a new ingredient.

### Request Body

```typescript
interface CreateIngredientRequest {
  name: string;                       // required, max 100 chars
  category: string;                   // required

  // Purchasing
  packageUnit: string;                // required: "pack", "kg", "bottle", etc.
  costPerPackage: number;             // required, >= 0

  // Usage
  baseUnit: string;                   // required: "pcs", "kg", "g", "L", "mL"
  packageSize: number;                // required, > 0

  // Stock (optional)
  quantity?: number;                  // default: 0
  parLevel?: number;                  // default: 0
  countByBaseUnit?: boolean;          // default: false

  // Special options (optional)
  vendorId?: number | null;
  sellable?: boolean;                 // default: false
  sellPrice?: number | null;          // required if sellable
  isOverhead?: boolean;               // default: false
  overheadPerTransaction?: number | null; // required if isOverhead
}
```

### Response 201

```typescript
interface CreateIngredientResponse {
  id: number;
  name: string;
  // ... all fields from IngredientListItem
}
```

### Response 400

```json
{
  "error": "Validation failed",
  "details": [
    { "field": "packageSize", "message": "Package size must be greater than 0" }
  ]
}
```

### Example Request

```json
{
  "name": "Burger Patties",
  "category": "Protein",
  "packageUnit": "pack",
  "costPerPackage": 420.00,
  "baseUnit": "pcs",
  "packageSize": 8,
  "quantity": 3.5,
  "parLevel": 2
}
```

---

## PUT /api/ingredients/:id

Update an existing ingredient.

### Request Body

Same as POST, all fields optional except those being updated.

### Response 200

Updated ingredient object.

### Response 404

```json
{ "error": "Ingredient not found" }
```

---

## POST /api/ingredients/:id/restock

Add stock and optionally update pricing.

### Request Body

```typescript
interface RestockRequest {
  quantity: number;                   // required, > 0, packages to add
  costPerPackage?: number;            // optional, update if price changed
  packageSize?: number;               // optional, update if pack size changed

  // Audit
  userId: number;                     // required
  userName: string;                   // required
}
```

### Response 200

```typescript
interface RestockResponse {
  ingredient: IngredientListItem;
  restockDetails: {
    previousQuantity: number;
    addedQuantity: number;
    newQuantity: number;
    previousCostPerPackage: number | null;
    newCostPerPackage: number;
    costPerBaseUnit: number;
  };
}
```

### Example Request

```json
{
  "quantity": 5,
  "costPerPackage": 450.00,
  "userId": 1,
  "userName": "Admin"
}
```

### Example Response

```json
{
  "ingredient": { "id": 1, "name": "Burger Patties", "quantity": 8.5, ... },
  "restockDetails": {
    "previousQuantity": 3.5,
    "addedQuantity": 5,
    "newQuantity": 8.5,
    "previousCostPerPackage": 420.00,
    "newCostPerPackage": 450.00,
    "costPerBaseUnit": 56.25
  }
}
```

---

## GET /api/ingredients/low-stock

Get ingredients below PAR level for alerts.

### Response 200

```typescript
interface LowStockResponse {
  count: number;
  items: Array<{
    id: number;
    name: string;
    quantity: number;
    totalBaseUnits: number;
    parLevel: number;
    baseUnit: string;
    packageUnit: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    stockRatio: number;
  }>;
}
```

### Priority Calculation

```
stockRatio = quantity / parLevel
─────────────────────────────────
= 0        → "critical"
< 0.25     → "high"
< 0.5      → "medium"
< 1.0      → "low"
```

---

## Error Responses

All endpoints follow consistent error format:

### 400 Bad Request
```json
{ "error": "Validation message" }
```

### 401 Unauthorized
```json
{ "error": "Not authenticated" }
```

### 404 Not Found
```json
{ "error": "Ingredient not found" }
```

### 500 Internal Server Error
```json
{ "error": "Internal server error" }
```

---

## Notes

1. **Backward Compatibility**: Response includes deprecated `unit` and `costPerUnit` fields mapped from new system
2. **Computed Fields**: `costPerBaseUnit`, `totalBaseUnits`, `stockStatus`, `stockRatio` are calculated server-side
3. **Audit Trail**: All changes recorded in `IngredientHistory` table
4. **Precision**: Monetary values use 2 decimal places; quantities use 2-3 decimal places
