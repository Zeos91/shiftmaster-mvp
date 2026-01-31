/**
 * ShiftService - Business logic for shift operations
 * All shift-related business rules live here
 */

import { Shift, Worker } from '@prisma/client'
import { shiftRepository, CreateShiftData, ShiftWithRelations } from './ShiftRepository.js'
import { workerRepository } from '../worker/WorkerRepository.js'
import { shiftPolicy } from './ShiftPolicy.js'
import {
  ValidationError,
  NotFoundError,
  BusinessRuleViolationError
} from '../shared/errors.js'
import { JobRole, ShiftState, EnumValidators } from '../shared/enums.js'
import { logAudit } from '../../utils/auditLog.js'
import { emitDashboardEvent, DashboardEvents } from '../../utils/dashboardEvents.js'
import { createNotification } from '../../controllers/notifications.controller.js'

interface CreateShiftInput {
  startTime: string
  endTime: string
  hours?: number
  workerId: string
  siteId: string
  roleRequired: string
  equipmentId?: string
  state?: string
  operatorRate?: number
  siteRate?: number
  overrideOperatorRate?: number | null
  overrideSiteRate?: number | null
  date?: string
}

interface UpdateShiftInput {
  approved?: boolean
  state?: string
  startTime?: string
  endTime?: string
  hours?: number
  workerId?: string
  siteId?: string
  roleRequired?: string
  equipmentId?: string | null
  date?: string
  overrideOperatorRate?: number | null
  overrideSiteRate?: number | null
  actualStartTime?: string
  actualEndTime?: string
  breakMinutes?: number
  totalHours?: number
}

interface AuditContext {
  userId?: string
  ipAddress?: string
  userAgent?: string
}

export class ShiftService {
  /**
   * Validate shift input data
   */
  private validateCreateInput(input: CreateShiftInput): void {
    if (!input.startTime || !input.endTime || !input.workerId || !input.siteId || !input.roleRequired) {
      throw new ValidationError(
        'Missing required fields: startTime, endTime, workerId, siteId, roleRequired'
      )
    }

    // Validate roleRequired
    if (!EnumValidators.isValidJobRole(input.roleRequired)) {
      throw new ValidationError(
        `Invalid roleRequired. Must be one of: ${Object.values(JobRole).join(', ')}`
      )
    }

    // Validate equipmentId constraints
    const allowedRoles = EnumValidators.getJobRolesThatAllowEquipment()
    if (input.equipmentId && !allowedRoles.includes(input.roleRequired as JobRole)) {
      throw new ValidationError(
        `equipmentId is only allowed for crane_operator or signalman roles`
      )
    }

    // Validate state if provided
    if (input.state && !EnumValidators.isValidShiftState(input.state)) {
      throw new ValidationError(
        `Invalid state. Must be one of: ${Object.values(ShiftState).join(', ')}`
      )
    }
  }

  /**
   * Validate worker has required role
   */
  private async validateWorkerRole(workerId: string, roleRequired: JobRole): Promise<void> {
    const hasRole = await workerRepository.hasJobRole(workerId, roleRequired)
    if (!hasRole) {
      throw new BusinessRuleViolationError(
        `Worker does not have the required role: ${roleRequired}`
      )
    }
  }

