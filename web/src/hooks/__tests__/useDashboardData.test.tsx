import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useDashboardSummary } from '@/hooks/useDashboardData'
import api from '@/lib/axios'

jest.mock('@/lib/axios')

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useDashboardData', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('fetches dashboard summary successfully', async () => {
    const mockData = {
      period: { from: '2025-01-01', to: '2025-01-31' },
      totalWorkers: 50,
      activeWorkers: 45,
      totalShifts: 200,
      completedShifts: 180,
      cancelledShifts: 5,
      pendingBroadcasts: 10,
      openApplications: 25,
      todaysShifts: 8,
      upcomingShifts: 15
    }

    ;(api.get as jest.Mock).mockResolvedValue({ data: mockData })

    const { result } = renderHook(() => useDashboardSummary(), {
      wrapper: createWrapper()
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockData)
    expect(api.get).toHaveBeenCalledWith('/api/dashboard/summary?')
  })

  it('includes date parameters in API call', async () => {
    const mockData = {
      period: { from: '2025-01-01', to: '2025-01-31' },
      totalWorkers: 50
    }

    ;(api.get as jest.Mock).mockResolvedValue({ data: mockData })

    const { result } = renderHook(
      () => useDashboardSummary('2025-01-01', '2025-01-31'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(api.get).toHaveBeenCalledWith(
      expect.stringContaining('from=2025-01-01')
    )
    expect(api.get).toHaveBeenCalledWith(
      expect.stringContaining('to=2025-01-31')
    )
  })

  it('handles API errors correctly', async () => {
    ;(api.get as jest.Mock).mockRejectedValue(new Error('API Error'))

    const { result } = renderHook(() => useDashboardSummary(), {
      wrapper: createWrapper()
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeInstanceOf(Error)
  })
})
