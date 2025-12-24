// @ts-nocheck
import React, { createContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import api from '../api/client'

export const NotificationContext = createContext(null)

export const NotificationProvider = ({ children }) => {
  const auth = useAuth()
  const token = auth?.token
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch notifications
  const fetchNotifications = useCallback(async (unreadOnly = false) => {
    if (!token) return

    try {
      setLoading(true)
      const params = unreadOnly ? { unread: 'true', limit: 100 } : { limit: 100 }
      const res = await api.get('/notifications', { params })
      setNotifications(res.data.notifications || [])
      setUnreadCount(res.data.unreadCount || 0)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  // Fetch unread count only (lighter endpoint for badge)
  const fetchUnreadCount = useCallback(async () => {
    if (!token) return

    try {
      const res = await api.get('/notifications/unread-count')
      setUnreadCount(res.data.unreadCount || 0)
    } catch (err) {
      console.error('Failed to fetch unread count:', err)
    }
  }, [token])

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    if (!token) return

    try {
      await api.post(`/notifications/${notificationId}/read`)
      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }, [token])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!token) return

    try {
      await api.post('/notifications/read-all')
      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true }))
      )
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err)
    }
  }, [token])

  // Setup polling interval (every 20 seconds for lightweight unread count)
  useEffect(() => {
    if (!token) return

    // Fetch full notifications on initial load
    fetchNotifications()

    // Then poll for unread count every 20 seconds
    const pollInterval = setInterval(() => {
      fetchUnreadCount()
    }, 20000) // 20 seconds

    return () => clearInterval(pollInterval)
  }, [token, fetchNotifications, fetchUnreadCount])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        error,
        fetchNotifications,
        fetchUnreadCount,
        markAsRead,
        markAllAsRead
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}
