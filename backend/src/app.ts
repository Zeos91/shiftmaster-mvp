/**
 * Express Application Setup
 * Configures middleware, routes, and error handling
 */

import express, { Application, Request, Response, NextFunction } from 'express'
import cors from 'cors'
import apiV1Routes from './api/v1/index.js'
import { env } from './infra/config/env.js'
import { logger } from './infra/logger/logger.js'
import { errorResponse } from './utils/response.js'

const app: Application = express()

// ===========================
// CORS Configuration
// ===========================
const allowedOrigins = env.ALLOWED_ORIGINS
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
  .map(s => s.replace(/\/$/, '')) // Remove trailing slash

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true)

      const normalized = origin.replace(/\/$/, '')
      if (allowedOrigins.includes(normalized)) {
        return callback(null, true)
      }

      logger.warn(`CORS blocked origin: ${origin}`)
      return callback(new Error('CORS blocked'))
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    credentials: true
  })
)

app.options('*', cors()) // Enable pre-flight for all routes

logger.info('CORS configuration loaded')

// ===========================
// Body Parsers
// ===========================
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ===========================
// API Routes
// ===========================
app.use('/api/v1', apiV1Routes)

// Legacy route support (can be deprecated later)
// Temporarily keep old endpoints for backward compatibility
import oldAuthRoutes from './routes/auth.routes.js'
import oldShiftsRoutes from './routes/shifts.routes.js'
import oldBroadcastRoutes from './routes/broadcast.routes.js'
import oldReportsRoutes from './routes/reports.routes.js'
import oldAuditRoutes from './routes/audit.routes.js'
import oldNotificationsRoutes from './routes/notifications.routes.js'
import oldDashboardRoutes from './routes/dashboard.routes.js'
import oldStreamRoutes from './routes/stream.routes.js'
import oldAnalyticsRoutes from './routes/analytics.routes.js'

app.use('/api/auth', oldAuthRoutes)
app.use('/api/shifts', oldShiftsRoutes)
app.use('/api/shifts', oldBroadcastRoutes) // Note: shares /api/shifts prefix
app.use('/api/reports', oldReportsRoutes)
app.use('/api/audit', oldAuditRoutes)
app.use('/api/notifications', oldNotificationsRoutes)
app.use('/api/dashboard', oldDashboardRoutes)
app.use('/api/dashboard', oldStreamRoutes) // Note: shares /api/dashboard prefix
app.use('/api/dashboard', oldAnalyticsRoutes) // Note: shares /api/dashboard prefix

// ===========================
// Root Endpoint
// ===========================
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'ShiftMaster API',
    version: '1.0.0',
    endpoints: {
      v1: '/api/v1',
      legacy: '/api'
    }
  })
})

// ===========================
// 404 Handler
// ===========================
app.use((req: Request, res: Response) => {
  errorResponse(res, `Route ${req.method} ${req.path} not found`, 404, undefined, 'NOT_FOUND')
})

// ===========================
// Global Error Handler
// ===========================
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err)

  if (err.message === 'CORS blocked') {
    return errorResponse(res, 'CORS policy violation', 403, undefined, 'CORS_ERROR')
  }

  errorResponse(res, 'Internal server error', 500, undefined, 'INTERNAL_ERROR')
})

export default app
