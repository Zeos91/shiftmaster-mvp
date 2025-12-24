'use client'

import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { LayoutDashboard, LogOut, Menu, X } from 'lucide-react'
import ProtectedRoute from '@/components/ProtectedRoute'
import RealtimeIndicator from '@/components/dashboard/RealtimeIndicator'
interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <ProtectedRoute requireManager>
      <div className="min-h-screen bg-gray-100">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}

        {/* Sidebar */}
        <aside
          className={`fixed top-0 left-0 h-full w-64 bg-gray-900 text-white z-50 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-xl font-bold">ShiftMaster</h1>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="space-y-2">
              <a
                href="/dashboard"
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-600 text-white"
              >
                <LayoutDashboard className="w-5 h-5" />
                <span>Dashboard</span>
              </a>
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <div className="lg:ml-64">
          {/* Top bar */}
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="flex items-center justify-between px-4 py-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-600 hover:text-gray-900"
              >
                <Menu className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-4 ml-auto">
                  <RealtimeIndicator enabled={true} />
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.role.replace(/_/g, ' ')}</p>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
