// __tests__/integration/users/setUserAsProfessor.test.ts
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

async function createUserAndLogin(email: string, role: 'ADMIN' | 'PROFESSOR' | 'COMMON' = 'COMMON') {
  const app      = await getTestApp()
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
  return { accessToken }
}

async function createTargetUser(email: string) {
  const app = await getTestApp()

  const response = await app.inject({
    method:  'POST',
    url:     '/users',
    payload: { name: 'Target User', email, password: 'senha12345' },
  })

  return response.json() as { id: string }
}

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('PATCH /users/:id/set-professor — Promoção a Professor', () => {
  describe('casos de sucesso', () => {
    it('deve retornar 200 ao promover usuário COMMON', async () => {
      const app = await getTestApp()

      const { id: targetId } = await createTargetUser('target@test.com')
      const { accessToken }  = await createUserAndLogin('admin@test.com', 'ADMIN')

      const response = await app.inject({
        method:  'PATCH',
        url:     `/users/${targetId}/set-professor`,
        headers: { authorization: `Bearer ${accessToken}` },
      })

      expect(response.statusCode).toBe(200)
    })

    it('deve retornar o usuário com role PROFESSOR', async () => {
      const app = await getTestApp()

      const { id: targetId } = await createTargetUser('target@test.com')
      const { accessToken }  = await createUserAndLogin('admin@test.com', 'ADMIN')

      const response = await app.inject({
        method:  'PATCH',
        url:     `/users/${targetId}/set-professor`,
        headers: { authorization: `Bearer ${accessToken}` },
      })

      const body = response.json()
      expect(body.role).toBe('PROFESSOR')
      expect(body.id).toBe(targetId)
    })

    it('deve nunca retornar passwordHash na resposta', async () => {
      const app = await getTestApp()

      const { id: targetId } = await createTargetUser('target@test.com')
      const { accessToken }  = await createUserAndLogin('admin@test.com', 'ADMIN')

      const response = await app.inject({
        method:  'PATCH',
        url:     `/users/${targetId}/set-professor`,
        headers: { authorization: `Bearer ${accessToken}` },
      })

      expect(response.json()).not.toHaveProperty('passwordHash')
    })

    it('deve persistir o novo role PROFESSOR no banco de dados', async () => {
      const app = await getTestApp()

      const { id: targetId } = await createTargetUser('target@test.com')
      const { accessToken }  = await createUserAndLogin('admin@test.com', 'ADMIN')

      await app.inject({
        method:  'PATCH',
        url:     `/users/${targetId}/set-professor`,
        headers: { authorization: `Bearer ${accessToken}` },
      })

      const userInDb = await prisma.user.findUnique({ where: { id: targetId } })
      expect(userInDb?.role).toBe('PROFESSOR')
    })

    it('deve gerar AuditLog com action USER_PROMOTED_TO_PROFESSOR (RNF05)', async () => {
      const app = await getTestApp()

      const { id: targetId } = await createTargetUser('target@test.com')
      const { accessToken }  = await createUserAndLogin('admin@test.com', 'ADMIN')

      await app.inject({
        method:  'PATCH',
        url:     `/users/${targetId}/set-professor`,
        headers: { authorization: `Bearer ${accessToken}` },
      })

      const log = await prisma.auditLog.findFirst({
        where: { action: 'USER_PROMOTED_TO_PROFESSOR' },
      })

      expect(log).not.toBeNull()
      expect(log?.targetId).toBe(targetId)
    })

    it('deve promover usuário INSTITUTIONALIZED para PROFESSOR', async () => {
      const app = await getTestApp()

      await createTargetUser('inst@dcx.ufpb.br')
      const target = await prisma.user.findUnique({ where: { email: 'inst@dcx.ufpb.br' } })

      const { accessToken } = await createUserAndLogin('admin@test.com', 'ADMIN')

      const response = await app.inject({
        method:  'PATCH',
        url:     `/users/${target!.id}/set-professor`,
        headers: { authorization: `Bearer ${accessToken}` },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().role).toBe('PROFESSOR')
    })
  })

  describe('erros de negócio', () => {
    it('deve retornar 404 quando o usuário target não existe', async () => {
      const app = await getTestApp()
      const { accessToken } = await createUserAndLogin('admin@test.com', 'ADMIN')

      const response = await app.inject({
        method:  'PATCH',
        url:     '/users/00000000-0000-0000-0000-000000000000/set-professor',
        headers: { authorization: `Bearer ${accessToken}` },
      })

      expect(response.statusCode).toBe(404)
      expect(response.json().code).toBe('USER_NOT_FOUND')
    })

    it('deve retornar 403 quando target já é ADMIN', async () => {
      const app = await getTestApp()

      const { accessToken: adminToken } = await createUserAndLogin('admin@test.com', 'ADMIN')

      await createTargetUser('outro_admin@test.com')
      const otherAdmin = await prisma.user.findUnique({ where: { email: 'outro_admin@test.com' } })
      await prisma.user.update({ where: { id: otherAdmin!.id }, data: { role: 'ADMIN' } })

      const response = await app.inject({
        method:  'PATCH',
        url:     `/users/${otherAdmin!.id}/set-professor`,
        headers: { authorization: `Bearer ${adminToken}` },
      })

      expect(response.statusCode).toBe(403)
      expect(response.json().code).toBe('FORBIDDEN')
    })
  })

  describe('autorização', () => {
    it('deve retornar 403 quando usuário COMMON tenta promover', async () => {
      const app = await getTestApp()

      const { id: targetId } = await createTargetUser('target@test.com')
      const { accessToken }  = await createUserAndLogin('common@test.com', 'COMMON')

      const response = await app.inject({
        method:  'PATCH',
        url:     `/users/${targetId}/set-professor`,
        headers: { authorization: `Bearer ${accessToken}` },
      })

      expect(response.statusCode).toBe(403)
    })

    it('deve retornar 403 quando PROFESSOR tenta promover outro usuário', async () => {
      const app = await getTestApp()

      const { id: targetId } = await createTargetUser('target@test.com')
      const { accessToken }  = await createUserAndLogin('prof@test.com', 'PROFESSOR')

      const response = await app.inject({
        method:  'PATCH',
        url:     `/users/${targetId}/set-professor`,
        headers: { authorization: `Bearer ${accessToken}` },
      })

      expect(response.statusCode).toBe(403)
    })

    it('deve retornar 401 quando sem token', async () => {
      const app = await getTestApp()

      const { id: targetId } = await createTargetUser('target@test.com')

      const response = await app.inject({
        method: 'PATCH',
        url:    `/users/${targetId}/set-professor`,
      })

      expect(response.statusCode).toBe(401)
    })

    it('não deve alterar o role no banco quando não autorizado', async () => {
      const app = await getTestApp()

      const { id: targetId } = await createTargetUser('target@test.com')
      const { accessToken }  = await createUserAndLogin('common@test.com', 'COMMON')

      await app.inject({
        method:  'PATCH',
        url:     `/users/${targetId}/set-professor`,
        headers: { authorization: `Bearer ${accessToken}` },
      })

      const userInDb = await prisma.user.findUnique({ where: { id: targetId } })
      expect(userInDb?.role).toBe('COMMON')
    })
  })
})
