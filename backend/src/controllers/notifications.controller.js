import prisma from '../prisma.js'

// Helper: Create a notification for a worker
export const createNotification = async ({ workerId, shiftId, title, message, type }) => {
  try {
    await prisma.notification.create({
      data: {
        workerId,
        shiftId,
        title,
        message,
        type
      }
    })
  } catch (err) {
    console.error('Failed to create notification:', err)
    // Non-blocking — don't throw
  }
}

// GET notifications for current user
export const getNotifications = async (req, res) => {
  try {
    const { unread, limit = 50, offset = 0 } = req.query
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const where = { workerId: userId }
    if (unread === 'true') {
      where.isRead = false
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          shift: {
            select: {
              id: true,
              date: true,
              startTime: true,
              endTime: true,
              roleRequired: true,
              state: true,
              site: {
                select: { id: true, name: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.notification.count({ where })
    ])

    const unreadCount = await prisma.notification.count({
      where: { workerId: userId, isRead: false }
    })

    return res.json({
      notifications,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      },
      unreadCount
    })
  } catch (err) {
    console.error('getNotifications error:', err)
    return res.status(500).json({ error: 'Failed to fetch notifications', details: err.message })
  }
}

// Mark single notification as read
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const notification = await prisma.notification.findUnique({ where: { id } })

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' })
    }

    // Verify ownership
    if (notification.workerId !== userId) {
      return res.status(403).json({ error: 'Cannot modify other workers\' notifications' })
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    })

    return res.json(updated)
  } catch (err) {
    console.error('markAsRead error:', err)
    return res.status(500).json({ error: 'Failed to mark notification as read', details: err.message })
  }
}

// Mark all notifications as read for current user
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const result = await prisma.notification.updateMany({
      where: { workerId: userId, isRead: false },
      data: { isRead: true }
    })

    return res.json({
      message: 'All notifications marked as read',
      count: result.count
    })
  } catch (err) {
    console.error('markAllAsRead error:', err)
    return res.status(500).json({ error: 'Failed to mark all notifications as read', details: err.message })
  }
}

// Get unread count (for badge)
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const count = await prisma.notification.count({
      where: { workerId: userId, isRead: false }
    })

    return res.json({ unreadCount: count })
  } catch (err) {
    console.error('getUnreadCount error:', err)
    return res.status(500).json({ error: 'Failed to get unread count', details: err.message })
  }
}
