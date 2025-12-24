import express from 'express'
import { verifyToken } from '../middleware/auth.js'
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount
} from '../controllers/notifications.controller.js'

const router = express.Router()

// Get all notifications for current user
router.get('/', verifyToken, getNotifications)

// Get unread count (for badge)
router.get('/unread-count', verifyToken, getUnreadCount)

// Mark single notification as read
router.post('/:id/read', verifyToken, markAsRead)

// Mark all notifications as read
router.post('/read-all', verifyToken, markAllAsRead)

export default router
