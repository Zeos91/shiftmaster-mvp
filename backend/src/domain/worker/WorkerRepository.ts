/**
 * Worker Repository - Database access layer for Worker entity
 */

import { prisma } from '../../infra/db/prisma.js'
import { Worker, Prisma } from '@prisma/client'
import { Role, JobRole } from '../shared/enums.js'

export type WorkerWithRelations = Prisma.WorkerGetPayload<{
  include: {
    shifts: true
    managedSites: true
    applications: true
  }
}>

export type CreateWorkerData = {
  name: string
  email: string
  phone: string
  password: string
  role?: Role
  roles?: JobRole[]
  certifications?: string[]
  phoneVerified?: boolean
}

export type UpdateWorkerData = Partial<Omit<CreateWorkerData, 'email'>>

export class WorkerRepository {
  /**
   * Find worker by ID
   */
  async findById(id: string): Promise<Worker | null> {
    return prisma.worker.findUnique({
      where: { id }
    })
  }

  /**
   * Find worker by email
   */
  async findByEmail(email: string): Promise<Worker | null> {
    return prisma.worker.findUnique({
      where: { email }
    })
  }

  /**
   * Find worker by phone
   */
  async findByPhone(phone: string): Promise<Worker | null> {
    return prisma.worker.findFirst({
      where: { phone }
    })
  }

  /**
   * Find all workers with optional filters
   */
  async findMany(params?: {
    role?: Role
    jobRole?: JobRole
    availabilityStatus?: boolean
    skip?: number
    take?: number
  }): Promise<Worker[]> {
    const { role, jobRole, availabilityStatus, skip, take } = params || {}

    return prisma.worker.findMany({
      where: {
        ...(role && { role }),
        ...(jobRole && { roles: { has: jobRole } }),
        ...(availabilityStatus !== undefined && { availabilityStatus })
      },
      orderBy: { createdAt: 'desc' },
      ...(skip !== undefined && { skip }),
      ...(take !== undefined && { take })
    })
  }

  /**
   * Create a new worker
   */
  async create(data: CreateWorkerData): Promise<Worker> {
    return prisma.worker.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        role: data.role || 'OPERATOR',
        roles: data.roles || ['crane_operator'],
        certifications: data.certifications || [],
        phoneVerified: data.phoneVerified || false
      }
    })
  }

  /**
   * Update an existing worker
   */
  async update(id: string, data: UpdateWorkerData): Promise<Worker> {
    return prisma.worker.update({
      where: { id },
      data
    })
  }

  /**
   * Delete a worker
   */
  async delete(id: string): Promise<void> {
    await prisma.worker.delete({ where: { id } })
  }

  /**
   * Verify worker has a specific job role
   */
  async hasJobRole(workerId: string, jobRole: JobRole): Promise<boolean> {
    const worker = await this.findById(workerId)
    if (!worker) return false
    return worker.roles.includes(jobRole)
  }

  /**
   * Update worker's phone verification status
   */
  async verifyPhone(id: string): Promise<Worker> {
    return prisma.worker.update({
      where: { id },
      data: { phoneVerified: true }
    })
  }

  /**
   * Count workers by criteria
   */
  async count(params?: {
    role?: Role
    jobRole?: JobRole
  }): Promise<number> {
    const { role, jobRole } = params || {}

    return prisma.worker.count({
      where: {
        ...(role && { role }),
        ...(jobRole && { roles: { has: jobRole } })
      }
    })
  }
}

export const workerRepository = new WorkerRepository()
