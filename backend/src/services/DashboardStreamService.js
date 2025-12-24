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
  }

  /**
   * Send SSE formatted event to all manager clients
   */
  broadcast(eventName, data) {
    const event = {
      id: Date.now(),
      type: eventName,
      data,
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
        client.res.write(`data: ${JSON.stringify(data)}\n`)
        client.res.write('id: ' + event.id + '\n\n')

        // Update last activity time for timeout reset
        this.lastEventTime.set(clientId, Date.now())
      } catch (error) {
        // Client disconnected, remove it
        this.removeClient(clientId)
      }
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
    } catch (error) {
      // Client disconnected
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
      recentEvents: this.eventHistory.slice(-10)
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