  /**
   * Calculate hours from timestamps
   */
  private calculateHours(startTime: Date, endTime: Date): number {
    return (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
  }

  /**
   * Calculate date from startTime
   */
  private calculateDate(startTime: Date): string {
    return startTime.toISOString().split('T')[0]
  }

  /**
   * Create a new shift
   */
  async createShift(
    input: CreateShiftInput,
    currentUser: Worker,
    auditContext: AuditContext
  ): Promise<ShiftWithRelations> {
    // Validate input
    this.validateCreateInput(input)

    // Check authorization
    shiftPolicy.enforceCreate(currentUser)

    // Validate worker has required role
    await this.validateWorkerRole(input.workerId, input.roleRequired as JobRole)

    // Calculate hours if not provided
    const startTime = new Date(input.startTime)
    const endTime = new Date(input.endTime)
    const calculatedHours = input.hours || this.calculateHours(startTime, endTime)

    // Calculate date if not provided
    const shiftDate = input.date || this.calculateDate(startTime)
    const shiftState = input.state || 'assigned'

    // Create shift
    const shift = await shiftRepository.create({
      startTime,
      endTime,
      date: shiftDate,
      hours: calculatedHours,
      totalHours: null,
      actualStartTime: null,
      actualEndTime: null,
      breakMinutes: null,
      workerId: input.workerId,
      siteId: input.siteId,
      roleRequired: input.roleRequired as JobRole,
      equipmentId: input.equipmentId || null,
      state: shiftState as ShiftState,
      operatorRate: input.operatorRate ?? 0,
      siteRate: input.siteRate ?? 0,
      overrideOperatorRate: input.overrideOperatorRate ?? null,
      overrideSiteRate: input.overrideSiteRate ?? null,
      approved: false,
      approvedById: null,
      approvedAt: null,
      locked: false,
      overrideEdit: false,
      craneId: null
    })

    // Log audit event
    await logAudit({
      actorId: auditContext.userId,
      action: 'shift_created',
      entityType: 'shift',
      entityId: shift.id,
      metadata: {
        workerId: input.workerId,
        siteId: input.siteId,
        roleRequired: input.roleRequired,
        hours: calculatedHours,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      },
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent
    })

    // Emit dashboard event
    emitDashboardEvent(DashboardEvents.SHIFT_CREATED, {
      shiftId: shift.id,
      workerId: input.workerId,
      siteId: input.siteId,
      state: shift.state,
      date: shift.date,
      roleRequired: shift.roleRequired,
      operatorRate: shift.operatorRate,
      siteRate: shift.siteRate
    })

    return shift
  }

  /**
   * Get shift by ID
   */
  async getShiftById(shiftId: string, currentUser: Worker): Promise<ShiftWithRelations> {
    const shift = await shiftRepository.findById(shiftId)
    if (!shift) {
      throw new NotFoundError('Shift', shiftId)
    }

    // Check authorization
    shiftPolicy.enforceView(currentUser, shift)

    return shift
  }

  /**
   * Get all shifts with optional filters
   */
  async getAllShifts(params?: {
    workerId?: string
    siteId?: string
    state?: ShiftState
    approved?: boolean
    date?: string
  }): Promise<ShiftWithRelations[]> {
    return shiftRepository.findMany(params)
  }

  /**
   * Update a shift
   */
  async updateShift(
    shiftId: string,
    input: UpdateShiftInput,
    currentUser: Worker,
    auditContext: AuditContext
  ): Promise<ShiftWithRelations> {
    // Fetch existing shift
    const shift = await shiftRepository.findById(shiftId)
    if (!shift) {
      throw new NotFoundError('Shift', shiftId)
    }

    // Check authorization
    shiftPolicy.enforceUpdate(currentUser, shift)

    // Validate roleRequired if provided
    if (input.roleRequired) {
      if (!EnumValidators.isValidJobRole(input.roleRequired)) {
        throw new ValidationError(
          `Invalid roleRequired. Must be one of: ${Object.values(JobRole).join(', ')}`
        )
      }

      // Validate worker has the new role
      const targetWorkerId = input.workerId || shift.workerId
      await this.validateWorkerRole(targetWorkerId, input.roleRequired as JobRole)
    }

    // Validate state if provided
    if (input.state && !EnumValidators.isValidShiftState(input.state)) {
      throw new ValidationError(
        `Invalid state. Must be one of: ${Object.values(ShiftState).join(', ')}`
      )
    }

    // Validate equipmentId constraints
    if (input.equipmentId !== undefined || input.roleRequired) {
      const targetRole = input.roleRequired || shift.roleRequired
      const targetEquipmentId = input.equipmentId !== undefined ? input.equipmentId : shift.equipmentId
      const allowedRoles = EnumValidators.getJobRolesThatAllowEquipment()
      if (targetEquipmentId && !allowedRoles.includes(targetRole as JobRole)) {
        throw new ValidationError(
          `equipmentId is only allowed for crane_operator or signalman roles`
        )
      }
    }

    // Build update data
    const updateData: any = {}
    if (input.state) updateData.state = input.state
    if (input.startTime) updateData.startTime = new Date(input.startTime)
    if (input.endTime) updateData.endTime = new Date(input.endTime)
    if (input.hours !== undefined) updateData.hours = input.hours
    if (input.totalHours !== undefined) updateData.totalHours = input.totalHours
    if (input.actualStartTime) updateData.actualStartTime = new Date(input.actualStartTime)
    if (input.actualEndTime) updateData.actualEndTime = new Date(input.actualEndTime)
    if (input.breakMinutes !== undefined) updateData.breakMinutes = input.breakMinutes
    if (input.date) updateData.date = input.date
    if (input.workerId) updateData.workerId = input.workerId
    if (input.siteId) updateData.siteId = input.siteId
    if (input.roleRequired) updateData.roleRequired = input.roleRequired
    if (input.equipmentId !== undefined) updateData.equipmentId = input.equipmentId
    if (input.overrideOperatorRate !== undefined) updateData.overrideOperatorRate = input.overrideOperatorRate
    if (input.overrideSiteRate !== undefined) updateData.overrideSiteRate = input.overrideSiteRate

    // Handle approval (manager only)
    if (input.approved !== undefined) {
      shiftPolicy.enforceApprove(currentUser)
      updateData.approved = input.approved
      updateData.approvedById = input.approved ? currentUser.id : null
      if (input.approved) {
        updateData.approvedAt = new Date()
        updateData.locked = true
      }
    }

    // Update shift
    const updatedShift = await shiftRepository.update(shiftId, updateData)

    // Log audit event
    await logAudit({
      actorId: auditContext.userId,
      action: 'shift_updated',
      entityType: 'shift',
      entityId: shiftId,
      metadata: {
        changes: updateData,
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
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent
    })

    // Emit event if completed
    const completedNow = updatedShift.state === 'completed' && shift.state !== 'completed'
    if (completedNow) {
      emitDashboardEvent(DashboardEvents.SHIFT_COMPLETED, {
        shiftId: shiftId,
        workerId: updatedShift.workerId,
        siteId: updatedShift.siteId,
        hours: updatedShift.totalHours ?? updatedShift.hours,
        approved: updatedShift.approved
      })
    }

    return updatedShift
  }

  /**
   * Delete a shift
   */
  async deleteShift(
    shiftId: string,
    currentUser: Worker,
    auditContext: AuditContext
  ): Promise<void> {
    // Fetch shift
    const shift = await shiftRepository.findById(shiftId)
    if (!shift) {
      throw new NotFoundError('Shift', shiftId)
    }

    // Check authorization
    shiftPolicy.enforceDelete(currentUser, shift)

    // Delete shift
    await shiftRepository.delete(shiftId)

    // Log audit event
    await logAudit({
      actorId: auditContext.userId,
      action: 'shift_deleted',
      entityType: 'shift',
      entityId: shiftId,
      metadata: {
        workerId: shift.workerId,
        siteId: shift.siteId,
        state: shift.state,
        approved: shift.approved
      },
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent
    })
  }

  /**
   * Approve a shift
   */
  async approveShift(
    shiftId: string,
    currentUser: Worker,
    auditContext: AuditContext
  ): Promise<ShiftWithRelations> {
    // Fetch shift
    const shift = await shiftRepository.findById(shiftId)
    if (!shift) {
      throw new NotFoundError('Shift', shiftId)
    }

    // Check authorization
    shiftPolicy.enforceApprove(currentUser)

    // Check if already approved
    if (shift.approved) {
      throw new BusinessRuleViolationError('Shift is already approved')
    }

    // Approve shift
    const approvedShift = await shiftRepository.approve(shiftId, currentUser.id)

    // Log audit event
    await logAudit({
      actorId: auditContext.userId,
      action: 'shift_approved',
      entityType: 'shift',
      entityId: shiftId,
      metadata: {
        approvedBy: currentUser.id,
        workerId: shift.workerId,
        hours: shift.hours
      },
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent
    })

    // Create notification for worker
    try {
      await createNotification({
        workerId: shift.workerId,
        shiftId: shift.id,
        title: 'Shift Approved',
        message: `Your shift on ${shift.date} has been approved`,
        type: 'hours_approved'
      })
    } catch (error) {
      console.error('Failed to create approval notification:', error)
    }

    return approvedShift
  }

  /**
   * Broadcast a shift
   */
  async broadcastShift(
    shiftId: string,
    currentUser: Worker,
    auditContext: AuditContext
  ): Promise<ShiftWithRelations> {
    // Fetch shift
    const shift = await shiftRepository.findById(shiftId)
    if (!shift) {
      throw new NotFoundError('Shift', shiftId)
    }

    // Check authorization
    shiftPolicy.enforceBroadcast(currentUser)

    // Update state to broadcasted
    const broadcastedShift = await shiftRepository.update(shiftId, {
      state: 'broadcasted'
    })

    // Log audit event
    await logAudit({
      actorId: auditContext.userId,
      action: 'shift_broadcasted',
      entityType: 'shift',
      entityId: shiftId,
      metadata: {
        siteId: shift.siteId,
        roleRequired: shift.roleRequired,
        date: shift.date
      },
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent
    })

    // Emit dashboard event
    emitDashboardEvent(DashboardEvents.SHIFT_BROADCASTED, {
      shiftId: shift.id,
      siteId: shift.siteId,
      roleRequired: shift.roleRequired,
      date: shift.date
    })

    return broadcastedShift
  }
}

export const shiftService = new ShiftService()
