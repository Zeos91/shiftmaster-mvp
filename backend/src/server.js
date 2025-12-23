import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import shiftsRoutes from './routes/shifts.routes.js'
import broadcastRoutes from './routes/broadcast.routes.js'
import authRoutes from './routes/auth.routes.js'

const app = express()

// Configure strict CORS whitelist from ALLOWED_ORIGINS env var
// Example: ALLOWED_ORIGINS=https://example.com,https://qzm1fyg-anonymous-8081.exp.direct
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
  .map(s => s.replace(/\/$/, '')) // remove trailing slash for exact-match comparisons

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true) // allow non-browser tools (curl, server-to-server)
    const norm = origin.replace(/\/$/, '')
    if (allowedOrigins.includes(norm)) return callback(null, true)
    return callback(new Error('CORS blocked'))
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
}))
app.options('*', cors())
console.log('🔥 CORS CONFIG LOADED')
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/shifts', shiftsRoutes)
app.use('/api/shifts', broadcastRoutes)

app.get('/', (req, res) => {
  res.send('ShiftMaster API running')
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
