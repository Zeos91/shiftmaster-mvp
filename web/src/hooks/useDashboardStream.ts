'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'

export type ConnectionStatus = 'connected' | 'reconnecting' | 'polling' | 'disconnected'

interface UseDashboardStreamOptions {
  enabled?: boolean
  onStatusChange?: (status: ConnectionStatus) => void
}

const POLLING_INTERVAL = 30000 // 30 seconds fallback
const RECONNECT_BASE_DELAY = 1000 // 1 second
const RECONNECT_MAX_DELAY = 30000 // 30 seconds
const RECONNECT_BACKOFF = 1.5

/**
 * Hook for real-time dashboard updates via SSE with polling fallback
 * 
 * Features:
 * - Listens to /api/dashboard/stream for real-time events
 * - Automatically invalidates React Query on relevant events
 * - Falls back to polling if SSE unavailable
 * - Reconnects with exponential backoff on failure
 * - Pauses on tab visibility hidden
 * - Handles offline/online events
 */
export function useDashboardStream({
  enabled = true,
  onStatusChange
}: UseDashboardStreamOptions = {}) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const queryClient = useQueryClient()

  const eventSourceRef = useRef<EventSource | null>(null)
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Update status and call callback
  const updateStatus = useCallback((newStatus: ConnectionStatus) => {
    setStatus(newStatus)
    onStatusChange?.(newStatus)
  }, [onStatusChange])

  // Handle SSE events
  const handleSSEEvent = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        const eventType = (event as any).type

        // Invalidate relevant queries based on event type
        if (eventType?.startsWith('shift.') || eventType === 'activity.logged') {
          queryClient.invalidateQueries({
            queryKey: ['dashboard', 'summary']
          })
          queryClient.invalidateQueries({
            queryKey: ['dashboard', 'shift-metrics']
          })
          queryClient.invalidateQueries({
            queryKey: ['dashboard', 'activity']
          })
        }

        if (eventType === 'worker.updated') {
          queryClient.invalidateQueries({
            queryKey: ['dashboard', 'summary']
          })
          queryClient.invalidateQueries({
            queryKey: ['dashboard', 'worker-activity']
          })
        }

        // Reset reconnect attempts on successful event
        reconnectAttemptsRef.current = 0
      } catch (error) {
        console.error('Error processing SSE event:', error)
      }
    },
    [queryClient]
  )

  // Connect to SSE
  const connectSSE = useCallback(() => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        updateStatus('disconnected')
        return
      }

      // Create EventSource with auth header
      const eventSource = new EventSource('/api/dashboard/stream', {
        // Note: credentials not supported with EventSource, using header in interceptor
      })

      // Add token to headers via fetch interceptor
      const originalHeaders = api.defaults.headers.common
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`

      eventSource.addEventListener('connected', () => {
        updateStatus('connected')
        reconnectAttemptsRef.current = 0

        // Clear polling if active
        if (pollingTimeoutRef.current) {
          clearTimeout(pollingTimeoutRef.current)
          pollingTimeoutRef.current = null
        }
      })

      eventSource.addEventListener('shift.created', handleSSEEvent as any)
      eventSource.addEventListener('shift.broadcasted', handleSSEEvent as any)
      eventSource.addEventListener('shift.applied', handleSSEEvent as any)
      eventSource.addEventListener('shift.confirmed', handleSSEEvent as any)
      eventSource.addEventListener('shift.completed', handleSSEEvent as any)
      eventSource.addEventListener('worker.updated', handleSSEEvent as any)
      eventSource.addEventListener('activity.logged', handleSSEEvent as any)

      eventSource.onerror = () => {
        eventSource.close()
        eventSourceRef.current = null
        startPollingFallback()
      }

      eventSourceRef.current = eventSource
    } catch (error) {
      console.error('SSE connection error:', error)
      startPollingFallback()
    }
  }, [updateStatus, handleSSEEvent])

  // Start polling fallback
  const startPollingFallback = useCallback(() => {
    updateStatus('polling')

    const poll = async () => {
      try {
        // Poll all dashboard endpoints
        await Promise.all([
          api.get('/api/dashboard/summary'),
          api.get('/api/dashboard/shift-metrics'),
          api.get('/api/dashboard/worker-activity'),
          api.get('/api/dashboard/activity')
        ])

        // Invalidate all queries to trigger refetch
        queryClient.invalidateQueries({
          queryKey: ['dashboard']
        })

        // Schedule next poll
        pollingTimeoutRef.current = setTimeout(poll, POLLING_INTERVAL)
      } catch (error) {
        console.error('Polling error:', error)

        // Attempt SSE reconnection
        if (reconnectAttemptsRef.current < 5) {
          scheduleReconnect()
        } else {
          updateStatus('disconnected')
        }
      }
    }

    poll()
  }, [updateStatus, queryClient])

  // Reconnect with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (!enabled) return

    updateStatus('reconnecting')

    const delay = Math.min(
      RECONNECT_BASE_DELAY * Math.pow(RECONNECT_BACKOFF, reconnectAttemptsRef.current),
      RECONNECT_MAX_DELAY
    )

    reconnectAttemptsRef.current++

    reconnectTimeoutRef.current = setTimeout(() => {
      connectSSE()
    }, delay)
  }, [enabled, updateStatus, connectSSE])

  // Handle visibility changes (pause/resume)
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      // Tab hidden - close SSE, keep polling
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    } else {
      // Tab visible - try to reconnect SSE
      if (!eventSourceRef.current) {
        connectSSE()
      }
    }
  }, [connectSSE])

  // Handle online/offline
  const handleOnline = useCallback(() => {
    if (!eventSourceRef.current && !pollingTimeoutRef.current) {
      connectSSE()
    }
  }, [connectSSE])

  const handleOffline = useCallback(() => {
    updateStatus('disconnected')
  }, [updateStatus])

  // Initialize on mount
  useEffect(() => {
    if (!enabled) {
      updateStatus('disconnected')
      return
    }

    // Check if online
    if (!navigator.onLine) {
      updateStatus('disconnected')
      return
    }

    // Start SSE connection
    connectSSE()

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)

      // Close SSE
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }

      // Clear timeouts
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current)
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [enabled, connectSSE, handleVisibilityChange, handleOnline, handleOffline, updateStatus])

  return {
    status,
    isLive: status === 'connected',
    isPolling: status === 'polling',
    isReconnecting: status === 'reconnecting',
    isDisconnected: status === 'disconnected'
  }
}
