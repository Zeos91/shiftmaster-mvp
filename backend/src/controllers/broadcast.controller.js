import prisma from '../prisma.js'
import { logAudit } from '../utils/auditLog.js'
import { createNotification } from './notifications.controller.js'

// ============================
// HELPER FUNCTIONS
// ============================

/**
 * Check if a worker is eligible for a shift based on:
 * - availabilityStatus = true
 * - Worker has the required role
 * - Certifications match (if required)
 */
const isWorkerEligible = async (worker, shift) => {
  // Must be available
  if (!worker.availabilityStatus) {
    return false
  }

  // Must have the required role
  if (!worker.roles.includes(shift.roleRequired)) {
    return false
  }

  // Certifications matching could be added here if needed
  // For now, just check role match

  return true
}

/**
 * Get all eligible workers for a shift
 */
const getEligibleWorkers = async (shiftId) => {
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId }
  })

  if (!shift) {
    return null
  }

  // Find all workers who are available and have the required role
  const workers = await prisma.worker.findMany({
    where: {
      availabilityStatus: true,
      roles: {
        has: shift.roleRequired
      }
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      roles: true,
      certifications: true
    }
  })

  return workers
}

// ============================
// BROADCAST SHIFT
// ============================
export const broadcastShift = async (req, res) => {
  try {
    const { id } = req.params

    // Fetch the shift
    const shift = await prisma.shift.findUnique({
      where: { id }
    })

    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' })
    }

    // Can only broadcast if state is 'assigned' or initially unset
    // Broadcast means the shift becomes available for workers to apply
    if (!['assigned', 'broadcasted'].includes(shift.state)) {
      return res.status(400).json({
        error: `Cannot broadcast shift in state: ${shift.state}. Can only broadcast from 'assigned' state.`
      })
    }

    // Update shift state to broadcasted
    const updatedShift = await prisma.shift.update({
      where: { id },
      data: {
        state: 'broadcasted'
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
      action: 'shift_broadcasted',
      entityType: 'shift',
      entityId: id,
      metadata: {
        siteId: updatedShift.siteId,
        roleRequired: updatedShift.roleRequired
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })

    // Get eligible workers for this broadcast
    const eligibleWorkers = await getEligibleWorkers(id)

    // Create notifications for eligible workers
    if (eligibleWorkers && eligibleWorkers.length > 0) {
      for (const worker of eligibleWorkers) {
        await createNotification({
          workerId: worker.id,
          shiftId: id,
          title: `New Shift Available: ${updatedShift.roleRequired}`,
          message: `A new ${updatedShift.roleRequired} shift is available at ${updatedShift.site?.name || 'Site'} on ${updatedShift.date}`,
          type: 'shift_broadcast'
        })
      }
    }

    return res.json({
      message: 'Shift broadcasted successfully',
      shift: updatedShift,
      eligibleWorkers: eligibleWorkers || []
    })
  } catch (err) {
    console.error('broadcastShift error:', err)
    return res.status(500).json({ error: 'Failed to broadcast shift', details: err.message })
  }
}

// ============================
// APPLY TO SHIFT
// ============================
export const applyToShift = async (req, res) => {
  try {
    const { id } = req.params
    const { workerId } = req.body

    // If workerId not provided, use authenticated user
    const applicantId = workerId || req.user?.id

    if (!applicantId) {
      return res.status(400).json({ error: 'workerId is required or must be authenticated' })
    }

    // Fetch shift and worker
    const shift = await prisma.shift.findUnique({ where: { id } })
    const worker = await prisma.worker.findUnique({ where: { id: applicantId } })

    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' })
    }

    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' })
    }

    // Shift must be in 'broadcasted' state
    if (shift.state !== 'broadcasted') {
      return res.status(400).json({
        error: `Cannot apply to shift in state: ${shift.state}. Shift must be broadcasted.`
      })
    }

    // Check eligibility
    const eligible = await isWorkerEligible(worker, shift)
    if (!eligible) {
      return res.status(403).json({
        error: 'Worker is not eligible for this shift (not available, missing required role, or certifications mismatch)'
      })
    }

    // Check if worker has already applied to this shift
    const existingApplication = await prisma.shiftApplication.findUnique({
      where: {
        shiftId_workerId: {
          shiftId: id,
          workerId: applicantId
        }
      }
    })

    if (existingApplication) {
      return res.status(409).json({
        error: 'Worker has already applied to this shift'
      })
    }

    // Create application
    const application = await prisma.shiftApplication.create({
      data: {
        shiftId: id,
        workerId: applicantId,
        status: 'applied'
      },
      include: {
        worker: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            roles: true
          }
        },
        shift: true
      }
    })

    // Log audit event
    await logAudit({
      actorId: applicantId,
      action: 'shift_applied',
      entityType: 'application',
      entityId: application.id,
      metadata: {
        shiftId: id,
        workerId: applicantId,
        workerName: worker.name
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })

    // Update shift state to 'applied' if this is the first application
    const applicationCount = await prisma.shiftApplication.count({
      where: { shiftId: id }
    })

    if (applicationCount === 1) {
      await prisma.shift.update({
        where: { id },
        data: { state: 'applied' }
      })
    }

    // Notify site manager of new application
    const siteManager = await prisma.site.findUnique({
      where: { id: shift.siteId },
      select: { managerId: true }
    })

    if (siteManager?.managerId) {
      await createNotification({
        workerId: siteManager.managerId,
        shiftId: id,
        title: `New Application: ${worker.name}`,
        message: `${worker.name} has applied for the ${shift.roleRequired} shift on ${shift.date}`,
        type: 'application_received'
      })
    }

    return res.status(201).json({
      message: 'Application created successfully',
      application
    })
  } catch (err) {
    console.error('applyToShift error:', err)
    return res.status(500).json({ error: 'Failed to apply to shift', details: err.message })
  }
}

