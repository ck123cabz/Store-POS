# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Store-POS is a desktop Point of Sale application built with Electron. It uses an embedded Express.js server with NeDB (document-oriented database) for data persistence. The frontend is jQuery-based with Bootstrap 3.

## Development Commands

```bash
# Install dependencies
npm install

# Start development (with hot reload via nodemon)
npm run electron

# Build Windows installer
npm run electron-build

# Package Windows executable
npm run package-win
```

**Default credentials:** admin/admin

**Server port:** 8001 (configurable via PORT env variable)

## Architecture

### Process Model
- **Main Process** (`start.js`): Electron window management, IPC handlers for quit/reload
- **Server** (`server.js`): Express.js API server started on app launch
- **Renderer** (`index.html` + `assets/js/pos.js`): jQuery-based SPA handling all POS UI

### Data Flow
Frontend (jQuery) → Express API (localhost:8001) → NeDB databases

### Database Location
All NeDB databases stored in `%APPDATA%/POS/server/databases/`:
- `users.db` - User accounts with role-based permissions
- `inventory.db` - Products (id, name, price, category, quantity, stock flag, image)
- `categories.db` - Product categories
- `transactions.db` - Sales records with items, totals, payment info
- `customers.db` - Customer records
- `settings.db` - Store configuration (name, logo, tax settings)

### API Routes
| Route | File | Purpose |
|-------|------|---------|
| `/api/users` | `api/users.js` | Authentication, user CRUD |
| `/api/inventory` | `api/inventory.js` | Product management, SKU lookup |
| `/api/categories` | `api/categories.js` | Category CRUD |
| `/api/transactions` | `api/transactions.js` | Sales, on-hold orders, filtering |
| `/api/customers` | `api/customers.js` | Customer database |
| `/api/settings` | `api/settings.js` | Store configuration |

### Key Frontend Components
The main UI logic lives in `assets/js/pos.js` (~2400 lines). Key areas:
- Product grid and cart management
- Receipt generation using html2canvas + jsPDF
- Barcode scanning via JsBarcode
- Print functionality via print-js
- Date filtering with daterangepicker

### User Permissions System
Users have granular permissions: `perm_products`, `perm_categories`, `perm_transactions`, `perm_users`, `perm_settings`

### Network Mode
App supports "Network Point of Sale Terminal" mode where multiple PCs connect to a central database by configuring a different API IP address.

## Key Implementation Details

- **IDs**: Products and transactions use timestamp-based IDs (`Math.floor(Date.now() / 1000)`)
- **Image uploads**: Stored in `%APPDATA%/POS/uploads/`, filenames are timestamps
- **Stock tracking**: Per-product toggle; inventory auto-decrements on paid transactions
- **On-hold orders**: Tracked via `ref_number` field in transactions
- **Receipt printing**: HTML rendered → html2canvas → jsPDF → print-js

## Testing

No test framework is currently configured. Manual testing required.
