import express from 'express'
import {
  createShift,
  getShifts,
  approveShift,
  deleteShift,
  updateShift
} from '../controllers/shifts.controller.js'
import { verifyToken, requireRole } from '../middleware/auth.js'

const router = express.Router()

// All shift endpoints require authentication
router.post('/', verifyToken, createShift)
router.get('/', verifyToken, getShifts)
router.patch('/:id', verifyToken, updateShift)
router.delete('/:id', verifyToken, requireRole('PROJECT_MANAGER', 'COMPANY_ADMIN'), deleteShift)
router.patch('/:id/approve', verifyToken, requireRole('SITE_MANAGER', 'PROJECT_MANAGER', 'COMPANY_ADMIN'), approveShift)

export default router
