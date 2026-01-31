/**
 * Auth Routes - API v1
 */

import { Router } from 'express'
import { register, verifyOTP, login, getProfile } from './auth.controller.js'
import { verifyToken } from '../../../middlewares/auth.middleware.js'

const router = Router()

// Public routes
router.post('/register', register)
router.post('/verify-otp', verifyOTP)
router.post('/login', login)

// Protected routes
router.get('/profile', verifyToken, getProfile)

export default router
