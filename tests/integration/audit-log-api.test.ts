/**
 * Integration Tests: Audit Log API
 * Tests /api/audit-log route handlers for auth and permission requirements
 *
 * Constitution Compliance:
 * - Principle II (Security-First): Verifies auth AND permAuditLog checks
 * - Principle V (RESTful API Standards): Verifies correct status codes
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import {
  createMockSession,
  createLimitedSession,
  createTestRequest,
  mockPrismaData,
} from '../utils/api-test-helpers'

// Mock modules before importing route handlers
vi.mock('@/lib/prisma', () => ({
  prisma: {
    ingredientHistory: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

// Import after mocks are set up
import { GET } from '@/app/api/audit-log/route'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

describe('Audit Log API - /api/audit-log', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/audit-log', () => {
    test('returns 401 when not authenticated', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue(null as unknown as ReturnType<typeof auth>)
      const request = createTestRequest('/api/audit-log') as NextRequest

      // Act
      const response = await GET(request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(body.error).toBe('Unauthorized')
    })

    test('returns 403 when user lacks permAuditLog permission', async () => {
      // Arrange - authenticated but WITHOUT audit log permission
      const session = createLimitedSession({ permAuditLog: false })
      vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
      const request = createTestRequest('/api/audit-log') as NextRequest

      // Act
      const response = await GET(request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(403)
      expect(body.error).toBe('Permission denied')
    })

    test('returns 403 even with other permissions but no permAuditLog', async () => {
      // Arrange - has all permissions EXCEPT audit log
      const session = createMockSession()
      session.user.permAuditLog = false
      vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
      const request = createTestRequest('/api/audit-log') as NextRequest

      // Act
      const response = await GET(request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(403)
      expect(body.error).toBe('Permission denied')
    })

    test('returns audit logs when authenticated with permAuditLog', async () => {
      // Arrange
      const session = createMockSession()
      vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
      vi.mocked(prisma.ingredientHistory.findMany)
        .mockResolvedValueOnce(mockPrismaData.ingredientHistory as never) // logs query
        .mockResolvedValueOnce([{ source: 'sale' }] as never) // sources query
        .mockResolvedValueOnce([{ userId: 1, userName: 'Test Admin' }] as never) // users query
      vi.mocked(prisma.ingredientHistory.count).mockResolvedValue(1)
      const request = createTestRequest('/api/audit-log') as NextRequest

      // Act
      const response = await GET(request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(body).toHaveProperty('logs')
      expect(body).toHaveProperty('total')
      expect(body).toHaveProperty('page')
      expect(body).toHaveProperty('filters')
      expect(Array.isArray(body.logs)).toBe(true)
    })

    test('supports pagination parameters', async () => {
      // Arrange
      const session = createMockSession()
      vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
      vi.mocked(prisma.ingredientHistory.findMany)
        .mockResolvedValueOnce([]) // logs query
        .mockResolvedValueOnce([]) // sources query
        .mockResolvedValueOnce([]) // users query
      vi.mocked(prisma.ingredientHistory.count).mockResolvedValue(100)
      const request = createTestRequest('/api/audit-log', {
        searchParams: { page: '2', limit: '25' },
      }) as NextRequest

      // Act
      const response = await GET(request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(body.page).toBe(2)
      expect(body.limit).toBe(25)
      // Verify skip was calculated correctly for page 2 with limit 25
      expect(prisma.ingredientHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 25, // (page 2 - 1) * limit 25 = 25
          take: 25,
        })
      )
    })

    test('supports filtering by source', async () => {
      // Arrange
      const session = createMockSession()
      vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
      vi.mocked(prisma.ingredientHistory.findMany)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
      vi.mocked(prisma.ingredientHistory.count).mockResolvedValue(0)
      const request = createTestRequest('/api/audit-log', {
        searchParams: { source: 'sale' },
      }) as NextRequest

      // Act
      await GET(request)

      // Assert
      expect(prisma.ingredientHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            source: 'sale',
          }),
        })
      )
    })

    test('supports filtering by userId', async () => {
      // Arrange
      const session = createMockSession()
      vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
      vi.mocked(prisma.ingredientHistory.findMany)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
      vi.mocked(prisma.ingredientHistory.count).mockResolvedValue(0)
      const request = createTestRequest('/api/audit-log', {
        searchParams: { userId: '1' },
      }) as NextRequest

      // Act
      await GET(request)

      // Assert
      expect(prisma.ingredientHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 1,
          }),
        })
      )
    })

    test('supports filtering by date range', async () => {
      // Arrange
      const session = createMockSession()
      vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
      vi.mocked(prisma.ingredientHistory.findMany)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
      vi.mocked(prisma.ingredientHistory.count).mockResolvedValue(0)
      const request = createTestRequest('/api/audit-log', {
        searchParams: {
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
        },
      }) as NextRequest

      // Act
      await GET(request)

      // Assert
      expect(prisma.ingredientHistory.findMany).toHaveBeenCalledWith(
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

    test('handles database errors gracefully', async () => {
      // Arrange
      const session = createMockSession()
      vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
      vi.mocked(prisma.ingredientHistory.findMany).mockRejectedValue(new Error('Database error'))
      const request = createTestRequest('/api/audit-log') as NextRequest

      // Act
      const response = await GET(request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(body.error).toBe('Failed to fetch audit log')
    })
  })
})
