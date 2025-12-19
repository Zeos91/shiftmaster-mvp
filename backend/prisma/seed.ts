import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // ----------------------
  // Users
  // ----------------------
  const companyAdmin = await prisma.user.create({
    data: {
      name: 'Mahmoud Admin',
      email: 'admin@example.com',
      phone: '+972500000000',
      role: 'COMPANY_ADMIN',
      residenceLocation: 'Tel Aviv, Israel',
    },
  })

  const projectManager = await prisma.user.create({
    data: {
      name: 'Eli Project Manager',
      email: 'pm@example.com',
      phone: '+972511111111',
      role: 'PROJECT_MANAGER',
      residenceLocation: 'Ramat Gan, Israel',
    },
  })

  const siteManager = await prisma.user.create({
    data: {
      name: 'Amir Site Manager',
      email: 'manager@example.com',
      phone: '+972522222222',
      role: 'SITE_MANAGER',
      residenceLocation: 'Herzliya, Israel',
    },
  })

  const operator1 = await prisma.user.create({
    data: {
      name: 'Operator One',
      email: 'op1@example.com',
      phone: '+972533333333',
      role: 'OPERATOR',
      residenceLocation: 'Netanya, Israel',
    },
  })

  const operator2 = await prisma.user.create({
    data: {
      name: 'Operator Two',
      email: 'op2@example.com',
      phone: '+972544444444',
      role: 'OPERATOR',
      residenceLocation: 'Rishon Lezion, Israel',
    },
  })

  // ----------------------
  // Sites
  // ----------------------
  const siteA = await prisma.site.create({
    data: {
      name: 'Site A',
      address: 'Tel Aviv Port',
      managerId: siteManager.id,
    },
  })

  const siteB = await prisma.site.create({
    data: {
      name: 'Site B',
      address: 'Ramat Gan Industrial Zone',
      managerId: siteManager.id,
    },
  })

  // ----------------------
  // Cranes
  // ----------------------
  const crane1 = await prisma.crane.create({
    data: {
      craneNumber: 'CR-1',
      siteId: siteA.id,
    },
  })

  const crane2 = await prisma.crane.create({
    data: {
      craneNumber: 'CR-2',
      siteId: siteB.id,
    },
  })

  // ----------------------
  // Operator Rates
  // ----------------------
  await prisma.operatorRate.createMany({
    data: [
      { operatorId: operator1.id, hourlyRate: 120, validFrom: new Date() },
      { operatorId: operator2.id, hourlyRate: 130, validFrom: new Date() },
    ],
  })

  // ----------------------
  // Site Rates
  // ----------------------
  await prisma.siteRate.createMany({
    data: [
      { siteId: siteA.id, hourlyRate: 200, validFrom: new Date() },
      { siteId: siteB.id, hourlyRate: 220, validFrom: new Date() },
    ],
  })

  // ----------------------
  // Example Shift
  // ----------------------
  await prisma.shift.create({
    data: {
      operatorId: operator1.id,
      siteId: siteA.id,
      craneId: crane1.id,
      startTime: new Date('2025-12-18T08:00:00Z'),
      endTime: new Date('2025-12-18T16:00:00Z'),
      hours: 8,
      operatorRate: 120,
      siteRate: 200,
      approved: false,
    },
  })

  console.log('Database seeded successfully!')
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
