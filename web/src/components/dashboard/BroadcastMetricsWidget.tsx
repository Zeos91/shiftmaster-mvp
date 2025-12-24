'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/axios'
import { Radio, Users, CheckCircle, Clock } from 'lucide-react'

export default function BroadcastMetricsWidget() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-analytics'],
    queryFn: async () => {
      const response = await api.get('/dashboard/analytics')
      return response.data
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  })

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-gray-200 rounded"></div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        Failed to load broadcast metrics
      </div>
    )
  }

  const metrics = [
    {
      label: 'Total Broadcasts',
      value: data?.broadcastedShifts || 0,
      icon: Radio,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      label: 'Active Applications',
      value: data?.pendingApplications || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      label: 'Acceptance Rate',
      value: data?.applicationAcceptanceRate 
        ? `${data.applicationAcceptanceRate.toFixed(1)}%`
        : 'N/A',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      label: 'Avg. Response Time',
      value: data?.averageApplicationTime
        ? `${Math.round(data.averageApplicationTime)} min`
        : 'N/A',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ]

  return (
    <div className="space-y-3">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${metric.bgColor}`}>
              <metric.icon className={`w-5 h-5 ${metric.color}`} />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {metric.label}
            </span>
          </div>
          <span className="text-lg font-bold text-gray-900">
            {metric.value}
          </span>
        </div>
      ))}
    </div>
  )
}
