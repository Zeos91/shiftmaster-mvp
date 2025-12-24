import { useQuery } from '@tanstack/react-query'
import api from '@/lib/axios'

export interface DashboardSummary {
  period: { from: string; to: string }
  totalWorkers: number
  activeWorkers: number
  totalShifts: number
  completedShifts: number
  cancelledShifts: number
  pendingBroadcasts: number
  openApplications: number
  todaysShifts: number
  upcomingShifts: number
}

export interface ShiftMetrics {
  period: { from: string; to: string }
  totalShifts: number
  totalApplications: number
  avgApplicationsPerShift: number
  avgTimeToAssignment: string
  fillRate: string
  rejectionRate: string
  completionRate: string
}

export interface WorkerActivity {
  period: { from: string; to: string }
  mostActiveWorkers: Array<{
    id: string
    name: string
    shiftCount: number
  }>
  workersByRole: Record<string, number>
  workersByStatus: {
    available: number
    unavailable: number
  }
  availabilityStats: {
    availablePercentage: string
    total: number
  }
}

export interface Activity {
  id: string
  type: string
  description: string
  timestamp: string
  actor: {
    id: string
    name: string
    role: string
  }
  shiftId: string | null
  metadata?: any
}

export interface RecentActivity {
  activities: Activity[]
}

export function useDashboardSummary(from?: string, to?: string) {
  return useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'summary', from, to],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (from) params.append('from', from)
      if (to) params.append('to', to)
      
      const response = await api.get(`/api/dashboard/summary?${params}`)
      return response.data
    }
  })
}

export function useShiftMetrics(from?: string, to?: string) {
  return useQuery<ShiftMetrics>({
    queryKey: ['dashboard', 'shift-metrics', from, to],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (from) params.append('from', from)
      if (to) params.append('to', to)
      
      const response = await api.get(`/api/dashboard/shift-metrics?${params}`)
      return response.data
    }
  })
}

export function useWorkerActivity(from?: string, to?: string) {
  return useQuery<WorkerActivity>({
    queryKey: ['dashboard', 'worker-activity', from, to],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (from) params.append('from', from)
      if (to) params.append('to', to)
      
      const response = await api.get(`/api/dashboard/worker-activity?${params}`)
      return response.data
    }
  })
}

export function useRecentActivity(from?: string, to?: string) {
  return useQuery<RecentActivity>({
    queryKey: ['dashboard', 'activity', from, to],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (from) params.append('from', from)
      if (to) params.append('to', to)
      
      const response = await api.get(`/api/dashboard/activity?${params}`)
      return response.data
    }
  })
}
