/**
 * Infrastructure Layer - Password Hashing Utilities
 * Secure password hashing and verification using bcrypt
 */

import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

/**
 * Hash a plain text password
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verify a password against a hashed password
 */
export const verifyPassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword)
}
