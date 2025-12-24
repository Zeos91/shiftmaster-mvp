import prisma from '../prisma.js'

// Helper: Parse and validate date range
const parseDateRange = (from, to) => {
  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(now.getDate() - 30)

  const fromDate = from ? new Date(from) : thirtyDaysAgo
  const toDate = to ? new Date(to) : now

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    throw new Error('Invalid date format. Use YYYY-MM-DD')
  }

  if (fromDate > toDate) {
    throw new Error('from date must be before to date')
  }

  return {
    from: fromDate.toISOString().split('T')[0],
    to: toDate.toISOString().split('T')[0]
  }
}

// Helper: Check if user is manager
const requireManager = (user) => {
  const managerRoles = ['SITE_MANAGER', 'PROJECT_MANAGER', 'COMPANY_ADMIN']
  if (!managerRoles.includes(user.role)) {
    throw new Error('Manager access required')
  }
}

// GET /api/dashboard/summary
export const getSummary = async (req, res) => {
  try {
    requireManager(req.user)
    const { from, to } = parseDateRange(req.query.from, req.query.to)

    // Get date range for "today"
    const today = new Date().toISOString().split('T')[0]
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    const nextWeekDate = nextWeek.toISOString().split('T')[0]

    // Total workers
    const totalWorkers = await prisma.worker.count()

    // Active workers (available)
    const activeWorkers = await prisma.worker.count({
      where: { availabilityStatus: true }
    })

    // Total shifts in date range
    const totalShifts = await prisma.shift.count({
      where: {
        date: { gte: from, lte: to }
      }
    })

    // Completed shifts
    const completedShifts = await prisma.shift.count({
      where: {
        date: { gte: from, lte: to },
        state: 'completed'
      }
    })

    // Cancelled shifts (we'll use deleted or specific state if exists)
    const cancelledShifts = 0 // Placeholder - add if you have cancelled state

    // Pending broadcasts
    const pendingBroadcasts = await prisma.shift.count({
      where: {
        date: { gte: from, lte: to },
        state: 'broadcasted'
      }
    })

    // Open applications (applied status)
    const openApplications = await prisma.shiftApplication.count({
      where: {
        status: 'applied',
        shift: {
          date: { gte: from, lte: to }
        }
      }
    })

    // Today's shifts
    const todaysShifts = await prisma.shift.count({
      where: { date: today }
    })

    // Upcoming shifts (next 7 days)
    const upcomingShifts = await prisma.shift.count({
      where: {
        date: { gte: today, lte: nextWeekDate }
      }
    })

    return res.json({
      period: { from, to },
      totalWorkers,
      activeWorkers,
      totalShifts,
      completedShifts,
      cancelledShifts,
      pendingBroadcasts,
      openApplications,
      todaysShifts,
      upcomingShifts
    })
  } catch (err) {
    if (err.message === 'Manager access required') {
      return res.status(403).json({ error: err.message })
    }
    if (err.message.includes('Invalid date') || err.message.includes('from date')) {
      return res.status(400).json({ error: err.message })
    }
    console.error('getSummary error:', err)
    return res.status(500).json({ error: 'Failed to fetch dashboard summary', details: err.message })
  }
}

// GET /api/dashboard/shift-metrics
export const getShiftMetrics = async (req, res) => {
  try {
    requireManager(req.user)
    const { from, to } = parseDateRange(req.query.from, req.query.to)

    // Get all shifts in date range
    const shifts = await prisma.shift.findMany({
      where: {
        date: { gte: from, lte: to }
      },
      include: {
        applications: true
      }
    })

    // Get all applications in date range
    const applications = await prisma.shiftApplication.findMany({
      where: {
        shift: {
          date: { gte: from, lte: to }
        }
      },
      include: {
        shift: true
      }
    })

    // Calculate avgApplicationsPerShift
    const totalApplications = applications.length
    const shiftsWithApplications = shifts.filter(s => s.applications.length > 0).length
    const avgApplicationsPerShift = shiftsWithApplications > 0
      ? (totalApplications / shiftsWithApplications).toFixed(2)
      : 0

    // Calculate avgTimeToAssignment (broadcast → confirmation)
    const assignedShifts = shifts.filter(s => s.state === 'assigned' && s.createdAt)
    let totalAssignmentTime = 0
    let assignmentCount = 0

    for (const shift of assignedShifts) {
      if (shift.createdAt && shift.updatedAt) {
        const timeDiff = new Date(shift.updatedAt) - new Date(shift.createdAt)
        totalAssignmentTime += timeDiff
        assignmentCount++
      }
    }

    const avgTimeToAssignment = assignmentCount > 0
      ? Math.round(totalAssignmentTime / assignmentCount / (1000 * 60 * 60)) // hours
      : 0

    // Calculate fillRate (% of broadcasted shifts that were assigned)
    const broadcastedShifts = shifts.filter(s => s.state === 'broadcasted' || s.state === 'assigned' || s.state === 'completed')
    const filledShifts = shifts.filter(s => s.state === 'assigned' || s.state === 'completed')
    const fillRate = broadcastedShifts.length > 0
      ? ((filledShifts.length / broadcastedShifts.length) * 100).toFixed(2)
      : 0

    // Calculate rejectionRate (% of applications rejected)
    const rejectedApplications = applications.filter(a => a.status === 'rejected').length
    const rejectionRate = totalApplications > 0
      ? ((rejectedApplications / totalApplications) * 100).toFixed(2)
      : 0

    // Calculate completionRate
    const completedShifts = shifts.filter(s => s.state === 'completed').length
    const completionRate = shifts.length > 0
      ? ((completedShifts / shifts.length) * 100).toFixed(2)
      : 0

    return res.json({
      period: { from, to },
      totalShifts: shifts.length,
      totalApplications,
      avgApplicationsPerShift: parseFloat(avgApplicationsPerShift),
      avgTimeToAssignment: `${avgTimeToAssignment}h`,
      fillRate: `${fillRate}%`,
      rejectionRate: `${rejectionRate}%`,
      completionRate: `${completionRate}%`
    })
  } catch (err) {
    if (err.message === 'Manager access required') {
      return res.status(403).json({ error: err.message })
    }
    if (err.message.includes('Invalid date') || err.message.includes('from date')) {
      return res.status(400).json({ error: err.message })
    }
    console.error('getShiftMetrics error:', err)
    return res.status(500).json({ error: 'Failed to fetch shift metrics', details: err.message })
  }
}

