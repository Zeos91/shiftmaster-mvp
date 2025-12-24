'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/axios'
import { Activity, Zap, TrendingUp, AlertCircle } from 'lucide-react'

export default function PerformanceMonitorWidget() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['performance-metrics'],
    queryFn: async () => {
      const response = await api.get('/dashboard/analytics')
      return response.data
    },
    refetchInterval: 10000 // Refresh every 10 seconds
  })

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-gray-200 rounded"></div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        Failed to load performance metrics
      </div>
    )
  }

  // Calculate derived metrics
  const completionRate = data?.totalShifts
    ? ((data.completedShifts / data.totalShifts) * 100).toFixed(1)
    : '0.0'
  
  const utilizationRate = data?.totalWorkers
    ? ((data.activeWorkers / data.totalWorkers) * 100).toFixed(1)
    : '0.0'

  const metrics = [
    {
      label: 'Shift Completion',
      value: `${completionRate}%`,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      trend: Number(completionRate) >= 80 ? 'good' : 'warning'
    },
    {
      label: 'Worker Utilization',
      value: `${utilizationRate}%`,
      icon: Activity,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      trend: Number(utilizationRate) >= 70 ? 'good' : 'warning'
    },
    {
      label: 'Active Workers',
      value: `${data?.activeWorkers || 0}/${data?.totalWorkers || 0}`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      trend: 'neutral'
    },
    {
      label: 'Pending Actions',
      value: (data?.pendingApplications || 0) + (data?.broadcastedShifts || 0),
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      trend: 'neutral'
    }
  ]

  return (
    <div className="space-y-3">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${metric.bgColor}`}>
              <metric.icon className={`w-4 h-4 ${metric.color}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600">{metric.label}</p>
              <p className="text-lg font-bold text-gray-900">{metric.value}</p>
            </div>
          </div>
          {metric.trend !== 'neutral' && (
            <div
              className={`w-2 h-2 rounded-full ${
                metric.trend === 'good' ? 'bg-green-500' : 'bg-yellow-500'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
