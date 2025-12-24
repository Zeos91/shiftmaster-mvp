import request from 'supertest'
import express from 'express'
import { jest } from '@jest/globals'
import getDashboardStreamService from '../src/services/DashboardStreamService.js'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'

// Mock middleware
const mockVerifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) {
    return res.status(401).json({ error: 'No token' })
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret')
    req.user = decoded
    next()
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' })
  }
}

describe('Dashboard SSE Stream', () => {
  let app
  let streamService

  beforeEach(() => {
    app = express()
    app.use(express.json())

    streamService = getDashboardStreamService()
    streamService.shutdown()
    streamService.eventHistory = []

    // Create test router with auth
    const testRouter = express.Router()
    testRouter.get('/stream', mockVerifyToken, (req, res) => {
      const managerRoles = ['SITE_MANAGER', 'PROJECT_MANAGER', 'COMPANY_ADMIN']
      if (!managerRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Manager access required' })
      }

      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      const clientId = uuidv4()
      const success = streamService.addClient(clientId, res, req.user.id, req.user.role)
      if (!success) {
        return
      }

      res.write(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`)

      const endTimer = setTimeout(() => {
        if (!res.writableEnded) {
          res.end()
        }
      }, 150)

      req.on('close', () => {
        clearTimeout(endTimer)
        streamService.removeClient(clientId)
      })
    })

    app.use('/api/dashboard', testRouter)
  })

  afterEach(() => {
    streamService.shutdown()
  })

  describe('Authentication', () => {
    it('should reject request without token', async () => {
      const res = await request(app).get('/api/dashboard/stream')
      expect(res.status).toBe(401)
    })

    it('should reject request with invalid token', async () => {
      const res = await request(app)
        .get('/api/dashboard/stream')
        .set('Authorization', 'Bearer invalid-token')
      expect(res.status).toBe(401)
    })

    it('should reject worker role', async () => {
      const token = jwt.sign(
        { id: 'user1', email: 'op@test.com', role: 'OPERATOR' },
        process.env.JWT_SECRET || 'test-secret'
      )

      const res = await request(app)
        .get('/api/dashboard/stream')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(403)
      expect(res.body.error).toContain('Manager access required')
    })
  })

  describe('Manager Access', () => {
    it('should allow SITE_MANAGER', async () => {
      const token = jwt.sign(
        { id: 'user1', email: 'sm@test.com', role: 'SITE_MANAGER' },
        process.env.JWT_SECRET || 'test-secret'
      )

      const res = await request(app)
        .get('/api/dashboard/stream')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /text\/event-stream/)

      expect(res.status).toBe(200)
      expect(res.text).toContain('event: connected')
    })

    it('should allow PROJECT_MANAGER', async () => {
      const token = jwt.sign(
        { id: 'user1', email: 'pm@test.com', role: 'PROJECT_MANAGER' },
        process.env.JWT_SECRET || 'test-secret'
      )

      const res = await request(app)
        .get('/api/dashboard/stream')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /text\/event-stream/)

      expect(res.status).toBe(200)
    })

    it('should allow COMPANY_ADMIN', async () => {
      const token = jwt.sign(
        { id: 'user1', email: 'admin@test.com', role: 'COMPANY_ADMIN' },
        process.env.JWT_SECRET || 'test-secret'
      )

      const res = await request(app)
        .get('/api/dashboard/stream')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /text\/event-stream/)

      expect(res.status).toBe(200)
    })
  })

  describe('SSE Functionality', () => {
    it('should send connected event', async () => {
      const token = jwt.sign(
        { id: 'user1', email: 'sm@test.com', role: 'SITE_MANAGER' },
        process.env.JWT_SECRET || 'test-secret'
      )

      const res = await request(app)
        .get('/api/dashboard/stream')
        .set('Authorization', `Bearer ${token}`)

      expect(res.text).toContain('event: connected')
      expect(res.text).toContain('clientId')
    })

    it('should broadcast events to all clients', () => {
      const mockRes = {
        write: jest.fn(),
        end: jest.fn(),
        writableEnded: false,
        setHeader: jest.fn()
      }

      streamService.addClient('client-1', mockRes, 'user1', 'SITE_MANAGER')
      streamService.broadcast('shift.created', { shiftId: '123' })

      const written = mockRes.write.mock.calls.map(call => call[0]).join('')
      expect(written).toContain('event: shift.created')
      expect(written).toContain('shiftId')
    })
  })

  describe('Service Metrics', () => {
    it('should track active connections', () => {
      const metrics = streamService.getMetrics()
      expect(metrics.activeConnections).toBe(0)
      expect(metrics.maxConnections).toBe(100)
    })

    it('should store event history', () => {
      streamService.broadcast('test.event', { data: 'test' })
      const metrics = streamService.getMetrics()
      expect(metrics.recentEvents.length).toBeGreaterThan(0)
      expect(metrics.recentEvents[0].type).toBe('test.event')
    })

    it('should not exceed max history size', () => {
      for (let i = 0; i < 150; i++) {
        streamService.broadcast('test.event', { index: i })
      }
      const metrics = streamService.getMetrics()
      expect(metrics.eventHistorySize).toBeLessThanOrEqual(100)
    })
  })

  describe('Cleanup', () => {
    it('should remove client on disconnect', () => {
      const mockRes = {
        setHeader: jest.fn(),
        write: jest.fn(),
        writableEnded: false,
        end: jest.fn()
      }

      streamService.addClient('test-id', mockRes, 'user1', 'SITE_MANAGER')
      expect(streamService.getMetrics().activeConnections).toBe(1)

      streamService.removeClient('test-id')
      expect(streamService.getMetrics().activeConnections).toBe(0)
    })

    it('should clear timeouts on shutdown', () => {
      const mockRes = {
        setHeader: jest.fn(),
        write: jest.fn(),
        writableEnded: false,
        end: jest.fn()
      }

      streamService.addClient('test-id', mockRes, 'user1', 'SITE_MANAGER')
      streamService.shutdown()

      expect(streamService.getMetrics().activeConnections).toBe(0)
    })
  })
})
