/**
 * ShiftMaster MVP - Type Definitions
 * Unified domain models for Workers, Roles, and Shifts
 */

// Role enum for auth/permissions
export enum Role {
  OPERATOR = 'OPERATOR',
  SITE_MANAGER = 'SITE_MANAGER',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  COMPANY_ADMIN = 'COMPANY_ADMIN'
}

// Job role enum - specific roles workers can perform
export enum JobRole {
  CRANE_OPERATOR = 'crane_operator',
  SAFETY_ASSISTANT = 'safety_assistant',
  SIGNALMAN = 'signalman',
  SITE_MANAGER = 'site_manager',
  SAFETY_OFFICER = 'safety_officer',
  GENERAL_WORKER = 'general_worker'
}

// Shift state machine
export enum ShiftState {
  ASSIGNED = 'assigned',
  BROADCASTED = 'broadcasted',
  APPLIED = 'applied',
  PENDING_APPROVAL = 'pending_approval',
  COMPLETED = 'completed'
}

// Worker (formerly Operator)
export interface Worker {
  id: string
  name: string
  email: string
  phone: string
  role: Role
  roles: JobRole[]
  certifications: string[]
  availabilityStatus: boolean
  phoneVerified: boolean
  residenceLocation?: string
  createdAt: string
}

// Shift
export interface Shift {
  id: string
  workerId: string
  worker?: Worker
  siteId: string
  site?: any // Site interface not defined here
  date: string // YYYY-MM-DD
  startTime?: string
  endTime?: string
  hours: number
  roleRequired: JobRole
  equipmentId?: string
  operatorRate: number
  siteRate: number
  overrideOperatorRate?: number
  overrideSiteRate?: number
  state: ShiftState
  approved: boolean
  approvedById?: string
  approvedBy?: Worker
  overrideEdit: boolean
  craneId?: string
  createdAt: string
}

// API Response types
export interface LoginResponse {
  worker: Omit<Worker, 'password'>
  token: string
}

export interface RegisterResponse {
  message: string
  worker: Omit<Worker, 'password'>
}

export interface VerifyOTPResponse {
  message: string
  worker: Omit<Worker, 'password'>
  token: string
}

export interface ShiftResponse extends Shift {}

export interface ShiftsListResponse extends Array<Shift> {}

// Auth context types
export interface AuthContextType {
  worker: (Omit<Worker, 'password'> & { token: string }) | null
  isLoading: boolean
  error: string | null
  register: (name: string, email: string, phone: string, password: string) => Promise<void>
  verifyOTP: (phone: string, code: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  getProfile: () => Promise<void>
}
