import prisma from '../prisma.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import twilio from 'twilio'

// Initialize Twilio client (lazy load to handle missing credentials)
let twilioClient = null
const getTwilioClient = () => {
  if (!twilioClient && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )
  }
  return twilioClient
}

// Utility: Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Utility: Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

// ============================
// REGISTER a new worker
// ============================
export const register = async (req, res) => {
  try {
    const { name, email, phone, password, role, roles, certifications } = req.body

    // Validate required fields
    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        error: 'Missing required fields: name, email, phone, password'
      })
    }

    // Check if worker already exists
    const existingWorker = await prisma.worker.findUnique({
      where: { email }
    })

    if (existingWorker) {
      return res.status(409).json({ error: 'Worker with this email already exists' })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create worker with phoneVerified = false
    const worker = await prisma.worker.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role: role || 'OPERATOR',
        roles: roles || ['crane_operator'],
        certifications: certifications || [],
        phoneVerified: false
      }
    })

    // Generate OTP (6-digit, expires in 5 minutes)
    const otpCode = generateOTP()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    await prisma.oTP.create({
      data: {
        phone,
        code: otpCode,
        expiresAt
      }
    })

    // Send OTP via SMS using Twilio
    try {
      const client = getTwilioClient()
      if (client) {
        await client.messages.create({
          body: `Your ShiftMaster verification code is: ${otpCode}. Valid for 5 minutes.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phone
        })
      }
    } catch (smsError) {
      console.error('Twilio SMS error:', smsError.message)
    }

    // In development/testing, log the OTP
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] OTP for ${phone}: ${otpCode}`)
    }

    return res.status(201).json({
      message: 'Worker registered successfully. Please verify your phone with the OTP sent via SMS.',
      worker: {
        id: worker.id,
        name: worker.name,
        email: worker.email,
        phone: worker.phone,
        role: worker.role,
        roles: worker.roles
      }
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to register user' })
  }
}

// ============================
// VERIFY OTP
// ============================
export const verifyOTP = async (req, res) => {
  try {
    const { phone, code } = req.body

    if (!phone || !code) {
      return res.status(400).json({ error: 'Phone and code are required' })
    }

    // Find the OTP record
    const otpRecord = await prisma.oTP.findFirst({
      where: { phone, code }
    })

    if (!otpRecord) {
      return res.status(401).json({ error: 'Invalid OTP code' })
    }

    // Check if OTP is expired
    if (new Date() > otpRecord.expiresAt) {
      // Delete expired OTP
      await prisma.oTP.delete({ where: { id: otpRecord.id } })
      return res.status(401).json({ error: 'OTP has expired' })
    }

    // Find worker by phone (phone is not a unique field) and mark as verified
    const existingWorker = await prisma.worker.findFirst({ where: { phone } })
    if (!existingWorker) {
      return res.status(404).json({ error: 'Worker with this phone not found' })
    }

    const worker = await prisma.worker.update({
      where: { id: existingWorker.id },
      data: { phoneVerified: true }
    })

    // Delete OTP record after successful verification
    await prisma.oTP.delete({ where: { id: otpRecord.id } })

    // Generate JWT token
    const token = generateToken(worker)

    return res.json({
      message: 'Phone verified successfully',
      worker: {
        id: worker.id,
        name: worker.name,
        email: worker.email,
        phone: worker.phone,
        role: worker.role,
        roles: worker.roles
      },
      token
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to verify OTP' })
  }
}

// ============================
// LOGIN worker
// ============================
export const login = async (req, res) => {
  try {
    const { email, phone, password } = req.body

    // Accept either email or phone
    if ((!email && !phone) || !password) {
      return res.status(400).json({
        error: 'Email or phone and password are required'
      })
    }

    // Find worker
    let worker
    if (email) {
      worker = await prisma.worker.findUnique({
        where: { email }
      })
    } else {
      worker = await prisma.worker.findFirst({
        where: { phone }
      })
    }

    if (!worker) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Check if phone is verified
    if (!worker.phoneVerified) {
      return res.status(403).json({
        error: 'Phone not verified. Please verify your phone with OTP first.'
      })
    }

    // Check password
    const passwordMatch = await bcrypt.compare(password, worker.password)

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Generate JWT token
    const token = generateToken(worker)

    return res.json({
      worker: {
        id: worker.id,
        name: worker.name,
        email: worker.email,
        phone: worker.phone,
        role: worker.role,
        roles: worker.roles
      },
      token
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to login' })
  }
}

// ============================
// GET current worker profile (requires auth)
// ============================
export const getProfile = async (req, res) => {
  try {
    const worker = await prisma.worker.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        roles: true,
        certifications: true,
        availabilityStatus: true,
        phoneVerified: true,
        residenceLocation: true,
        createdAt: true
      }
    })

    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' })
    }

    res.json(worker)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
}

// ============================
// RESEND OTP (for users who didn't receive it)
// ============================
export const resendOTP = async (req, res) => {
  try {
    const { phone } = req.body

    if (!phone) {
      return res.status(400).json({ error: 'Phone is required' })
    }

    // Check if worker exists
    const worker = await prisma.worker.findFirst({
      where: { phone }
    })

    if (!worker) {
      return res.status(404).json({ error: 'Worker with this phone not found' })
    }

    // Delete any existing OTP for this phone
    await prisma.oTP.deleteMany({
      where: { phone }
    })

    // Generate new OTP
    const otpCode = generateOTP()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    await prisma.oTP.create({
      data: {
        phone,
        code: otpCode,
        expiresAt
      }
    })

    // Send OTP via SMS
    try {
      const client = getTwilioClient()
      if (client) {
        await client.messages.create({
          body: `Your ShiftMaster verification code is: ${otpCode}. Valid for 5 minutes.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phone
        })
      }
    } catch (smsError) {
      console.error('Twilio SMS error:', smsError.message)
    }

    // In development/testing, log the OTP
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] OTP for ${phone}: ${otpCode}`)
    }

    return res.json({
      message: 'OTP resent successfully'
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to resend OTP' })
  }
}
