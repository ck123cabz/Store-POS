# Store POS Web Rebuild - Design Document

**Date:** 2026-01-21
**Status:** Approved

## Overview

Rebuild the existing Electron-based Store POS application as a modern cloud-hosted web application using React/Next.js, while preserving all existing functionality.

## Target Users

- **Managers/Owners:** Desktop web browsers for dashboards and administration
- **Retail Staff:** Tablets and mobile phones for POS terminal operations

## Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14+ (App Router) |
| UI Components | shadcn/ui + Radix UI |
| Styling | Tailwind CSS |
| State Management | React useState/useReducer |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | NextAuth.js (Auth.js) |
| PDF Generation | @react-pdf/renderer |
| Email | Resend (or Nodemailer) |
| File Storage | Local uploads |
| Deployment | Cloud SaaS (Vercel/Railway) |

## Key Decisions

- **Single-tenant** for MVP (no multi-tenancy complexity)
- **Near-real-time polling** (30-60s) for multi-terminal sync
- **Record-only payments** (no payment gateway integration)
- **PDF + Email receipts** (no thermal printer integration for MVP)

---

## Data Models (1:1 from existing)

### User
```typescript
User {
  _id: number           // timestamp-based, or 1 for admin
  username: string
  password: string      // bcrypt hashed (replacing base64)
  fullname: string
  perm_products: 0 | 1
  perm_categories: 0 | 1
  perm_transactions: 0 | 1
  perm_users: 0 | 1
  perm_settings: 0 | 1
  status: string        // "Logged In_<ISO date>" or "Logged Out_<ISO date>"
}
```

### Category
```typescript
Category {
  _id: number           // timestamp-based
  name: string
}
```

### Customer
```typescript
Customer {
  _id: number           // timestamp-based
  name: string
  phone: string
  email: string
  address: string
}
```

### Product
```typescript
Product {
  _id: number           // timestamp-based
  name: string
  price: string         // stored as string, formatted
  category: number      // category _id (foreign key)
  quantity: number      // stock count
  stock: 0 | 1          // 1 = track stock, 0 = don't track
  img: string           // filename
}
```

### Transaction
```typescript
Transaction {
  _id: number           // order number (timestamp-based)
  order: number         // same as _id
  ref_number: string    // reference for on-hold orders
  discount: string
  customer: { id: number, name: string } | "0"  // "0" for walk-in
  status: 0 | 1         // 0 = pending/on-hold, 1 = completed
  subtotal: string
  tax: number
  order_type: number    // always 1
  items: OrderItem[]
  date: Date
  payment_type: string  // "Cash" | "Card" | "Cheque"
  payment_info: string
  total: string
  paid: string
  change: string
  till: number
  mac: string
  user: string          // cashier fullname
  user_id: number       // cashier _id
}
```

### OrderItem
```typescript
OrderItem {
  id: number            // product _id
  product_name: string
  sku: string
  price: string
  quantity: number
}
```

### Settings
```typescript
Settings {
  _id: 1                // singleton
  settings: {
    app: string
    store: string
    address_one: string
    address_two: string
    contact: string
    tax: string         // VAT registration number
    symbol: string      // currency symbol
    percentage: string  // tax percentage
    charge_tax: "on" | undefined
    footer: string
    img: string         // logo filename
  }
}
```

---

## Page Structure

```
/                       → Login page (if not authenticated)
/pos                    → Main POS terminal (product grid + cart)
/transactions           → Transaction history with filters
/products               → Product management (CRUD)
/categories             → Category management (CRUD)
/customers              → Customer management (CRUD)
/users                  → User management (CRUD + permissions)
/settings               → Store settings
```

### Main POS Layout
```
┌─────────────────────────────────────────────────────────────────┐
│  Header: Store Name | Cashier Name | Logout | Settings          │
├───────────────────────────────────┬─────────────────────────────┤
│  Category filter buttons          │  CART                       │
│  [All] [Cat1] [Cat2] [Cat3]       │  - Item list with qty +/-   │
│                                   │  - Subtotal                 │
│  Product grid (responsive)        │  - Discount input           │
│  - Image, name, price, stock      │  - Tax                      │
│                                   │  - Total                    │
│  [Barcode input field]            │  - Customer dropdown        │
│                                   │  [Cancel] [Hold] [Pay]      │
├───────────────────────────────────┴─────────────────────────────┤
│  Footer: [Hold Orders] [Customer Orders]                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
store-pos/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── pos/page.tsx
│   │   │   ├── transactions/page.tsx
│   │   │   ├── products/page.tsx
│   │   │   ├── categories/page.tsx
│   │   │   ├── customers/page.tsx
│   │   │   ├── users/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── products/route.ts
│   │   │   ├── categories/route.ts
│   │   │   ├── customers/route.ts
│   │   │   ├── transactions/route.ts
│   │   │   └── settings/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                 # shadcn components
│   │   ├── pos/
│   │   ├── forms/
│   │   └── layout/
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── auth.ts
│   │   └── utils.ts
│   ├── hooks/
│   │   ├── use-cart.ts
│   │   └── use-polling.ts
│   └── types/index.ts
├── public/uploads/
├── .env
├── package.json
└── tailwind.config.ts
```

---

## API Endpoints

### Products
- `GET /api/products` - List all
- `GET /api/products/[id]` - Get one
- `POST /api/products` - Create (with image)
- `PUT /api/products/[id]` - Update
- `DELETE /api/products/[id]` - Delete
- `POST /api/products/sku` - Lookup by barcode

### Categories
- `GET /api/categories` - List all
- `POST /api/categories` - Create
- `PUT /api/categories/[id]` - Update
- `DELETE /api/categories/[id]` - Delete

### Customers
- `GET /api/customers` - List all
- `GET /api/customers/[id]` - Get one
- `POST /api/customers` - Create
- `PUT /api/customers/[id]` - Update
- `DELETE /api/customers/[id]` - Delete

### Transactions
- `GET /api/transactions` - List (with filters: date, user, till, status)
- `GET /api/transactions/on-hold` - Pending with ref_number
- `GET /api/transactions/customer-orders` - Pending with customer
- `POST /api/transactions` - Create
- `PUT /api/transactions/[id]` - Update
- `DELETE /api/transactions/[id]` - Delete

### Users
- `GET /api/users` - List all
- `GET /api/users/[id]` - Get one
- `POST /api/users` - Create/update
- `DELETE /api/users/[id]` - Delete

### Settings
- `GET /api/settings` - Get store settings
- `POST /api/settings` - Update settings (with logo)

### Auth (NextAuth.js)
- `POST /api/auth/signin` - Login
- `POST /api/auth/signout` - Logout

---

## Features Preserved

- Product grid with category filtering
- Shopping cart with quantity controls
- Barcode/SKU scanning
- Multiple payment types (Cash, Card, Cheque)
- Discount and tax calculation
- On-hold orders with reference numbers
- Customer orders
- Walk-in customer support
- Transaction history with filters
- User management with 5 permission types
- Store settings (name, address, tax, logo)
- Multi-terminal support (till numbers)
- Receipt generation

## Improvements

- Proper password hashing (bcrypt)
- Mobile-responsive UI
- Cloud deployment
- Digital receipts via email
- Near-real-time data sync
- Modern UI with shadcn/ui
