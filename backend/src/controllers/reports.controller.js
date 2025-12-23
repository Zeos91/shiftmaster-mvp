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
