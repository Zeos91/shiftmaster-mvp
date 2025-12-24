import prisma from '../prisma.js'

/**
 * GET /api/dashboard/analytics
 * Returns aggregated metrics for shifts, broadcasts, applications, workers
 * Supports date range filtering
 */
export const getDashboardAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, siteId, roleRequired } = req.query

    // Default to last 30 days if no range provided
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(endDate) : new Date()

    // Build filter conditions
    const dateFilter = {
      createdAt: {
        gte: start,
        lte: end
      }
    }

    const shiftFilter = {
      date: {
        gte: start.toISOString().split('T')[0],
        lte: end.toISOString().split('T')[0]
      }
    }

    if (siteId) {
      shiftFilter.siteId = siteId
    }

    if (roleRequired) {
      shiftFilter.roleRequired = roleRequired
    }

    // Parallel aggregation queries
    const [
      totalShifts,
      shiftsByState,
      totalApplications,
      applicationsByStatus,
      totalWorkers,
      activeWorkers,
      recentAuditLogs,
      shiftsPerDay
    ] = await Promise.all([
      // Total shifts in period
      prisma.shift.count({ where: shiftFilter }),

      // Shifts grouped by state
      prisma.shift.groupBy({
        by: ['state'],
        where: shiftFilter,
        _count: { id: true }
      }),

      // Total applications in period
      prisma.shiftApplication.count({
        where: {
          ...dateFilter,
          shift: siteId ? { siteId } : undefined
        }
      }),

      // Applications grouped by status
      prisma.shiftApplication.groupBy({
        by: ['status'],
        where: {
          ...dateFilter,
          shift: siteId ? { siteId } : undefined
        },
        _count: { id: true }
      }),

      // Total workers
      prisma.worker.count(),

      // Active workers (with shifts in period)
      prisma.worker.count({
        where: {
          shifts: {
            some: shiftFilter
          }
        }
      }),

      // Recent audit activity
      prisma.auditLog.count({
        where: {
          timestamp: {
            gte: start,
            lte: end
          }
        }
      }),

      // Shifts per day trend
      prisma.$queryRaw`
        SELECT 
          DATE("date") as day,
          COUNT(*)::int as count,
          state
        FROM "Shift"
        WHERE "date" >= ${start.toISOString().split('T')[0]}
          AND "date" <= ${end.toISOString().split('T')[0]}
          ${siteId ? prisma.$queryRaw`AND "siteId" = ${siteId}` : prisma.$queryRaw``}
        GROUP BY DATE("date"), state
        ORDER BY day DESC
        LIMIT 90
      `
    ])

    // Calculate metrics
    const completionRate = totalShifts > 0
      ? (shiftsByState.find(s => s.state === 'completed')?._count?.id || 0) / totalShifts
      : 0

    const applicationAcceptanceRate = totalApplications > 0
      ? (applicationsByStatus.find(a => a.status === 'accepted')?._count?.id || 0) / totalApplications
      : 0

    return res.json({
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      },
      shifts: {
        total: totalShifts,
        byState: shiftsByState.reduce((acc, s) => {
          acc[s.state] = s._count.id
          return acc
        }, {}),
        completionRate: Math.round(completionRate * 100),
        trend: shiftsPerDay
      },
      applications: {
        total: totalApplications,
        byStatus: applicationsByStatus.reduce((acc, a) => {
          acc[a.status] = a._count.id
          return acc
        }, {}),
        acceptanceRate: Math.round(applicationAcceptanceRate * 100)
      },
      workers: {
        total: totalWorkers,
        active: activeWorkers,
        utilization: totalWorkers > 0 ? Math.round((activeWorkers / totalWorkers) * 100) : 0
      },
      activity: {
        auditLogs: recentAuditLogs
      }
    })
  } catch (err) {
    console.error('getDashboardAnalytics error:', err)
    return res.status(500).json({ error: 'Failed to fetch analytics', details: err.message })
  }
}

/**
 * GET /api/dashboard/history
 * Returns historical events (audit logs, shift changes, applications)
 * Supports pagination and filtering
 */
export const getDashboardHistory = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      entityType,
      action,
      actorId,
      page = 1,
      limit = 50
    } = req.query

    const pageNum = Math.max(1, parseInt(page))
    const pageSize = Math.min(100, Math.max(1, parseInt(limit)))
    const skip = (pageNum - 1) * pageSize

    // Build filter
    const where = {}

    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) where.timestamp.gte = new Date(startDate)
      if (endDate) where.timestamp.lte = new Date(endDate)
    }

    if (entityType) where.entityType = entityType
    if (action) where.action = action
    if (actorId) where.actorId = actorId

    // RBAC: limit visibility based on user role
    const user = req.user
    if (user.role === 'OPERATOR') {
      // Workers only see their own actions
      where.actorId = user.id
    } else if (user.role === 'SITE_MANAGER') {
      // Site managers see logs for their sites
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

    const [events, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: pageSize
      }),
      prisma.auditLog.count({ where })
    ])

    return res.json({
      events,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize)
      }
    })
  } catch (err) {
    console.error('getDashboardHistory error:', err)
    return res.status(500).json({ error: 'Failed to fetch history', details: err.message })
  }
}

/**
 * GET /api/dashboard/trends
 * Returns time-series data for various metrics
 */
export const getDashboardTrends = async (req, res) => {
  try {
    const { metric, interval = 'day', startDate, endDate, siteId } = req.query

    if (!metric) {
      return res.status(400).json({ error: 'metric parameter is required' })
    }

    if (!['shifts', 'workers', 'applications'].includes(metric)) {
      return res.status(400).json({ error: 'metric must be shifts, workers, or applications' })
    }

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(endDate) : new Date()

    let trendData = []

    switch (metric) {
      case 'shifts':
        trendData = await prisma.$queryRaw`
          SELECT 
            DATE("date") as period,
            COUNT(*)::int as value,
            state as category
          FROM "Shift"
          WHERE "date" >= ${start.toISOString().split('T')[0]}
            AND "date" <= ${end.toISOString().split('T')[0]}
            ${siteId ? prisma.$queryRaw`AND "siteId" = ${siteId}` : prisma.$queryRaw``}
          GROUP BY DATE("date"), state
          ORDER BY period ASC
        `
        break

      case 'applications':
        trendData = await prisma.$queryRaw`
          SELECT 
            DATE("appliedAt") as period,
            COUNT(*)::int as value,
            status as category
          FROM "ShiftApplication"
          WHERE "appliedAt" >= ${start}
            AND "appliedAt" <= ${end}
          GROUP BY DATE("appliedAt"), status
          ORDER BY period ASC
        `
        break

      case 'activity':
        trendData = await prisma.$queryRaw`
          SELECT 
            DATE("timestamp") as period,
            COUNT(*)::int as value,
            action as category
          FROM "AuditLog"
          WHERE "timestamp" >= ${start}
            AND "timestamp" <= ${end}
          GROUP BY DATE("timestamp"), action
          ORDER BY period ASC
        `
        break

      default:
        return res.status(400).json({ error: 'Invalid metric type' })
    }

    return res.json({
      metric,
      interval,
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      },
      data: trendData
    })
  } catch (err) {
    console.error('getDashboardTrends error:', err)
    return res.status(500).json({ error: 'Failed to fetch trends', details: err.message })
  }
}
