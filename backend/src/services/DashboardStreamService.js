// SSE Dashboard Streaming Service
// Manages real-time connections and event broadcasting

class DashboardStreamService {
  constructor() {
    this.clients = new Map() // Map<clientId, { res, userId, role }>
    this.eventHistory = [] // Last 100 events for reconnects
    this.maxClients = 100
    this.maxHistorySize = 100
    this.heartbeatInterval = 20000 // 20 seconds
    this.idleTimeout = 15 * 60 * 1000 // 15 minutes
    this.heartbeatIntervals = new Map()
    this.lastEventTime = new Map()

    // Performance metrics
    this.metrics = {
      totalConnections: 0,
      totalDisconnects: 0,
      totalEvents: 0,
      totalHeartbeats: 0,
      failedHeartbeats: 0,
      eventProcessingTimes: [],
      maxEventProcessingTime: 0,
      avgEventProcessingTime: 0
    }
  }

  /**
   * Register a new SSE client
   */
  addClient(clientId, res, userId, role) {
    if (this.clients.size >= this.maxClients) {
      res.status(503).end('Server at max connections')
      return false
    }

    this.clients.set(clientId, { res, userId, role, connectedAt: Date.now() })
    this.lastEventTime.set(clientId, Date.now())
    this.metrics.totalConnections++

    // Set up heartbeat
    const heartbeat = setInterval(() => {
      this.sendHeartbeat(clientId)
    }, this.heartbeatInterval)

    this.heartbeatIntervals.set(clientId, heartbeat)

    // Set up idle timeout
    const timeout = setTimeout(() => {
      this.removeClient(clientId)
    }, this.idleTimeout)

    this.clients.get(clientId).idleTimeout = timeout

    return true
  }

  /**
   * Remove a client connection
   */
  removeClient(clientId) {
    const client = this.clients.get(clientId)
    if (!client) return

    // Clear heartbeat
    const interval = this.heartbeatIntervals.get(clientId)
    if (interval) clearInterval(interval)
    this.heartbeatIntervals.delete(clientId)

    // Clear idle timeout
    if (client.idleTimeout) clearTimeout(client.idleTimeout)

    // Close response
    try {
      if (!client.res.writableEnded) {
        client.res.end()
      }
    } catch (e) {
      // Response already closed
    }

    this.clients.delete(clientId)
    this.lastEventTime.delete(clientId)
    this.metrics.totalDisconnects++
  }

  /**
   * Send SSE formatted event to all manager clients
   */
  broadcast(eventName, data, priority = 'info') {
    const startTime = Date.now()

    const event = {
      id: Date.now(),
      type: eventName,
      data,
      priority, // info, warning, critical
      timestamp: new Date().toISOString()
    }

    // Store in history
    this.eventHistory.push(event)
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift()
    }

    // Send to all connected managers
    for (const [clientId, client] of this.clients) {
      try {
        client.res.write(`event: ${eventName}\n`)
        client.res.write(`data: ${JSON.stringify({ ...data, priority })}\n`)
        client.res.write('id: ' + event.id + '\n\n')

        // Update last activity time for timeout reset
        this.lastEventTime.set(clientId, Date.now())
      } catch (error) {
        // Client disconnected, remove it
        this.removeClient(clientId)
      }
    }

    // Track performance
    const processingTime = Date.now() - startTime
    this.metrics.totalEvents++
    this.metrics.eventProcessingTimes.push(processingTime)
    if (this.metrics.eventProcessingTimes.length > 100) {
      this.metrics.eventProcessingTimes.shift()
    }
    if (processingTime > this.metrics.maxEventProcessingTime) {
      this.metrics.maxEventProcessingTime = processingTime
    }
    this.metrics.avgEventProcessingTime =
      this.metrics.eventProcessingTimes.reduce((a, b) => a + b, 0) /
      this.metrics.eventProcessingTimes.length
  }

  /**
   * Send notification/alert to specific users or roles
   */
  sendNotification(eventName, data, options = {}) {
    const {
      priority = 'info',
      targetUserIds = null,
      targetRoles = null
    } = options

    const event = {
      id: Date.now(),
      type: eventName,
      data: { ...data, priority },
      timestamp: new Date().toISOString()
    }

    // Filter clients by target criteria
    for (const [clientId, client] of this.clients) {
      // Filter by user ID if specified
      if (targetUserIds && !targetUserIds.includes(client.userId)) {
        continue
      }

      // Filter by role if specified
      if (targetRoles && !targetRoles.includes(client.role)) {
        continue
      }

      try {
        client.res.write(`event: ${eventName}\n`)
        client.res.write(`data: ${JSON.stringify(event.data)}\n`)
        client.res.write('id: ' + event.id + '\n\n')

        this.lastEventTime.set(clientId, Date.now())
      } catch (error) {
        this.removeClient(clientId)
      }
    }

    // Store in history
    this.eventHistory.push(event)
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift()
    }
  }

  /**
   * Send heartbeat to keep connection alive
   */
  sendHeartbeat(clientId) {
    const client = this.clients.get(clientId)
    if (!client) return

    try {
      client.res.write(':heartbeat\n\n')
      this.lastEventTime.set(clientId, Date.now())
      this.metrics.totalHeartbeats++
    } catch (error) {
      // Client disconnected
      this.metrics.failedHeartbeats++
      this.removeClient(clientId)
    }
  }

  /**
   * Get metrics for monitoring
   */
  getMetrics() {
    return {
      activeConnections: this.clients.size,
      maxConnections: this.maxClients,
      eventHistorySize: this.eventHistory.length,
      recentEvents: this.eventHistory.slice(-10),
      performance: {
        totalConnections: this.metrics.totalConnections,
        totalDisconnects: this.metrics.totalDisconnects,
        totalEvents: this.metrics.totalEvents,
        totalHeartbeats: this.metrics.totalHeartbeats,
        failedHeartbeats: this.metrics.failedHeartbeats,
        heartbeatSuccessRate: this.metrics.totalHeartbeats > 0
          ? ((this.metrics.totalHeartbeats - this.metrics.failedHeartbeats) / this.metrics.totalHeartbeats * 100).toFixed(2) + '%'
          : '100%',
        avgEventProcessingTime: this.metrics.avgEventProcessingTime.toFixed(2) + 'ms',
        maxEventProcessingTime: this.metrics.maxEventProcessingTime + 'ms'
      }
    }
  }

  /**
   * Close all connections (graceful shutdown)
   */
  shutdown() {
    for (const clientId of this.clients.keys()) {
      this.removeClient(clientId)
    }
    this.clients.clear()
    this.heartbeatIntervals.clear()
    this.lastEventTime.clear()
  }
}

// Singleton instance
let instance = null

export default function getDashboardStreamService() {
  if (!instance) {
    instance = new DashboardStreamService()
  }
  return instance
}

export { DashboardStreamService }
