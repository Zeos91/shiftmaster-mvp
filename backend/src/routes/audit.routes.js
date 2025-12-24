import express from 'express'
import { fetchAuditLogs } from '../utils/auditLog.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

// Fetch audit logs with permissions checking
router.get('/logs', verifyToken, fetchAuditLogs)

export default router
