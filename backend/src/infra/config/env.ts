/**
 * Infrastructure Layer - Environment Configuration
 * Type-safe environment variable access
 */

export interface EnvConfig {
  // Server
  PORT: number
  NODE_ENV: 'development' | 'production' | 'test'

  // Database
  DATABASE_URL: string

  // Authentication
  JWT_SECRET: string

  // Twilio (optional)
  TWILIO_ACCOUNT_SID?: string
  TWILIO_AUTH_TOKEN?: string
  TWILIO_PHONE_NUMBER?: string

  // CORS
  ALLOWED_ORIGINS: string
}

const getEnv = (): EnvConfig => {
  return {
    PORT: parseInt(process.env.PORT || '3000', 10),
    NODE_ENV: (process.env.NODE_ENV as any) || 'development',
    DATABASE_URL: process.env.DATABASE_URL || '',
    JWT_SECRET: process.env.JWT_SECRET || '',
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || ''
  }
}

export const env = getEnv()
