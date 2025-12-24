'use client'

import { useState } from 'react'
import { Calendar } from 'lucide-react'

interface DateFilterProps {
  onApply: (from: string, to: string) => void
}

export default function DateFilter({ onApply }: DateFilterProps) {
  const [from, setFrom] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
  })

  const [to, setTo] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })

  const handleApply = () => {
    onApply(from, to)
  }

  const handleReset = () => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    setFrom(date.toISOString().split('T')[0])
    setTo(new Date().toISOString().split('T')[0])
    onApply(date.toISOString().split('T')[0], new Date().toISOString().split('T')[0])
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filter by Date:</span>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="from-date" className="text-sm text-gray-600">From:</label>
          <input
            id="from-date"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="to-date" className="text-sm text-gray-600">To:</label>
          <input
            id="to-date"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={handleApply}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Apply Filter
        </button>

        <button
          onClick={handleReset}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  )
}
