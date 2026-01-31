/**
 * Auth Policy - Authorization rules for authentication operations
 */

import { Role } from '../shared/enums.js'
import { ForbiddenError, UnauthorizedError } from '../shared/errors.js'

export class AuthPolicy {
  /**
   * Check if a user can register with a specific role
   */
  canRegisterWithRole(requestedRole: Role, currentUserRole?: Role): boolean {
    // Public registration defaults to OPERATOR
    if (!currentUserRole) {
      return requestedRole === Role.OPERATOR
    }

    // Only admins can create other roles
    if (currentUserRole === Role.COMPANY_ADMIN) {
      return true
    }

    return false
  }

  /**
   * Check if user can access profile
   */
  canAccessProfile(userId: string, profileUserId: string, userRole: Role): boolean {
    // Users can always access their own profile
    if (userId === profileUserId) {
      return true
    }

    // Managers and admins can view other profiles
    return [Role.PROJECT_MANAGER, Role.COMPANY_ADMIN].includes(userRole)
  }

  /**
   * Enforce registration role policy
   */
  enforceRegistrationRole(requestedRole: Role, currentUserRole?: Role): void {
    if (!this.canRegisterWithRole(requestedRole, currentUserRole)) {
      throw new ForbiddenError(
        `You do not have permission to create users with role: ${requestedRole}`
      )
    }
  }

  /**
   * Enforce profile access policy
   */
  enforceProfileAccess(userId: string, profileUserId: string, userRole: Role): void {
    if (!this.canAccessProfile(userId, profileUserId, userRole)) {
      throw new ForbiddenError('You do not have permission to access this profile')
    }
  }
}

export const authPolicy = new AuthPolicy()
