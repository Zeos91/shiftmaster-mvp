/**
 * Standardized API Response Utilities
 * Ensures consistent response format across all endpoints
 */

import { Response } from 'express'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    message: string
    field?: string
    code?: string
  }
  meta?: {
    timestamp: string
    requestId?: string
  }
}

/**
 * Success response helper
 */
export const successResponse = <T = any>(
  res: Response,
  data: T,
  statusCode: number = 200
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString()
    }
  }
  return res.status(statusCode).json(response)
}

/**
 * Error response helper
 */
export const errorResponse = (
  res: Response,
  message: string,
  statusCode: number = 500,
  field?: string,
  code?: string
): Response => {
  const response: ApiResponse = {
    success: false,
    error: {
      message,
      ...(field && { field }),
      ...(code && { code })
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  }
  return res.status(statusCode).json(response)
}

/**
 * Created response (201)
 */
export const createdResponse = <T = any>(res: Response, data: T): Response => {
  return successResponse(res, data, 201)
}

/**
 * No content response (204)
 */
export const noContentResponse = (res: Response): Response => {
  return res.status(204).send()
}

/**
 * Not found response (404)
 */
export const notFoundResponse = (
  res: Response,
  entity: string = 'Resource'
): Response => {
  return errorResponse(res, `${entity} not found`, 404, undefined, 'NOT_FOUND')
}

/**
 * Validation error response (400)
 */
export const validationErrorResponse = (
  res: Response,
  message: string,
  field?: string
): Response => {
  return errorResponse(res, message, 400, field, 'VALIDATION_ERROR')
}

/**
 * Unauthorized response (401)
 */
export const unauthorizedResponse = (
  res: Response,
  message: string = 'Unauthorized'
): Response => {
  return errorResponse(res, message, 401, undefined, 'UNAUTHORIZED')
}

/**
 * Forbidden response (403)
 */
export const forbiddenResponse = (
  res: Response,
  message: string = 'Forbidden'
): Response => {
  return errorResponse(res, message, 403, undefined, 'FORBIDDEN')
}

/**
 * Conflict response (409)
 */
export const conflictResponse = (
  res: Response,
  message: string
): Response => {
  return errorResponse(res, message, 409, undefined, 'CONFLICT')
}
