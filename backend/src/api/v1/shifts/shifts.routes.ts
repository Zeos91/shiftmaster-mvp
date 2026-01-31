/**
 * Shifts Routes - API v1
 */

import { Router } from 'express'
import {
  createShift,
  getAllShifts,
  getShiftById,
  updateShift,
  deleteShift,
  approveShift,
  broadcastShift
} from './shifts.controller.js'
import { verifyToken, requireRole } from '../../../middlewares/auth.middleware.js'

const router = Router()

// All routes require authentication
router.use(verifyToken)

// Shift CRUD
router.post('/', createShift)
router.get('/', getAllShifts)
router.get('/:id', getShiftById)
router.patch('/:id', updateShift)
router.delete('/:id', requireRole('PROJECT_MANAGER', 'COMPANY_ADMIN'), deleteShift)

// Shift actions
router.patch(
  '/:id/approve',
  requireRole('SITE_MANAGER', 'PROJECT_MANAGER', 'COMPANY_ADMIN'),
  approveShift
)
router.patch(
  '/:id/broadcast',
  requireRole('SITE_MANAGER', 'PROJECT_MANAGER', 'COMPANY_ADMIN'),
  broadcastShift
)

export default router
