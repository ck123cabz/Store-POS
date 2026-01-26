/**
 * Integration Tests: Transactions API
 * Tests /api/transactions route handlers for auth and transaction operations
 *
 * Constitution Compliance:
 * - Principle II (Security-First): Verifies auth checks
 * - Principle IV (Data Integrity): Verifies atomic transaction behavior
 * - Principle V (RESTful API Standards): Verifies correct status codes
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import {
  createMockSession,
  createTestRequest,
  mockPrismaData,
} from '../utils/api-test-helpers'

// Mock modules before importing route handlers
vi.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    transaction: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    ingredient: {
      update: vi.fn(),
    },
    ingredientHistory: {
      create: vi.fn(),
    },
    customer: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'test123456'),
}))

// Import after mocks are set up
import { GET, POST } from '@/app/api/transactions/route'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

describe('Transactions API - /api/transactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/transactions', () => {
    test('returns 401 when not authenticated', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue(null as unknown as ReturnType<typeof auth>)
      const request = createTestRequest('/api/transactions')

      // Act
      const response = await GET(request as Request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(body.error).toBe('Unauthorized')
    })

    test('returns transactions when authenticated', async () => {
      // Arrange
      const session = createMockSession()
      vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
      vi.mocked(prisma.transaction.findMany).mockResolvedValue([mockPrismaData.transaction] as never)
      const request = createTestRequest('/api/transactions')

      // Act
      const response = await GET(request as Request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBe(1)
      expect(body[0]).toHaveProperty('orderNumber')
      expect(body[0]).toHaveProperty('total')
    })

    test('filters by status when provided', async () => {
      // Arrange
      const session = createMockSession()
      vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
      vi.mocked(prisma.transaction.findMany).mockResolvedValue([])
      const request = createTestRequest('/api/transactions', {
        searchParams: { status: '1' },
      })

      // Act
      await GET(request as Request)

      // Assert
      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 1,
          }),
        })
      )
    })

    test('filters by date range when provided', async () => {
      // Arrange
      const session = createMockSession()
      vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
      vi.mocked(prisma.transaction.findMany).mockResolvedValue([])
      const request = createTestRequest('/api/transactions', {
        searchParams: {
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
        },
      })

      // Act
      await GET(request as Request)

      // Assert
      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      )
    })
  })

  describe('POST /api/transactions', () => {
    test('returns 401 when not authenticated', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue(null as unknown as ReturnType<typeof auth>)
      const request = createTestRequest('/api/transactions', {
        method: 'POST',
        body: {
          items: [{ id: 1, productName: 'Test', price: 100, quantity: 1 }],
          subtotal: 100,
          total: 100,
          status: 1,
          paidAmount: 100,
          changeAmount: 0,
        },
      })

      // Act
      const response = await POST(request as Request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(body.error).toBe('Unauthorized')
    })

    test('creates transaction using prisma.$transaction for atomicity', async () => {
      // Arrange
      const session = createMockSession()
      vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)

      // Mock product lookup for category analysis
      vi.mocked(prisma.product.findMany).mockResolvedValue([
        { id: 1, categoryId: 1 },
      ] as never)

      // Mock the $transaction to execute the callback and return the result
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        // Create a mock transaction client
        const mockTx = {
          transaction: {
            create: vi.fn().mockResolvedValue({
              id: 1,
              orderNumber: 1234567890,
              items: [{ id: 1, productId: 1, productName: 'Test', price: 100, quantity: 1 }],
            }),
          },
          product: {
            findUnique: vi.fn().mockResolvedValue({
              id: 1,
              name: 'Test Product',
              trackStock: false,
              linkedIngredientId: null,
              linkedIngredient: null,
              recipeItems: [],
            }),
            update: vi.fn(),
          },
          ingredient: {
            update: vi.fn(),
          },
          ingredientHistory: {
            create: vi.fn(),
          },
          customer: {
            findUnique: vi.fn().mockResolvedValue(null),
            update: vi.fn(),
          },
        }
        return callback(mockTx as never)
      })

      const request = createTestRequest('/api/transactions', {
        method: 'POST',
        body: {
          items: [{ id: 1, productName: 'Test', price: 100, quantity: 1 }],
          subtotal: 100,
          total: 100,
          status: 1,
          paidAmount: 100,
          changeAmount: 0,
        },
      })

      // Act
      const response = await POST(request as Request)

      // Assert
      expect(response.status).toBe(200)
      // Verify atomic transaction was used
      expect(prisma.$transaction).toHaveBeenCalled()
    })

    test('handles database errors gracefully', async () => {
      // Arrange
      const session = createMockSession()
      vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
      vi.mocked(prisma.product.findMany).mockResolvedValue([{ id: 1, categoryId: 1 }] as never)
      vi.mocked(prisma.$transaction).mockRejectedValue(new Error('Database error'))

      const request = createTestRequest('/api/transactions', {
        method: 'POST',
        body: {
          items: [{ id: 1, productName: 'Test', price: 100, quantity: 1 }],
          subtotal: 100,
          total: 100,
          status: 1,
          paidAmount: 100,
          changeAmount: 0,
        },
      })

      // Act
      const response = await POST(request as Request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(body.error).toBe('Failed to create transaction')
    })
  })
})
