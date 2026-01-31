/**
 * Domain Enums - Single source of truth for all enumeration types
 * These mirror the Prisma schema but live in the domain layer
 */

export enum Role {
  OPERATOR = 'OPERATOR',
  SITE_MANAGER = 'SITE_MANAGER',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  COMPANY_ADMIN = 'COMPANY_ADMIN'
}

export enum JobRole {
  CRANE_OPERATOR = 'crane_operator',
  SAFETY_ASSISTANT = 'safety_assistant',
  SIGNALMAN = 'signalman',
  SITE_MANAGER = 'site_manager',
  SAFETY_OFFICER = 'safety_officer',
  GENERAL_WORKER = 'general_worker'
}

export enum ShiftState {
  ASSIGNED = 'assigned',
  BROADCASTED = 'broadcasted',
  APPLIED = 'applied',
  PENDING_APPROVAL = 'pending_approval',
  COMPLETED = 'completed'
}

export enum ApplicationStatus {
  APPLIED = 'applied',
  REJECTED = 'rejected',
  ACCEPTED = 'accepted'
}

export enum AuditAction {
  WORKER_CREATED = 'worker_created',
  WORKER_ROLE_UPDATED = 'worker_role_updated',
  WORKER_CERT_UPDATED = 'worker_cert_updated',
  SHIFT_CREATED = 'shift_created',
  SHIFT_UPDATED = 'shift_updated',
  SHIFT_DELETED = 'shift_deleted',
  SHIFT_BROADCASTED = 'shift_broadcasted',
  SHIFT_APPLIED = 'shift_applied',
  SHIFT_APPLICATION_REJECTED = 'shift_application_rejected',
  SHIFT_APPLICATION_ACCEPTED = 'shift_application_accepted',
  SHIFT_ASSIGNED = 'shift_assigned',
  SHIFT_APPROVED = 'shift_approved',
  SHIFT_COMPLETED = 'shift_completed',
  SHIFT_OVERRIDE_EDIT = 'shift_override_edit',
  PDF_GENERATED = 'pdf_generated',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  PERMISSIONS_CHANGED = 'permissions_changed'
}

export enum AuditEntityType {
  WORKER = 'worker',
  SHIFT = 'shift',
  APPLICATION = 'application',
  REPORT = 'report',
  AUTH = 'auth'
}

export enum NotificationType {
  SHIFT_BROADCAST = 'shift_broadcast',
  APPLICATION_RECEIVED = 'application_received',
  APPLICATION_SELECTED = 'application_selected',
  APPLICATION_REJECTED = 'application_rejected',
  HOURS_SUBMITTED = 'hours_submitted',
  HOURS_APPROVED = 'hours_approved',
  SHIFT_REMINDER = 'shift_reminder'
}

/**
 * Helper functions for enum validation
 */
export const EnumValidators = {
  isValidRole(role: string): role is Role {
    return Object.values(Role).includes(role as Role)
  },

  isValidJobRole(jobRole: string): jobRole is JobRole {
    return Object.values(JobRole).includes(jobRole as JobRole)
  },

  isValidShiftState(state: string): state is ShiftState {
    return Object.values(ShiftState).includes(state as ShiftState)
  },

  isValidApplicationStatus(status: string): status is ApplicationStatus {
    return Object.values(ApplicationStatus).includes(status as ApplicationStatus)
  },

  getJobRolesThatAllowEquipment(): JobRole[] {
    return [JobRole.CRANE_OPERATOR, JobRole.SIGNALMAN]
  }
}
