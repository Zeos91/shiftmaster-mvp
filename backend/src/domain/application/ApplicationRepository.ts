/**
 * Application Repository - Database access layer for ShiftApplication entity
 */

import { prisma } from '../../infra/db/prisma.js'
import { ShiftApplication, Prisma } from '@prisma/client'
import { ApplicationStatus } from '../shared/enums.js'

export type ApplicationWithRelations = Prisma.ShiftApplicationGetPayload<{
  include: {
    worker: true
    shift: {
      include: {
        site: true
        worker: true
      }
    }
  }
}>

export type CreateApplicationData = {
  shiftId: string
  workerId: string
  status?: ApplicationStatus
}

export class ApplicationRepository {
  /**
   * Find application by ID
   */
  async findById(id: string): Promise<ApplicationWithRelations | null> {
    return prisma.shiftApplication.findUnique({
      where: { id },
      include: {
        worker: true,
        shift: {
          include: {
            site: true,
            worker: true
          }
        }
      }
    })
  }

  /**
   * Find applications by shift ID
   */
  async findByShiftId(shiftId: string): Promise<ApplicationWithRelations[]> {
    return prisma.shiftApplication.findMany({
      where: { shiftId },
      include: {
        worker: true,
        shift: {
          include: {
            site: true,
            worker: true
          }
        }
      },
      orderBy: { appliedAt: 'asc' }
    })
  }

  /**
   * Find applications by worker ID
   */
  async findByWorkerId(workerId: string): Promise<ApplicationWithRelations[]> {
    return prisma.shiftApplication.findMany({
      where: { workerId },
      include: {
        worker: true,
        shift: {
          include: {
            site: true,
            worker: true
          }
        }
      },
      orderBy: { appliedAt: 'desc' }
    })
  }

  /**
   * Find application by shift and worker
   */
  async findByShiftAndWorker(
    shiftId: string,
    workerId: string
  ): Promise<ApplicationWithRelations | null> {
    return prisma.shiftApplication.findUnique({
      where: {
        shiftId_workerId: { shiftId, workerId }
      },
      include: {
        worker: true,
        shift: {
          include: {
            site: true,
            worker: true
          }
        }
      }
    })
  }

  /**
   * Create a new application
   */
  async create(data: CreateApplicationData): Promise<ApplicationWithRelations> {
    return prisma.shiftApplication.create({
      data: {
        shiftId: data.shiftId,
        workerId: data.workerId,
        status: data.status || 'applied'
      },
      include: {
        worker: true,
        shift: {
          include: {
            site: true,
            worker: true
          }
        }
      }
    })
  }

  /**
   * Update application status
   */
  async updateStatus(
    id: string,
    status: ApplicationStatus
  ): Promise<ApplicationWithRelations> {
    return prisma.shiftApplication.update({
      where: { id },
      data: { status },
      include: {
        worker: true,
        shift: {
          include: {
            site: true,
            worker: true
          }
        }
      }
    })
  }

  /**
   * Delete an application
   */
  async delete(id: string): Promise<void> {
    await prisma.shiftApplication.delete({ where: { id } })
  }

  /**
   * Count applications by criteria
   */
  async count(params?: {
    shiftId?: string
    workerId?: string
    status?: ApplicationStatus
  }): Promise<number> {
    const { shiftId, workerId, status } = params || {}

    return prisma.shiftApplication.count({
      where: {
        ...(shiftId && { shiftId }),
        ...(workerId && { workerId }),
        ...(status && { status })
      }
    })
  }
}

export const applicationRepository = new ApplicationRepository()
