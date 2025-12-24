'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireManager?: boolean
}

export default function ProtectedRoute({ children, requireManager = false }: ProtectedRouteProps) {
  const { user, loading, isManager } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login')
      } else if (requireManager && !isManager()) {
        router.push('/worker')
      }
    }
  }, [user, loading, requireManager, router, isManager])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || (requireManager && !isManager())) {
    return null
  }

  return <>{children}</>
}
