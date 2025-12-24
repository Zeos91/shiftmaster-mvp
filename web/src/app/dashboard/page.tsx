'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import DateFilter from '@/components/dashboard/DateFilter'
import SummaryCards from '@/components/dashboard/SummaryCards'
import ShiftMetricsChart from '@/components/dashboard/ShiftMetricsChart'
import WorkerActivityChart from '@/components/dashboard/WorkerActivityChart'
import ActivityFeed from '@/components/dashboard/ActivityFeed'
import {
  useDashboardSummary,
  useShiftMetrics,
  useWorkerActivity,
  useRecentActivity
} from '@/hooks/useDashboardData'

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({})

  const summaryQuery = useDashboardSummary(dateRange.from, dateRange.to)
  const metricsQuery = useShiftMetrics(dateRange.from, dateRange.to)
  const activityQuery = useWorkerActivity(dateRange.from, dateRange.to)
  const recentActivityQuery = useRecentActivity(dateRange.from, dateRange.to)

  const handleDateFilter = (from: string, to: string) => {
    setDateRange({ from, to })
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manager Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Overview of shift operations and worker activity
          </p>
        </div>

        <DateFilter onApply={handleDateFilter} />

        <SummaryCards
          data={summaryQuery.data}
          loading={summaryQuery.isLoading}
          error={summaryQuery.error as Error | null}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ShiftMetricsChart
            data={metricsQuery.data}
            loading={metricsQuery.isLoading}
            error={metricsQuery.error as Error | null}
          />
          <WorkerActivityChart
            data={activityQuery.data}
            loading={activityQuery.isLoading}
            error={activityQuery.error as Error | null}
          />
        </div>

        <ActivityFeed
          data={recentActivityQuery.data}
          loading={recentActivityQuery.isLoading}
          error={recentActivityQuery.error as Error | null}
        />
      </div>
    </DashboardLayout>
  )
}
