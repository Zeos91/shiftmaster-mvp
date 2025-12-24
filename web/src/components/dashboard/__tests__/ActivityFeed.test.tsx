import { render, screen } from '@testing-library/react'
import ActivityFeed from '@/components/dashboard/ActivityFeed'

const mockData = {
  activities: [
    {
      id: '1',
      type: 'login_success',
      description: 'Test Manager logged in',
      timestamp: '2025-01-01T10:00:00Z',
      actor: {
        id: 'user1',
        name: 'Test Manager',
        role: 'SITE_MANAGER'
      },
      shiftId: null
    },
    {
      id: '2',
      type: 'shift_broadcast',
      description: 'New shift broadcasted',
      timestamp: '2025-01-01T09:00:00Z',
      actor: {
        id: 'user2',
        name: 'Another Manager',
        role: 'PROJECT_MANAGER'
      },
      shiftId: 'shift123'
    }
  ]
}

describe('ActivityFeed', () => {
  it('renders loading skeleton when loading', () => {
    render(<ActivityFeed data={undefined} loading={true} error={null} />)
    const skeletons = screen.getAllByRole('generic')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders error message when error occurs', () => {
    const error = new Error('Failed to load activity')
    render(<ActivityFeed data={undefined} loading={false} error={error} />)
    expect(screen.getByText(/unable to load recent activity/i)).toBeInTheDocument()
  })

  it('renders empty state when no activities', () => {
    render(<ActivityFeed data={{ activities: [] }} loading={false} error={null} />)
    expect(screen.getByText('No recent activity')).toBeInTheDocument()
  })

  it('renders all activity items', () => {
    render(<ActivityFeed data={mockData} loading={false} error={null} />)
    
    expect(screen.getByText('Test Manager logged in')).toBeInTheDocument()
    expect(screen.getByText('New shift broadcasted')).toBeInTheDocument()
    expect(screen.getByText('Test Manager')).toBeInTheDocument()
    expect(screen.getByText('Another Manager')).toBeInTheDocument()
  })

  it('displays shift badge for shift-related activities', () => {
    render(<ActivityFeed data={mockData} loading={false} error={null} />)
    expect(screen.getByText('Shift')).toBeInTheDocument()
  })
})
