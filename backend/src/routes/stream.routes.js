import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import getDashboardStreamService from '../services/DashboardStreamService.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()
const streamService = getDashboardStreamService()

/**
 * SSE Endpoint for real-time dashboard updates
 * GET /api/dashboard/stream
 */
router.get('/stream', verifyToken, (req, res) => {
  // Check manager role
  const managerRoles = ['SITE_MANAGER', 'PROJECT_MANAGER', 'COMPANY_ADMIN']
  if (!managerRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Manager access required' })
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('X-Accel-Buffering', 'no') // Disable proxy buffering

  const clientId = uuidv4()

  // Register client
  const success = streamService.addClient(clientId, res, req.user.id, req.user.role)
  if (!success) {
    return // Already sent 503 response
  }

  // Send initial connection message
  res.write(`event: connected\n`)
  res.write(`data: ${JSON.stringify({ clientId, timestamp: new Date().toISOString() })}\n\n`)

  // Handle client disconnect
  req.on('close', () => {
    streamService.removeClient(clientId)
  })

  // Graceful error handling
  res.on('error', () => {
    streamService.removeClient(clientId)
  })
})

/**
 * Health check for SSE service
 */
router.get('/stream/metrics', verifyToken, (req, res) => {
  const metrics = streamService.getMetrics()
  res.json(metrics)
})

export default router
