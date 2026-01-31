/**
 * Application Policy - Authorization rules for shift application operations
 */

import { Role } from '../shared/enums.js'
import { Worker, ShiftApplication, Shift } from '@prisma/client'
import { ForbiddenError, BusinessRuleViolationError } from '../shared/errors.js'

export class ApplicationPolicy {
  /**
   * Check if user can apply to a shift
   */
  canApply(user: Worker, shift: Shift): boolean {
    // Only operators can apply
    if (user.role !== Role.OPERATOR) {
      return false
    }

    // Cannot apply to own shift
    if (shift.workerId === user.id) {
      return false
    }

    // Shift must be in broadcasted state
    if (shift.state !== 'broadcasted') {
      return false
    }

    return true
  }

  /**
   * Check if user can accept/reject an application
   */
  canManageApplication(user: Worker, shift: Shift): boolean {
    // Site managers, project managers, and admins can manage
    return [Role.SITE_MANAGER, Role.PROJECT_MANAGER, Role.COMPANY_ADMIN].includes(
      user.role
    )
  }

  /**
   * Check if user can view an application
   */
  canView(user: Worker, application: ShiftApplication): boolean {
    // Worker who applied can view their own application
    if (application.workerId === user.id) {
      return true
    }

    // Managers can view all applications
    return [Role.SITE_MANAGER, Role.PROJECT_MANAGER, Role.COMPANY_ADMIN].includes(
      user.role
    )
  }

  /**
   * Check if user can withdraw an application
   */
  canWithdraw(user: Worker, application: ShiftApplication): boolean {
    // Only the applicant can withdraw
    if (application.workerId !== user.id) {
      return false
    }

    // Can only withdraw if still in 'applied' status
    return application.status === 'applied'
  }

  /**
   * Enforce apply permission
   */
  enforceApply(user: Worker, shift: Shift): void {
    if (!this.canApply(user, shift)) {
      if (user.role !== Role.OPERATOR) {
        throw new ForbiddenError('Only operators can apply to shifts')
      }
      if (shift.workerId === user.id) {
        throw new BusinessRuleViolationError('You cannot apply to your own shift')
      }
      if (shift.state !== 'broadcasted') {
        throw new BusinessRuleViolationError(
          'Shift must be in broadcasted state to apply'
        )
      }
      throw new ForbiddenError('You cannot apply to this shift')
    }
  }

  /**
   * Enforce manage application permission
   */
  enforceManageApplication(user: Worker, shift: Shift): void {
    if (!this.canManageApplication(user, shift)) {
      throw new ForbiddenError(
        'You do not have permission to manage shift applications'
      )
    }
  }

  /**
   * Enforce view permission
   */
  enforceView(user: Worker, application: ShiftApplication): void {
    if (!this.canView(user, application)) {
      throw new ForbiddenError('You do not have permission to view this application')
    }
  }

  /**
   * Enforce withdraw permission
   */
  enforceWithdraw(user: Worker, application: ShiftApplication): void {
    if (!this.canWithdraw(user, application)) {
      if (application.workerId !== user.id) {
        throw new ForbiddenError('You can only withdraw your own applications')
      }
      if (application.status !== 'applied') {
        throw new BusinessRuleViolationError(
          'Application can only be withdrawn if it is still pending'
        )
      }
      throw new ForbiddenError('You cannot withdraw this application')
    }
  }
}

export const applicationPolicy = new ApplicationPolicy()
