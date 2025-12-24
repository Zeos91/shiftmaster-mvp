import prisma from '../prisma.js'
import PDFDocument from 'pdfkit'
import jwt from 'jsonwebtoken'

export const exportHoursPdf = async (req, res) => {
  try {
    const { startDate, endDate, role, siteId, token } = req.query

    // Accept token via query param as fallback for mobile browser downloads
    let user = req.user
    if (!user && token) {
      try {
        user = jwt.verify(token, process.env.JWT_SECRET)
      } catch (e) {
        return res.status(401).json({ error: 'Invalid token' })
      }
    }

    const managerRoles = ['SITE_MANAGER', 'PROJECT_MANAGER', 'COMPANY_ADMIN']
    if (!user || !managerRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden: manager role required' })
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required (YYYY-MM-DD)' })
    }

    const where = {
      date: { gte: startDate, lte: endDate }
    }

    if (role) where.roleRequired = role
    if (siteId) where.siteId = siteId

    const shifts = await prisma.shift.findMany({
      where,
      include: {
        worker: true,
        site: true
      },
      orderBy: { date: 'asc' }
    })

    // Stream PDF
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="hours_report.pdf"')

    const doc = new PDFDocument({ margin: 40 })
    doc.pipe(res)

    doc.fontSize(18).text('Shift Hours Report', { align: 'center' })
    doc.moveDown()
    doc.fontSize(10).text(`Date range: ${startDate} → ${endDate}`)
    if (role) doc.text(`Role: ${role}`)
    if (siteId) doc.text(`Site: ${siteId}`)
    doc.moveDown()

    // Table header
    doc.fontSize(10)
    doc.text('Date', { continued: true, width: 90 })
    doc.text('Site', { continued: true, width: 130 })
    doc.text('Worker', { continued: true, width: 120 })
    doc.text('Role', { continued: true, width: 90 })
    doc.text('Hours', { align: 'right' })
    doc.moveDown(0.5)

    shifts.forEach((s) => {
      const hours = s.totalHours ? s.totalHours.toString() : (s.hours ? s.hours.toString() : '')
      doc.text(s.date, { continued: true, width: 90 })
      doc.text(s.site?.name || '', { continued: true, width: 130 })
      doc.text(s.worker?.name || '', { continued: true, width: 120 })
      doc.text(s.roleRequired, { continued: true, width: 90 })
      doc.text(hours, { align: 'right' })
      doc.moveDown(0.2)
    })

    doc.end()
  } catch (err) {
    console.error('exportHoursPdf error:', err)
    return res.status(500).json({ error: 'Failed to generate PDF', details: err.message })
  }
}
// JSON: My shifts report (workers can request their own; managers can request for workers they manage)
export const getMyShiftsReport = async (req, res) => {
  try {
    const { startDate, endDate, siteId, includePending } = req.query
    const user = req.user

    if (!startDate || !endDate) return res.status(400).json({ error: 'startDate and endDate required (YYYY-MM-DD)' })

    let where = {
      date: { gte: startDate, lte: endDate }
    }

    if (siteId) where.siteId = siteId

    // Only approved by default
    if (!includePending || includePending === 'false') {
      where.locked = true
    }

    // If worker (OPERATOR role), only their own shifts
    if (user.role === 'OPERATOR') {
      where.workerId = user.id
    } else {
      // Managers may provide ?workerId= to fetch for that worker; otherwise use user's own
      if (req.query.workerId) {
        where.workerId = req.query.workerId
      } else {
        where.workerId = user.id
      }
    }

    const shifts = await prisma.shift.findMany({
      where,
      include: { site: true },
      orderBy: { date: 'asc' }
    })

    const total = shifts.reduce((sum, s) => sum + (Number(s.totalHours || s.hours) || 0), 0)

    return res.json({ shifts, total })
  } catch (err) {
    console.error('getMyShiftsReport error:', err)
    return res.status(500).json({ error: 'Failed to fetch report', details: err.message })
  }
}

