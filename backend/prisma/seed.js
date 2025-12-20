import prisma from '../src/prisma.js'
import bcrypt from 'bcryptjs'

async function main() {
  console.log('🌱 Seeding database...')

  // Clear existing data (optional, comment out if you want to preserve)
  // await prisma.oTP.deleteMany({})
  // await prisma.shift.deleteMany({})
  // await prisma.crane.deleteMany({})
  // await prisma.site.deleteMany({})
  // await prisma.user.deleteMany({})

  // Create test users with different roles
  const hashedPassword = await bcrypt.hash('SecurePassword123!', 10)

  const operator = await prisma.user.upsert({
    where: { email: 'operator@shiftmaster.dev' },
    update: {},
    create: {
      name: 'John Operator',
      email: 'operator@shiftmaster.dev',
      phone: '+14155552671',
      password: hashedPassword,
      phoneVerified: true,
      role: 'OPERATOR'
    }
  })

  const siteManager = await prisma.user.upsert({
    where: { email: 'manager@shiftmaster.dev' },
    update: {},
    create: {
      name: 'Jane Manager',
      email: 'manager@shiftmaster.dev',
      phone: '+14155552672',
      password: hashedPassword,
      phoneVerified: true,
      role: 'SITE_MANAGER'
    }
  })

  const projectManager = await prisma.user.upsert({
    where: { email: 'project@shiftmaster.dev' },
    update: {},
    create: {
      name: 'Bob Project',
      email: 'project@shiftmaster.dev',
      phone: '+14155552673',
      password: hashedPassword,
      phoneVerified: true,
      role: 'PROJECT_MANAGER'
    }
  })

  const admin = await prisma.user.upsert({
    where: { email: 'admin@shiftmaster.dev' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@shiftmaster.dev',
      phone: '+14155552674',
      password: hashedPassword,
      phoneVerified: true,
      role: 'COMPANY_ADMIN'
    }
  })

  console.log('✅ Created users:')
  console.log(`  - Operator: ${operator.email}`)
  console.log(`  - Site Manager: ${siteManager.email}`)
  console.log(`  - Project Manager: ${projectManager.email}`)
  console.log(`  - Admin: ${admin.email}`)
  console.log(`  All passwords: SecurePassword123!`)

  // Create test sites
  const site1 = await prisma.site.upsert({
    where: { id: 'site-1' },
    update: {},
    create: {
      id: 'site-1',
      name: 'Downtown Construction Site',
      address: '123 Main St, Downtown',
      managerId: siteManager.id
    }
  })

  const site2 = await prisma.site.upsert({
    where: { id: 'site-2' },
    update: {},
    create: {
      id: 'site-2',
      name: 'Uptown Development',
      address: '456 Oak Ave, Uptown',
      managerId: siteManager.id
    }
  })

  console.log('✅ Created sites:')
  console.log(`  - ${site1.name}`)
  console.log(`  - ${site2.name}`)

  // Create test cranes
  const crane1 = await prisma.crane.upsert({
    where: { id: 'crane-1' },
    update: {},
    create: {
      id: 'crane-1',
      craneNumber: 'CRANE-001',
      siteId: site1.id
    }
  })

  const crane2 = await prisma.crane.upsert({
    where: { id: 'crane-2' },
    update: {},
    create: {
      id: 'crane-2',
      craneNumber: 'CRANE-002',
      siteId: site2.id
    }
  })

  console.log('✅ Created cranes:')
  console.log(`  - ${crane1.craneNumber}`)
  console.log(`  - ${crane2.craneNumber}`)

  // Create test shifts
  const now = new Date()
  const startTime = new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2 hours ago
  const endTime = new Date(startTime.getTime() + 8 * 60 * 60 * 1000) // 8 hours later

  const shift1 = await prisma.shift.upsert({
    where: { id: 'shift-1' },
    update: {},
    create: {
      id: 'shift-1',
      operatorId: operator.id,
      siteId: site1.id,
      craneId: crane1.id,
      startTime,
      endTime,
      hours: 8,
      operatorRate: 50.00,
      siteRate: 150.00,
      approved: false
    }
  })

  const shift2 = await prisma.shift.upsert({
    where: { id: 'shift-2' },
    update: {},
    create: {
      id: 'shift-2',
      operatorId: operator.id,
      siteId: site2.id,
      craneId: crane2.id,
      startTime: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 7 * 60 * 60 * 1000),
      hours: 8,
      operatorRate: 55.00,
      siteRate: 160.00,
      approved: true,
      approvedById: siteManager.id
    }
  })

  console.log('✅ Created shifts:')
  console.log(`  - Shift 1: 8 hours (pending approval)`)
  console.log(`  - Shift 2: 8 hours (approved)`)

  // Create test OTP (for testing OTP verification without real SMS)
  const testOTP = await prisma.oTP.create({
    data: {
      phone: '+14155552675',
      code: '123456',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // Valid for 5 minutes
    }
  })

  console.log('✅ Created test OTP:')
  console.log(`  - Phone: ${testOTP.phone}`)
  console.log(`  - Code: ${testOTP.code}`)
  console.log(`  - Expires in: 5 minutes`)

  console.log('\n✨ Database seeding complete!')
  console.log('\n📝 Test Accounts (all password: SecurePassword123!):')
  console.log(`  OPERATOR: operator@shiftmaster.dev`)
  console.log(`  SITE_MANAGER: manager@shiftmaster.dev`)
  console.log(`  PROJECT_MANAGER: project@shiftmaster.dev`)
  console.log(`  COMPANY_ADMIN: admin@shiftmaster.dev`)
  console.log('\n🔐 Test OTP: 123456 for phone +14155552675')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
