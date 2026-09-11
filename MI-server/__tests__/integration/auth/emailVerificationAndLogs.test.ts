// __tests__/integration/auth/emailVerificationAndLogs.test.ts
// Cobertura de POST /auth/verify-email e GET /logs.
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { getTestApp, closeTestApp } from '../../helpers/request'
import { createUserAndLogin, cleanMaterialsDb } from '../../helpers/materials'
import { prisma } from '../../../src/database/prisma'

beforeEach(cleanMaterialsDb)

afterAll(async () => {
  await cleanMaterialsDb()
  await closeTestApp()
})

const auth = (token: string) => ({ authorization: `Bearer ${token}` })

// ── POST /auth/verify-email ─────────────────────────────────────────────────────

describe('POST /auth/verify-email', () => {
  async function createUnverifiedUserWithToken(token: string, expiresAt: Date) {
    const user = await prisma.user.create({
      data: {
        name:          'Institucional',
        email:         'inst@dcx.ufpb.br',
        passwordHash:  'hash-irrelevante',
        role:          'INSTITUTIONALIZED',
        emailVerified: false,
      },
    })
    await prisma.emailVerificationToken.create({ data: { token, userId: user.id, expiresAt } })
    return user
  }

  it('deve verificar o e-mail com um código válido', async () => {
    const app = await getTestApp()
    const user = await createUnverifiedUserWithToken('123456', new Date(Date.now() + 60 * 60 * 1000))

    const res = await app.inject({ method: 'POST', url: '/auth/verify-email', payload: { code: '123456' } })

    expect(res.statusCode).toBe(200)
    const updated = await prisma.user.findUnique({ where: { id: user.id } })
    expect(updated?.emailVerified).toBe(true)
  })

  it('deve retornar 400 quando o código está ausente', async () => {
    const app = await getTestApp()
    const res = await app.inject({ method: 'POST', url: '/auth/verify-email', payload: {} })
    expect(res.statusCode).toBe(400)
  })

  it('deve retornar 400 para um código inexistente', async () => {
    const app = await getTestApp()
    const res = await app.inject({ method: 'POST', url: '/auth/verify-email', payload: { code: '999999' } })
    expect(res.statusCode).toBe(400)
  })

  it('deve retornar 400 para um código expirado', async () => {
    const app = await getTestApp()
    await createUnverifiedUserWithToken('111111', new Date(Date.now() - 60 * 1000))

    const res = await app.inject({ method: 'POST', url: '/auth/verify-email', payload: { code: '111111' } })

    expect(res.statusCode).toBe(400)
  })
})

// ── GET /logs ─────────────────────────────────────────────────────────────────

describe('GET /logs', () => {
  async function seedLogs() {
    await prisma.inspectionLog.createMany({
      data: [
        { context: 'testController', direction: 'CLIENT_TO_SERVER', payload: { a: 1 } },
        { context: 'testController', direction: 'SERVER_TO_CLIENT', payload: { b: 2 } },
      ],
    })
  }

  it('deve listar os InspectionLogs para um ADMIN', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin@test.com', 'ADMIN')
    await seedLogs()

    const res = await app.inject({ method: 'GET', url: '/logs', headers: auth(admin.accessToken) })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.logs)).toBe(true)
    expect(body.total).toBeGreaterThanOrEqual(2)
  })

  it('deve aplicar o filtro por context', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin@test.com', 'ADMIN')
    await seedLogs()

    const res = await app.inject({ method: 'GET', url: '/logs?context=testController', headers: auth(admin.accessToken) })

    expect(res.statusCode).toBe(200)
    expect(res.json().total).toBe(2)
  })

  it('deve retornar 403 para usuário não-ADMIN', async () => {
    const app = await getTestApp()
    const prof = await createUserAndLogin('prof@test.com', 'PROFESSOR')

    const res = await app.inject({ method: 'GET', url: '/logs', headers: auth(prof.accessToken) })

    expect(res.statusCode).toBe(403)
  })
})
