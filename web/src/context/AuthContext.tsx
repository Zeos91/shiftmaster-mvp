'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/axios'

interface User {
  id: string
  name: string
  email: string
  role: 'OPERATOR' | 'SITE_MANAGER' | 'PROJECT_MANAGER' | 'COMPANY_ADMIN'
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isManager: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check for stored user on mount
    const storedUser = localStorage.getItem('user')
    const token = localStorage.getItem('authToken')
    
    if (storedUser && token) {
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/api/auth/login', { email, password })
      const { worker, token } = response.data
      
      const userData: User = {
        id: worker.id,
        name: worker.name,
        email: worker.email,
        role: worker.role
      }
      
      localStorage.setItem('authToken', token)
      localStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)
      
      // Redirect based on role
      if (isManagerRole(userData.role)) {
        router.push('/dashboard')
      } else {
        router.push('/worker')
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed')
    }
  }

  const logout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    setUser(null)
    router.push('/login')
  }

  const isManager = () => {
    if (!user) return false
    return isManagerRole(user.role)
  }

  const isManagerRole = (role: string) => {
    return ['SITE_MANAGER', 'PROJECT_MANAGER', 'COMPANY_ADMIN'].includes(role)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isManager }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
