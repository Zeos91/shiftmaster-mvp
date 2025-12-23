import express from 'express'
import { exportHoursPdf } from '../controllers/reports.controller.js'

const router = express.Router()

// Reports: controller enforces auth; accept token via query param for mobile downloads
router.get('/hours/pdf', exportHoursPdf)

export default router