// PDF export for worker shifts. Supports GET (for browser linking with token) and POST (for API clients)
export const exportShiftsPdf = async (req, res) => {
  try {
    const params = req.method === 'GET' ? req.query : req.body
    const { startDate, endDate, siteId, includePending, workerId, rtl, token } = params

    if (!startDate || !endDate) return res.status(400).json({ error: 'startDate and endDate required (YYYY-MM-DD)' })

    // Accept token in query for browser downloads
    let user = req.user
    if (!user && token) {
      try { user = jwt.verify(token, process.env.JWT_SECRET) } catch (e) { return res.status(401).json({ error: 'Invalid token' }) }
    }

    if (!user) return res.status(401).json({ error: 'Not authenticated' })

    // Determine target worker
    let targetWorkerId = workerId || user.id

    // If requester is operator, enforce only own
    if (user.role === 'OPERATOR' && targetWorkerId !== user.id) {
      return res.status(403).json({ error: 'Cannot export other workers\' data' })
    }

    // Fetch shifts
    const whereBase = { date: { gte: startDate, lte: endDate }, workerId: targetWorkerId }
    if (siteId) whereBase.siteId = siteId
    if (!includePending || includePending === 'false') whereBase.locked = true

    const shifts = await prisma.shift.findMany({ where: whereBase, include: { site: true }, orderBy: { date: 'asc' } })

    // Manager permission check: if requester is SITE_MANAGER, ensure they manage at least one site in results
    if (user.role === 'SITE_MANAGER' && targetWorkerId !== user.id) {
      const managedSiteIds = (await prisma.site.findMany({ where: { managerId: user.id }, select: { id: true } })).map(s => s.id)
      const hasManaged = shifts.some(s => managedSiteIds.includes(s.siteId))
      if (!hasManaged) return res.status(403).json({ error: 'Manager may only export reports for workers on sites they manage' })
    }

    const worker = await prisma.worker.findUnique({ where: { id: targetWorkerId } })
    if (!worker) return res.status(404).json({ error: 'Worker not found' })

    // Generate PDF
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${worker.name.replace(/\s+/g, '_')}_shifts_${startDate}_${endDate}.pdf"`)

    const doc = new PDFDocument({ margin: 40 })
    doc.pipe(res)

    const company = process.env.COMPANY_NAME || 'ACME Construction'
    doc.fontSize(16).text(company, { align: rtl ? 'right' : 'left' })
    doc.moveDown(0.5)
    doc.fontSize(12).text(`Worker: ${worker.name}`, { align: rtl ? 'right' : 'left' })
    doc.text(`Roles: ${(worker.roles || []).join(', ')}`, { align: rtl ? 'right' : 'left' })
    doc.text(`Date range: ${startDate} → ${endDate}`, { align: rtl ? 'right' : 'left' })
    doc.text(`Generated: ${new Date().toISOString()}`, { align: rtl ? 'right' : 'left' })
    doc.moveDown()

    // Table header
    doc.fontSize(10).font('Helvetica-Bold')
    const headers = rtl ? ['Hours', 'End', 'Start', 'Equipment', 'Role', 'Date'] : ['Date', 'Role', 'Equipment', 'Start', 'End', 'Hours']
    const colWidth = 85
    headers.forEach((h, i) => {
      doc.text(h, 40 + i * colWidth, doc.y, { width: colWidth, align: rtl ? 'right' : 'left', continued: i < headers.length - 1 })
    })
    doc.moveDown(0.5).font('Helvetica')

    let total = 0
    shifts.forEach(s => {
      const start = s.actualStartTime ? new Date(s.actualStartTime).toISOString().slice(0, 19) : (s.startTime ? new Date(s.startTime).toISOString().slice(0, 19) : '')
      const end = s.actualEndTime ? new Date(s.actualEndTime).toISOString().slice(0, 19) : (s.endTime ? new Date(s.endTime).toISOString().slice(0, 19) : '')
      const hours = s.totalHours ? Number(s.totalHours) : (s.hours ? Number(s.hours) : 0)
      total += hours

      const row = rtl ? [String(hours.toFixed(2)), end, start, s.equipmentId || '', s.roleRequired, s.date] : [s.date, s.roleRequired, s.equipmentId || '', start, end, String(hours.toFixed(2))]
      row.forEach((cell, i) => {
        doc.text(cell || '', 40 + i * colWidth, doc.y, { width: colWidth, align: rtl ? 'right' : 'left', continued: i < row.length - 1 })
      })
      doc.moveDown(0.3)
    })

    doc.moveDown().fontSize(12).font('Helvetica-Bold').text(`Total hours: ${total.toFixed(2)}`, { align: rtl ? 'right' : 'left' })
    doc.end()
  } catch (err) {
    console.error('exportShiftsPdf error:', err)
    return res.status(500).json({ error: 'Failed to generate PDF', details: err.message })
  }
}