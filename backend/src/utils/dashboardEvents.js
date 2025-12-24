// Helper to emit SSE events from any controller

import getDashboardStreamService from '../services/DashboardStreamService.js'

export function emitDashboardEvent(eventName, data, priority = 'info') {
  try {
    const streamService = getDashboardStreamService()
    streamService.broadcast(eventName, {
      ...data,
      emittedAt: new Date().toISOString()
    }, priority)
  } catch (error) {
    console.error('Error emitting dashboard event:', error)
    // Silently fail - SSE is optional for dashboard, not critical
  }
}

export function sendNotification(eventName, data, options) {
  try {
    const streamService = getDashboardStreamService()
    streamService.sendNotification(eventName, {
      ...data,
      emittedAt: new Date().toISOString()
    }, options)
  } catch (error) {
    console.error('Error sending notification:', error)
  }
}

// Event types
export const DashboardEvents = {
  SHIFT_CREATED: 'shift.created',
  SHIFT_BROADCASTED: 'shift.broadcasted',
  SHIFT_APPLIED: 'shift.applied',
  SHIFT_CONFIRMED: 'shift.confirmed',
  SHIFT_COMPLETED: 'shift.completed',
  WORKER_UPDATED: 'worker.updated',
  ACTIVITY_LOGGED: 'activity.logged'
}

// Alert/Notification priorities
export const NotificationPriority = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical'
}
