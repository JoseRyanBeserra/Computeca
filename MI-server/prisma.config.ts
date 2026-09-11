// prisma.config.ts — Prisma 7 datasource configuration
import { defineConfig } from 'prisma/config'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import * as dotenv from 'dotenv'

dotenv.config()

export default defineConfig({
  earlyAccess: true,
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env['DATABASE_URL'] as string,
  },
  migrate: {
    async adapter(env) {
      const pool = new pg.Pool({
        connectionString: env['DATABASE_URL'] as string,
        max: 5,
      })
      return new PrismaPg(pool)
    },
  },
})
