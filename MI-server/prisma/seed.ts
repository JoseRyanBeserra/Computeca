// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'

dotenv.config()

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env')
  }

  const existing = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  })

  if (existing) {
    console.log(`✅ Admin já existe (${existing.email}) — seed ignorado`)
    return
  }

  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12)
  const passwordHash = await bcrypt.hash(adminPassword, saltRounds)

  const admin = await prisma.user.create({
    data: {
      name: 'Admin Master',
      email: adminEmail,
      passwordHash,
      role: 'ADMIN',
      emailVerified: true,
    },
  })

  console.log(`✅ Admin criado: ${admin.email} (id: ${admin.id})`)
}

main()
  .catch((err) => {
    console.error('❌ Seed falhou:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
