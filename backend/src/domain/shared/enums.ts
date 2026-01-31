/**
 * Domain Enums - FROZEN CONTRACT
 * 
 * CRITICAL: These enum string values are immutable and used across:
 * - Database (Prisma schema)
 * - API responses (REST endpoints)
 * - OpenAPI/Swagger documentation
 * - Web & Mobile UI
 * 
 * ⚠️  NEVER rename existing enum values
 * ✅  New values may be added in future versions
 * 
 * Version: 1.0.0
 * Last Updated: 2026-01-31
 */

// ============================================================================
// USER & ROLE ENUMS
// ============================================================================

/**
 * UserRole - System-level user roles defining access permissions
 * 
 * Used for: Authentication, authorization, RBAC
 * Reference: See docs/rbac.md for permission matrix
 */
export enum UserRole {
  /** Regular shift worker - can view and work assigned shifts */
  WORKER = 'worker',
  
  /** Site manager - can manage shifts and workers at assigned sites */
  SITE_MANAGER = 'site_manager',
  
  /** Safety officer - can review and approve safety compliance */
  SAFETY_OFFICER = 'safety_officer',
  
  /** System administrator - full access to all features */
  ADMIN = 'admin'
}

/**
 * JobRole - Specialized worker roles/certifications
 * 
 * Used for: Shift requirements, worker qualifications, equipment assignment
 * Note: Workers can have multiple job roles
 */
export enum JobRole {
  /** Licensed crane operator */
  CRANE_OPERATOR = 'crane_operator',
  
  /** Safety assistant on site */
  SAFETY_ASSISTANT = 'safety_assistant',
  
  /** Crane signalman/spotter */
  SIGNALMAN = 'signalman',
  
  /** On-site manager role */
  SITE_MANAGER = 'site_manager',
  
  /** Safety officer certification */
  SAFETY_OFFICER = 'safety_officer',
  
  /** General construction worker */
  GENERAL_WORKER = 'general_worker'
}

// ============================================================================
// SHIFT LIFECYCLE ENUMS
// ============================================================================

/**
 * ShiftState - Lifecycle states for a shift
 * 
 * State Machine Flow:
 * draft → broadcasted → assigned → completed
 *   ↓         ↓           ↓
 *   → cancelled ← ← ← ← ← 
 * 
 * Used for: Shift workflow, UI display, filtering
 */
export enum ShiftState {
  /** Shift created but not yet visible to workers (manager draft) */
  DRAFT = 'draft',
  
  /** Shift posted and open for worker applications */
  BROADCASTED = 'broadcasted',
  
  /** Shift assigned to a specific worker */
  ASSIGNED = 'assigned',
  
  /** Shift work completed, awaiting approval */
  COMPLETED = 'completed',
  
  /** Shift cancelled by manager (terminal state) */
  CANCELLED = 'cancelled'
}

/**
 * ShiftType - Classification of shift by business context
 * 
 * Used for: Billing rates, overtime rules, urgency prioritization
 */
export enum ShiftType {
  /** Standard scheduled shift */
  REGULAR = 'regular',
  
  /** Overtime or extended hours shift */
  OVERTIME = 'overtime',
  
  /** Emergency/urgent unplanned shift */
  EMERGENCY = 'emergency'
}

// ============================================================================
// APPLICATION WORKFLOW ENUMS
// ============================================================================

/**
 * ApplicationState - Worker application status for broadcasted shifts
 * 
 * State Machine Flow:
 * applied → pending → approved (terminal)
 *   ↓         ↓
 *   ↓         → rejected (terminal)
 *   ↓
 *   → withdrawn (terminal)
 * 
 * Used for: Application workflow, notifications, shift assignment
 */
export enum ApplicationState {
  /** Worker submitted application (initial state) */
  APPLIED = 'applied',
  
  /** Application under review by manager */
  PENDING = 'pending',
  
  /** Application approved - worker assigned to shift */
  APPROVED = 'approved',
  
  /** Application declined by manager */
  REJECTED = 'rejected',
  
  /** Worker withdrew their application */
  WITHDRAWN = 'withdrawn'
}

// ============================================================================
// AUDIT & TRACKING ENUMS
// ============================================================================

/**
 * AuditAction - System actions that are logged for compliance
 * 
 * Used for: Audit trail, compliance reporting, security monitoring
 */
export enum AuditAction {
  // Worker actions
  WORKER_CREATED = 'worker_created',
  WORKER_ROLE_UPDATED = 'worker_role_updated',
  WORKER_CERT_UPDATED = 'worker_cert_updated',
  
  // Shift lifecycle
  SHIFT_CREATED = 'shift_created',
  SHIFT_UPDATED = 'shift_updated',
  SHIFT_DELETED = 'shift_deleted',
  SHIFT_BROADCASTED = 'shift_broadcasted',
  SHIFT_ASSIGNED = 'shift_assigned',
  SHIFT_APPROVED = 'shift_approved',
  SHIFT_COMPLETED = 'shift_completed',
  SHIFT_CANCELLED = 'shift_cancelled',
  SHIFT_OVERRIDE_EDIT = 'shift_override_edit',
  
  // Application workflow
  SHIFT_APPLIED = 'shift_applied',
  SHIFT_APPLICATION_APPROVED = 'shift_application_approved',
  SHIFT_APPLICATION_REJECTED = 'shift_application_rejected',
  SHIFT_APPLICATION_WITHDRAWN = 'shift_application_withdrawn',
  
