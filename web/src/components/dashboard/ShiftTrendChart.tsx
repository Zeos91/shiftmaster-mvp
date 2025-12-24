'use client'

import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/axios'

interface ShiftTrendChartProps {
  startDate?: string
  endDate?: string
  siteId?: string
}

export default function ShiftTrendChart({ startDate, endDate, siteId }: ShiftTrendChartProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'trends', 'shifts', startDate, endDate, siteId],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('metric', 'shifts')
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      if (siteId) params.set('siteId', siteId)

      const res = await api.get(`/dashboard/trends?${params.toString()}`)
      return res.data
    },
    refetchInterval: 60000 // Refresh every minute
  })

  const chartData = useMemo(() => {
    if (!data?.data) return []

    // Group by period and aggregate states
    const grouped = data.data.reduce((acc: any, item: any) => {
      const period = new Date(item.period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      if (!acc[period]) {
        acc[period] = { period, assigned: 0, broadcasted: 0, applied: 0, completed: 0 }
      }
      acc[period][item.category] = (acc[period][item.category] || 0) + item.value
      return acc
    }, {})

    return Object.values(grouped)
  }, [data])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>Failed to load trend data</p>
      </div>
    )
  }

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>No trend data available</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="period" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="assigned" stroke="#3b82f6" strokeWidth={2} name="Assigned" />
        <Line type="monotone" dataKey="broadcasted" stroke="#f59e0b" strokeWidth={2} name="Broadcasted" />
        <Line type="monotone" dataKey="applied" stroke="#8b5cf6" strokeWidth={2} name="Applied" />
        <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} name="Completed" />
      </LineChart>
    </ResponsiveContainer>
  )
}
