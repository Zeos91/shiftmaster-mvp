/**
 * Infrastructure Layer - Logger
 * Centralized logging utility (can be extended with Winston/Pino)
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

class Logger {
  private prefix(level: LogLevel): string {
    const timestamp = new Date().toISOString()
    return `[${timestamp}] [${level.toUpperCase()}]`
  }

  info(message: string, ...args: any[]): void {
    console.log(this.prefix('info'), message, ...args)
  }

  warn(message: string, ...args: any[]): void {
    console.warn(this.prefix('warn'), message, ...args)
  }

  error(message: string, error?: Error | any, ...args: any[]): void {
    console.error(this.prefix('error'), message, error, ...args)
  }

  debug(message: string, ...args: any[]): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.prefix('debug'), message, ...args)
    }
  }
}

export const logger = new Logger()
export default logger
