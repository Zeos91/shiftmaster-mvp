import express from 'express'
import {
  createShift,
  getShifts,
  approveShift,
  deleteShift,
  updateShift
} from '../controllers/shifts.controller.js'

const router = express.Router()

router.post('/', createShift)
router.get('/', getShifts)
router.patch('/:id/approve', approveShift)
router.delete('/:id', deleteShift)
router.patch('/:id', updateShift)
export default router
