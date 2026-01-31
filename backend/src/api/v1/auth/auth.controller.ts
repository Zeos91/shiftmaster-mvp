/**
 * Auth Controller - Thin orchestration layer for authentication
 * No business logic - only request/response handling
 */

import { Request, Response } from 'express'
import { authService } from '../../../domain/auth/AuthService.js'
import {
  successResponse,
  createdResponse,
  errorResponse,
  validationErrorResponse,
  unauthorizedResponse,
  conflictResponse
} from '../../../utils/response.js'
import {
  ValidationError,
  ConflictError,
  UnauthorizedError,
  NotFoundError
} from '../../../domain/shared/errors.js'

/**
 * Register a new worker
 * POST /api/v1/auth/register
 */
export const register = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { name, email, phone, password, role, roles, certifications } = req.body

    const result = await authService.register(
      {
        name,
        email,
        phone,
        password,
        role,
        roles,
        certifications
      },
      req.user?.role
    )

    return createdResponse(res, {
      message: result.message,
      worker: {
        id: result.worker.id,
        name: result.worker.name,
        email: result.worker.email,
        phone: result.worker.phone,
        role: result.worker.role,
        roles: result.worker.roles
      }
    })
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(res, error.message, error.field)
    }
    if (error instanceof ConflictError) {
      return conflictResponse(res, error.message)
    }
    console.error('Register error:', error)
    return errorResponse(res, 'Failed to register user')
  }
}

/**
 * Verify OTP
 * POST /api/v1/auth/verify-otp
 */
export const verifyOTP = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { phone, code } = req.body

    const result = await authService.verifyOTP({ phone, code })

    return successResponse(res, {
      message: result.message,
      worker: {
        id: result.worker.id,
        name: result.worker.name,
        email: result.worker.email,
        phone: result.worker.phone,
        role: result.worker.role,
        roles: result.worker.roles
      },
      token: result.token
    })
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(res, error.message)
    }
    if (error instanceof UnauthorizedError) {
      return unauthorizedResponse(res, error.message)
    }
    if (error instanceof NotFoundError) {
      return errorResponse(res, error.message, 404)
    }
    console.error('Verify OTP error:', error)
    return errorResponse(res, 'Failed to verify OTP')
  }
}

/**
 * Login
 * POST /api/v1/auth/login
 */
export const login = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { email, phone, password } = req.body

    const result = await authService.login({ email, phone, password })

    return successResponse(res, {
      worker: {
        id: result.worker.id,
        name: result.worker.name,
        email: result.worker.email,
        phone: result.worker.phone,
        role: result.worker.role,
        roles: result.worker.roles,
        phoneVerified: result.worker.phoneVerified
      },
      token: result.token
    })
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(res, error.message)
    }
    if (error instanceof UnauthorizedError) {
      return unauthorizedResponse(res, error.message)
    }
    console.error('Login error:', error)
    return errorResponse(res, 'Failed to login')
  }
}

/**
 * Get current user profile
 * GET /api/v1/auth/profile
 */
export const getProfile = async (req: Request, res: Response): Promise<Response> => {
  try {
    if (!req.user?.id) {
      return unauthorizedResponse(res, 'Not authenticated')
    }

    const worker = await authService.getProfile(req.user.id)

    // Remove password from response
    const { password, ...workerData } = worker

    return successResponse(res, { worker: workerData })
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return errorResponse(res, error.message, 404)
    }
    console.error('Get profile error:', error)
    return errorResponse(res, 'Failed to fetch profile')
  }
}
