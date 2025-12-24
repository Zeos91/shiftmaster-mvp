import { formatDistanceToNow } from 'date-fns'
import { Activity, CheckCircle, UserPlus, UserCheck, XCircle, Clock, Radio, Bell } from 'lucide-react'
import { RecentActivity } from '@/hooks/useDashboardData'

interface ActivityFeedProps {
  data?: RecentActivity
  loading: boolean
  error: Error | null
}

const ACTIVITY_ICONS: Record<string, any> = {
  login_success: UserCheck,
  shift_broadcast: Radio,
  application_received: UserPlus,
  application_selected: CheckCircle,
  application_rejected: XCircle,
  hours_submitted: Clock,
  hours_approved: CheckCircle,
  shift_reminder: Bell
}

const ACTIVITY_COLORS: Record<string, string> = {
  login_success: 'bg-blue-100 text-blue-600',
  shift_broadcast: 'bg-purple-100 text-purple-600',
  application_received: 'bg-green-100 text-green-600',
  application_selected: 'bg-emerald-100 text-emerald-600',
  application_rejected: 'bg-red-100 text-red-600',
  hours_submitted: 'bg-orange-100 text-orange-600',
  hours_approved: 'bg-green-100 text-green-600',
  shift_reminder: 'bg-yellow-100 text-yellow-600'
}

export default function ActivityFeed({ data, loading, error }: ActivityFeedProps) {
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <p className="font-medium">Unable to load recent activity</p>
        <p className="text-sm mt-1">{error.message}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-4 bg-gray-200 rounded w-48 mb-6 animate-pulse"></div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!data || data.activities.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Activity</h3>
        <div className="text-center py-8">
          <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No recent activity</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Activity</h3>
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {data.activities.map((activity) => {
          const Icon = ACTIVITY_ICONS[activity.type] || Activity
          const colorClass = ACTIVITY_COLORS[activity.type] || 'bg-gray-100 text-gray-600'

          return (
            <div key={activity.id} className="flex gap-4 items-start">
              <div className={`p-2 rounded-full ${colorClass} flex-shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">{activity.actor.name}</span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </span>
                  {activity.shiftId && (
                    <>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-blue-600">Shift</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
