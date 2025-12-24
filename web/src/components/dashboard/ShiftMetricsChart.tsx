'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ShiftMetrics } from '@/hooks/useDashboardData'

interface ShiftMetricsChartProps {
  data?: ShiftMetrics
  loading: boolean
  error: Error | null
}

export default function ShiftMetricsChart({ data, loading, error }: ShiftMetricsChartProps) {
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <p className="font-medium">Unable to load shift metrics</p>
        <p className="text-sm mt-1">{error.message}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-4 bg-gray-200 rounded w-48 mb-6 animate-pulse"></div>
        <div className="h-80 bg-gray-100 rounded animate-pulse"></div>
      </div>
    )
  }

  if (!data) return null

  const chartData = [
    {
      name: 'Fill Rate',
      value: parseFloat(data.fillRate.replace('%', ''))
    },
    {
      name: 'Completion Rate',
      value: parseFloat(data.completionRate.replace('%', ''))
    },
    {
      name: 'Rejection Rate',
      value: parseFloat(data.rejectionRate.replace('%', ''))
    }
  ]

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Shift Performance Metrics</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">Avg Applications/Shift</p>
          <p className="text-2xl font-bold text-gray-900">{data.avgApplicationsPerShift.toFixed(1)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">Avg Time to Assignment</p>
          <p className="text-2xl font-bold text-gray-900">{data.avgTimeToAssignment}</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis domain={[0, 100]} />
          <Tooltip formatter={(value) => `${value}%`} />
          <Legend />
          <Bar dataKey="value" fill="#3b82f6" name="Percentage (%)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
