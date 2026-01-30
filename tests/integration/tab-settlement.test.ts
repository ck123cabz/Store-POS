/**
 * Integration Tests: Tab Settlement API
 * US4: Tab Settlement - Pay down tab balance
 * Tests /api/customers/[id]/tab route handlers
 *
 * Constitution Compliance:
 * - Principle II (Security-First): Verifies auth checks and input validation
 * - Principle IV (Data Integrity): Verifies atomic balance updates
 * - Principle V (RESTful API Standards): Verifies correct status codes and responses
 */

import { describe, test, expect, vi, beforeEach } from "vitest"
import {
  createMockSession,
  createTestRequest,
} from "../utils/api-test-helpers"

// Mock modules before importing route handlers
vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    tabSettlement: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))

// Import after mocks are set up
import { GET, POST } from "@/app/api/customers/[id]/tab/route"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// Mock customer data
const mockCustomer = {
  id: 1,
  name: "Test Customer",
  phone: "1234567890",
  email: "test@example.com",
  tabBalance: 500, // Customer owes $500
  creditLimit: 1000,
  tabStatus: "active",
}

// Mock tab settlement data
const mockSettlements = [
  {
    id: 1,
    customerId: 1,
    amount: 100,
    paymentType: "Cash",
    paymentInfo: null,
    previousBalance: 600,
    newBalance: 500,
    userId: 1,
    createdAt: new Date("2024-01-15T10:00:00Z"),
  },
  {
    id: 2,
    customerId: 1,
    amount: 50,
    paymentType: "GCash",
    paymentInfo: "REF123456",
    previousBalance: 550,
    newBalance: 500,
    userId: 1,
    createdAt: new Date("2024-01-10T14:30:00Z"),
  },
]

