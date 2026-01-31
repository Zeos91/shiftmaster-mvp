/**
 * Applications Controller - Thin orchestration layer for shift applications
 * No business logic - only request/response handling
 */

import { Request, Response } from 'express'
import { applicationService } from '../../../domain/application/ApplicationService.js'
import {
  successResponse,
  createdResponse,
  errorResponse,
  notFoundResponse,
  noContentResponse,
  forbiddenResponse,
  conflictResponse
} from '../../../utils/response.js'
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  BusinessRuleViolationError
} from '../../../domain/shared/errors.js'

/**
 * Apply to a shift
 * POST /api/v1/applications
 */
export const applyToShift = async (req: Request, res: Response): Promise<Response> => {
  try {
    if (!req.user) {
      return errorResponse(res, 'Unauthorized', 401)
    }

    const { shiftId } = req.body

    if (!shiftId) {
      return errorResponse(res, 'shiftId is required', 400)
    }

    const application = await applicationService.applyToShift(shiftId, req.user, {
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })

    return createdResponse(res, application)
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return notFoundResponse(res, 'Shift')
    }
    if (error instanceof ForbiddenError) {
      return forbiddenResponse(res, error.message)
    }
    if (error instanceof ConflictError) {
      return conflictResponse(res, error.message)
    }
    if (error instanceof BusinessRuleViolationError) {
      return errorResponse(res, error.message, 400)
    }
    console.error('Apply to shift error:', error)
    return errorResponse(res, 'Failed to apply to shift')
  }
}

/**
 * Get applications for a shift
 * GET /api/v1/applications/shift/:shiftId
 */
export const getApplicationsByShift = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { shiftId } = req.params

    const applications = await applicationService.getApplicationsByShift(shiftId)

    return successResponse(res, applications)
  } catch (error: any) {
    console.error('Get applications error:', error)
    return errorResponse(res, 'Failed to fetch applications')
  }
}

/**
 * Get applications by a worker
 * GET /api/v1/applications/worker/:workerId
 */
export const getApplicationsByWorker = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { workerId } = req.params

    const applications = await applicationService.getApplicationsByWorker(workerId)

    return successResponse(res, applications)
  } catch (error: any) {
    console.error('Get applications error:', error)
    return errorResponse(res, 'Failed to fetch applications')
  }
}

/**
 * Accept an application
 * PATCH /api/v1/applications/:id/accept
 */
export const acceptApplication = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user) {
      return errorResponse(res, 'Unauthorized', 401)
    }

    const { id } = req.params

    const application = await applicationService.acceptApplication(id, req.user, {
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })

    return successResponse(res, application)
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return notFoundResponse(res, 'Application')
    }
    if (error instanceof ForbiddenError) {
      return forbiddenResponse(res, error.message)
    }
    if (error instanceof BusinessRuleViolationError) {
      return errorResponse(res, error.message, 400)
    }
    console.error('Accept application error:', error)
    return errorResponse(res, 'Failed to accept application')
  }
}

/**
 * Reject an application
 * PATCH /api/v1/applications/:id/reject
 */
export const rejectApplication = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user) {
      return errorResponse(res, 'Unauthorized', 401)
    }

    const { id } = req.params

    const application = await applicationService.rejectApplication(id, req.user, {
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })

    return successResponse(res, application)
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return notFoundResponse(res, 'Application')
    }
    if (error instanceof ForbiddenError) {
      return forbiddenResponse(res, error.message)
    }
    if (error instanceof BusinessRuleViolationError) {
      return errorResponse(res, error.message, 400)
    }
    console.error('Reject application error:', error)
    return errorResponse(res, 'Failed to reject application')
  }
}

/**
 * Withdraw an application
 * DELETE /api/v1/applications/:id
 */
export const withdrawApplication = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user) {
      return errorResponse(res, 'Unauthorized', 401)
    }

    const { id } = req.params

    await applicationService.withdrawApplication(id, req.user, {
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })

    return noContentResponse(res)
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return notFoundResponse(res, 'Application')
    }
    if (error instanceof ForbiddenError) {
      return forbiddenResponse(res, error.message)
    }
    if (error instanceof BusinessRuleViolationError) {
      return errorResponse(res, error.message, 400)
    }
    console.error('Withdraw application error:', error)
    return errorResponse(res, 'Failed to withdraw application')
  }
}
