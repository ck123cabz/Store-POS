import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useWorkspacePolling } from "@/hooks/use-workspace-polling"

// Helper: advance timers and flush all pending microtasks
async function flushPromises() {
  await vi.advanceTimersByTimeAsync(0)
}

describe("useWorkspacePolling", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("fetches data on mount and sets loading to false", async () => {
    const mockData = { count: 42 }
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response)

    const { result } = renderHook(() =>
      useWorkspacePolling<{ count: number }>({ url: "/api/test" })
    )

    expect(result.current.loading).toBe(true)

    await act(async () => {
      await flushPromises()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.data).toEqual(mockData)
    expect(result.current.error).toBeNull()
  })

  it("polls every 30 seconds", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: 1 }),
    } as Response)

    renderHook(() =>
      useWorkspacePolling<{ value: number }>({ url: "/api/test" })
    )

    // Initial fetch
    await act(async () => { await flushPromises() })
    expect(fetch).toHaveBeenCalledTimes(1)

    // Advance 30s → second poll
    await act(async () => { await vi.advanceTimersByTimeAsync(30000) })
    expect(fetch).toHaveBeenCalledTimes(2)

    // Advance 30s → third poll
    await act(async () => { await vi.advanceTimersByTimeAsync(30000) })
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it("pauses polling when document is hidden", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: 1 }),
    } as Response)

    renderHook(() =>
      useWorkspacePolling<{ value: number }>({ url: "/api/test" })
    )

    await act(async () => { await flushPromises() })
    expect(fetch).toHaveBeenCalledTimes(1)

    // Simulate hiding the document
    Object.defineProperty(document, "hidden", { value: true, writable: true })
    document.dispatchEvent(new Event("visibilitychange"))

    await act(async () => { await vi.advanceTimersByTimeAsync(30000) })
    // Should not have polled while hidden
    expect(fetch).toHaveBeenCalledTimes(1)

    // Simulate showing the document again — triggers immediate fetch
    Object.defineProperty(document, "hidden", { value: false, writable: true })
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"))
      await flushPromises()
    })

    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it("stops polling after 3 consecutive failures (circuit breaker)", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: false, status: 500 } as Response)
      .mockResolvedValueOnce({ ok: false, status: 500 } as Response)
      .mockResolvedValueOnce({ ok: false, status: 500 } as Response)
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ value: 1 }),
      } as Response)

    renderHook(() =>
      useWorkspacePolling<{ value: number }>({ url: "/api/test" })
    )

    // Initial fetch (failure 1)
    await act(async () => { await flushPromises() })
    expect(fetch).toHaveBeenCalledTimes(1)

    // Failure 2
    await act(async () => { await vi.advanceTimersByTimeAsync(30000) })
    expect(fetch).toHaveBeenCalledTimes(2)

    // Failure 3 — circuit breaker trips
    await act(async () => { await vi.advanceTimersByTimeAsync(30000) })
    expect(fetch).toHaveBeenCalledTimes(3)

    // Should NOT fetch again — circuit breaker is open
    await act(async () => { await vi.advanceTimersByTimeAsync(30000) })
    // Fetch is still called by setInterval, but fetchData returns early
    // The key assertion: no *successful* fetch will happen
    // Check that the 4th call was made but returned early due to circuit breaker
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it("does not fetch when enabled is false", async () => {
    renderHook(() =>
      useWorkspacePolling<{ value: number }>({ url: "/api/test", enabled: false })
    )

    await act(async () => { await vi.advanceTimersByTimeAsync(1000) })

    expect(fetch).not.toHaveBeenCalled()
  })

  it("resets failure count on successful fetch", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: false, status: 500 } as Response)
      .mockResolvedValueOnce({ ok: false, status: 500 } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ value: 1 }),
      } as Response)
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ value: 2 }),
      } as Response)

    renderHook(() =>
      useWorkspacePolling<{ value: number }>({ url: "/api/test" })
    )

    // Failure 1
    await act(async () => { await flushPromises() })
    expect(fetch).toHaveBeenCalledTimes(1)

    // Failure 2
    await act(async () => { await vi.advanceTimersByTimeAsync(30000) })
    expect(fetch).toHaveBeenCalledTimes(2)

    // Success — resets counter
    await act(async () => { await vi.advanceTimersByTimeAsync(30000) })
    expect(fetch).toHaveBeenCalledTimes(3)

    // Should continue polling (counter was reset)
    await act(async () => { await vi.advanceTimersByTimeAsync(30000) })
    expect(fetch).toHaveBeenCalledTimes(4)
  })
})