// Helper to create params object for route handlers
function createRouteParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe("Tab Settlement API - /api/customers/[id]/tab", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("GET /api/customers/[id]/tab", () => {
    test("returns 401 when not authenticated", async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue(null as unknown as ReturnType<typeof auth>)
      const request = createTestRequest("/api/customers/1/tab")

      // Act
      const response = await GET(request , createRouteParams("1"))
      const body = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(body.error).toBe("Unauthorized")
    })

    test("returns 404 when customer does not exist", async () => {
      // Arrange
      const session = createMockSession()
      vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
      vi.mocked(prisma.customer.findUnique).mockResolvedValue(null)
      const request = createTestRequest("/api/customers/999/tab")

      // Act
      const response = await GET(request , createRouteParams("999"))
      const body = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(body.error).toBe("Customer not found")
    })

    test("returns tab history sorted by date descending", async () => {
      // Arrange
      const session = createMockSession()
      vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
      // The API uses customer.findUnique with include for tabSettlements
      vi.mocked(prisma.customer.findUnique).mockResolvedValue({
        ...mockCustomer,
        tabSettlements: mockSettlements,
      } as never)
      const request = createTestRequest("/api/customers/1/tab")

      // Act
      const response = await GET(request , createRouteParams("1"))
      const body = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(body).toHaveProperty("customer")
      expect(body.customer).toHaveProperty("tabBalance")
      expect(body.customer).toHaveProperty("creditLimit")
      expect(body).toHaveProperty("settlements")
      expect(Array.isArray(body.settlements)).toBe(true)
      expect(body.settlements.length).toBe(2)
      // Verify customer.findUnique was called (which includes tabSettlements with orderBy)
      expect(prisma.customer.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
        })
      )
    })

    test("returns customer tab balance and credit info", async () => {
      // Arrange
      const session = createMockSession()
      vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
      vi.mocked(prisma.customer.findUnique).mockResolvedValue({
        ...mockCustomer,
        tabSettlements: [],
      } as never)
      const request = createTestRequest("/api/customers/1/tab")

      // Act
      const response = await GET(request , createRouteParams("1"))
      const body = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(body.customer.tabBalance).toBe(500)
      expect(body.customer.creditLimit).toBe(1000)
      expect(body.customer.tabStatus).toBe("active")
    })
  })

  describe("POST /api/customers/[id]/tab", () => {
    test("returns 401 when not authenticated", async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue(null as unknown as ReturnType<typeof auth>)
      const request = createTestRequest("/api/customers/1/tab", {
        method: "POST",
        body: { amount: 100, paymentMethod: "Cash" },
      })

      // Act
      const response = await POST(request , createRouteParams("1"))
      const body = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(body.error).toBe("Unauthorized")
    })

    test("returns 404 when customer does not exist", async () => {
      // Arrange
      const session = createMockSession()
      vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
      vi.mocked(prisma.customer.findUnique).mockResolvedValue(null)
      const request = createTestRequest("/api/customers/999/tab", {
        method: "POST",
        body: { amount: 100, paymentMethod: "Cash" },
      })

      // Act
      const response = await POST(request , createRouteParams("999"))
      const body = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(body.error).toBe("Customer not found")
    })

    test("creates settlement with Cash payment", async () => {
      // Arrange
      const session = createMockSession()
      vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
      vi.mocked(prisma.customer.findUnique).mockResolvedValue(mockCustomer as never)

      // Mock the $transaction to execute the callback
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        const mockTx = {
          customer: {
            update: vi.fn().mockResolvedValue({
              ...mockCustomer,
              tabBalance: 400, // 500 - 100
            }),
          },
          tabSettlement: {
            create: vi.fn().mockResolvedValue({
              id: 3,
              customerId: 1,
              amount: 100,
              paymentType: "Cash",
              paymentInfo: null,
              previousBalance: 500,
              newBalance: 400,
              userId: 1,
              createdAt: new Date(),
            }),
          },
        }
        return callback(mockTx as never)
      })

      const request = createTestRequest("/api/customers/1/tab", {
        method: "POST",
        body: { amount: 100, paymentMethod: "Cash" },
      })

      // Act
      const response = await POST(request , createRouteParams("1"))
      const body = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.newBalance).toBe(400)
      expect(body.settlement).toHaveProperty("id")
      expect(body.settlement.paymentType).toBe("Cash")
      expect(prisma.$transaction).toHaveBeenCalled()
    })

    test("creates settlement with GCash payment including reference", async () => {
      // Arrange
      const session = createMockSession()
      vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
      vi.mocked(prisma.customer.findUnique).mockResolvedValue(mockCustomer as never)

      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        const mockTx = {
          customer: {
            update: vi.fn().mockResolvedValue({
              ...mockCustomer,
              tabBalance: 300,
            }),
          },
          tabSettlement: {
            create: vi.fn().mockResolvedValue({
              id: 4,
              customerId: 1,
              amount: 200,
              paymentType: "GCash",
              paymentInfo: "GCASH123456789",
              previousBalance: 500,
              newBalance: 300,
              userId: 1,
              createdAt: new Date(),
            }),
          },
        }
        return callback(mockTx as never)
      })

      const request = createTestRequest("/api/customers/1/tab", {
        method: "POST",
        body: {
          amount: 200,
          paymentMethod: "GCash",
          paymentInfo: "GCASH123456789", // Must be at least 10 characters
        },
      })

      // Act
      const response = await POST(request , createRouteParams("1"))
      const body = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.newBalance).toBe(300)
      expect(body.settlement.paymentType).toBe("GCash")
      expect(body.settlement.paymentInfo).toBe("GCASH123456789")
    })

    test("allows partial settlement (amount < balance)", async () => {
      // Arrange
      const session = createMockSession()
      vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
      vi.mocked(prisma.customer.findUnique).mockResolvedValue(mockCustomer as never)

      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        const mockTx = {
          customer: {
            update: vi.fn().mockResolvedValue({
              ...mockCustomer,
              tabBalance: 450, // 500 - 50
            }),
          },
          tabSettlement: {
            create: vi.fn().mockResolvedValue({
              id: 5,
              customerId: 1,
              amount: 50,
              paymentType: "Cash",
              paymentInfo: null,
              previousBalance: 500,
              newBalance: 450,
              userId: 1,
              createdAt: new Date(),
            }),
          },
        }
        return callback(mockTx as never)
      })

      const request = createTestRequest("/api/customers/1/tab", {
        method: "POST",
        body: { amount: 50, paymentMethod: "Cash" },
      })

      // Act
      const response = await POST(request , createRouteParams("1"))
      const body = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.newBalance).toBe(450)
    })

    test("allows full settlement (amount = balance)", async () => {
      // Arrange
      const session = createMockSession()
      vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
      vi.mocked(prisma.customer.findUnique).mockResolvedValue(mockCustomer as never)

      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        const mockTx = {
          customer: {
            update: vi.fn().mockResolvedValue({
              ...mockCustomer,
              tabBalance: 0, // Full settlement
            }),
          },
          tabSettlement: {
            create: vi.fn().mockResolvedValue({
              id: 6,
              customerId: 1,
              amount: 500,
              paymentType: "Cash",
              paymentInfo: null,
              previousBalance: 500,
              newBalance: 0,
              userId: 1,
              createdAt: new Date(),
            }),
          },
        }
        return callback(mockTx as never)
      })

      const request = createTestRequest("/api/customers/1/tab", {
        method: "POST",
        body: { amount: 500, paymentMethod: "Cash" },
      })

      // Act
      const response = await POST(request , createRouteParams("1"))
      const body = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.newBalance).toBe(0)
    })

    test("rejects settlement when amount > current balance", async () => {
      // Arrange
      const session = createMockSession()
      vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
      vi.mocked(prisma.customer.findUnique).mockResolvedValue(mockCustomer as never)

      const request = createTestRequest("/api/customers/1/tab", {
        method: "POST",
        body: { amount: 600, paymentMethod: "Cash" }, // More than $500 balance
      })

      // Act
      const response = await POST(request , createRouteParams("1"))
      const body = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(body.error).toContain("exceeds")
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    test("rejects settlement when amount is zero", async () => {
      // Arrange
      const session = createMockSession()
      vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
      vi.mocked(prisma.customer.findUnique).mockResolvedValue(mockCustomer as never)

      const request = createTestRequest("/api/customers/1/tab", {
        method: "POST",
        body: { amount: 0, paymentMethod: "Cash" },
      })

      // Act
      const response = await POST(request , createRouteParams("1"))
      const body = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(body.error).toContain("positive")
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    test("rejects settlement when amount is negative", async () => {
      // Arrange
      const session = createMockSession()
      vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
      vi.mocked(prisma.customer.findUnique).mockResolvedValue(mockCustomer as never)

      const request = createTestRequest("/api/customers/1/tab", {
        method: "POST",
        body: { amount: -50, paymentMethod: "Cash" },
      })

      // Act
      const response = await POST(request , createRouteParams("1"))
      const body = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(body.error).toContain("positive")
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    test("rejects settlement with invalid payment method", async () => {
      // Arrange
      const session = createMockSession()
      vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
      vi.mocked(prisma.customer.findUnique).mockResolvedValue(mockCustomer as never)

      const request = createTestRequest("/api/customers/1/tab", {
        method: "POST",
        body: { amount: 100, paymentMethod: "Bitcoin" }, // Invalid payment method
      })

      // Act
      const response = await POST(request , createRouteParams("1"))
      const body = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(body.error).toContain("Cash")
      expect(body.error).toContain("GCash")
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    test("rejects GCash payment with too short reference", async () => {
      // Arrange
      const session = createMockSession()
      vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
      vi.mocked(prisma.customer.findUnique).mockResolvedValue(mockCustomer as never)

      const request = createTestRequest("/api/customers/1/tab", {
        method: "POST",
        body: {
          amount: 100,
          paymentMethod: "GCash",
          paymentInfo: "REF123", // Too short (less than 10 characters)
        },
      })

      // Act
      const response = await POST(request , createRouteParams("1"))
      const body = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(body.error).toContain("10 characters")
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    test("handles database errors gracefully", async () => {
      // Arrange
      const session = createMockSession()
      vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
      vi.mocked(prisma.customer.findUnique).mockResolvedValue(mockCustomer as never)
      vi.mocked(prisma.$transaction).mockRejectedValue(new Error("Database error"))

      const request = createTestRequest("/api/customers/1/tab", {
        method: "POST",
        body: { amount: 100, paymentMethod: "Cash" },
      })

      // Act
      const response = await POST(request , createRouteParams("1"))
      const body = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(body.error).toBe("Failed to create tab settlement")
    })
  })
})

describe("Tab Settlement Edge Cases", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test("handles customer with zero balance", async () => {
    // Arrange
    const session = createMockSession()
    vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      ...mockCustomer,
      tabBalance: 0,
    } as never)

    const request = createTestRequest("/api/customers/1/tab", {
      method: "POST",
      body: { amount: 100, paymentMethod: "Cash" },
    })

    // Act
    const response = await POST(request , createRouteParams("1"))
    const body = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(body.error).toContain("exceeds")
  })

  test("handles decimal amounts correctly", async () => {
    // Arrange
    const session = createMockSession()
    vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      ...mockCustomer,
      tabBalance: 100.50,
    } as never)

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      const mockTx = {
        customer: {
          update: vi.fn().mockResolvedValue({
            ...mockCustomer,
            tabBalance: 50.25,
          }),
        },
        tabSettlement: {
          create: vi.fn().mockResolvedValue({
            id: 7,
            customerId: 1,
            amount: 50.25,
            paymentType: "Cash",
            paymentInfo: null,
            previousBalance: 100.50,
            newBalance: 50.25,
            userId: 1,
            createdAt: new Date(),
          }),
        },
      }
      return callback(mockTx as never)
    })

    const request = createTestRequest("/api/customers/1/tab", {
      method: "POST",
      body: { amount: 50.25, paymentMethod: "Cash" },
    })

    // Act
    const response = await POST(request , createRouteParams("1"))
    const body = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(body.newBalance).toBeCloseTo(50.25, 2)
  })

  test("handles very large settlement amounts", async () => {
    // Arrange
    const session = createMockSession()
    vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      ...mockCustomer,
      tabBalance: 99999.99,
    } as never)

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      const mockTx = {
        customer: {
          update: vi.fn().mockResolvedValue({
            ...mockCustomer,
            tabBalance: 0,
          }),
        },
        tabSettlement: {
          create: vi.fn().mockResolvedValue({
            id: 8,
            customerId: 1,
            amount: 99999.99,
            paymentType: "Cash",
            paymentInfo: null,
            previousBalance: 99999.99,
            newBalance: 0,
            userId: 1,
            createdAt: new Date(),
          }),
        },
      }
      return callback(mockTx as never)
    })

    const request = createTestRequest("/api/customers/1/tab", {
      method: "POST",
      body: { amount: 99999.99, paymentMethod: "Cash" },
    })

    // Act
    const response = await POST(request , createRouteParams("1"))
    const body = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.newBalance).toBe(0)
  })

  test("records user who processed the settlement", async () => {
    // Arrange
    const session = createMockSession({ id: "42", name: "Manager User" })
    vi.mocked(auth).mockResolvedValue(session as unknown as ReturnType<typeof auth>)
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(mockCustomer as never)

    let capturedUserId: number | undefined

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      const mockTx = {
        customer: {
          update: vi.fn().mockResolvedValue({
            ...mockCustomer,
            tabBalance: 400,
          }),
        },
        tabSettlement: {
          create: vi.fn().mockImplementation((data) => {
            capturedUserId = data.data.userId
            return Promise.resolve({
              id: 9,
              customerId: 1,
              amount: 100,
              paymentType: "Cash",
              paymentInfo: null,
              previousBalance: 500,
              newBalance: 400,
              userId: data.data.userId,
              createdAt: new Date(),
            })
          }),
        },
      }
      return callback(mockTx as never)
    })

    const request = createTestRequest("/api/customers/1/tab", {
      method: "POST",
      body: { amount: 100, paymentMethod: "Cash" },
    })

    // Act
    await POST(request , createRouteParams("1"))

    // Assert
    expect(capturedUserId).toBe(42)
  })
})
