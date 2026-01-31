/**
 * Applications Routes - API v1
 */

import { Router } from 'express'
import {
  applyToShift,
  getApplicationsByShift,
  getApplicationsByWorker,
  acceptApplication,
  rejectApplication,
  withdrawApplication
} from './applications.controller.js'
import { verifyToken, requireRole } from '../../../middlewares/auth.middleware.js'

const router = Router()

// All routes require authentication
router.use(verifyToken)

// Apply to shift
router.post('/', applyToShift)

// Get applications
router.get('/shift/:shiftId', getApplicationsByShift)
router.get('/worker/:workerId', getApplicationsByWorker)

// Manage applications (managers only)
router.patch(
  '/:id/accept',
  requireRole('SITE_MANAGER', 'PROJECT_MANAGER', 'COMPANY_ADMIN'),
  acceptApplication
)
router.patch(
  '/:id/reject',
  requireRole('SITE_MANAGER', 'PROJECT_MANAGER', 'COMPANY_ADMIN'),
  rejectApplication
)

// Withdraw application (own application only)
router.delete('/:id', withdrawApplication)

export default router
