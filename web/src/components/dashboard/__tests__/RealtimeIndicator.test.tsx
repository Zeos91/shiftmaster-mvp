import { render, screen } from '@testing-library/react'
import RealtimeIndicator from '@/components/dashboard/RealtimeIndicator'
import * as useDashboardStreamModule from '@/hooks/useDashboardStream'

jest.mock('@/hooks/useDashboardStream')

describe('RealtimeIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should show green live indicator when connected', () => {
    jest.spyOn(useDashboardStreamModule, 'useDashboardStream').mockReturnValue({
      status: 'connected',
      isLive: true,
      isPolling: false,
      isReconnecting: false,
      isDisconnected: false
    })

    render(<RealtimeIndicator />)

    expect(screen.getByText('🟢')).toBeInTheDocument()
    expect(screen.getByText('Live')).toBeInTheDocument()
  })

  it('should show yellow indicator when reconnecting', () => {
    jest.spyOn(useDashboardStreamModule, 'useDashboardStream').mockReturnValue({
      status: 'reconnecting',
      isLive: false,
      isPolling: false,
      isReconnecting: true,
      isDisconnected: false
    })

    render(<RealtimeIndicator />)

    expect(screen.getByText('🟡')).toBeInTheDocument()
    expect(screen.getByText('Reconnecting')).toBeInTheDocument()
  })

  it('should show yellow indicator when polling', () => {
    jest.spyOn(useDashboardStreamModule, 'useDashboardStream').mockReturnValue({
      status: 'polling',
      isLive: false,
      isPolling: true,
      isReconnecting: false,
      isDisconnected: false
    })

    render(<RealtimeIndicator />)

    expect(screen.getByText('🟡')).toBeInTheDocument()
    expect(screen.getByText('Polling')).toBeInTheDocument()
  })

  it('should show gray indicator when disconnected', () => {
    jest.spyOn(useDashboardStreamModule, 'useDashboardStream').mockReturnValue({
      status: 'disconnected',
      isLive: false,
      isPolling: false,
      isReconnecting: false,
      isDisconnected: true
    })

    render(<RealtimeIndicator />)

    expect(screen.getByText('⚪')).toBeInTheDocument()
    expect(screen.getByText('Offline')).toBeInTheDocument()
  })

  it('should respect enabled prop', () => {
    const useSpy = jest.spyOn(useDashboardStreamModule, 'useDashboardStream')

    render(<RealtimeIndicator enabled={false} />)

    expect(useSpy).toHaveBeenCalledWith({ enabled: false })
  })

  it('should apply correct color classes', () => {
    jest.spyOn(useDashboardStreamModule, 'useDashboardStream').mockReturnValue({
      status: 'connected',
      isLive: true,
      isPolling: false,
      isReconnecting: false,
      isDisconnected: false
    })

    const { container } = render(<RealtimeIndicator />)
    const indicator = container.firstChild

    expect(indicator).toHaveClass('text-green-600')
  })
})
