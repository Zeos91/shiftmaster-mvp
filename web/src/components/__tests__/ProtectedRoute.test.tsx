import { render, screen } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/context/AuthContext'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))

jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn()
}))

describe('ProtectedRoute', () => {
  const mockPush = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('shows loading spinner when auth is loading', () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: true,
      isManager: () => false
    })

    const { container } = render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    const spinner = container.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('redirects to login when user is not authenticated', () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
      isManager: () => false
    })

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    expect(mockPush).toHaveBeenCalledWith('/login')
  })

  it('redirects workers to /worker when requireManager is true', () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { id: '1', role: 'OPERATOR' },
      loading: false,
      isManager: () => false
    })

    render(
      <ProtectedRoute requireManager>
        <div>Manager Content</div>
      </ProtectedRoute>
    )

    expect(mockPush).toHaveBeenCalledWith('/worker')
  })

  it('renders children when user is authenticated and is manager', () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { id: '1', role: 'SITE_MANAGER' },
      loading: false,
      isManager: () => true
    })

    render(
      <ProtectedRoute requireManager>
        <div>Manager Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByText('Manager Content')).toBeInTheDocument()
  })

  it('renders children for authenticated users when requireManager is false', () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { id: '1', role: 'OPERATOR' },
      loading: false,
      isManager: () => false
    })

    render(
      <ProtectedRoute requireManager={false}>
        <div>User Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByText('User Content')).toBeInTheDocument()
  })
})