// ============================
// CONFIRM WORKER FOR SHIFT
// ============================
export const confirmWorker = async (req, res) => {
  try {
    const { id } = req.params
    const { workerId } = req.body

    if (!workerId) {
      return res.status(400).json({ error: 'workerId is required' })
    }

    // Check permissions: only managers/admins can confirm
    const managerRoles = ['SITE_MANAGER', 'PROJECT_MANAGER', 'COMPANY_ADMIN']
    if (!managerRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Only managers/admins can confirm workers for shifts'
      })
    }

    // Fetch shift
    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        applications: true
      }
    })

    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' })
    }

    // Shift must be in 'applied' state
    if (shift.state !== 'applied') {
      return res.status(400).json({
        error: `Cannot confirm worker for shift in state: ${shift.state}. Shift must be in 'applied' state.`
      })
    }

    // Find the application to confirm
    const applicationToConfirm = await prisma.shiftApplication.findUnique({
      where: {
        shiftId_workerId: {
          shiftId: id,
          workerId
        }
      }
    })

    if (!applicationToConfirm) {
      return res.status(404).json({ error: 'No application found for this worker and shift' })
    }

    if (applicationToConfirm.status !== 'applied') {
      return res.status(400).json({
        error: `Application already has status: ${applicationToConfirm.status}`
      })
    }

    // Confirm the selected worker's application
    await prisma.shiftApplication.update({
      where: { id: applicationToConfirm.id },
      data: { status: 'accepted' }
    })

    // Log acceptance
    await logAudit({
      actorId: req.user?.id,
      action: 'shift_application_accepted',
      entityType: 'application',
      entityId: applicationToConfirm.id,
      metadata: {
        shiftId: id,
        workerId,
        managerName: req.user?.email
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })

    // Reject all other applications
    const rejectedApplications = await prisma.shiftApplication.findMany({
      where: {
        shiftId: id,
        workerId: { not: workerId },
        status: 'applied'
      }
    })

    await prisma.shiftApplication.updateMany({
      where: {
        shiftId: id,
        workerId: { not: workerId },
        status: 'applied'
      },
      data: { status: 'rejected' }
    })

    // Log rejections
    for (const rejectedApp of rejectedApplications) {
      await logAudit({
        actorId: req.user?.id,
        action: 'shift_application_rejected',
        entityType: 'application',
        entityId: rejectedApp.id,
        metadata: {
          shiftId: id,
          workerId: rejectedApp.workerId,
          reason: 'Worker not selected'
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    // Get shift details for notifications
    const shiftDetails = await prisma.shift.findUnique({
      where: { id },
      include: { site: { select: { name: true } } }
    })

    // Get worker name for notifications
    const selectedWorker = await prisma.worker.findUnique({
      where: { id: workerId },
      select: { name: true }
    })

    // Notify selected worker of acceptance
    await createNotification({
      workerId,
      shiftId: id,
      title: `Application Accepted! ✅`,
      message: `You've been selected for the ${shiftDetails.roleRequired} shift on ${shiftDetails.date} at ${shiftDetails.site?.name}`,
      type: 'application_selected'
    })

    // Notify rejected workers
    for (const rejectedApp of rejectedApplications) {
      await createNotification({
        workerId: rejectedApp.workerId,
        shiftId: id,
        title: `Application Update`,
        message: `Your application for the ${shiftDetails.roleRequired} shift on ${shiftDetails.date} was not selected. Try the next one!`,
        type: 'application_rejected'
      })
    }

    // Assign the shift to the worker and update state
    const updatedShift = await prisma.shift.update({
      where: { id },
      data: {
        workerId: workerId,
        state: 'assigned'
      },
      include: {
        worker: true,
        site: true,
        crane: true,
        approvedBy: true,
        applications: {
          include: {
            worker: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            }
          }
        }
      }
    })

    return res.json({
      message: 'Worker confirmed for shift successfully',
      shift: updatedShift
    })
  } catch (err) {
    console.error('confirmWorker error:', err)
    return res.status(500).json({ error: 'Failed to confirm worker', details: err.message })
  }
}

// ============================
// GET SHIFT APPLICATIONS
// ============================
export const getShiftApplications = async (req, res) => {
  try {
    const { id } = req.params

    // Fetch shift first
    const shift = await prisma.shift.findUnique({
      where: { id }
    })

    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' })
    }

    // Get all applications with worker details
    const applications = await prisma.shiftApplication.findMany({
      where: { shiftId: id },
      include: {
        worker: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            roles: true,
            certifications: true,
            availabilityStatus: true
          }
        }
      },
      orderBy: { appliedAt: 'asc' }
    })

    return res.json({
      shift,
      applications,
      totalApplications: applications.length,
      acceptedApplication: applications.find(app => app.status === 'accepted')
    })
  } catch (err) {
    console.error('getShiftApplications error:', err)
    return res.status(500).json({ error: 'Failed to fetch applications', details: err.message })
  }
}

// ============================
// GET ELIGIBLE WORKERS FOR SHIFT (For UI purposes)
// ============================
export const getEligibleWorkersForShift = async (req, res) => {
  try {
    const { id } = req.params

    // Fetch shift first
    const shift = await prisma.shift.findUnique({
      where: { id }
    })

    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' })
    }

    // Get eligible workers
    const eligibleWorkers = await getEligibleWorkers(id)

    return res.json({
      shift,
      eligibleWorkers: eligibleWorkers || [],
      totalEligible: eligibleWorkers?.length || 0
    })
  } catch (err) {
    console.error('getEligibleWorkersForShift error:', err)
    return res.status(500).json({ error: 'Failed to fetch eligible workers', details: err.message })
  }
}
