'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { WorkerActivity } from '@/hooks/useDashboardData'
import { Users } from 'lucide-react'

interface WorkerActivityChartProps {
  data?: WorkerActivity
  loading: boolean
  error: Error | null
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function WorkerActivityChart({ data, loading, error }: WorkerActivityChartProps) {
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <p className="font-medium">Unable to load worker activity</p>
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

  const roleData = Object.entries(data.workersByRole).map(([name, value]) => ({
    name: name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    value
  }))

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Worker Activity</h3>

      {/* Top Workers */}
      <div className="mb-8">
        <h4 className="text-sm font-medium text-gray-700 mb-4">Most Active Workers</h4>
        {data.mostActiveWorkers.length > 0 ? (
          <div className="space-y-2">
            {data.mostActiveWorkers.slice(0, 5).map((worker, idx) => (
              <div key={worker.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-500">#{idx + 1}</span>
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">{worker.name}</span>
                </div>
                <span className="text-sm font-bold text-blue-600">{worker.shiftCount} shifts</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No shift activity in this period</p>
        )}
      </div>

      {/* Workers by Role */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-4">Workers by Role</h4>
        {roleData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={roleData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {roleData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-gray-500">No worker data available</p>
        )}
      </div>

      {/* Availability Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <p className="text-sm text-green-700 font-medium">Available</p>
          <p className="text-2xl font-bold text-green-900">{data.workersByStatus.available}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-700 font-medium">Unavailable</p>
          <p className="text-2xl font-bold text-gray-900">{data.workersByStatus.unavailable}</p>
        </div>
      </div>
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-green-600">{data.availabilityStats.availablePercentage}</span> available
        </p>
      </div>
    </div>
  )
}
