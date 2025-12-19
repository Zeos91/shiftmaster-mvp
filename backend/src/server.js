import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import shiftsRoutes from './routes/shifts.routes.js'
import authRoutes from './routes/auth.routes.js'

const app = express()

app.use(cors({
  origin: '*'
}))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/shifts', shiftsRoutes)

app.get('/', (req, res) => {
  res.send('ShiftMaster API running')
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
