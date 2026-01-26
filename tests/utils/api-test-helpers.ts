/**
 * API Integration Test Helpers
 * Utilities for testing Next.js App Router API routes
 */

import { vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Create a mock session for authenticated requests
 */
export function createMockSession(overrides: Partial<MockUser> = {}): MockSession {
  return {
    user: {
      id: '1',
      name: 'Test Admin',
      username: 'admin',
      permProducts: true,
      permCategories: true,
      permTransactions: true,
      permUsers: true,
      permSettings: true,
      permReports: true,
      permAuditLog: true,
      ...overrides,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }
}

/**
 * Create a mock session with limited permissions
 */
export function createLimitedSession(permissions: Partial<MockUser> = {}): MockSession {
  return {
    user: {
      id: '2',
      name: 'Limited User',
      username: 'limited',
      permProducts: false,
      permCategories: false,
      permTransactions: false,
      permUsers: false,
      permSettings: false,
      permReports: false,
      permAuditLog: false,
      ...permissions,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }
}

/**
 * Create a NextRequest for testing API routes
 */
export function createTestRequest(
  url: string,
  options: {
    method?: string
    body?: unknown
    searchParams?: Record<string, string>
  } = {}
): NextRequest {
  const { method = 'GET', body, searchParams } = options

  let fullUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`

  if (searchParams) {
    const params = new URLSearchParams(searchParams)
    fullUrl += `?${params.toString()}`
  }

  // Create request init - cast to any to bypass Next.js RequestInit type differences
  const requestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body && method !== 'GET' ? JSON.stringify(body) : undefined,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextRequest(fullUrl, requestInit as any)
}

/**
 * Parse JSON response from NextResponse
 */
export async function parseResponse<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>
}

/**
 * Assert response status and get body
 */
export async function expectStatus<T>(
  response: Response,
  expectedStatus: number
): Promise<T> {
  if (response.status !== expectedStatus) {
    const body = await response.text()
    throw new Error(
      `Expected status ${expectedStatus}, got ${response.status}. Body: ${body}`
    )
  }
  return response.json() as Promise<T>
}

// Type definitions
export interface MockUser {
  id: string
  name: string
  username: string
  permProducts: boolean
  permCategories: boolean
  permTransactions: boolean
  permUsers: boolean
  permSettings: boolean
  permReports: boolean
  permAuditLog: boolean
}

export interface MockSession {
  user: MockUser
  expires: string
}

/**
 * Create mock Prisma responses for common queries
 */
export const mockPrismaData = {
  product: {
    id: 1,
    name: 'Test Product',
    price: 100,
    categoryId: 1,
    quantity: 10,
    trackStock: true,
    image: '',
    linkedIngredientId: null,
    needsPricing: false,
    category: { id: 1, name: 'Test Category' },
  },
  products: [
    {
      id: 1,
      name: 'Test Product 1',
      price: 100,
      categoryId: 1,
      quantity: 10,
      trackStock: true,
      image: '',
      linkedIngredientId: null,
      needsPricing: false,
      linkedIngredient: null,
      category: { id: 1, name: 'Test Category' },
    },
    {
      id: 2,
      name: 'Test Product 2',
      price: 200,
      categoryId: 1,
      quantity: 5,
      trackStock: false,
      image: '',
      linkedIngredientId: null,
      needsPricing: false,
      linkedIngredient: null,
      category: { id: 1, name: 'Test Category' },
    },
  ],
  transaction: {
    id: 1,
    orderNumber: 1234567890,
    refNumber: '',
    discount: 0,
    customerId: null,
    userId: 1,
    status: 1,
    subtotal: 100,
    taxAmount: 10,
    total: 110,
    paidAmount: 110,
    changeAmount: 0,
    paymentType: 'Cash',
    paymentInfo: '',
    tillNumber: 1,
    macAddress: '',
    weather: null,
    courtStatus: null,
    dayType: 'Weekday',
    itemCount: 1,
    isDrinkOnly: false,
    hasFoodAttached: true,
    isGroupOrder: false,
    daypart: 'Morning',
    items: [
      {
        id: 1,
        transactionId: 1,
        productId: 1,
        productName: 'Test Product',
        sku: '1',
        price: 100,
        quantity: 1,
      },
    ],
    customer: null,
    user: { id: 1, fullname: 'Test Admin' },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  ingredientHistory: [
    {
      id: 1,
      ingredientId: 1,
      ingredientName: 'Test Ingredient',
      changeId: 'abc123',
      field: 'quantity',
      oldValue: '10',
      newValue: '8',
      source: 'sale',
      reason: 'sale',
      reasonNote: 'Sold 2x Test Product',
      userId: 1,
      userName: 'Test Admin',
      createdAt: new Date(),
      ingredient: { id: 1, name: 'Test Ingredient', unit: 'each' },
    },
  ],
}

/**
 * Setup mock for auth module
 */
export function setupAuthMock(session: MockSession | null) {
  vi.doMock('@/lib/auth', () => ({
    auth: vi.fn().mockResolvedValue(session),
  }))
}

/**
 * Reset all mocks
 */
export function resetMocks() {
  vi.resetModules()
  vi.clearAllMocks()
}
