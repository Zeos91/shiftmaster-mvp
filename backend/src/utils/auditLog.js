import prisma from '../prisma.js'
import { emitDashboardEvent, DashboardEvents } from './dashboardEvents.js'

/**
 * Log an audit event. Called by controllers after critical actions.
 * Immutable — cannot be edited or deleted after creation.
 */
export const logAudit = async ({
  actorId,
  action,
  entityType,
  entityId,
  metadata,
  ipAddress,
  userAgent
}) => {
  try {
    const entry = await prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        metadata: metadata || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null
      }
    })

    emitDashboardEvent(DashboardEvents.ACTIVITY_LOGGED, {
      id: entry.id,
      actorId,
      action,
      entityType,
      entityId,
      metadata: metadata || null,
      timestamp: entry.timestamp
    })
  } catch (err) {
    console.error('Failed to log audit event:', err)
    // Don't throw — audit failure should not block main operations
  }
}

/**
 * Fetch audit logs with permissions checking.
 * Workers see only their own actions.
 * Managers see logs for shifts/workers they manage.
 */
export const fetchAuditLogs = async (req, res) => {
  try {
    const { actorId, workerId, shiftId, entityType, action, startDate, endDate, page, limit } = req.query
    const user = req.user

    if (!user) return res.status(401).json({ error: 'Not authenticated' })

    const pageNum = Math.max(1, parseInt(page) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(limit) || 20))
    const skip = (pageNum - 1) * pageSize

    let where = {}

    // Determine what user can see
    if (user.role === 'OPERATOR') {
      // Workers can only see their own audit logs
      where.actorId = user.id
    } else if (user.role === 'SITE_MANAGER') {
      // Site managers can see:
      // 1. Their own actions
      // 2. Logs for shifts on sites they manage
      // 3. Logs for workers who worked shifts they manage
      // For simplicity, check if any shifts match their managed sites
      const managedSiteIds = (await prisma.site.findMany({
        where: { managerId: user.id },
        select: { id: true }
      })).map(s => s.id)

      where.OR = [
        { actorId: user.id },
        {
          entityType: 'shift',
          entityId: {
            in: (await prisma.shift.findMany({
              where: { siteId: { in: managedSiteIds } },
              select: { id: true }
            })).map(s => s.id)
          }
        }
      ]
    }
    // PROJECT_MANAGER and COMPANY_ADMIN can see all logs

    // Apply additional filters
    if (actorId) where.actorId = actorId
    if (entityType) where.entityType = entityType
    if (action) where.action = action
    if (shiftId) {
      where.entityType = 'shift'
      where.entityId = shiftId
    }
    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) where.timestamp.gte = new Date(startDate)
      if (endDate) where.timestamp.lte = new Date(endDate)
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { actor: { select: { id: true, name: true, email: true } } },
        orderBy: { timestamp: 'desc' },
        skip,
        take: pageSize
      }),
      prisma.auditLog.count({ where })
    ])

    return res.json({
      logs,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize)
      }
    })
  } catch (err) {
    console.error('fetchAuditLogs error:', err)
    return res.status(500).json({ error: 'Failed to fetch audit logs', details: err.message })
  }
}
