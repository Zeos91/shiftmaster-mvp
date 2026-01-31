/**
 * Shift Repository - Database access layer for Shift entity
 * All database operations for shifts go through this repository
 */

import { prisma } from '../../infra/db/prisma.js'
import { Shift, Prisma } from '@prisma/client'
import { ShiftState } from '../shared/enums.js'

export type ShiftWithRelations = Prisma.ShiftGetPayload<{
  include: {
    worker: true
    site: true
    crane: true
    approvedBy: true
    applications: {
      include: {
        worker: true
      }
    }
  }
}>

export type CreateShiftData = Omit<Shift, 'id' | 'createdAt'>
export type UpdateShiftData = Partial<CreateShiftData>

export class ShiftRepository {
  /**
   * Find shift by ID with all relations
   */
  async findById(id: string): Promise<ShiftWithRelations | null> {
    return prisma.shift.findUnique({
      where: { id },
      include: {
        worker: true,
        site: true,
        crane: true,
        approvedBy: true,
        applications: {
          include: {
            worker: true
          }
        }
      }
    })
  }

  /**
   * Find all shifts with optional filters
   */
  async findMany(params?: {
    workerId?: string
    siteId?: string
    state?: ShiftState
    approved?: boolean
    date?: string
    skip?: number
    take?: number
  }): Promise<ShiftWithRelations[]> {
    const { workerId, siteId, state, approved, date, skip, take } = params || {}

    return prisma.shift.findMany({
      where: {
        ...(workerId && { workerId }),
        ...(siteId && { siteId }),
        ...(state && { state }),
        ...(approved !== undefined && { approved }),
        ...(date && { date })
      },
      include: {
        worker: true,
        site: true,
        crane: true,
        approvedBy: true,
        applications: {
          include: {
            worker: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      ...(skip !== undefined && { skip }),
      ...(take !== undefined && { take })
    })
  }

  /**
   * Create a new shift
   */
  async create(data: CreateShiftData): Promise<ShiftWithRelations> {
    return prisma.shift.create({
      data,
      include: {
        worker: true,
        site: true,
        crane: true,
        approvedBy: true,
        applications: {
          include: {
            worker: true
          }
        }
      }
    })
  }

  /**
   * Update an existing shift
   */
  async update(id: string, data: UpdateShiftData): Promise<ShiftWithRelations> {
    return prisma.shift.update({
      where: { id },
      data,
      include: {
        worker: true,
        site: true,
        crane: true,
        approvedBy: true,
        applications: {
          include: {
            worker: true
          }
        }
      }
    })
  }

  /**
   * Delete a shift
   */
  async delete(id: string): Promise<void> {
    await prisma.shift.delete({ where: { id } })
  }

  /**
   * Approve a shift
   */
  async approve(id: string, approvedById: string): Promise<ShiftWithRelations> {
    return prisma.shift.update({
      where: { id },
      data: {
        approved: true,
        approvedById,
        approvedAt: new Date(),
        locked: true
      },
      include: {
        worker: true,
        site: true,
        crane: true,
        approvedBy: true,
        applications: {
          include: {
            worker: true
          }
        }
      }
    })
  }

  /**
   * Count shifts by criteria
   */
  async count(params?: {
    workerId?: string
    siteId?: string
    state?: ShiftState
    approved?: boolean
  }): Promise<number> {
    const { workerId, siteId, state, approved } = params || {}

    return prisma.shift.count({
      where: {
        ...(workerId && { workerId }),
        ...(siteId && { siteId }),
        ...(state && { state }),
        ...(approved !== undefined && { approved })
      }
    })
  }

  /**
   * Find shifts by date range
   */
  async findByDateRange(
    startDate: string,
    endDate: string
  ): Promise<ShiftWithRelations[]> {
    return prisma.shift.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        worker: true,
        site: true,
        crane: true,
        approvedBy: true,
        applications: {
          include: {
            worker: true
          }
        }
      },
      orderBy: { date: 'asc' }
    })
  }
}

export const shiftRepository = new ShiftRepository()
