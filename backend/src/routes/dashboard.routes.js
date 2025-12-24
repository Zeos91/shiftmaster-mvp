import express from 'express'
import { verifyToken } from '../middleware/auth.js'
import {
  getSummary,
  getShiftMetrics,
  getWorkerActivity,
  getRecentActivity
} from '../controllers/dashboard.controller.js'

const router = express.Router()

// All dashboard endpoints require authentication
// Manager access is checked in controller

// Dashboard summary
router.get('/summary', verifyToken, getSummary)

// Shift performance metrics
router.get('/shift-metrics', verifyToken, getShiftMetrics)

// Worker activity metrics
router.get('/worker-activity', verifyToken, getWorkerActivity)

// Recent activity feed
router.get('/activity', verifyToken, getRecentActivity)

export default router
