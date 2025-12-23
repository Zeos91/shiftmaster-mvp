import express from 'express'
import {
  broadcastShift,
  applyToShift,
  confirmWorker,
  getShiftApplications,
  getEligibleWorkersForShift
} from '../controllers/broadcast.controller.js'
import { verifyToken, requireRole } from '../middleware/auth.js'

const router = express.Router()

// All broadcast endpoints require authentication
// POST /shifts/:id/broadcast - Only managers can broadcast
router.post('/:id/broadcast', verifyToken, requireRole('SITE_MANAGER', 'PROJECT_MANAGER', 'COMPANY_ADMIN'), broadcastShift)

// POST /shifts/:id/apply - Any authenticated worker can apply
router.post('/:id/apply', verifyToken, applyToShift)

// POST /shifts/:id/confirm - Only managers can confirm
router.post('/:id/confirm', verifyToken, requireRole('SITE_MANAGER', 'PROJECT_MANAGER', 'COMPANY_ADMIN'), confirmWorker)

// GET /shifts/:id/applications - Get all applications for a shift (requires auth)
router.get('/:id/applications', verifyToken, getShiftApplications)

// GET /shifts/:id/eligible-workers - Get eligible workers for a shift (managers only)
router.get('/:id/eligible-workers', verifyToken, requireRole('SITE_MANAGER', 'PROJECT_MANAGER', 'COMPANY_ADMIN'), getEligibleWorkersForShift)

export default router
