/**
 * Authentication Middleware
 * JWT verification and role-based access control
 */

import { Request, Response, NextFunction } from 'express'
import { verifyToken as verifyJWT } from '../infra/auth/jwt.js'
import { workerRepository } from '../domain/worker/WorkerRepository.js'
import { Worker } from '@prisma/client'
import { Role } from '../domain/shared/enums.js'
import { unauthorizedResponse, forbiddenResponse } from '../utils/response.js'

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: Worker
    }
  }
}

/**
 * Middleware to verify JWT token and attach user to request
 */
export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      unauthorizedResponse(res, 'No token provided')
      return
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Verify JWT
    const payload = verifyJWT(token)

    // Fetch full user from database
    const user = await workerRepository.findById(payload.id)

    if (!user) {
      unauthorizedResponse(res, 'User not found')
      return
    }

    // Attach user to request
    req.user = user

    next()
  } catch (error: any) {
    console.error('Token verification error:', error)
    unauthorizedResponse(res, 'Invalid or expired token')
  }
}

/**
 * Middleware factory to require specific roles
 * Usage: requireRole('SITE_MANAGER', 'COMPANY_ADMIN')
 */
export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      unauthorizedResponse(res, 'Not authenticated')
      return
    }

    if (!allowedRoles.includes(req.user.role as Role)) {
      forbiddenResponse(
        res,
        `This action requires one of the following roles: ${allowedRoles.join(', ')}`
      )
      return
    }

    next()
  }
}
