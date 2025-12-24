'use client'

import { useDashboardStream, ConnectionStatus } from '@/hooks/useDashboardStream'

interface RealtimeIndicatorProps {
  enabled?: boolean
}

export default function RealtimeIndicator({ enabled = true }: RealtimeIndicatorProps) {
  const { status } = useDashboardStream({ enabled })

  const statusConfig: Record<ConnectionStatus, { icon: string; label: string; color: string }> = {
    connected: {
      icon: '🟢',
      label: 'Live',
      color: 'text-green-600'
    },
    reconnecting: {
      icon: '🟡',
      label: 'Reconnecting',
      color: 'text-yellow-600'
    },
    polling: {
      icon: '🟡',
      label: 'Polling',
      color: 'text-yellow-600'
    },
    disconnected: {
      icon: '⚪',
      label: 'Offline',
      color: 'text-gray-500'
    }
  }

  const config = statusConfig[status]

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 ${config.color}`}>
      <span className="text-lg">{config.icon}</span>
      <span className="text-sm font-medium">{config.label}</span>
    </div>
  )
}
