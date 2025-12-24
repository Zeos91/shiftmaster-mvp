import request from 'supertest'
import { app } from '../src/server.js'

describe('Analytics API', () => {
  let authToken

  beforeAll(async () => {
    // Create test user and get auth token
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Analytics Test',
        email: `analytics-${Date.now()}@test.com`,
        phone: '+1234567890',
        password: 'password123',
        role: 'SITE_MANAGER'
      })

    if (registerRes.status !== 201) {
      console.error('Registration failed:', registerRes.status, registerRes.body)
    }

    authToken = registerRes.body.token
    if (!authToken) {
      console.error('No token in response:', registerRes.body)
    }
  })

  describe('GET /api/dashboard/analytics', () => {
    it('should return aggregated dashboard metrics', async () => {
      const res = await request(app)
        .get('/api/dashboard/analytics')
        .set('Authorization', `Bearer ${authToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('totalShifts')
      expect(res.body).toHaveProperty('completedShifts')
      expect(res.body).toHaveProperty('assignedShifts')
      expect(res.body).toHaveProperty('broadcastedShifts')
      expect(res.body).toHaveProperty('totalWorkers')
      expect(res.body).toHaveProperty('activeWorkers')
      expect(res.body).toHaveProperty('shiftCompletionRate')
      
      // Values should be numbers
      expect(typeof res.body.totalShifts).toBe('number')
      expect(typeof res.body.shiftCompletionRate).toBe('number')
    })

    it('should filter by date range', async () => {
      const res = await request(app)
        .get('/api/dashboard/analytics')
        .query({
          startDate: '2025-01-01',
          endDate: '2025-01-02'
        })
        .set('Authorization', `Bearer ${authToken}`)

      expect(res.status).toBe(200)
      expect(typeof res.body.totalShifts).toBe('number')
    })

    it('should filter by siteId', async () => {
      const res = await request(app)
        .get('/api/dashboard/analytics')
        .query({ siteId: 'test-site-id' })
        .set('Authorization', `Bearer ${authToken}`)

      expect(res.status).toBe(200)
      expect(typeof res.body.totalShifts).toBe('number')
    })

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/dashboard/analytics')

      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/dashboard/history', () => {
    it('should return paginated activity history', async () => {
      const res = await request(app)
        .get('/api/dashboard/history')
        .set('Authorization', `Bearer ${authToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('activities')
      expect(res.body).toHaveProperty('total')
      expect(res.body).toHaveProperty('page')
      expect(res.body).toHaveProperty('pageSize')
      expect(Array.isArray(res.body.activities)).toBe(true)
    })

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/dashboard/history')
        .query({ page: 1, pageSize: 2 })
        .set('Authorization', `Bearer ${authToken}`)

      expect(res.status).toBe(200)
      expect(res.body.page).toBe(1)
      expect(res.body.pageSize).toBe(2)
      expect(res.body.activities.length).toBeLessThanOrEqual(2)
    })

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/dashboard/history')

      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/dashboard/trends', () => {
    it('should return shift trend data', async () => {
      const res = await request(app)
        .get('/api/dashboard/trends')
        .query({ metric: 'shifts', period: 'day' })
        .set('Authorization', `Bearer ${authToken}`)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      
      if (res.body.length > 0) {
        expect(res.body[0]).toHaveProperty('period')
        expect(res.body[0]).toHaveProperty('count')
      }
    })

    it('should return worker trend data', async () => {
      const res = await request(app)
        .get('/api/dashboard/trends')
        .query({ metric: 'workers', period: 'day' })
        .set('Authorization', `Bearer ${authToken}`)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })

    it('should return application trend data', async () => {
      const res = await request(app)
        .get('/api/dashboard/trends')
        .query({ metric: 'applications', period: 'day' })
        .set('Authorization', `Bearer ${authToken}`)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })

    it('should support different time periods', async () => {
      const res = await request(app)
        .get('/api/dashboard/trends')
        .query({ metric: 'shifts', period: 'week' })
        .set('Authorization', `Bearer ${authToken}`)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })

    it('should filter by date range', async () => {
      const res = await request(app)
        .get('/api/dashboard/trends')
        .query({
          metric: 'shifts',
          period: 'day',
          startDate: '2025-01-01',
          endDate: '2025-01-03'
        })
        .set('Authorization', `Bearer ${authToken}`)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/dashboard/trends')
        .query({ metric: 'shifts', period: 'day' })

      expect(res.status).toBe(401)
    })

    it('should validate metric parameter', async () => {
      const res = await request(app)
        .get('/api/dashboard/trends')
        .query({ period: 'day' })
        .set('Authorization', `Bearer ${authToken}`)

      expect(res.status).toBe(400)
    })
  })
})
