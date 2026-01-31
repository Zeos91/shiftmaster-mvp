/**
 * Server Entry Point
 * Starts the Express server
 */

import app from './app.js'
import { env } from './infra/config/env.js'
import { logger } from './infra/logger/logger.js'
import { prisma } from './infra/db/prisma.js'

const PORT = env.PORT

// Only start server if not in test mode
if (env.NODE_ENV !== 'test') {
  // Test database connection
  prisma.$connect()
    .then(() => {
      logger.info('Database connected successfully')

      // Start server
      app.listen(PORT, () => {
        logger.info(`🚀 Server running on port ${PORT}`)
        logger.info(`📍 Environment: ${env.NODE_ENV}`)
        logger.info(`🔗 API v1: http://localhost:${PORT}/api/v1`)
        logger.info(`🔗 Legacy API: http://localhost:${PORT}/api`)
      })
    })
    .catch((error) => {
      logger.error('Failed to connect to database:', error)
      process.exit(1)
    })

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...')
    await prisma.$disconnect()
    process.exit(0)
  })

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully...')
    await prisma.$disconnect()
    process.exit(0)
  })
}
