import prisma from '../prisma.js'
import { logAudit } from '../utils/auditLog.js'

// Validation helpers
const validateRoleRequiredField = (roleRequired) => {
  const validRoles = ['crane_operator', 'safety_assistant', 'signalman', 'site_manager', 'safety_officer', 'general_worker']
  return validRoles.includes(roleRequired)
}

const validateShiftState = (state) => {
  const validStates = ['assigned', 'broadcasted', 'applied', 'pending_approval', 'completed']
  return validStates.includes(state)
}

const validateEquipmentIdAllowed = (roleRequired, equipmentId) => {
  // equipmentId is only allowed for crane_operator and signalman
  if (equipmentId) {
    const allowedRoles = ['crane_operator', 'signalman']
    if (!allowedRoles.includes(roleRequired)) {
      return false
    }
  }
  return true
}

const validateWorkerHasRole = async (workerId, roleRequired) => {
  const worker = await prisma.worker.findUnique({ where: { id: workerId } })
  if (!worker) return false
  return worker.roles.includes(roleRequired)
}

// CREATE a shift
export const createShift = async (req, res) => {
  try {
    const {
      startTime,
      endTime,
      hours,
      workerId,
      siteId,
      roleRequired,
      equipmentId,
      state,
      operatorRate,
      siteRate,
      overrideOperatorRate,
      overrideSiteRate,
      date
    } = req.body

    // Validate required fields
    if (!startTime || !endTime || !workerId || !siteId || !roleRequired) {
      return res.status(400).json({ 
        error: "Missing required fields. Must include: startTime, endTime, workerId, siteId, roleRequired" 
      })
    }

    // Validate roleRequired is a valid JobRole
    if (!validateRoleRequiredField(roleRequired)) {
      return res.status(400).json({ 
        error: "Invalid roleRequired. Must be one of: crane_operator, safety_assistant, signalman, site_manager, safety_officer, general_worker" 
      })
    }

    // Validate equipmentId is only used for allowed roles
    if (!validateEquipmentIdAllowed(roleRequired, equipmentId)) {
      return res.status(400).json({ 
        error: "equipmentId is only allowed for crane_operator or signalman roles" 
      })
    }

    // Validate worker has the required role
    const workerHasRole = await validateWorkerHasRole(workerId, roleRequired)
    if (!workerHasRole) {
      return res.status(400).json({ 
        error: `Worker does not have the required role: ${roleRequired}` 
      })
    }

    // Validate state if provided
    const shiftState = state || 'assigned'
    if (!validateShiftState(shiftState)) {
      return res.status(400).json({ 
        error: "Invalid state. Must be one of: assigned, broadcasted, applied, pending_approval, completed" 
      })
    }

    // Calculate hours if not provided
    let calculatedHours = hours
    if (!hours) {
      const start = new Date(startTime)
      const end = new Date(endTime)
      calculatedHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    }

    // Calculate date if not provided (YYYY-MM-DD format)
    let shiftDate = date
    if (!date) {
      const start = new Date(startTime)
      shiftDate = start.toISOString().split('T')[0]
    }

    const shift = await prisma.shift.create({
      data: {
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        date: shiftDate,
        hours: calculatedHours,
        workerId,
        siteId,
        roleRequired,
        equipmentId: equipmentId || null,
        state: shiftState,
        operatorRate: operatorRate ?? 0,
        siteRate: siteRate ?? 0,
        overrideOperatorRate: overrideOperatorRate ?? null,
        overrideSiteRate: overrideSiteRate ?? null
      },
      include: {
        worker: true,
        site: true,
        crane: true,
        approvedBy: true
      }
    })

    // Log audit event
    await logAudit({
      actorId: req.user?.id,
      action: 'shift_created',
      entityType: 'shift',
      entityId: shift.id,
      metadata: {
        workerId,
        siteId,
        roleRequired,
        hours: calculatedHours,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString()
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })

    return res.status(201).json(shift)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Failed to create shift", details: err.message })
  }
}

// UPDATE shift (partial update)
export const updateShift = async (req, res) => {
  try {
    const { id } = req.params
    const {
      approved,
      state,
      startTime,
      endTime,
      hours,
      workerId,
      siteId,
      roleRequired,
      equipmentId,
      date,
      overrideOperatorRate,
      overrideSiteRate
    } = req.body

    // Fetch existing shift to enforce edit rules
    const shift = await prisma.shift.findUnique({ where: { id } })
    if (!shift) return res.status(404).json({ error: 'Shift not found' })

    // Workers cannot edit approved shifts unless overrideEdit is true
    // Workers cannot edit locked shifts
    if (shift.locked && req.user.role === 'OPERATOR') {
      return res.status(409).json({ error: 'Shift is locked and cannot be edited' })
    }

    // Build data object dynamically
    const data = {}

    // Only managers may change approval state
    const managerRoles = ['SITE_MANAGER', 'PROJECT_MANAGER', 'COMPANY_ADMIN']
    if (approved !== undefined) {
      if (!managerRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Only managers can change approval state' })
      }
      data.approved = approved
      data.approvedById = approved ? req.user.id : null
    }

    // Validate and update state if provided
    if (state !== undefined) {
      if (!validateShiftState(state)) {
        return res.status(400).json({ 
          error: "Invalid state. Must be one of: assigned, broadcasted, applied, pending_approval, completed" 
        })
      }
      data.state = state
    }

    // Validate and update roleRequired if provided
    if (roleRequired !== undefined) {
      if (!validateRoleRequiredField(roleRequired)) {
        return res.status(400).json({ 
          error: "Invalid roleRequired. Must be one of: crane_operator, safety_assistant, signalman, site_manager, safety_officer, general_worker" 
        })
      }
      // Validate worker has the new role
      const targetWorkerId = workerId || shift.workerId
      const workerHasRole = await validateWorkerHasRole(targetWorkerId, roleRequired)
      if (!workerHasRole) {
        return res.status(400).json({ 
          error: `Worker does not have the required role: ${roleRequired}` 
        })
      }
      data.roleRequired = roleRequired
    }

    // Validate equipmentId constraints if updating roleRequired
    if (equipmentId !== undefined || roleRequired) {
      const targetRole = roleRequired || shift.roleRequired
      const targetEquipmentId = equipmentId !== undefined ? equipmentId : shift.equipmentId
      if (!validateEquipmentIdAllowed(targetRole, targetEquipmentId)) {
        return res.status(400).json({ 
          error: "equipmentId is only allowed for crane_operator or signalman roles" 
        })
      }
      if (equipmentId !== undefined) {
        data.equipmentId = equipmentId
      }
    }

    if (startTime) data.startTime = new Date(startTime)
    if (endTime) data.endTime = new Date(endTime)
    if (hours !== undefined) data.hours = hours
    if (date) data.date = date
    if (workerId) data.workerId = workerId
    if (siteId) data.siteId = siteId
    if (overrideOperatorRate !== undefined) data.overrideOperatorRate = overrideOperatorRate
    if (overrideSiteRate !== undefined) data.overrideSiteRate = overrideSiteRate

    const updatedShift = await prisma.shift.update({
      where: { id },
      data,
      include: {
        worker: true,
        site: true,
        crane: true,
        approvedBy: true
      }
    })

    // Log audit event
    await logAudit({
      actorId: req.user?.id,
      action: 'shift_updated',
      entityType: 'shift',
      entityId: id,
      metadata: {
        changes: data,
        before: {
          state: shift.state,
          approved: shift.approved,
          locked: shift.locked
        },
        after: {
          state: updatedShift.state,
          approved: updatedShift.approved,
          locked: updatedShift.locked
        }
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })

    return res.json(updatedShift)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Failed to update shift", details: err.message })
  }
}

// GET all shifts
export const getShifts = async (req, res) => {
  try {
    const shifts = await prisma.shift.findMany({
      include: {
        worker: true,
        site: true,
        crane: true,
        approvedBy: true
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json(shifts)
  } catch (err) {
    console.error('getShifts error:', err)
    res.status(500).json({ error: 'Failed to fetch shifts', details: err.message })
  }
}

// APPROVE shift
export const approveShift = async (req, res) => {
  try {
    const { id } = req.params

    const shift = await prisma.shift.findUnique({ where: { id } })
    if (!shift) return res.status(404).json({ error: 'Shift not found' })

    // RBAC: only site_manager user role OR a worker whose job roles include 'safety_officer'
    const isSiteManager = req.user.role === 'SITE_MANAGER'
    const workerRecord = await prisma.worker.findUnique({ where: { id: req.user.id } })
    const isSafetyOfficer = workerRecord?.roles?.includes('safety_officer')
    if (!isSiteManager && !isSafetyOfficer) {
      return res.status(403).json({ error: 'Only site managers or safety officers may approve hours' })
    }

    // Valid only if shift has logged hours
    if (!shift.totalHours && !shift.actualStartTime) {
      return res.status(400).json({ error: 'Shift has no logged hours to approve' })
    }

    if (shift.locked) {
      return res.status(409).json({ error: 'Shift already approved/locked' })
    }

    // Perform approval: set approved flags and lock
    const updated = await prisma.shift.update({
      where: { id },
      data: {
        approved: true,
        approvedAt: new Date(),
        approvedById: req.user.id,
        locked: true
      },
      include: { worker: true, site: true, crane: true }
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        shiftId: id,
        actorId: req.user.id,
        action: 'HOURS_APPROVED',
        payload: { totalHours: updated.totalHours ?? updated.hours }
      }
    })

    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to approve shift', details: err.message })
  }
}

// DELETE shift
export const deleteShift = async (req, res) => {
  try {
    const { id } = req.params
    const shift = await prisma.shift.findUnique({ where: { id } })
    if (!shift) return res.status(404).json({ error: 'Shift not found' })

    // Workers cannot delete locked shifts
    if (shift.locked && req.user.role === 'OPERATOR') {
      return res.status(409).json({ error: 'Shift is locked and cannot be deleted' })
    }

    await prisma.shift.delete({ where: { id } })

    // Log audit event
    await logAudit({
      actorId: req.user?.id,
      action: 'shift_deleted',
      entityType: 'shift',
      entityId: id,
      metadata: {
        workerId: shift.workerId,
        siteId: shift.siteId,
        state: shift.state
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })

    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete shift', details: err.message })
  }
}

// Managers can toggle overrideEdit to allow workers to edit/delete after approval
export const setOverrideEdit = async (req, res) => {
  try {
    const { id } = req.params
    const { overrideEdit } = req.body

    const shift = await prisma.shift.findUnique({ where: { id } })
    if (!shift) return res.status(404).json({ error: 'Shift not found' })

    // RBAC: only site_manager or safety_officer may toggle override
    const isSiteManager = req.user.role === 'SITE_MANAGER'
    const workerRecord = await prisma.worker.findUnique({ where: { id: req.user.id } })
    const isSafetyOfficer = workerRecord?.roles?.includes('safety_officer')
    if (!isSiteManager && !isSafetyOfficer) {
      return res.status(403).json({ error: 'Only site managers or safety officers may toggle override' })
    }

    const updated = await prisma.shift.update({
      where: { id },
      data: { overrideEdit: !!overrideEdit },
      include: { 
        worker: true, 
        site: true, 
        crane: true,
        approvedBy: true 
      }
    })

    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to set overrideEdit', details: err.message })
  }
}

// Manager override endpoint: modify locked shifts and record audit
export const overrideShift = async (req, res) => {
  try {
    const { id } = req.params
    const { reason, updatedFields } = req.body

    if (!reason || !updatedFields) {
      return res.status(400).json({ error: 'reason and updatedFields are required' })
    }

    // RBAC: only site_manager user role OR worker whose job roles include 'safety_officer'
    const isSiteManager = req.user.role === 'SITE_MANAGER'
    const workerRecord = await prisma.worker.findUnique({ where: { id: req.user.id } })
    const isSafetyOfficer = workerRecord?.roles?.includes('safety_officer')
    if (!isSiteManager && !isSafetyOfficer) {
      return res.status(403).json({ error: 'Only site managers or safety officers may perform overrides' })
    }

    // Fetch shift
    const shift = await prisma.shift.findUnique({ where: { id } })
    if (!shift) return res.status(404).json({ error: 'Shift not found' })

    // Can modify locked shifts
    if (!shift.locked) {
      return res.status(400).json({ error: 'Shift is not locked; override is intended for locked shifts' })
    }

    // Keep a copy of previous values for audit
    const before = {}
    for (const k of Object.keys(updatedFields)) {
      before[k] = shift[k]
    }

    // Apply updates and set overrideEdit true; set approved false to require re-approval
    const data = { ...updatedFields, overrideEdit: true, approved: false, approvedAt: null, approvedById: null, locked: true }

    const updated = await prisma.shift.update({ where: { id }, data, include: { worker: true, site: true, crane: true } })

    // Audit log entry
    await prisma.auditLog.create({
      data: {
        shiftId: id,
        actorId: req.user.id,
        action: 'OVERRIDE_EDIT',
        payload: { reason, before, updatedFields }
      }
    })

    return res.json({ message: 'Override applied', shift: updated })
  } catch (err) {
    console.error('overrideShift error:', err)
    return res.status(500).json({ error: 'Failed to apply override', details: err.message })
  }
}

// ============================
// FEED: broadcasted shifts for worker
// ============================
export const getFeedShifts = async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Not authenticated' })

    const worker = await prisma.worker.findUnique({ where: { id: userId } })
    if (!worker) return res.status(404).json({ error: 'Worker not found' })

    const roles = worker.roles || []

    const today = new Date().toISOString().split('T')[0]

    const shifts = await prisma.shift.findMany({
      where: {
        state: 'broadcasted',
        date: { gte: today },
        roleRequired: { in: roles },
        applications: { none: { workerId: userId } }
      },
      include: {
        worker: true,
        site: true,
        crane: true
      },
      orderBy: { date: 'asc' }
    })

    return res.json(shifts)
  } catch (err) {
    console.error('getFeedShifts error:', err)
    return res.status(500).json({ error: 'Failed to fetch feed', details: err.message })
  }
}

// GET audit logs for a shift (assigned worker or manager/safety officer)
export const getShiftAudit = async (req, res) => {
  try {
    const { id } = req.params
    const shift = await prisma.shift.findUnique({ where: { id } })
    if (!shift) return res.status(404).json({ error: 'Shift not found' })

    const isSiteManager = req.user.role === 'SITE_MANAGER'
    const workerRecord = await prisma.worker.findUnique({ where: { id: req.user.id } })
    const isSafetyOfficer = workerRecord?.roles?.includes('safety_officer')

    if (!(isSiteManager || isSafetyOfficer || req.user.id === shift.workerId)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const logs = await prisma.auditLog.findMany({
      where: { shiftId: id },
      include: { actor: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' }
    })

    return res.json({ shiftId: id, logs })
  } catch (err) {
    console.error('getShiftAudit error:', err)
    return res.status(500).json({ error: 'Failed to fetch audit logs', details: err.message })
  }
}

// ============================
// MY SHIFTS: assigned / pending_approval / completed
// ============================
export const getMyShifts = async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Not authenticated' })

    const [assigned, pendingApproval, completed] = await Promise.all([
      prisma.shift.findMany({
        where: { workerId: userId, state: 'assigned' },
        include: { worker: true, site: true, crane: true },
        orderBy: { date: 'asc' }
      }),
      prisma.shift.findMany({
        where: { workerId: userId, state: 'pending_approval' },
        include: { worker: true, site: true, crane: true },
        orderBy: { date: 'asc' }
      }),
      prisma.shift.findMany({
        where: { workerId: userId, state: 'completed' },
        include: { worker: true, site: true, crane: true },
        orderBy: { date: 'desc' }
      })
    ])

    return res.json({ assigned, pending_approval: pendingApproval, completed })
  } catch (err) {
    console.error('getMyShifts error:', err)
    return res.status(500).json({ error: 'Failed to fetch my shifts', details: err.message })
  }
}

// ============================
// MY APPLICATIONS: applications made by the user
// ============================
export const getMyApplications = async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Not authenticated' })

    const applications = await prisma.shiftApplication.findMany({
      where: { workerId: userId },
      include: {
        shift: {
          include: { worker: true, site: true, crane: true }
        }
      },
      orderBy: { appliedAt: 'desc' }
    })

    return res.json(applications)
  } catch (err) {
    console.error('getMyApplications error:', err)
    return res.status(500).json({ error: 'Failed to fetch my applications', details: err.message })
  }
}

// LOG HOURS for shift
export const logShiftHours = async (req, res) => {
  try {
    const { id } = req.params
    const { actualStartTime, actualEndTime, breakMinutes } = req.body

    const shift = await prisma.shift.findUnique({ where: { id } })
    if (!shift) return res.status(404).json({ error: 'Shift not found' })

    // Only assigned worker may log hours
    if (shift.workerId !== req.user.id) {
      return res.status(403).json({ error: 'Only assigned worker may log hours' })
    }

    // Only allowed after shift date
    const today = new Date().toISOString().split('T')[0]
    if (shift.date > today) {
      return res.status(400).json({ error: 'Can only log hours after shift date' })
    }

    // Editable until approved/locked
    if (shift.locked) {
      return res.status(409).json({ error: 'Cannot edit hours after approval/lock' })
    }

    if (!actualStartTime || !actualEndTime) {
      return res.status(400).json({ error: 'actualStartTime and actualEndTime are required' })
    }

    const start = new Date(actualStartTime)
    const end = new Date(actualEndTime)
    if (end <= start) return res.status(400).json({ error: 'actualEndTime must be after actualStartTime' })

    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    const breaks = breakMinutes ? Number(breakMinutes) : 0
    const totalHours = Math.max(0, durationHours - (breaks / 60))

    const updated = await prisma.shift.update({
      where: { id },
      data: {
        actualStartTime: new Date(actualStartTime),
        actualEndTime: new Date(actualEndTime),
        breakMinutes: breaks,
        totalHours: totalHours
      },
      include: { worker: true, site: true, crane: true }
    })

    // Audit: distinguish between first log and edit
    const existingLogged = shift.totalHours || shift.actualStartTime
    await prisma.auditLog.create({
      data: {
        shiftId: id,
        actorId: req.user.id,
        action: existingLogged ? 'HOURS_EDITED' : 'HOURS_LOGGED',
        payload: { actualStartTime, actualEndTime, breakMinutes, totalHours }
      }
    })

    return res.json(updated)
  } catch (err) {
    console.error('logShiftHours error:', err)
    return res.status(500).json({ error: 'Failed to log hours', details: err.message })
  }
}
