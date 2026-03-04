import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminPassword = await bcrypt.hash('Admin@123', 10)
  const staffPassword = await bcrypt.hash('Staff@123', 10)

  // Seed Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@freedomshippingllc.com' },
    update: {},
    create: {
      email: 'admin@freedomshippingllc.com',
      name: 'Super Admin',
      password_hash: adminPassword,
      role: 'Admin',
      status: 'Active',
    },
  })

  // Seed Staff User
  const staff = await prisma.user.upsert({
    where: { email: 'staff@freedomshippingllc.com' },
    update: {},
    create: {
      email: 'staff@freedomshippingllc.com',
      name: 'John Staff',
      password_hash: staffPassword,
      role: 'Staff',
      status: 'Active',
    },
  })

  // Seed Store
  const store1 = await prisma.store.create({
    data: {
      name: 'Las Vegas - Store 1',
      address: '123 Casino Drive',
      city: 'Las Vegas',
      state: 'NV',
      zip_code: '89109',
      max_members: 5,
    },
  })

  // Assign staff to store as reporter
  await prisma.storeMember.create({
    data: {
      store_id: store1.id,
      user_id: staff.id,
      is_reporter: true,
      status: 'Active',
    }
  })

  console.log('Seed completed:')
  console.log({ admin: admin.email, staff: staff.email, store: store1.name })
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
