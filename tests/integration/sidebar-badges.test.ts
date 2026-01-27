import { describe, it, expect, beforeEach, vi } from "vitest"
import { NextRequest } from "next/server"
import { createMockSession, resetMocks } from "../utils/api-test-helpers"

/**
 * Integration tests for /api/sidebar-badges endpoint
 * Tests: T036, T037, T038, T039
 */
describe("/api/sidebar-badges", () => {
  beforeEach(() => {
    resetMocks()
  })

  describe("authentication (T037)", () => {
    it("returns 401 when not authenticated", async () => {
      // Mock auth to return null (not authenticated)
      vi.doMock("@/lib/auth", () => ({
        auth: vi.fn().mockResolvedValue(null),
      }))

      // Mock prisma
      vi.doMock("@/lib/prisma", () => ({
        prisma: {},
      }))

      // Import after mocking
      const { GET } = await import("@/app/api/sidebar-badges/route")
      const res = await GET()

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe(true)
      expect(data.message).toBe("Unauthorized")
    })
  })

  describe("badge counts (T036)", () => {
    it("returns correct structure when authenticated", async () => {
      const session = createMockSession()

      // Mock auth
      vi.doMock("@/lib/auth", () => ({
        auth: vi.fn().mockResolvedValue(session),
      }))

      // Mock prisma with test data
      vi.doMock("@/lib/prisma", () => ({
        prisma: {
          $queryRaw: vi.fn().mockResolvedValue([{ count: BigInt(3) }]),
          product: {
            count: vi.fn().mockResolvedValue(2),
          },
          employeeTask: {
            count: vi.fn().mockResolvedValue(7),
          },
          taskCompletion: {
            count: vi.fn().mockResolvedValue(4),
          },
        },
      }))

      const { GET } = await import("@/app/api/sidebar-badges/route")
      const res = await GET()

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveProperty("lowStockIngredients")
      expect(data).toHaveProperty("needsPricingProducts")
      expect(data).toHaveProperty("taskProgress")
      expect(data.taskProgress).toHaveProperty("completed")
      expect(data.taskProgress).toHaveProperty("total")
    })

    it("returns integer counts >= 0", async () => {
      const session = createMockSession()

      vi.doMock("@/lib/auth", () => ({
        auth: vi.fn().mockResolvedValue(session),
      }))

      vi.doMock("@/lib/prisma", () => ({
        prisma: {
          $queryRaw: vi.fn().mockResolvedValue([{ count: BigInt(5) }]),
          product: {
            count: vi.fn().mockResolvedValue(3),
          },
          employeeTask: {
            count: vi.fn().mockResolvedValue(10),
          },
          taskCompletion: {
            count: vi.fn().mockResolvedValue(6),
          },
        },
      }))

      const { GET } = await import("@/app/api/sidebar-badges/route")
      const res = await GET()
      const data = await res.json()

      expect(typeof data.lowStockIngredients).toBe("number")
      expect(typeof data.needsPricingProducts).toBe("number")
      expect(typeof data.taskProgress.completed).toBe("number")
      expect(typeof data.taskProgress.total).toBe("number")

      expect(data.lowStockIngredients).toBeGreaterThanOrEqual(0)
      expect(data.needsPricingProducts).toBeGreaterThanOrEqual(0)
      expect(data.taskProgress.completed).toBeGreaterThanOrEqual(0)
      expect(data.taskProgress.total).toBeGreaterThanOrEqual(0)
    })
  })

  describe("edge case: high counts (T038)", () => {
    it("handles counts over 99 gracefully at API level", async () => {
      const session = createMockSession()

      vi.doMock("@/lib/auth", () => ({
        auth: vi.fn().mockResolvedValue(session),
      }))

      vi.doMock("@/lib/prisma", () => ({
        prisma: {
          $queryRaw: vi.fn().mockResolvedValue([{ count: BigInt(150) }]),
          product: {
            count: vi.fn().mockResolvedValue(200),
          },
          employeeTask: {
            count: vi.fn().mockResolvedValue(50),
          },
          taskCompletion: {
            count: vi.fn().mockResolvedValue(10),
          },
        },
      }))

      const { GET } = await import("@/app/api/sidebar-badges/route")
      const res = await GET()
      const data = await res.json()

      // API should return actual numbers, not formatted strings
      expect(Number.isInteger(data.lowStockIngredients)).toBe(true)
      expect(Number.isInteger(data.needsPricingProducts)).toBe(true)
      expect(data.lowStockIngredients).toBe(150)
      expect(data.needsPricingProducts).toBe(200)
    })
  })

  describe("edge case: zero counts (T039)", () => {
    it("returns 0 when no items need attention", async () => {
      const session = createMockSession()

      vi.doMock("@/lib/auth", () => ({
        auth: vi.fn().mockResolvedValue(session),
      }))

      vi.doMock("@/lib/prisma", () => ({
        prisma: {
          $queryRaw: vi.fn().mockResolvedValue([{ count: BigInt(0) }]),
          product: {
            count: vi.fn().mockResolvedValue(0),
          },
          employeeTask: {
            count: vi.fn().mockResolvedValue(5),
          },
          taskCompletion: {
            count: vi.fn().mockResolvedValue(5),
          },
        },
      }))

      const { GET } = await import("@/app/api/sidebar-badges/route")
      const res = await GET()
      const data = await res.json()

      expect(data.lowStockIngredients).toBe(0)
      expect(data.needsPricingProducts).toBe(0)
      expect(data.taskProgress.completed).toBe(5)
      expect(data.taskProgress.total).toBe(5)
    })
  })
})
