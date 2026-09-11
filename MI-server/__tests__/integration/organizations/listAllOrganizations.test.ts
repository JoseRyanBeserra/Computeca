// __tests__/integration/organizations/listAllOrganizations.test.ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { getTestApp, closeTestApp } from '../../helpers/request'
import { prisma }                   from '../../../src/database/prisma'

// ── Limpeza ────────────────────────────────────────────────────────────────────

async function cleanup() {
  await prisma.inspectionLog.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.organizationMember.deleteMany()
  await prisma.organization.deleteMany()
  await prisma.user.deleteMany()
}

beforeEach(cleanup)

afterAll(async () => {
  await cleanup()
  await closeTestApp()
})

// ── Helpers ────────────────────────────────────────────────────────────────────

async function createUserAndLogin(email: string, role: 'ADMIN' | 'PROFESSOR' | 'COMMON' = 'COMMON') {
  const app      = await getTestApp()
  const password = 'senha12345'

  await app.inject({ method: 'POST', url: '/users', payload: { name: 'Test User', email, password } })

  if (role !== 'COMMON') {
    await prisma.user.update({ where: { email }, data: { role } })
  }

  const loginRes = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, password } })
  const user     = await prisma.user.findUniqueOrThrow({ where: { email } })

  return { accessToken: loginRes.json().accessToken as string, userId: user.id }
}

async function createOrg(name: string, createdById: string, status: 'ACTIVE' | 'ARCHIVED' = 'ACTIVE') {
  return prisma.organization.create({ data: { name, createdById, status } })
}

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('GET /organizations/all — Listagem administrativa de organizações', () => {
  describe('casos de sucesso', () => {
    it('deve listar todas as organizações com total (ADMIN)', async () => {
      const app = await getTestApp()
      const { accessToken, userId } = await createUserAndLogin('admin@test.com', 'ADMIN')
      await createOrg('Projeto A', userId)
      await createOrg('Projeto B', userId)

      const res = await app.inject({
        method:  'GET',
        url:     '/organizations/all',
        headers: { authorization: `Bearer ${accessToken}` },
      })

      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.total).toBe(2)
      expect(body.organizations).toHaveLength(2)
      expect(body.organizations[0]).toMatchObject({
        id:          expect.any(String),
        name:        expect.any(String),
        status:      'ACTIVE',
        memberCount: expect.any(Number),
      })
    })

    it('deve filtrar por status (apenas ACTIVE)', async () => {
      const app = await getTestApp()
      const { accessToken, userId } = await createUserAndLogin('admin@test.com', 'ADMIN')
      await createOrg('Ativa', userId, 'ACTIVE')
      await createOrg('Arquivada', userId, 'ARCHIVED')

      const res = await app.inject({
        method:  'GET',
        url:     '/organizations/all?status=ACTIVE',
        headers: { authorization: `Bearer ${accessToken}` },
      })

      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.total).toBe(1)
      expect(body.organizations[0].name).toBe('Ativa')
    })

    it('deve paginar respeitando perPage', async () => {
      const app = await getTestApp()
      const { accessToken, userId } = await createUserAndLogin('admin@test.com', 'ADMIN')
      await createOrg('Org 1', userId)
      await createOrg('Org 2', userId)
      await createOrg('Org 3', userId)

      const res = await app.inject({
        method:  'GET',
        url:     '/organizations/all?perPage=2&page=1',
        headers: { authorization: `Bearer ${accessToken}` },
      })

      const body = res.json()
      expect(body.total).toBe(3)
      expect(body.organizations).toHaveLength(2)
      expect(body.perPage).toBe(2)
    })

    it('deve refletir a contagem de membros', async () => {
      const app = await getTestApp()
      const { accessToken, userId } = await createUserAndLogin('admin@test.com', 'ADMIN')
      const org = await createOrg('Com membros', userId)
      await prisma.organizationMember.create({ data: { organizationId: org.id, userId, role: 'ADMIN' } })

      const res = await app.inject({
        method:  'GET',
        url:     '/organizations/all',
        headers: { authorization: `Bearer ${accessToken}` },
      })

      expect(res.json().organizations[0].memberCount).toBe(1)
    })
  })

  describe('autorização', () => {
    it('deve retornar 403 para usuário não-ADMIN (PROFESSOR)', async () => {
      const app = await getTestApp()
      const { accessToken } = await createUserAndLogin('prof@test.com', 'PROFESSOR')

      const res = await app.inject({
        method:  'GET',
        url:     '/organizations/all',
        headers: { authorization: `Bearer ${accessToken}` },
      })

      expect(res.statusCode).toBe(403)
    })

    it('deve retornar 401 quando sem token', async () => {
      const app = await getTestApp()
      const res = await app.inject({ method: 'GET', url: '/organizations/all' })
      expect(res.statusCode).toBe(401)
    })
  })
})
