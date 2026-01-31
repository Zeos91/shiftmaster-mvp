/**
 * Shifts Controller - Thin orchestration layer for shift operations
 * No business logic - only request/response handling
 */

import { Request, Response } from 'express'
import { shiftService } from '../../../domain/shift/ShiftService.js'
import {
  successResponse,
  createdResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  noContentResponse,
  forbiddenResponse
} from '../../../utils/response.js'
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  BusinessRuleViolationError
} from '../../../domain/shared/errors.js'

/**
 * Create a new shift
 * POST /api/v1/shifts
 */
export const createShift = async (req: Request, res: Response): Promise<Response> => {
  try {
    if (!req.user) {
      return errorResponse(res, 'Unauthorized', 401)
    }

    const {
      startTime,
      endTime,
      hours,
      workerId,
      siteId,
      roleRequired,
      equipmentId,
      state,
      operatorRate,
      siteRate,
      overrideOperatorRate,
      overrideSiteRate,
      date
    } = req.body

    const shift = await shiftService.createShift(
      {
        startTime,
        endTime,
        hours,
        workerId,
        siteId,
        roleRequired,
        equipmentId,
        state,
        operatorRate,
        siteRate,
        overrideOperatorRate,
        overrideSiteRate,
        date
      },
      req.user,
      {
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    )

    return createdResponse(res, shift)
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(res, error.message, error.field)
    }
    if (error instanceof ForbiddenError) {
      return forbiddenResponse(res, error.message)
    }
    if (error instanceof BusinessRuleViolationError) {
      return errorResponse(res, error.message, 400)
    }
    console.error('Create shift error:', error)
    return errorResponse(res, 'Failed to create shift')
  }
}

/**
 * Get all shifts
 * GET /api/v1/shifts
 */
export const getAllShifts = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { workerId, siteId, state, approved, date } = req.query

    const shifts = await shiftService.getAllShifts({
      workerId: workerId as string,
      siteId: siteId as string,
      state: state as any,
      approved: approved === 'true' ? true : approved === 'false' ? false : undefined,
      date: date as string
    })

    return successResponse(res, shifts)
  } catch (error: any) {
    console.error('Get shifts error:', error)
    return errorResponse(res, 'Failed to fetch shifts')
  }
}

/**
 * Get shift by ID
 * GET /api/v1/shifts/:id
 */
export const getShiftById = async (req: Request, res: Response): Promise<Response> => {
  try {
    if (!req.user) {
      return errorResponse(res, 'Unauthorized', 401)
    }

    const { id } = req.params

    const shift = await shiftService.getShiftById(id, req.user)

    return successResponse(res, shift)
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return notFoundResponse(res, 'Shift')
    }
    if (error instanceof ForbiddenError) {
      return forbiddenResponse(res, error.message)
    }
    console.error('Get shift error:', error)
    return errorResponse(res, 'Failed to fetch shift')
  }
}

/**
 * Update a shift
 * PATCH /api/v1/shifts/:id
 */
export const updateShift = async (req: Request, res: Response): Promise<Response> => {
  try {
    if (!req.user) {
      return errorResponse(res, 'Unauthorized', 401)
    }

    const { id } = req.params
    const {
      approved,
      state,
      startTime,
      endTime,
      hours,
      workerId,
      siteId,
      roleRequired,
      equipmentId,
      date,
      overrideOperatorRate,
      overrideSiteRate,
      actualStartTime,
      actualEndTime,
      breakMinutes,
      totalHours
    } = req.body

    const shift = await shiftService.updateShift(
      id,
      {
        approved,
        state,
        startTime,
        endTime,
        hours,
        workerId,
        siteId,
        roleRequired,
        equipmentId,
        date,
        overrideOperatorRate,
        overrideSiteRate,
        actualStartTime,
        actualEndTime,
        breakMinutes,
        totalHours
      },
      req.user,
      {
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    )

    return successResponse(res, shift)
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return notFoundResponse(res, 'Shift')
    }
    if (error instanceof ValidationError) {
      return validationErrorResponse(res, error.message, error.field)
    }
    if (error instanceof ForbiddenError) {
      return forbiddenResponse(res, error.message)
    }
    if (error instanceof BusinessRuleViolationError) {
      return errorResponse(res, error.message, 400)
    }
    console.error('Update shift error:', error)
    return errorResponse(res, 'Failed to update shift')
  }
}

/**
 * Delete a shift
 * DELETE /api/v1/shifts/:id
 */
export const deleteShift = async (req: Request, res: Response): Promise<Response> => {
  try {
    if (!req.user) {
      return errorResponse(res, 'Unauthorized', 401)
    }

    const { id } = req.params

    await shiftService.deleteShift(id, req.user, {
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })

    return noContentResponse(res)
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return notFoundResponse(res, 'Shift')
    }
    if (error instanceof ForbiddenError) {
      return forbiddenResponse(res, error.message)
    }
    console.error('Delete shift error:', error)
    return errorResponse(res, 'Failed to delete shift')
  }
}

/**
 * Approve a shift
 * PATCH /api/v1/shifts/:id/approve
 */
export const approveShift = async (req: Request, res: Response): Promise<Response> => {
  try {
    if (!req.user) {
      return errorResponse(res, 'Unauthorized', 401)
    }

    const { id } = req.params

    const shift = await shiftService.approveShift(id, req.user, {
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })

    return successResponse(res, shift)
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return notFoundResponse(res, 'Shift')
    }
    if (error instanceof ForbiddenError) {
      return forbiddenResponse(res, error.message)
    }
    if (error instanceof BusinessRuleViolationError) {
      return errorResponse(res, error.message, 400)
    }
    console.error('Approve shift error:', error)
    return errorResponse(res, 'Failed to approve shift')
  }
}

/**
 * Broadcast a shift
 * PATCH /api/v1/shifts/:id/broadcast
 */
export const broadcastShift = async (req: Request, res: Response): Promise<Response> => {
  try {
    if (!req.user) {
      return errorResponse(res, 'Unauthorized', 401)
    }

    const { id } = req.params

    const shift = await shiftService.broadcastShift(id, req.user, {
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })

    return successResponse(res, shift)
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return notFoundResponse(res, 'Shift')
    }
    if (error instanceof ForbiddenError) {
      return forbiddenResponse(res, error.message)
    }
    console.error('Broadcast shift error:', error)
    return errorResponse(res, 'Failed to broadcast shift')
  }
}
