'use client'

import { useState, useMemo, memo } from 'react'
import dynamic from 'next/dynamic'
import { Responsive, Layout } from 'react-grid-layout'
import DashboardLayout from '@/components/DashboardLayout'
import DateFilter from '@/components/dashboard/DateFilter'
import SummaryCards from '@/components/dashboard/SummaryCards'
import ShiftMetricsChart from '@/components/dashboard/ShiftMetricsChart'
import WorkerActivityChart from '@/components/dashboard/WorkerActivityChart'
import ActivityFeed from '@/components/dashboard/ActivityFeed'
import DashboardWidget from '@/components/dashboard/DashboardWidget'
import DashboardNotifications from '@/components/dashboard/DashboardNotifications'
import { useWidgetStore } from '@/store/widgetStore'
import { Settings } from 'lucide-react'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

// Lazy load chart components for performance
const ShiftTrendChart = dynamic(() => import('@/components/dashboard/ShiftTrendChart'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded"></div>
})
const BroadcastMetricsWidget = dynamic(() => import('@/components/dashboard/BroadcastMetricsWidget'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded"></div>
})
const PerformanceMonitorWidget = dynamic(() => import('@/components/dashboard/PerformanceMonitorWidget'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded"></div>
})

// Memoized widget components
const MemoizedSummaryCards = memo(SummaryCards)
const MemoizedShiftMetrics = memo(ShiftMetricsChart)
const MemoizedWorkerActivity = memo(WorkerActivityChart)
const MemoizedActivityFeed = memo(ActivityFeed)
const MemoizedShiftTrend = memo(ShiftTrendChart)
const MemoizedBroadcastMetrics = memo(BroadcastMetricsWidget)
const MemoizedPerformanceMonitor = memo(PerformanceMonitorWidget)

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({})
  const [editMode, setEditMode] = useState(false)
  const { layouts, setLayouts, enabledWidgets, toggleWidget, resetLayouts } = useWidgetStore()

  const handleDateFilter = (from: string, to: string) => {
    setDateRange({ from, to })
  }

  const handleLayoutChange = (layout: any) => {
    if (editMode && Array.isArray(layout)) {
      const updatedLayouts = layout.map((item: any) => ({
        i: item.i,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        minW: layouts.find((l) => l.i === item.i)?.minW,
        minH: layouts.find((l) => l.i === item.i)?.minH
      }))
      setLayouts(updatedLayouts)
    }
  }

  const handleRemoveWidget = (widgetId: string) => {
    toggleWidget(widgetId)
  }

  const filteredLayouts = useMemo(
    () => layouts.filter((layout) => enabledWidgets.includes(layout.i)),
    [layouts, enabledWidgets]
  )

  return (
    <DashboardLayout>
      <DashboardNotifications />
      
      <div className="max-w-[1600px] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manager Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Real-time overview of shift operations and worker activity
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setEditMode(!editMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                editMode
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Settings className="w-4 h-4" />
              {editMode ? 'Done Editing' : 'Customize'}
            </button>
            
            {editMode && (
              <button
                onClick={resetLayouts}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Reset Layout
              </button>
            )}
          </div>
        </div>

        <DateFilter onApply={handleDateFilter} />

        <Responsive
          className="layout"
          layouts={{ lg: filteredLayouts }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={80}
          onLayoutChange={handleLayoutChange}
          width={1200}
        >
          {enabledWidgets.includes('summary-cards') && (
            <div key="summary-cards">
              <DashboardWidget
                id="summary-cards"
                title="Overview Metrics"
                onRemove={editMode ? handleRemoveWidget : undefined}
              >
                <MemoizedSummaryCards
                  data={undefined}
                  loading={false}
                  error={null}
                />
              </DashboardWidget>
            </div>
          )}

          {enabledWidgets.includes('shift-chart') && (
            <div key="shift-chart">
              <DashboardWidget
                id="shift-chart"
                title="Shift Trends (30 Days)"
                onRemove={editMode ? handleRemoveWidget : undefined}
              >
                <MemoizedShiftTrend
                  startDate={dateRange.from}
                  endDate={dateRange.to}
                />
              </DashboardWidget>
            </div>
          )}

          {enabledWidgets.includes('worker-chart') && (
            <div key="worker-chart">
              <DashboardWidget
                id="worker-chart"
                title="Worker Activity"
                onRemove={editMode ? handleRemoveWidget : undefined}
              >
                <MemoizedWorkerActivity
                  data={undefined}
                  loading={false}
                  error={null}
                />
              </DashboardWidget>
            </div>
          )}

          {enabledWidgets.includes('activity-feed') && (
            <div key="activity-feed">
              <DashboardWidget
                id="activity-feed"
                title="Recent Activity"
                onRemove={editMode ? handleRemoveWidget : undefined}
              >
                <MemoizedActivityFeed
                  data={undefined}
                  loading={false}
                  error={null}
                />
              </DashboardWidget>
            </div>
          )}

          {enabledWidgets.includes('recent-shifts') && (
            <div key="recent-shifts">
              <DashboardWidget
                id="recent-shifts"
                title="Recent Shifts"
                onRemove={editMode ? handleRemoveWidget : undefined}
              >
                <MemoizedShiftMetrics
                  data={undefined}
                  loading={false}
                  error={null}
                />
              </DashboardWidget>
            </div>
          )}

          {enabledWidgets.includes('broadcast-metrics') && (
            <div key="broadcast-metrics">
              <DashboardWidget
                id="broadcast-metrics"
                title="Broadcast Performance"
                onRemove={editMode ? handleRemoveWidget : undefined}
              >
                <MemoizedBroadcastMetrics />
              </DashboardWidget>
            </div>
          )}

          {enabledWidgets.includes('performance-monitor') && (
            <div key="performance-monitor">
              <DashboardWidget
                id="performance-monitor"
                title="System Health"
                onRemove={editMode ? handleRemoveWidget : undefined}
              >
                <MemoizedPerformanceMonitor />
              </DashboardWidget>
            </div>
          )}
        </Responsive>
      </div>
    </DashboardLayout>
  )
}
