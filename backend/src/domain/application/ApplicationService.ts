/**
 * ApplicationService - Business logic for shift application operations
 */

import { Worker } from '@prisma/client'
import { applicationRepository, ApplicationWithRelations } from './ApplicationRepository.js'
import { shiftRepository } from '../shift/ShiftRepository.js'
import { applicationPolicy } from './ApplicationPolicy.js'
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  BusinessRuleViolationError
} from '../shared/errors.js'
import { ApplicationStatus } from '../shared/enums.js'
import { logAudit } from '../../utils/auditLog.js'
import { createNotification } from '../../controllers/notifications.controller.js'

interface AuditContext {
  userId?: string
  ipAddress?: string
  userAgent?: string
}

export class ApplicationService {
  /**
   * Apply to a shift
   */
  async applyToShift(
    shiftId: string,
    currentUser: Worker,
    auditContext: AuditContext
  ): Promise<ApplicationWithRelations> {
    // Fetch shift
    const shift = await shiftRepository.findById(shiftId)
    if (!shift) {
      throw new NotFoundError('Shift', shiftId)
    }

    // Check authorization
    applicationPolicy.enforceApply(currentUser, shift)

    // Check if already applied
    const existingApplication = await applicationRepository.findByShiftAndWorker(
      shiftId,
      currentUser.id
    )
    if (existingApplication) {
      throw new ConflictError('You have already applied to this shift')
    }

    // Create application
    const application = await applicationRepository.create({
      shiftId,
      workerId: currentUser.id,
      status: 'applied'
    })

    // Log audit event
    await logAudit({
      actorId: auditContext.userId,
      action: 'shift_applied',
      entityType: 'application',
      entityId: application.id,
      metadata: {
        shiftId,
        workerId: currentUser.id,
        roleRequired: shift.roleRequired
      },
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent
    })

    // Create notification for shift owner/manager
    try {
      await createNotification({
        workerId: shift.workerId,
        shiftId: shift.id,
        title: 'New Application',
        message: `${currentUser.name} applied to your shift on ${shift.date}`,
        type: 'application_received'
      })
    } catch (error) {
      console.error('Failed to create application notification:', error)
    }

    return application
  }

  /**
   * Get applications for a shift
   */
  async getApplicationsByShift(shiftId: string): Promise<ApplicationWithRelations[]> {
    return applicationRepository.findByShiftId(shiftId)
  }

  /**
   * Get applications by a worker
   */
  async getApplicationsByWorker(workerId: string): Promise<ApplicationWithRelations[]> {
    return applicationRepository.findByWorkerId(workerId)
  }

  /**
   * Accept an application
   */
  async acceptApplication(
    applicationId: string,
    currentUser: Worker,
    auditContext: AuditContext
  ): Promise<ApplicationWithRelations> {
    // Fetch application
    const application = await applicationRepository.findById(applicationId)
    if (!application) {
      throw new NotFoundError('Application', applicationId)
    }

    // Check authorization
    applicationPolicy.enforceManageApplication(currentUser, application.shift)

    // Check if already processed
    if (application.status !== 'applied') {
      throw new BusinessRuleViolationError(
        `Application has already been ${application.status}`
      )
    }

    // Update application status
    const acceptedApplication = await applicationRepository.updateStatus(
      applicationId,
      'accepted'
    )

    // Update shift to assign this worker
    await shiftRepository.update(application.shiftId, {
      workerId: application.workerId,
      state: 'assigned'
    })

    // Reject other applications for this shift
    const otherApplications = await applicationRepository.findByShiftId(application.shiftId)
    for (const app of otherApplications) {
      if (app.id !== applicationId && app.status === 'applied') {
        await applicationRepository.updateStatus(app.id, 'rejected')

        // Notify rejected applicants
        try {
          await createNotification({
            workerId: app.workerId,
            shiftId: app.shiftId,
            title: 'Application Not Selected',
            message: `Your application for the shift on ${application.shift.date} was not selected`,
            type: 'application_rejected'
          })
        } catch (error) {
          console.error('Failed to create rejection notification:', error)
        }
      }
    }

    // Log audit event
    await logAudit({
      actorId: auditContext.userId,
      action: 'shift_application_accepted',
      entityType: 'application',
      entityId: applicationId,
      metadata: {
        shiftId: application.shiftId,
        workerId: application.workerId,
        acceptedBy: currentUser.id
      },
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent
    })

    // Create notification for accepted worker
    try {
      await createNotification({
        workerId: application.workerId,
        shiftId: application.shiftId,
        title: 'Application Accepted',
        message: `Congratulations! You've been selected for the shift on ${application.shift.date}`,
        type: 'application_selected'
      })
    } catch (error) {
      console.error('Failed to create acceptance notification:', error)
    }

    return acceptedApplication
  }

  /**
   * Reject an application
   */
  async rejectApplication(
    applicationId: string,
    currentUser: Worker,
    auditContext: AuditContext
  ): Promise<ApplicationWithRelations> {
    // Fetch application
    const application = await applicationRepository.findById(applicationId)
    if (!application) {
      throw new NotFoundError('Application', applicationId)
    }

    // Check authorization
    applicationPolicy.enforceManageApplication(currentUser, application.shift)

    // Check if already processed
    if (application.status !== 'applied') {
      throw new BusinessRuleViolationError(
        `Application has already been ${application.status}`
      )
    }

    // Update application status
    const rejectedApplication = await applicationRepository.updateStatus(
      applicationId,
      'rejected'
    )

    // Log audit event
    await logAudit({
      actorId: auditContext.userId,
      action: 'shift_application_rejected',
      entityType: 'application',
      entityId: applicationId,
      metadata: {
        shiftId: application.shiftId,
        workerId: application.workerId,
        rejectedBy: currentUser.id
      },
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent
    })

    // Create notification for rejected worker
    try {
      await createNotification({
        workerId: application.workerId,
        shiftId: application.shiftId,
        title: 'Application Not Selected',
        message: `Your application for the shift on ${application.shift.date} was not selected`,
        type: 'application_rejected'
      })
    } catch (error) {
      console.error('Failed to create rejection notification:', error)
    }

    return rejectedApplication
  }

  /**
   * Withdraw an application
   */
  async withdrawApplication(
    applicationId: string,
    currentUser: Worker,
    auditContext: AuditContext
  ): Promise<void> {
    // Fetch application
    const application = await applicationRepository.findById(applicationId)
    if (!application) {
      throw new NotFoundError('Application', applicationId)
    }

    // Check authorization
    applicationPolicy.enforceWithdraw(currentUser, application)

    // Delete application
    await applicationRepository.delete(applicationId)

    // Log audit event
    await logAudit({
      actorId: auditContext.userId,
      action: 'shift_application_rejected', // using rejected for withdrawal
      entityType: 'application',
      entityId: applicationId,
      metadata: {
        shiftId: application.shiftId,
        workerId: currentUser.id,
        withdrawn: true
      },
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent
    })
  }
}

export const applicationService = new ApplicationService()
