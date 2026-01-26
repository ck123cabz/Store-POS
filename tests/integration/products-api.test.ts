/**
 * Integration Tests: Products API
 * Tests /api/products route handlers for auth, permissions, and CRUD operations
 *
 * Constitution Compliance:
 * - Principle II (Security-First): Verifies auth and permission checks
 * - Principle V (RESTful API Standards): Verifies correct status codes
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import {
  createMockSession,
  createLimitedSession,
  createTestRequest,
  mockPrismaData,
  type MockSession,
} from '../utils/api-test-helpers'

// Mock modules before importing route handlers
vi.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

// Import after mocks are set up
import { GET, POST } from '@/app/api/products/route'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

describe('Products API - /api/products', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/products', () => {
    test('returns 401 when not authenticated', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue(null as unknown as ReturnType<typeof auth>)
      const request = createTestRequest('/api/products')

      // Act
      const response = await GET(request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(body.error).toBe('Unauthorized')
    })

    test('returns products when authenticated', async () => {
      // Arrange
      const session = createMockSession()
      vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
      vi.mocked(prisma.product.findMany).mockResolvedValue(mockPrismaData.products as never)
      const request = createTestRequest('/api/products')

      // Act
      const response = await GET(request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBe(2)
      expect(body[0]).toHaveProperty('id')
      expect(body[0]).toHaveProperty('name')
      expect(body[0]).toHaveProperty('price')
    })

    test('returns products even with limited permissions (read is allowed)', async () => {
      // Arrange - user with NO product permission can still READ
      const session = createLimitedSession({ permProducts: false })
      vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
      vi.mocked(prisma.product.findMany).mockResolvedValue(mockPrismaData.products as never)
      const request = createTestRequest('/api/products')

      // Act
      const response = await GET(request)

      // Assert - GET doesn't require permProducts, just authentication
      expect(response.status).toBe(200)
    })

    test('includes costing data when requested', async () => {
      // Arrange
      const session = createMockSession()
      vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
      const productsWithCosting = mockPrismaData.products.map((p) => ({
        ...p,
        trueCost: 50,
        trueMargin: 50,
        trueMarginPercent: 50,
      }))
      vi.mocked(prisma.product.findMany).mockResolvedValue(productsWithCosting as never)
      const request = createTestRequest('/api/products', {
        searchParams: { includeCosting: 'true' },
      })

      // Act
      const response = await GET(request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(body[0]).toHaveProperty('trueCost')
      expect(body[0]).toHaveProperty('trueMargin')
    })
  })

  describe('POST /api/products', () => {
    test('returns 401 when not authenticated', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue(null as unknown as ReturnType<typeof auth>)
      const request = createTestRequest('/api/products', {
        method: 'POST',
        body: { name: 'New Product', price: 100, categoryId: 1 },
      })

      // Act
      const response = await POST(request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(body.error).toBe('Unauthorized')
    })

    test('returns 403 when user lacks permProducts permission', async () => {
      // Arrange
      const session = createLimitedSession({ permProducts: false })
      vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
      const request = createTestRequest('/api/products', {
        method: 'POST',
        body: { name: 'New Product', price: 100, categoryId: 1 },
      })

      // Act
      const response = await POST(request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(403)
      expect(body.error).toBe('Permission denied')
    })

    test('creates product when authenticated with permission', async () => {
      // Arrange
      const session = createMockSession()
      vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
      const newProduct = {
        id: 3,
        name: 'New Product',
        price: 150,
        categoryId: 1,
        quantity: 0,
        trackStock: false,
        image: '',
        linkedIngredientId: null,
        needsPricing: false,
        linkedIngredient: null,
      }
      vi.mocked(prisma.product.create).mockResolvedValue(newProduct as never)
      const request = createTestRequest('/api/products', {
        method: 'POST',
        body: { name: 'New Product', price: 150, categoryId: 1 },
      })

      // Act
      const response = await POST(request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(body.name).toBe('New Product')
      expect(body.price).toBe(150)
      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'New Product',
            price: 150,
            categoryId: 1,
          }),
        })
      )
    })

    test('handles database errors gracefully', async () => {
      // Arrange
      const session = createMockSession()
      vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
      vi.mocked(prisma.product.create).mockRejectedValue(new Error('Database error'))
      const request = createTestRequest('/api/products', {
        method: 'POST',
        body: { name: 'New Product', price: 100, categoryId: 1 },
      })

      // Act
      const response = await POST(request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(body.error).toBe('Failed to create product')
    })
  })
})
