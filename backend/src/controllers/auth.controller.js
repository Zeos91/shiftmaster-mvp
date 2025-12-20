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
// REGISTER a new user
// ============================
export const register = async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body

    // Validate required fields
    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        error: 'Missing required fields: name, email, phone, password'
      })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user with phoneVerified = false
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role: role || 'OPERATOR',
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
      message: 'User registered successfully. Please verify your phone with the OTP sent via SMS.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
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

    // Find user and mark as verified
    const user = await prisma.user.update({
      where: { phone },
      data: { phoneVerified: true }
    })

    // Delete OTP record after successful verification
    await prisma.oTP.delete({ where: { id: otpRecord.id } })

    // Generate JWT token
    const token = generateToken(user)

    return res.json({
      message: 'Phone verified successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      token
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to verify OTP' })
  }
}

// ============================
// LOGIN user
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

    // Find user
    let user
    if (email) {
      user = await prisma.user.findUnique({
        where: { email }
      })
    } else {
      user = await prisma.user.findFirst({
        where: { phone }
      })
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Check if phone is verified
    if (!user.phoneVerified) {
      return res.status(403).json({
        error: 'Phone not verified. Please verify your phone with OTP first.'
      })
    }

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.password)

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Generate JWT token
    const token = generateToken(user)

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      token
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to login' })
  }
}

// ============================
// GET current user profile (requires auth)
// ============================
export const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        phoneVerified: true,
        residenceLocation: true,
        createdAt: true
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json(user)
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

    // Check if user exists
    const user = await prisma.user.findFirst({
      where: { phone }
    })

    if (!user) {
      return res.status(404).json({ error: 'User with this phone not found' })
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
