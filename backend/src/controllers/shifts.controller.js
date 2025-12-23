import prisma from '../prisma.js'

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
    if (shift.approved && req.user.role === 'OPERATOR' && !shift.overrideEdit) {
      return res.status(403).json({ error: 'Shift approved – cannot edit' })
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

    const shift = await prisma.shift.update({
      where: { id },
      data: {
        approved: true,
        approvedById: req.user.id,
        state: 'pending_approval' // Move to pending_approval state when approved
      },
      include: {
        worker: true,
        site: true,
        crane: true,
        approvedBy: true
      }
    })

    res.json(shift)
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

    // Workers cannot delete approved shifts unless manager has set overrideEdit
    if (shift.approved && req.user.role === 'OPERATOR' && !shift.overrideEdit) {
      return res.status(403).json({ error: 'Shift approved – cannot delete' })
    }

    await prisma.shift.delete({ where: { id } })

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
