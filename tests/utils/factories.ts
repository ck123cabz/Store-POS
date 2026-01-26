/**
 * Test Data Factories
 * Create test data with sensible defaults and overrides
 */

// Counter for unique IDs
let idCounter = 1000

function nextId() {
  return idCounter++
}

// Reset counter between test suites
export function resetFactories() {
  idCounter = 1000
}

// ============================================================================
// User Factory
// ============================================================================

export interface UserData {
  id?: number
  username?: string
  password?: string
  fullname?: string
  permProducts?: boolean
  permCategories?: boolean
  permTransactions?: boolean
  permUsers?: boolean
  permSettings?: boolean
  permReports?: boolean
  permAuditLog?: boolean
  status?: string
}

export function createUser(overrides: UserData = {}): Required<UserData> {
  const id = overrides.id ?? nextId()
  return {
    id,
    username: overrides.username ?? `user_${id}`,
    password: overrides.password ?? 'password123',
    fullname: overrides.fullname ?? `Test User ${id}`,
    permProducts: overrides.permProducts ?? false,
    permCategories: overrides.permCategories ?? false,
    permTransactions: overrides.permTransactions ?? false,
    permUsers: overrides.permUsers ?? false,
    permSettings: overrides.permSettings ?? false,
    permReports: overrides.permReports ?? false,
    permAuditLog: overrides.permAuditLog ?? false,
    status: overrides.status ?? 'active',
  }
}

export function createAdminUser(overrides: UserData = {}): Required<UserData> {
  return createUser({
    username: 'admin',
    fullname: 'Administrator',
    permProducts: true,
    permCategories: true,
    permTransactions: true,
    permUsers: true,
    permSettings: true,
    permReports: true,
    permAuditLog: true,
    ...overrides,
  })
}

// ============================================================================
// Category Factory
// ============================================================================

export interface CategoryData {
  id?: number
  name?: string
}

export function createCategory(overrides: CategoryData = {}): Required<CategoryData> {
  const id = overrides.id ?? nextId()
  return {
    id,
    name: overrides.name ?? `Category ${id}`,
  }
}

// ============================================================================
// Product Factory
// ============================================================================

export interface ProductData {
  id?: number
  name?: string
  price?: number
  categoryId?: number
  quantity?: number
  trackStock?: boolean
  image?: string
  linkedIngredientId?: number | null
  needsPricing?: boolean
  trueCost?: number | null
  trueMargin?: number | null
  isHeroItem?: boolean
}

export function createProduct(overrides: ProductData = {}): Required<ProductData> {
  const id = overrides.id ?? nextId()
  const price = overrides.price ?? 99.99
  const trueCost = overrides.trueCost ?? 30
  return {
    id,
    name: overrides.name ?? `Product ${id}`,
    price,
    categoryId: overrides.categoryId ?? 1,
    quantity: overrides.quantity ?? 100,
    trackStock: overrides.trackStock ?? true,
    image: overrides.image ?? '',
    linkedIngredientId: overrides.linkedIngredientId ?? null,
    needsPricing: overrides.needsPricing ?? false,
    trueCost,
    trueMargin: overrides.trueMargin ?? (price - trueCost),
    isHeroItem: overrides.isHeroItem ?? false,
  }
}

// ============================================================================
// Ingredient Factory
// ============================================================================

export interface IngredientData {
  id?: number
  name?: string
  quantity?: number
  unit?: string
  parLevel?: number
  unitCost?: number
  category?: string
  vendorId?: number | null
}

export function createIngredient(overrides: IngredientData = {}): Required<IngredientData> {
  const id = overrides.id ?? nextId()
  return {
    id,
    name: overrides.name ?? `Ingredient ${id}`,
    quantity: overrides.quantity ?? 50,
    unit: overrides.unit ?? 'kg',
    parLevel: overrides.parLevel ?? 20,
    unitCost: overrides.unitCost ?? 5.00,
    category: overrides.category ?? 'General',
    vendorId: overrides.vendorId ?? null,
  }
}

// ============================================================================
// Transaction Factory
// ============================================================================

export interface TransactionItemData {
  productId: number
  productName: string
  price: number
  quantity: number
}

export interface TransactionData {
  id?: number
  orderNumber?: number
  total?: number
  subtotal?: number
  tax?: number
  discount?: number
  status?: 'completed' | 'pending' | 'on_hold'
  paymentMethod?: string
  amountTendered?: number
  change?: number
  userId?: number
  customerId?: number | null
  items?: TransactionItemData[]
}

export function createTransaction(overrides: TransactionData = {}): Required<TransactionData> {
  const id = overrides.id ?? nextId()
  const items = overrides.items ?? [
    { productId: 1, productName: 'Test Product', price: 50, quantity: 2 },
  ]
  const subtotal = overrides.subtotal ?? items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const tax = overrides.tax ?? subtotal * 0.12
  const discount = overrides.discount ?? 0
  const total = overrides.total ?? (subtotal + tax - discount)

  return {
    id,
    orderNumber: overrides.orderNumber ?? id,
    total,
    subtotal,
    tax,
    discount,
    status: overrides.status ?? 'completed',
    paymentMethod: overrides.paymentMethod ?? 'cash',
    amountTendered: overrides.amountTendered ?? total,
    change: overrides.change ?? 0,
    userId: overrides.userId ?? 1,
    customerId: overrides.customerId ?? null,
    items,
  }
}

// ============================================================================
// Customer Factory
// ============================================================================

export interface CustomerData {
  id?: number
  name?: string
  email?: string
  phone?: string
  address?: string
}

export function createCustomer(overrides: CustomerData = {}): Required<CustomerData> {
  const id = overrides.id ?? nextId()
  return {
    id,
    name: overrides.name ?? `Customer ${id}`,
    email: overrides.email ?? `customer${id}@example.com`,
    phone: overrides.phone ?? `+1-555-000-${String(id).padStart(4, '0')}`,
    address: overrides.address ?? `${id} Test Street`,
  }
}

// ============================================================================
// Settings Factory
// ============================================================================

export interface SettingsData {
  id?: number
  appName?: string
  storeName?: string
  currencySymbol?: string
  chargeTax?: boolean
  taxPercentage?: number
  logo?: string
  receiptFooter?: string
}

export function createSettings(overrides: SettingsData = {}): Required<SettingsData> {
  return {
    id: overrides.id ?? 1,
    appName: overrides.appName ?? 'Store POS',
    storeName: overrides.storeName ?? 'Test Store',
    currencySymbol: overrides.currencySymbol ?? '₱',
    chargeTax: overrides.chargeTax ?? true,
    taxPercentage: overrides.taxPercentage ?? 12,
    logo: overrides.logo ?? '',
    receiptFooter: overrides.receiptFooter ?? 'Thank you for your purchase!',
  }
}
