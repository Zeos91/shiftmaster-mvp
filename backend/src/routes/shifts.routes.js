import express from 'express'
import {
  createShift,
  getShifts,
  getFeedShifts,
  getMyShifts,
  getMyApplications,
  logShiftHours,
  approveShift,
  deleteShift,
  updateShift
} from '../controllers/shifts.controller.js'
import { setOverrideEdit } from '../controllers/shifts.controller.js'
import { verifyToken, requireRole } from '../middleware/auth.js'

const router = express.Router()

// All shift endpoints require authentication
router.post('/', verifyToken, createShift)
router.get('/', verifyToken, getShifts)
router.get('/feed', verifyToken, getFeedShifts)
router.get('/my', verifyToken, getMyShifts)
router.patch('/:id', verifyToken, updateShift)
router.post('/:id/log-hours', verifyToken, logShiftHours)
// Allow SITE_MANAGER as well for delete per permissions matrix
// Allow operator deletes when permitted by controller logic; controller enforces approval/override rules
router.delete('/:id', verifyToken, deleteShift)
router.get('/applications/my', verifyToken, getMyApplications)
router.patch('/:id/approve', verifyToken, requireRole('SITE_MANAGER', 'PROJECT_MANAGER', 'COMPANY_ADMIN'), approveShift)
// Managers can toggle overrideEdit to allow operators to edit/delete after approval
router.patch('/:id/override-edit', verifyToken, requireRole('SITE_MANAGER', 'PROJECT_MANAGER', 'COMPANY_ADMIN'), setOverrideEdit)

export default router
