/**
 * Infrastructure Layer - JWT Utilities
 * Token generation and verification
 */

import jwt from 'jsonwebtoken'
import { Role } from '../../domain/shared/enums.js'

export interface JwtPayload {
  id: string
  email: string
  role: Role
}

export interface JwtConfig {
  secret: string
  expiresIn: string
}

const getJwtConfig = (): JwtConfig => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }
  return {
    secret,
    expiresIn: '7d'
  }
}

/**
 * Generate a JWT token for a user
 */
export const generateToken = (payload: JwtPayload): string => {
  const config = getJwtConfig()
  return jwt.sign(payload, config.secret, { expiresIn: config.expiresIn })
}

/**
 * Verify and decode a JWT token
 */
export const verifyToken = (token: string): JwtPayload => {
  const config = getJwtConfig()
  try {
    return jwt.verify(token, config.secret) as JwtPayload
  } catch (error) {
    throw new Error('Invalid or expired token')
  }
}

/**
 * Decode token without verification (for debugging)
 */
export const decodeToken = (token: string): JwtPayload | null => {
  try {
    return jwt.decode(token) as JwtPayload
  } catch {
    return null
  }
}
