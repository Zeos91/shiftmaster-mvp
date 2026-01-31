/**
 * API v1 Routes Index
 * Central routing configuration for API version 1
 */

import { Router } from 'express'
import authRoutes from './auth/auth.routes.js'
import shiftsRoutes from './shifts/shifts.routes.js'
import applicationsRoutes from './applications/applications.routes.js'

const router = Router()

// Mount route modules
router.use('/auth', authRoutes)
router.use('/shifts', shiftsRoutes)
router.use('/applications', applicationsRoutes)

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API v1 is running',
    timestamp: new Date().toISOString()
  })
})

export default router