  // Reporting
  PDF_GENERATED = 'pdf_generated',
  
  // Security
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  PERMISSIONS_CHANGED = 'permissions_changed'
}

/**
 * AuditEntityType - Entity types that can be audited
 * 
 * Used for: Audit log categorization, compliance filtering
 */
export enum AuditEntityType {
  WORKER = 'worker',
  SHIFT = 'shift',
  APPLICATION = 'application',
  REPORT = 'report',
  AUTH = 'auth'
}

// ============================================================================
// NOTIFICATION ENUMS
// ============================================================================

/**
 * NotificationType - Push notification and alert categories
 * 
 * Used for: Mobile push notifications, email alerts, in-app notifications
 */
export enum NotificationType {
  /** New shift posted and available for applications */
  SHIFT_BROADCASTED = 'shift_broadcasted',
  
  /** Manager received new application */
  APPLICATION_RECEIVED = 'application_received',
  
  /** Worker's application was approved */
  APPLICATION_APPROVED = 'application_approved',
  
  /** Worker's application was rejected */
  APPLICATION_REJECTED = 'application_rejected',
  
  /** Worker submitted hours for approval */
  HOURS_SUBMITTED = 'hours_submitted',
  
  /** Manager approved worker's submitted hours */
  HOURS_APPROVED = 'hours_approved',
  
  /** Reminder for upcoming shift */
  SHIFT_REMINDER = 'shift_reminder',
  
  /** Shift was cancelled by manager */
  SHIFT_CANCELLED = 'shift_cancelled'
}

// ============================================================================
// STATE TRANSITION VALIDATION
// ============================================================================

/**
 * State transition rules for shift workflow
 */
export const ShiftStateTransitions: Record<ShiftState, ShiftState[]> = {
  [ShiftState.DRAFT]: [ShiftState.BROADCASTED, ShiftState.CANCELLED],
  [ShiftState.BROADCASTED]: [ShiftState.ASSIGNED, ShiftState.CANCELLED],
  [ShiftState.ASSIGNED]: [ShiftState.COMPLETED, ShiftState.CANCELLED],
  [ShiftState.COMPLETED]: [], // Terminal state (approval is separate)
  [ShiftState.CANCELLED]: [] // Terminal state
}

/**
 * State transition rules for application workflow
 */
export const ApplicationStateTransitions: Record<ApplicationState, ApplicationState[]> = {
  [ApplicationState.APPLIED]: [ApplicationState.PENDING, ApplicationState.WITHDRAWN],
  [ApplicationState.PENDING]: [ApplicationState.APPROVED, ApplicationState.REJECTED],
  [ApplicationState.APPROVED]: [], // Terminal state
  [ApplicationState.REJECTED]: [], // Terminal state
  [ApplicationState.WITHDRAWN]: [] // Terminal state
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Enum validators and business rule helpers
 */
export const EnumValidators = {
  isValidUserRole(role: string): role is UserRole {
    return Object.values(UserRole).includes(role as UserRole)
  },

  isValidJobRole(jobRole: string): jobRole is JobRole {
    return Object.values(JobRole).includes(jobRole as JobRole)
  },

  isValidShiftState(state: string): state is ShiftState {
    return Object.values(ShiftState).includes(state as ShiftState)
  },

  isValidShiftType(type: string): type is ShiftType {
    return Object.values(ShiftType).includes(type as ShiftType)
  },

  isValidApplicationState(state: string): state is ApplicationState {
    return Object.values(ApplicationState).includes(state as ApplicationState)
  },

  isValidNotificationType(type: string): type is NotificationType {
    return Object.values(NotificationType).includes(type as NotificationType)
  },

  /**
   * Check if a shift state transition is valid
   */
  canTransitionShiftState(from: ShiftState, to: ShiftState): boolean {
    return ShiftStateTransitions[from]?.includes(to) ?? false
  },

  /**
   * Check if an application state transition is valid
   */
  canTransitionApplicationState(from: ApplicationState, to: ApplicationState): boolean {
    return ApplicationStateTransitions[from]?.includes(to) ?? false
  },

  /**
   * Get job roles that are allowed to use equipment
   */
  getJobRolesThatAllowEquipment(): JobRole[] {
    return [JobRole.CRANE_OPERATOR, JobRole.SIGNALMAN]
  },

  /**
   * Get terminal states for shifts (no further transitions allowed)
   */
  getShiftTerminalStates(): ShiftState[] {
    return [ShiftState.COMPLETED, ShiftState.CANCELLED]
  },

  /**
   * Get terminal states for applications
   */
  getApplicationTerminalStates(): ApplicationState[] {
    return [ApplicationState.APPROVED, ApplicationState.REJECTED, ApplicationState.WITHDRAWN]
  }
}

// ============================================================================
// LEGACY COMPATIBILITY (DEPRECATED)
// ============================================================================

/**
 * @deprecated Use UserRole instead
 * Kept for backward compatibility - will be removed in v2.0.0
 */
export enum Role {
  OPERATOR = 'OPERATOR',
  SITE_MANAGER = 'SITE_MANAGER',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  COMPANY_ADMIN = 'COMPANY_ADMIN'
}

/**
 * @deprecated Use ApplicationState instead
 * Kept for backward compatibility - will be removed in v2.0.0
 */
export enum ApplicationStatus {
  APPLIED = 'applied',
  REJECTED = 'rejected',
  ACCEPTED = 'accepted'
}
