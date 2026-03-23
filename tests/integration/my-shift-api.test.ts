/**
 * Integration Tests: My Shift Portal API
 * Tests /api/my-shift/* route handlers
 *
 * Constitution Compliance:
 * - Principle I (Test-First): Written before implementation
 * - Principle II (Security-First): Verifies auth checks, user-scoped data
 * - Principle V (RESTful API Standards): Verifies correct status codes and response shapes
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import {
  createMockSession,
  createLimitedSession,
  createTestRequest,
} from '../utils/api-test-helpers'

// Mock modules before importing route handlers
vi.mock('@/lib/prisma', () => ({
  prisma: {
    employee: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    shiftLog: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    taskCompletion: {
      count: vi.fn(),
    },
    employeeTask: {
      count: vi.fn(),
    },
    userStreak: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// ──────────────────────────────────────────────
// GET /api/my-shift
// ──────────────────────────────────────────────
describe('GET /api/my-shift', () => {
  let GET: (typeof import('@/app/api/my-shift/route'))['GET']

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('@/app/api/my-shift/route')
    GET = mod.GET
  })

  test('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  test('returns employee: null when user has no linked employee', async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession() as never)
    vi.mocked(prisma.employee.findFirst).mockResolvedValue(null)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.employee).toBeNull()
    expect(body.activeShift).toBeNull()
    expect(body.isStaleShift).toBe(false)
  })

  test('returns employee with no active shift', async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession() as never)
    vi.mocked(prisma.employee.findFirst).mockResolvedValue({
      id: 3,
      firstName: 'Christian',
      lastName: 'Pats',
      position: 'Line Cook',
      hourlyRate: 15.0,
      employmentStatus: 'Active',
    } as never)
    vi.mocked(prisma.shiftLog.findFirst).mockResolvedValue(null)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.employee.id).toBe(3)
    expect(body.employee.firstName).toBe('Christian')
    expect(body.activeShift).toBeNull()
    expect(body.isStaleShift).toBe(false)
  })

  test('returns employee with active shift (today)', async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession() as never)
    vi.mocked(prisma.employee.findFirst).mockResolvedValue({
      id: 3,
      firstName: 'Christian',
      lastName: 'Pats',
      position: 'Line Cook',
      hourlyRate: 15.0,
      employmentStatus: 'Active',
    } as never)

    const todayClockIn = new Date()
    todayClockIn.setHours(8, 0, 0, 0)

    vi.mocked(prisma.shiftLog.findFirst).mockResolvedValue({
      id: 42,
      employeeId: 3,
      clockIn: todayClockIn,
      clockOut: null,
      shiftTemplate: { name: 'Morning', color: '#3B82F6' },
      notes: '',
    } as never)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.activeShift).not.toBeNull()
    expect(body.activeShift.id).toBe(42)
    expect(body.isStaleShift).toBe(false)
  })

  test('returns isStaleShift: true when active shift is from a previous day', async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession() as never)
    vi.mocked(prisma.employee.findFirst).mockResolvedValue({
      id: 3,
      firstName: 'Christian',
      lastName: 'Pats',
      position: 'Line Cook',
      hourlyRate: 15.0,
      employmentStatus: 'Active',
    } as never)

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(17, 0, 0, 0)

    vi.mocked(prisma.shiftLog.findFirst).mockResolvedValue({
      id: 41,
      employeeId: 3,
      clockIn: yesterday,
      clockOut: null,
      shiftTemplate: null,
      notes: '',
    } as never)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.activeShift.id).toBe(41)
    expect(body.isStaleShift).toBe(true)
  })
})

// ──────────────────────────────────────────────
// POST /api/my-shift/clock-in
// ──────────────────────────────────────────────
describe('POST /api/my-shift/clock-in', () => {
  let POST: (typeof import('@/app/api/my-shift/clock-in/route'))['POST']

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('@/app/api/my-shift/clock-in/route')
    POST = mod.POST
  })

  test('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    const request = createTestRequest('/api/my-shift/clock-in', { method: 'POST' })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  test('returns 404 when user has no linked employee', async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession() as never)
    vi.mocked(prisma.employee.findFirst).mockResolvedValue(null)
    const request = createTestRequest('/api/my-shift/clock-in', { method: 'POST' })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe('No linked employee record')
  })

  test('returns 400 when already clocked in', async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession() as never)
    vi.mocked(prisma.employee.findFirst).mockResolvedValue({ id: 3 } as never)
    vi.mocked(prisma.shiftLog.findFirst).mockResolvedValue({
      id: 42,
      clockIn: new Date(),
      clockOut: null,
    } as never)
    const request = createTestRequest('/api/my-shift/clock-in', { method: 'POST' })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Already clocked in')
  })

  test('returns 400 when stale shift exists', async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession() as never)
    vi.mocked(prisma.employee.findFirst).mockResolvedValue({ id: 3 } as never)

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    vi.mocked(prisma.shiftLog.findFirst).mockResolvedValue({
      id: 41,
      clockIn: yesterday,
      clockOut: null,
    } as never)
    const request = createTestRequest('/api/my-shift/clock-in', { method: 'POST' })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Must close stale shift before clocking in')
  })

  test('returns 201 on successful clock-in', async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession() as never)
    vi.mocked(prisma.employee.findFirst).mockResolvedValue({ id: 3 } as never)
    vi.mocked(prisma.shiftLog.findFirst).mockResolvedValue(null)

    const createdShift = {
      id: 43,
      employeeId: 3,
      date: new Date(),
      clockIn: new Date(),
      clockOut: null,
      breakMinutes: 0,
      notes: '',
    }
    vi.mocked(prisma.shiftLog.create).mockResolvedValue(createdShift as never)

    const request = createTestRequest('/api/my-shift/clock-in', {
      method: 'POST',
      body: { notes: 'Opening shift' },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.id).toBe(43)
    expect(body.employeeId).toBe(3)
  })
})

// ──────────────────────────────────────────────
// POST /api/my-shift/clock-out
// ──────────────────────────────────────────────
describe('POST /api/my-shift/clock-out', () => {
  let POST: (typeof import('@/app/api/my-shift/clock-out/route'))['POST']

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('@/app/api/my-shift/clock-out/route')
    POST = mod.POST
  })

  test('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    const request = createTestRequest('/api/my-shift/clock-out', { method: 'POST' })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  test('returns 404 when user has no linked employee', async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession() as never)
    vi.mocked(prisma.employee.findFirst).mockResolvedValue(null)
    const request = createTestRequest('/api/my-shift/clock-out', { method: 'POST' })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe('No linked employee record')
  })

  test('returns 400 when not clocked in', async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession() as never)
    vi.mocked(prisma.employee.findFirst).mockResolvedValue({ id: 3 } as never)
    vi.mocked(prisma.shiftLog.findFirst).mockResolvedValue(null)
    const request = createTestRequest('/api/my-shift/clock-out', { method: 'POST' })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Not clocked in')
  })

  test('returns 200 on successful clock-out with summary', async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession() as never)
    vi.mocked(prisma.employee.findFirst).mockResolvedValue({ id: 3 } as never)

    const clockIn = new Date()
    clockIn.setHours(clockIn.getHours() - 8)

    vi.mocked(prisma.shiftLog.findFirst).mockResolvedValue({
      id: 43,
      employeeId: 3,
      clockIn,
      clockOut: null,
      breakMinutes: 0,
    } as never)

    vi.mocked(prisma.shiftLog.update).mockResolvedValue({
      id: 43,
      employeeId: 3,
      clockIn,
      clockOut: new Date(),
      breakMinutes: 0,
    } as never)

    vi.mocked(prisma.taskCompletion.count).mockResolvedValue(5)
    vi.mocked(prisma.employeeTask.count).mockResolvedValue(7)
    vi.mocked(prisma.userStreak.findUnique).mockResolvedValue({
      currentStreak: 12,
    } as never)

    const request = createTestRequest('/api/my-shift/clock-out', { method: 'POST' })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.shift).toBeDefined()
    expect(body.shift.id).toBe(43)
    expect(typeof body.shift.hoursWorked).toBe('number')
    expect(body.summary).toBeDefined()
    expect(body.summary.tasksCompletedToday).toBe(5)
    expect(body.summary.tasksTotal).toBe(7)
    expect(body.summary.currentStreak).toBe(12)
  })

  test('handles midnight-spanning shifts correctly (hours > 0)', async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession() as never)
    vi.mocked(prisma.employee.findFirst).mockResolvedValue({ id: 3 } as never)

    // Clock in at 10pm yesterday — ensures midnight crossing
    const clockIn = new Date()
    clockIn.setDate(clockIn.getDate() - 1)
    clockIn.setHours(22, 0, 0, 0)

    vi.mocked(prisma.shiftLog.findFirst).mockResolvedValue({
      id: 44,
      employeeId: 3,
      clockIn,
      clockOut: null,
      breakMinutes: 0,
      notes: '',
    } as never)

    vi.mocked(prisma.shiftLog.update).mockResolvedValue({
      id: 44,
      employeeId: 3,
      clockIn,
      clockOut: new Date(),
      breakMinutes: 0,
    } as never)

    vi.mocked(prisma.taskCompletion.count).mockResolvedValue(0)
    vi.mocked(prisma.employeeTask.count).mockResolvedValue(0)
    vi.mocked(prisma.userStreak.findUnique).mockResolvedValue(null)

    const request = createTestRequest('/api/my-shift/clock-out', { method: 'POST' })
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    // Clock-out uses Date.now() — hours should be positive and > 0
    // (clockIn was yesterday 10pm, now is today — must be > 2 hours at minimum)
    expect(body.shift.hoursWorked).toBeGreaterThan(0)
  })
})

// ──────────────────────────────────────────────
// PATCH /api/my-shift/close-stale
// ──────────────────────────────────────────────
describe('PATCH /api/my-shift/close-stale', () => {
  let PATCH: (typeof import('@/app/api/my-shift/close-stale/route'))['PATCH']

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('@/app/api/my-shift/close-stale/route')
    PATCH = mod.PATCH
  })

  test('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    const request = createTestRequest('/api/my-shift/close-stale', {
      method: 'PATCH',
      body: { clockOutTime: new Date().toISOString() },
    })

    const response = await PATCH(request)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  test('returns 404 when user has no linked employee', async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession() as never)
    vi.mocked(prisma.employee.findFirst).mockResolvedValue(null)
    const request = createTestRequest('/api/my-shift/close-stale', {
      method: 'PATCH',
      body: { clockOutTime: new Date().toISOString() },
    })

    const response = await PATCH(request)
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe('No linked employee record')
  })

  test('returns 400 when no stale shift exists', async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession() as never)
    vi.mocked(prisma.employee.findFirst).mockResolvedValue({ id: 3 } as never)
    vi.mocked(prisma.shiftLog.findFirst).mockResolvedValue(null)
    const request = createTestRequest('/api/my-shift/close-stale', {
      method: 'PATCH',
      body: { clockOutTime: new Date().toISOString() },
    })

    const response = await PATCH(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('No stale shift found')
  })

  test('returns 400 when clockOutTime is before clockIn', async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession() as never)
    vi.mocked(prisma.employee.findFirst).mockResolvedValue({ id: 3 } as never)

    const clockIn = new Date('2026-03-22T17:00:00.000Z')
    vi.mocked(prisma.shiftLog.findFirst).mockResolvedValue({
      id: 41,
      clockIn,
      clockOut: null,
    } as never)

    const request = createTestRequest('/api/my-shift/close-stale', {
      method: 'PATCH',
      body: { clockOutTime: '2026-03-22T16:00:00.000Z' },
    })

    const response = await PATCH(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Clock out time must be after clock in time')
  })

  test('returns 400 when clockOutTime is in the future', async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession() as never)
    vi.mocked(prisma.employee.findFirst).mockResolvedValue({ id: 3 } as never)

    const clockIn = new Date('2026-03-22T17:00:00.000Z')
    vi.mocked(prisma.shiftLog.findFirst).mockResolvedValue({
      id: 41,
      clockIn,
      clockOut: null,
    } as never)

    const futureTime = new Date()
    futureTime.setDate(futureTime.getDate() + 1)

    const request = createTestRequest('/api/my-shift/close-stale', {
      method: 'PATCH',
      body: { clockOutTime: futureTime.toISOString() },
    })

    const response = await PATCH(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain('future')
  })

  test('returns 200 on successful stale shift close', async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession() as never)
    vi.mocked(prisma.employee.findFirst).mockResolvedValue({ id: 3 } as never)

    const clockIn = new Date('2026-03-22T17:00:00.000Z')
    const clockOutTime = '2026-03-22T22:30:00.000Z'

    vi.mocked(prisma.shiftLog.findFirst).mockResolvedValue({
      id: 41,
      clockIn,
      clockOut: null,
    } as never)

    vi.mocked(prisma.shiftLog.update).mockResolvedValue({
      id: 41,
      clockIn,
      clockOut: new Date(clockOutTime),
    } as never)

    const request = createTestRequest('/api/my-shift/close-stale', {
      method: 'PATCH',
      body: { clockOutTime },
    })

    const response = await PATCH(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.id).toBe(41)
    expect(typeof body.hoursWorked).toBe('number')
    expect(body.hoursWorked).toBeCloseTo(5.5, 1)
  })
})

// ──────────────────────────────────────────────
// GET /api/employees/[id]/shifts — pagination
// ──────────────────────────────────────────────
describe('GET /api/employees/[id]/shifts — pagination', () => {
  let GET: (typeof import('@/app/api/employees/[id]/shifts/route'))['GET']

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('@/app/api/employees/[id]/shifts/route')
    GET = mod.GET
  })

  test('returns paginated response with cursor and take', async () => {
    const shifts = Array.from({ length: 11 }, (_, i) => ({
      id: 50 - i,
      employeeId: 3,
      date: new Date(),
      clockIn: new Date(),
      clockOut: new Date(),
      breakMinutes: 0,
      notes: '',
      shiftTemplate: null,
    }))

    vi.mocked(prisma.shiftLog.findMany).mockResolvedValue(shifts as never)

    const request = createTestRequest('/api/employees/3/shifts', {
      searchParams: { take: '10' },
    })

    const response = await GET(request, { params: Promise.resolve({ id: '3' }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.shifts).toBeDefined()
    expect(body.hasMore).toBe(true)
    expect(body.nextCursor).toBeDefined()
  })

  test('returns flat array when no pagination params (backward-compatible)', async () => {
    const shifts = [
      { id: 1, employeeId: 3, date: new Date(), clockIn: new Date(), clockOut: new Date() },
    ]
    vi.mocked(prisma.shiftLog.findMany).mockResolvedValue(shifts as never)

    const request = createTestRequest('/api/employees/3/shifts')

    const response = await GET(request, { params: Promise.resolve({ id: '3' }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(Array.isArray(body)).toBe(true)
  })

  test('returns hasMore: false on last page', async () => {
    const shifts = Array.from({ length: 5 }, (_, i) => ({
      id: 10 - i,
      employeeId: 3,
      date: new Date(),
      clockIn: new Date(),
      clockOut: new Date(),
      breakMinutes: 0,
      notes: '',
      shiftTemplate: null,
    }))

    vi.mocked(prisma.shiftLog.findMany).mockResolvedValue(shifts as never)

    const request = createTestRequest('/api/employees/3/shifts', {
      searchParams: { take: '10' },
    })

    const response = await GET(request, { params: Promise.resolve({ id: '3' }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.hasMore).toBe(false)
  })
})
