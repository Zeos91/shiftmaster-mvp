/**
 * Shift Policy - Authorization rules for shift operations
 */

import { Role } from '../shared/enums.js'
import { Worker, Shift } from '@prisma/client'
import { ForbiddenError } from '../shared/errors.js'

export class ShiftPolicy {
  /**
   * Check if user can create a shift
   */
  canCreate(user: Worker): boolean {
    // Site managers, project managers, and admins can create shifts
    return [Role.SITE_MANAGER, Role.PROJECT_MANAGER, Role.COMPANY_ADMIN].includes(
      user.role
    )
  }

  /**
   * Check if user can update a shift
   */
  canUpdate(user: Worker, shift: Shift): boolean {
    // Worker who owns the shift can update if not locked or if override is enabled
    if (shift.workerId === user.id) {
      return !shift.locked || shift.overrideEdit
    }

    // Managers and admins can always update
    return [Role.SITE_MANAGER, Role.PROJECT_MANAGER, Role.COMPANY_ADMIN].includes(
      user.role
    )
  }

  /**
   * Check if user can delete a shift
   */
  canDelete(user: Worker, shift: Shift): boolean {
    // Only project managers and admins can delete
    if (![Role.PROJECT_MANAGER, Role.COMPANY_ADMIN].includes(user.role)) {
      return false
    }

    // Cannot delete approved shifts unless override is enabled
    if (shift.approved && !shift.overrideEdit) {
      return false
    }

    return true
  }

  /**
   * Check if user can approve a shift
   */
  canApprove(user: Worker): boolean {
    // Site managers, project managers, and admins can approve
    return [Role.SITE_MANAGER, Role.PROJECT_MANAGER, Role.COMPANY_ADMIN].includes(
      user.role
    )
  }

  /**
   * Check if user can view a shift
   */
  canView(user: Worker, shift: Shift): boolean {
    // Worker who owns the shift can view
    if (shift.workerId === user.id) {
      return true
    }

    // All manager roles can view any shift
    return [Role.SITE_MANAGER, Role.PROJECT_MANAGER, Role.COMPANY_ADMIN].includes(
      user.role
    )
  }

  /**
   * Check if user can broadcast a shift
   */
  canBroadcast(user: Worker): boolean {
    // Site managers, project managers, and admins can broadcast
    return [Role.SITE_MANAGER, Role.PROJECT_MANAGER, Role.COMPANY_ADMIN].includes(
      user.role
    )
  }

  /**
   * Enforce create permission
   */
  enforceCreate(user: Worker): void {
    if (!this.canCreate(user)) {
      throw new ForbiddenError('You do not have permission to create shifts')
    }
  }

  /**
   * Enforce update permission
   */
  enforceUpdate(user: Worker, shift: Shift): void {
    if (!this.canUpdate(user, shift)) {
      throw new ForbiddenError(
        'You do not have permission to update this shift. It may be locked.'
      )
    }
  }

  /**
   * Enforce delete permission
   */
  enforceDelete(user: Worker, shift: Shift): void {
    if (!this.canDelete(user, shift)) {
      throw new ForbiddenError(
        'You do not have permission to delete this shift'
      )
    }
  }

  /**
   * Enforce approve permission
   */
  enforceApprove(user: Worker): void {
    if (!this.canApprove(user)) {
      throw new ForbiddenError('You do not have permission to approve shifts')
    }
  }

  /**
   * Enforce view permission
   */
  enforceView(user: Worker, shift: Shift): void {
    if (!this.canView(user, shift)) {
      throw new ForbiddenError('You do not have permission to view this shift')
    }
  }

  /**
   * Enforce broadcast permission
   */
  enforceBroadcast(user: Worker): void {
    if (!this.canBroadcast(user)) {
      throw new ForbiddenError('You do not have permission to broadcast shifts')
    }
  }
}

export const shiftPolicy = new ShiftPolicy()
