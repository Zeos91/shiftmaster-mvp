import { render, screen } from '@testing-library/react'
import SummaryCards from '@/components/dashboard/SummaryCards'

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

describe('SummaryCards', () => {
  it('renders loading skeleton when loading', () => {
    render(<SummaryCards data={undefined} loading={true} error={null} />)
    const skeletons = screen.getAllByRole('generic')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders error message when error occurs', () => {
    const error = new Error('Failed to load data')
    render(<SummaryCards data={undefined} loading={false} error={error} />)
    expect(screen.getByText(/unable to load summary data/i)).toBeInTheDocument()
    expect(screen.getByText('Failed to load data')).toBeInTheDocument()
  })

  it('renders all KPI cards with correct values', () => {
    render(<SummaryCards data={mockData} loading={false} error={null} />)
    
    expect(screen.getByText('Total Workers')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()
    
    expect(screen.getByText('Active Workers')).toBeInTheDocument()
    expect(screen.getByText('45')).toBeInTheDocument()
    
    expect(screen.getByText('Total Shifts')).toBeInTheDocument()
    expect(screen.getByText('200')).toBeInTheDocument()
    
    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getByText('180')).toBeInTheDocument()
  })

  it('renders all 9 KPI cards', () => {
    const { container } = render(<SummaryCards data={mockData} loading={false} error={null} />)
    const cards = container.querySelectorAll('.bg-white.rounded-lg.shadow')
    expect(cards.length).toBe(9)
  })
})
