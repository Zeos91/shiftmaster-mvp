import express from 'express'
import { exportHoursPdf, getMyShiftsReport, exportShiftsPdf } from '../controllers/reports.controller.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

// Reports: controller enforces auth; accept token via query param for mobile downloads
router.get('/hours/pdf', exportHoursPdf)
router.get('/my-shifts', verifyToken, getMyShiftsReport)
router.post('/export/pdf', verifyToken, exportShiftsPdf)
router.get('/export/pdf', exportShiftsPdf) // Allow GET for browser direct linking with token param
export default router
