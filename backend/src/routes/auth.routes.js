import express from 'express'
import { register, login, getProfile, verifyOTP, resendOTP } from '../controllers/auth.controller.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

router.post('/register', register)
router.post('/login', login)
router.post('/verify-otp', verifyOTP)
router.post('/resend-otp', resendOTP)
router.get('/profile', verifyToken, getProfile)

export default router
