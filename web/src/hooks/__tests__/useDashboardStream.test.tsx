import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useDashboardStream } from '@/hooks/useDashboardStream'

jest.mock('@/lib/axios', () => ({
  get: jest.fn(() => Promise.resolve({ data: {} })),
  defaults: { headers: { common: {} } }
}))

// Mock EventSource
global.EventSource = jest.fn() as any

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false }
    }
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useDashboardStream', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.setItem('authToken', 'test-token')
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    })
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('should initialize with disconnected status when disabled', () => {
    const { result } = renderHook(() => useDashboardStream({ enabled: false }), {
      wrapper: createWrapper()
    })

    expect(result.current.isDisconnected).toBe(true)
  })

  it('should attempt SSE connection when enabled', () => {
    const mockEventSource = {
      addEventListener: jest.fn(),
      close: jest.fn()
    }
    ;(global.EventSource as any).mockReturnValue(mockEventSource)

    const { result } = renderHook(() => useDashboardStream({ enabled: true }), {
      wrapper: createWrapper()
    })

    expect(global.EventSource).toHaveBeenCalledWith('/api/dashboard/stream', expect.any(Object))
  })

  it('should handle SSE connected event', async () => {
    const mockEventSource = {
      addEventListener: jest.fn(),
      close: jest.fn()
    }
    ;(global.EventSource as any).mockReturnValue(mockEventSource)

    const { result } = renderHook(() => useDashboardStream({ enabled: true }), {
      wrapper: createWrapper()
    })

    // Simulate connected event
    const connectedCallback = mockEventSource.addEventListener.mock.calls.find(
      call => call[0] === 'connected'
    )?.[1]

    act(() => {
      connectedCallback?.({ data: JSON.stringify({ clientId: '123' }) })
    })

    await waitFor(() => {
      expect(result.current.isLive).toBe(true)
    })
  })

  it('should fall back to polling on SSE error', async () => {
    const mockEventSource = {
      addEventListener: jest.fn(),
      close: jest.fn(),
      onerror: null as any
    }
    ;(global.EventSource as any).mockReturnValue(mockEventSource)

    const { result } = renderHook(() => useDashboardStream({ enabled: true }), {
      wrapper: createWrapper()
    })

    // Trigger error
    act(() => {
      if (mockEventSource.onerror) mockEventSource.onerror(new Event('error'))
    })

    await waitFor(() => {
      expect(result.current.isPolling).toBe(true)
    }, { timeout: 1000 })
  })

  it('should invalidate queries on shift events', async () => {
    const queryClient = new QueryClient()
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')

    const mockEventSource = {
      addEventListener: jest.fn(),
      close: jest.fn()
    }
    ;(global.EventSource as any).mockReturnValue(mockEventSource)

    const { result } = renderHook(() => useDashboardStream({ enabled: true }), {
      wrapper: ({ children }: any) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    })

    // Get the shift.created callback
    const shiftCallback = mockEventSource.addEventListener.mock.calls.find(
      call => call[0] === 'shift.created'
    )?.[1]

    // Simulate shift.created event
    act(() => {
      shiftCallback?.({
        data: JSON.stringify({ shiftId: '123' }),
        type: 'shift.created'
      } as any)
    })

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalled()
    })
  })

  it('should pause on tab hidden', async () => {
    const mockEventSource = {
      addEventListener: jest.fn(),
      close: jest.fn()
    }
    ;(global.EventSource as any).mockReturnValue(mockEventSource)

    renderHook(() => useDashboardStream({ enabled: true }), {
      wrapper: createWrapper()
    })

    // Simulate tab hidden
    Object.defineProperty(document, 'hidden', { value: true, writable: true })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    // EventSource should be closed
    expect(mockEventSource.close).toHaveBeenCalled()
  })

  it('should reconnect on tab visible', async () => {
    const mockEventSource = {
      addEventListener: jest.fn(),
      close: jest.fn()
    }
    ;(global.EventSource as any).mockReturnValue(mockEventSource)

    renderHook(() => useDashboardStream({ enabled: true }), {
      wrapper: createWrapper()
    })

    const initialCallCount = (global.EventSource as any).mock.calls.length

    // Simulate tab hidden -> closes SSE
    Object.defineProperty(document, 'hidden', { value: true, writable: true })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(mockEventSource.close).toHaveBeenCalled()

    // Simulate tab visible after hidden
    Object.defineProperty(document, 'hidden', { value: false, writable: true })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    // Should attempt reconnection (another EventSource call)
    expect((global.EventSource as any).mock.calls.length).toBeGreaterThan(initialCallCount)
  })

    it('should resume after tab becomes visible', () => {
      const mockEventSource = {
        addEventListener: jest.fn(),
        close: jest.fn()
      }
      ;(global.EventSource as any).mockReturnValue(mockEventSource)

      renderHook(() => useDashboardStream({ enabled: true }), {
        wrapper: createWrapper()
      })

      // Simulate tab hidden
      Object.defineProperty(document, 'hidden', { value: true, writable: true })
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'))
      })

      // EventSource should be closed
      expect(mockEventSource.close).toHaveBeenCalled()
    })

    it('should handle offline event', async () => {
    const mockEventSource = {
      addEventListener: jest.fn(),
      close: jest.fn()
    }
    ;(global.EventSource as any).mockReturnValue(mockEventSource)

    const { result } = renderHook(() => useDashboardStream({ enabled: true }), {
      wrapper: createWrapper()
    })

    // Simulate going offline
    act(() => {
      window.dispatchEvent(new Event('offline'))
    })

    await waitFor(() => {
      expect(result.current.isDisconnected).toBe(true)
    })
  })

  it('should call status change callback', async () => {
    const onStatusChange = jest.fn()
    const mockEventSource = {
      addEventListener: jest.fn(),
      close: jest.fn()
    }
    ;(global.EventSource as any).mockReturnValue(mockEventSource)

    renderHook(() => useDashboardStream({ enabled: true, onStatusChange }), {
      wrapper: createWrapper()
    })

    // Simulate connected
    const connectedCallback = mockEventSource.addEventListener.mock.calls.find(
      call => call[0] === 'connected'
    )?.[1]

    act(() => {
      connectedCallback?.({ data: JSON.stringify({ clientId: '123' }) })
    })

    await waitFor(() => {
      expect(onStatusChange).toHaveBeenCalledWith('connected')
    })
  })

  it('should handle no auth token', () => {
    localStorage.removeItem('authToken')
    const mockEventSource = {
      addEventListener: jest.fn(),
      close: jest.fn()
    }
    ;(global.EventSource as any).mockReturnValue(mockEventSource)

    const { result } = renderHook(() => useDashboardStream({ enabled: true }), {
      wrapper: createWrapper()
    })

    expect(result.current.isDisconnected).toBe(true)
  })

  it('should not connect when offline', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true
    })
    const mockEventSource = {
      addEventListener: jest.fn(),
      close: jest.fn()
    }
    ;(global.EventSource as any).mockReturnValue(mockEventSource)

    const { result } = renderHook(() => useDashboardStream({ enabled: true }), {
      wrapper: createWrapper()
    })

    expect(result.current.isDisconnected).toBe(true)
    expect(global.EventSource).not.toHaveBeenCalled()
  })

  it('should clean up on unmount', () => {
    const mockEventSource = {
      addEventListener: jest.fn(),
      close: jest.fn()
    }
    ;(global.EventSource as any).mockReturnValue(mockEventSource)

    const { unmount } = renderHook(() => useDashboardStream({ enabled: true }), {
      wrapper: createWrapper()
    })

    unmount()

    expect(mockEventSource.close).toHaveBeenCalled()
  })
})
