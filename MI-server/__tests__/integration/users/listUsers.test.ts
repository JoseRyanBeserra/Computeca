// __tests__/integration/users/listUsers.test.ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { getTestApp, closeTestApp } from '../../helpers/request'
import { prisma }                   from '../../../src/database/prisma'

// ── Limpeza ────────────────────────────────────────────────────────────────────
beforeEach(async () => {
  await prisma.inspectionLog.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.user.deleteMany()
})

afterAll(async () => {
  await prisma.inspectionLog.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.user.deleteMany()
  await closeTestApp()
})

// ── Helpers ────────────────────────────────────────────────────────────────────

async function createUserAndLogin(role: 'ADMIN' | 'PROFESSOR' | 'COMMON' = 'COMMON') {
  const app = await getTestApp()

  const email    = `user_${role.toLowerCase()}_${Date.now()}@test.com`
  const password = 'senha12345'

  await app.inject({
    method:  'POST',
    url:     '/users',
    payload: { name: 'Test User', email, password },
  })

  if (role !== 'COMMON') {
    await prisma.user.update({ where: { email }, data: { role } })
  }

  const loginResponse = await app.inject({
    method:  'POST',
    url:     '/auth/login',
    payload: { email, password },
  })

  const { accessToken } = loginResponse.json()
  return { accessToken, email }
}

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('GET /users — Listagem de Usuários', () => {
  describe('casos de sucesso', () => {
    it('deve retornar 200 e a estrutura de paginação quando ADMIN', async () => {
      const app = await getTestApp()
      const { accessToken } = await createUserAndLogin('ADMIN')

      const response = await app.inject({
        method:  'GET',
        url:     '/users',
        headers: { authorization: `Bearer ${accessToken}` },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body).toMatchObject({
        users:   expect.any(Array),
        total:   expect.any(Number),
        page:    expect.any(Number),
        perPage: expect.any(Number),
      })
    })

    it('deve listar todos os usuários criados', async () => {
      const app = await getTestApp()

      await app.inject({ method: 'POST', url: '/users', payload: { name: 'User A', email: 'a@test.com', password: 'senha12345' } })
      await app.inject({ method: 'POST', url: '/users', payload: { name: 'User B', email: 'b@test.com', password: 'senha12345' } })

      const { accessToken } = await createUserAndLogin('ADMIN')

      const response = await app.inject({
        method:  'GET',
        url:     '/users',
        headers: { authorization: `Bearer ${accessToken}` },
      })

      const body = response.json()
      expect(body.total).toBeGreaterThanOrEqual(3) // 2 users + 1 admin
      expect(body.users.length).toBeGreaterThanOrEqual(3)
    })

    it('deve nunca retornar passwordHash nos usuários listados', async () => {
      const app = await getTestApp()
      const { accessToken } = await createUserAndLogin('ADMIN')

      const response = await app.inject({
        method:  'GET',
        url:     '/users',
        headers: { authorization: `Bearer ${accessToken}` },
      })

      const body = response.json()
      for (const user of body.users) {
        expect(user).not.toHaveProperty('passwordHash')
      }
    })

    it('deve filtrar usuários por role', async () => {
      const app = await getTestApp()

      await app.inject({ method: 'POST', url: '/users', payload: { name: 'Prof Test', email: 'prof@test.com', password: 'senha12345' } })
      await prisma.user.update({ where: { email: 'prof@test.com' }, data: { role: 'PROFESSOR' } })

      const { accessToken } = await createUserAndLogin('ADMIN')

      const response = await app.inject({
        method:  'GET',
        url:     '/users?role=PROFESSOR',
        headers: { authorization: `Bearer ${accessToken}` },
      })

      const body = response.json()
      expect(body.users.every((u: { role: string }) => u.role === 'PROFESSOR')).toBe(true)
    })

    it('deve filtrar usuários suspensos', async () => {
      const app = await getTestApp()

      await app.inject({ method: 'POST', url: '/users', payload: { name: 'Suspenso', email: 'suspended@test.com', password: 'senha12345' } })
      await prisma.user.update({ where: { email: 'suspended@test.com' }, data: { suspended: true } })

      const { accessToken } = await createUserAndLogin('ADMIN')

      const response = await app.inject({
        method:  'GET',
        url:     '/users?suspended=true',
        headers: { authorization: `Bearer ${accessToken}` },
      })

      const body = response.json()
      expect(body.users.every((u: { suspended: boolean }) => u.suspended === true)).toBe(true)
    })

    it('deve respeitar a paginação (perPage)', async () => {
      const app = await getTestApp()

      await app.inject({ method: 'POST', url: '/users', payload: { name: 'U1', email: 'u1@test.com', password: 'senha12345' } })
      await app.inject({ method: 'POST', url: '/users', payload: { name: 'U2', email: 'u2@test.com', password: 'senha12345' } })
      await app.inject({ method: 'POST', url: '/users', payload: { name: 'U3', email: 'u3@test.com', password: 'senha12345' } })

      const { accessToken } = await createUserAndLogin('ADMIN')

      const response = await app.inject({
        method:  'GET',
        url:     '/users?perPage=2&page=1',
        headers: { authorization: `Bearer ${accessToken}` },
      })

      const body = response.json()
      expect(body.users.length).toBeLessThanOrEqual(2)
      expect(body.perPage).toBe(2)
    })
  })

  describe('autorização', () => {
    it('deve retornar 403 quando usuário COMMON tenta listar', async () => {
      const app = await getTestApp()
      const { accessToken } = await createUserAndLogin('COMMON')

      const response = await app.inject({
        method:  'GET',
        url:     '/users',
        headers: { authorization: `Bearer ${accessToken}` },
      })

      expect(response.statusCode).toBe(403)
    })

    it('deve retornar 403 quando PROFESSOR tenta listar', async () => {
      const app = await getTestApp()
      const { accessToken } = await createUserAndLogin('PROFESSOR')

      const response = await app.inject({
        method:  'GET',
        url:     '/users',
        headers: { authorization: `Bearer ${accessToken}` },
      })

      expect(response.statusCode).toBe(403)
    })

    it('deve retornar 401 quando sem token', async () => {
      const app = await getTestApp()

      const response = await app.inject({
        method: 'GET',
        url:    '/users',
      })

      expect(response.statusCode).toBe(401)
    })
  })
})
