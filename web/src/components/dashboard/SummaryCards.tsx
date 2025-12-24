import { Users, UserCheck, CalendarDays, CheckCircle, XCircle, Radio, FileQuestion, Clock, CalendarClock } from 'lucide-react'
import { DashboardSummary } from '@/hooks/useDashboardData'

interface SummaryCardsProps {
  data?: DashboardSummary
  loading: boolean
  error: Error | null
}

const CARD_CONFIGS = [
  { key: 'totalWorkers', label: 'Total Workers', icon: Users, color: 'bg-blue-500' },
  { key: 'activeWorkers', label: 'Active Workers', icon: UserCheck, color: 'bg-green-500' },
  { key: 'totalShifts', label: 'Total Shifts', icon: CalendarDays, color: 'bg-purple-500' },
  { key: 'completedShifts', label: 'Completed', icon: CheckCircle, color: 'bg-emerald-500' },
  { key: 'cancelledShifts', label: 'Cancelled', icon: XCircle, color: 'bg-red-500' },
  { key: 'pendingBroadcasts', label: 'Pending Broadcasts', icon: Radio, color: 'bg-orange-500' },
  { key: 'openApplications', label: 'Open Applications', icon: FileQuestion, color: 'bg-yellow-500' },
  { key: 'todaysShifts', label: "Today's Shifts", icon: Clock, color: 'bg-indigo-500' },
  { key: 'upcomingShifts', label: 'Upcoming (7d)', icon: CalendarClock, color: 'bg-cyan-500' }
]

function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg shadow p-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
          <div className="h-8 bg-gray-200 rounded w-16"></div>
        </div>
        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
      </div>
    </div>
  )
}

export default function SummaryCards({ data, loading, error }: SummaryCardsProps) {
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <p className="font-medium">Unable to load summary data</p>
        <p className="text-sm mt-1">{error.message}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 9 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {CARD_CONFIGS.map(({ key, label, icon: Icon, color }) => (
        <div
          key={key}
          className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {data[key as keyof Omit<DashboardSummary, 'period'>]}
              </p>
            </div>
            <div className={`${color} p-3 rounded-full`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
