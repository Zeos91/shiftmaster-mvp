'use client'

import { ReactNode } from 'react'
import { Trash2, GripVertical } from 'lucide-react'

interface DashboardWidgetProps {
  id: string
  title: string
  children: ReactNode
  onRemove?: (id: string) => void
  className?: string
}

export default function DashboardWidget({
  id,
  title,
  children,
  onRemove,
  className = ''
}: DashboardWidgetProps) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-gray-400 cursor-move drag-handle" />
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        </div>
        {onRemove && (
          <button
            onClick={() => onRemove(id)}
            className="text-gray-400 hover:text-red-600 transition-colors"
            title="Remove widget"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  )
}
