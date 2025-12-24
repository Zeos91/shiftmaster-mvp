import express from 'express'
import { verifyToken, requireRole } from '../middleware/auth.js'
import {
  getDashboardAnalytics,
  getDashboardHistory,
  getDashboardTrends
} from '../controllers/analytics.controller.js'

const router = express.Router()

// All analytics endpoints require authentication and manager roles
const managerAuth = [verifyToken, requireRole('SITE_MANAGER', 'PROJECT_MANAGER', 'COMPANY_ADMIN')]

/**
 * GET /api/dashboard/analytics
 * Returns aggregated dashboard metrics
 * Query params: startDate, endDate, siteId, roleRequired
 */
router.get('/analytics', managerAuth, getDashboardAnalytics)

/**
 * GET /api/dashboard/history
 * Returns paginated historical events (audit logs)
 * Query params: startDate, endDate, entityType, action, actorId, page, limit
 */
router.get('/history', verifyToken, getDashboardHistory)

/**
 * GET /api/dashboard/trends
 * Returns time-series data for charts
 * Query params: metric (shifts|applications|activity), interval, startDate, endDate, siteId
 */
router.get('/trends', managerAuth, getDashboardTrends)

export default router
