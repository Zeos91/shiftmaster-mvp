import prisma from '../prisma.js'

// CREATE a shift
export const createShift = async (req, res) => {
  try {
    const {
      startTime,
      endTime,
      hours,
      operatorId,
      siteId,
      craneId,
      operatorRate,
      siteRate,
      overrideOperatorRate,
      overrideSiteRate
    } = req.body

    // Validate required fields
    if (!startTime || !endTime || !operatorId || !siteId || !craneId) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    // Calculate hours if not provided
    let calculatedHours = hours
    if (!hours) {
      const start = new Date(startTime)
      const end = new Date(endTime)
      calculatedHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    }

    const shift = await prisma.shift.create({
      data: {
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        hours: calculatedHours,
        operatorId,
        siteId,
        craneId,
        operatorRate: operatorRate ?? 0, // fallback to 0 if not provided
        siteRate: siteRate ?? 0,
        overrideOperatorRate: overrideOperatorRate ?? null,
        overrideSiteRate: overrideSiteRate ?? null
      },
      include: {
        operator: true,
        site: true,
        crane: true
      }
    })

    return res.status(201).json(shift)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Failed to create shift" })
  }
}

// UPDATE shift (partial update)
export const updateShift = async (req, res) => {
  try {
    const { id } = req.params
    const {
      approved,
      approvedById,
      startTime,
      endTime,
      hours,
      operatorId,
      siteId,
      craneId,
      overrideOperatorRate,
      overrideSiteRate
    } = req.body

    // Build data object dynamically
    const data = {}

    if (approved !== undefined) data.approved = approved
    if (approvedById) data.approvedById = approvedById
    if (startTime) data.startTime = new Date(startTime)
    if (endTime) data.endTime = new Date(endTime)
    if (hours !== undefined) data.hours = hours
    if (operatorId) data.operatorId = operatorId
    if (siteId) data.siteId = siteId
    if (craneId) data.craneId = craneId
    if (overrideOperatorRate !== undefined) data.overrideOperatorRate = overrideOperatorRate
    if (overrideSiteRate !== undefined) data.overrideSiteRate = overrideSiteRate

    const updatedShift = await prisma.shift.update({
      where: { id },
      data,
      include: {
        operator: true,
        site: true,
        crane: true
      }
    })

    return res.json(updatedShift)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Failed to update shift" })
  }
}

// GET all shifts
export const getShifts = async (req, res) => {
  try {
    const shifts = await prisma.shift.findMany({
      include: {
        operator: true,
        site: true,
        crane: true
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json(shifts)
  } catch (err) {
    console.error('getShifts error:', err)
    res.status(500).json({ error: 'Failed to fetch shifts', details: err.message })
  }
}


// APPROVE shift
export const approveShift = async (req, res) => {
  try {
    const { id } = req.params
    const { approvedById } = req.body

    if (!approvedById) {
      return res.status(400).json({ error: 'approvedById is required' })
    }

    const shift = await prisma.shift.update({
      where: { id },
      data: {
        approved: true,
        approvedById
      },
      include: {
        approvedBy: true
      }
    })

    res.json(shift)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to approve shift' })
  }
}


// DELETE shift
export const deleteShift = async (req, res) => {
  try {
    const { id } = req.params

    await prisma.shift.delete({ where: { id } })

    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete shift' })
  }
}