// GET /api/dashboard/worker-activity
export const getWorkerActivity = async (req, res) => {
  try {
    requireManager(req.user)
    const { from, to } = parseDateRange(req.query.from, req.query.to)

    // Most active workers (top 10 by shift count)
    const workerShiftCounts = await prisma.shift.groupBy({
      by: ['workerId'],
      where: {
        date: { gte: from, lte: to }
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    })

    // Get worker details for top workers
    const workerIds = workerShiftCounts.map(w => w.workerId)
    const workers = await prisma.worker.findMany({
      where: { id: { in: workerIds } },
      select: {
        id: true,
        name: true,
        email: true,
        roles: true
      }
    })

    const mostActiveWorkers = workerShiftCounts.map(wsc => {
      const worker = workers.find(w => w.id === wsc.workerId)
      return {
        workerId: wsc.workerId,
        workerName: worker?.name || 'Unknown',
        workerEmail: worker?.email,
        shiftCount: wsc._count.id
      }
    })

    // Workers by role breakdown
    const allWorkers = await prisma.worker.findMany({
      select: { roles: true }
    })

    const roleBreakdown = {}
    allWorkers.forEach(worker => {
      worker.roles.forEach(role => {
        roleBreakdown[role] = (roleBreakdown[role] || 0) + 1
      })
    })

    // Workers by status
    const availableCount = await prisma.worker.count({
      where: { availabilityStatus: true }
    })
    const unavailableCount = await prisma.worker.count({
      where: { availabilityStatus: false }
    })

    return res.json({
      period: { from, to },
      mostActiveWorkers,
      workersByRole: roleBreakdown,
      workersByStatus: {
        available: availableCount,
        unavailable: unavailableCount
      },
      availabilityStats: {
        availablePercentage: allWorkers.length > 0
          ? ((availableCount / allWorkers.length) * 100).toFixed(2) + '%'
          : '0%',
        total: allWorkers.length
      }
    })
  } catch (err) {
    if (err.message === 'Manager access required') {
      return res.status(403).json({ error: err.message })
    }
    if (err.message.includes('Invalid date') || err.message.includes('from date')) {
      return res.status(400).json({ error: err.message })
    }
    console.error('getWorkerActivity error:', err)
    return res.status(500).json({ error: 'Failed to fetch worker activity', details: err.message })
  }
}

// GET /api/dashboard/activity
export const getRecentActivity = async (req, res) => {
  try {
    requireManager(req.user)
    const limit = parseInt(req.query.limit) || 20

    // Get recent audit logs as activity feed
    const auditLogs = await prisma.auditLog.findMany({
      take: limit,
      orderBy: { timestamp: 'desc' },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    })

    // Transform audit logs into activity feed
    const activities = auditLogs.map(log => {
      let description = ''
      let type = log.action

      switch (log.action) {
        case 'shift_created':
          description = `${log.actor?.name || 'Manager'} created a shift`
          break
        case 'shift_broadcasted':
          description = `${log.actor?.name || 'Manager'} broadcasted a shift`
          break
        case 'shift_applied':
          description = `${log.actor?.name || 'Worker'} applied to a shift`
          break
        case 'shift_application_accepted':
          description = `${log.actor?.name || 'Manager'} confirmed a worker for shift`
          break
        case 'shift_application_rejected':
          description = `Application rejected for shift`
          break
        case 'shift_completed':
          description = `Shift marked as completed`
          break
        case 'shift_approved':
          description = `${log.actor?.name || 'Manager'} approved shift hours`
          break
        case 'login_success':
          description = `${log.actor?.name || 'User'} logged in`
          break
        case 'pdf_generated':
          description = `${log.actor?.name || 'User'} generated a report`
          break
        default:
          description = `${log.action.replace(/_/g, ' ')}`
      }

      return {
        id: log.id,
        type: log.action,
        description,
        timestamp: log.timestamp,
        actor: {
          id: log.actor?.id,
          name: log.actor?.name,
          role: log.actor?.role
        },
        shiftId: log.entityType === 'shift' ? log.entityId : null,
        metadata: log.metadata
      }
    })

    return res.json({
      activities,
      total: activities.length
    })
  } catch (err) {
    if (err.message === 'Manager access required') {
      return res.status(403).json({ error: err.message })
    }
    console.error('getRecentActivity error:', err)
    return res.status(500).json({ error: 'Failed to fetch recent activity', details: err.message })
  }
}
