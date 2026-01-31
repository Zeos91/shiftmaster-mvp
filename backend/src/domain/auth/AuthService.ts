/**
 * AuthService - Business logic for authentication operations
 * All auth-related business rules live here
 */

import { Worker } from '@prisma/client'
import { workerRepository } from '../worker/WorkerRepository.js'
import { authPolicy } from './AuthPolicy.js'
import { generateToken } from '../../infra/auth/jwt.js'
import { hashPassword, verifyPassword } from '../../infra/auth/password.js'
import { prisma } from '../../infra/db/prisma.js'
import {
  ConflictError,
  UnauthorizedError,
  ValidationError,
  NotFoundError
} from '../shared/errors.js'
import { Role } from '../shared/enums.js'
import twilio from 'twilio'

interface RegisterData {
  name: string
  email: string
  phone: string
  password: string
  role?: Role
  roles?: string[]
  certifications?: string[]
}

interface LoginData {
  email?: string
  phone?: string
  password: string
}

interface OTPData {
  phone: string
  code: string
}

export class AuthService {
  private twilioClient: any = null

  private getTwilioClient() {
    if (
      !this.twilioClient &&
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN
    ) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      )
    }
    return this.twilioClient
  }

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  /**
   * Register a new worker
   */
  async register(data: RegisterData, currentUserRole?: Role): Promise<{
    worker: Worker
    message: string
  }> {
    // Validate required fields
    if (!data.name || !data.email || !data.phone || !data.password) {
      throw new ValidationError('Missing required fields: name, email, phone, password')
    }

    // Check authorization for role
    const requestedRole = data.role || Role.OPERATOR
    authPolicy.enforceRegistrationRole(requestedRole, currentUserRole)

    // Check if worker already exists
    const existingWorker = await workerRepository.findByEmail(data.email)
    if (existingWorker) {
      throw new ConflictError('Worker with this email already exists')
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password)

    // Create worker
    const worker = await workerRepository.create({
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: hashedPassword,
      role: requestedRole,
      roles: data.roles || ['crane_operator'],
      certifications: data.certifications || [],
      phoneVerified: false
    })

    // Generate and send OTP
    const otpCode = this.generateOTP()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    await prisma.oTP.create({
      data: {
        phone: data.phone,
        code: otpCode,
        expiresAt
      }
    })

    // Send OTP via SMS
    try {
      const client = this.getTwilioClient()
      if (client) {
        await client.messages.create({
          body: `Your ShiftMaster verification code is: ${otpCode}. Valid for 5 minutes.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: data.phone
        })
      }
    } catch (smsError: any) {
      console.error('Twilio SMS error:', smsError.message)
    }

    // Log OTP in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] OTP for ${data.phone}: ${otpCode}`)
    }

    return {
      worker,
      message:
        'Worker registered successfully. Please verify your phone with the OTP sent via SMS.'
    }
  }

  /**
   * Verify OTP and activate account
   */
  async verifyOTP(data: OTPData): Promise<{
    worker: Worker
    token: string
    message: string
  }> {
    if (!data.phone || !data.code) {
      throw new ValidationError('Phone and code are required')
    }

    // Find OTP record
    const otpRecord = await prisma.oTP.findFirst({
      where: { phone: data.phone, code: data.code }
    })

    if (!otpRecord) {
      throw new UnauthorizedError('Invalid OTP code')
    }

    // Check if expired
    if (new Date() > otpRecord.expiresAt) {
      await prisma.oTP.delete({ where: { id: otpRecord.id } })
      throw new UnauthorizedError('OTP has expired')
    }

    // Find and verify worker
    const existingWorker = await workerRepository.findByPhone(data.phone)
    if (!existingWorker) {
      throw new NotFoundError('Worker', data.phone)
    }

    const worker = await workerRepository.verifyPhone(existingWorker.id)

    // Delete OTP
    await prisma.oTP.delete({ where: { id: otpRecord.id } })

    // Generate JWT token
    const token = generateToken({
      id: worker.id,
      email: worker.email,
      role: worker.role as Role
    })

    return {
      worker,
      token,
      message: 'Phone verified successfully'
    }
  }

  /**
   * Login a worker
   */
  async login(data: LoginData): Promise<{
    worker: Worker
    token: string
  }> {
    // Validate input
    if ((!data.email && !data.phone) || !data.password) {
      throw new ValidationError('Email or phone and password are required')
    }

    // Find worker
    let worker: Worker | null = null
    if (data.email) {
      worker = await workerRepository.findByEmail(data.email)
    } else if (data.phone) {
      worker = await workerRepository.findByPhone(data.phone)
    }

    if (!worker || !worker.password) {
      throw new UnauthorizedError('Invalid credentials')
    }

    // Verify password
    const passwordValid = await verifyPassword(data.password, worker.password)
    if (!passwordValid) {
      throw new UnauthorizedError('Invalid credentials')
    }

    // Check phone verification
    if (!worker.phoneVerified) {
      throw new UnauthorizedError(
        'Phone not verified. Please complete OTP verification first.'
      )
    }

    // Generate token
    const token = generateToken({
      id: worker.id,
      email: worker.email,
      role: worker.role as Role
    })

    return {
      worker,
      token
    }
  }

  /**
   * Get worker profile
   */
  async getProfile(userId: string): Promise<Worker> {
    const worker = await workerRepository.findById(userId)
    if (!worker) {
      throw new NotFoundError('Worker', userId)
    }
    return worker
  }
}

export const authService = new AuthService()
