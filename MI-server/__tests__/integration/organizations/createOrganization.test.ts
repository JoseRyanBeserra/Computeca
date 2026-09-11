// __tests__/integration/organizations/createOrganization.test.ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { getTestApp, closeTestApp } from '../../helpers/request'
import { prisma }                   from '../../../src/database/prisma'

// ── Limpeza ────────────────────────────────────────────────────────────────────

beforeEach(async () => {
  await prisma.inspectionLog.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.organizationMember.deleteMany()
  await prisma.organization.deleteMany()
  await prisma.user.deleteMany()
})

afterAll(async () => {
  await prisma.inspectionLog.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.organizationMember.deleteMany()
  await prisma.organization.deleteMany()
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

  const loginRes = await app.inject({
    method:  'POST',
    url:     '/auth/login',
    payload: { email, password },
  })

  return { accessToken: loginRes.json().accessToken as string }
}

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('POST /organizations — Criação de Organização', () => {
  describe('casos de sucesso', () => {
    it('deve retornar 201 ao criar uma organização como PROFESSOR', async () => {
      const app = await getTestApp()
      const { accessToken } = await createUserAndLogin('prof@test.com', 'PROFESSOR')

      const response = await app.inject({
        method:  'POST',
        url:     '/organizations',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { name: 'Projeto de Extensão', description: 'Desc do projeto' },
      })

      expect(response.statusCode).toBe(201)
    })

    it('deve retornar os dados da organização criada', async () => {
      const app = await getTestApp()
      const { accessToken } = await createUserAndLogin('prof@test.com', 'PROFESSOR')

      const response = await app.inject({
        method:  'POST',
        url:     '/organizations',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { name: 'Projeto Alpha' },
      })

      const body = response.json()
      expect(body).toMatchObject({
        id:     expect.any(String),
        name:   'Projeto Alpha',
        status: 'ACTIVE',
      })
    })

    it('deve persistir a organização no banco de dados', async () => {
      const app = await getTestApp()
      const { accessToken } = await createUserAndLogin('prof@test.com', 'PROFESSOR')

      const response = await app.inject({
        method:  'POST',
        url:     '/organizations',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { name: 'Projeto Beta' },
      })

      const { id } = response.json()
      const org = await prisma.organization.findUnique({ where: { id } })

      expect(org).not.toBeNull()
      expect(org?.name).toBe('Projeto Beta')
    })

    it('deve adicionar o criador como ADMIN da organização', async () => {
      const app = await getTestApp()
      const { accessToken } = await createUserAndLogin('prof@test.com', 'PROFESSOR')
      const profUser = await prisma.user.findUnique({ where: { email: 'prof@test.com' } })

      const response = await app.inject({
        method:  'POST',
        url:     '/organizations',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { name: 'Projeto com Admin' },
      })

      const { id: orgId } = response.json()
      const membership = await prisma.organizationMember.findFirst({
        where: { organizationId: orgId, userId: profUser!.id },
      })

      expect(membership).not.toBeNull()
      expect(membership?.role).toBe('ADMIN')
    })

    it('deve gerar AuditLog com action ORGANIZATION_CREATED', async () => {
      const app = await getTestApp()
      const { accessToken } = await createUserAndLogin('prof@test.com', 'PROFESSOR')

      const response = await app.inject({
        method:  'POST',
        url:     '/organizations',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { name: 'Projeto Auditado' },
      })

      const { id: orgId } = response.json()
      const log = await prisma.auditLog.findFirst({
        where: { action: 'ORGANIZATION_CREATED', targetId: orgId },
      })

      expect(log).not.toBeNull()
    })

    it('deve funcionar também para ADMIN', async () => {
      const app = await getTestApp()
      const { accessToken } = await createUserAndLogin('admin@test.com', 'ADMIN')

      const response = await app.inject({
        method:  'POST',
        url:     '/organizations',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { name: 'Projeto do Admin' },
      })

      expect(response.statusCode).toBe(201)
    })
  })

  describe('validação', () => {
    it('deve retornar erro quando name não é fornecido', async () => {
      const app = await getTestApp()
      const { accessToken } = await createUserAndLogin('prof@test.com', 'PROFESSOR')

      const response = await app.inject({
        method:  'POST',
        url:     '/organizations',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {},
      })

      expect(response.statusCode).toBeGreaterThanOrEqual(400)
    })
  })

  describe('autorização', () => {
    it('deve retornar 403 quando usuário COMMON tenta criar', async () => {
      const app = await getTestApp()
      const { accessToken } = await createUserAndLogin('common@test.com', 'COMMON')

      const response = await app.inject({
        method:  'POST',
        url:     '/organizations',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { name: 'Projeto Indevido' },
      })

      expect(response.statusCode).toBe(403)
    })

    it('deve retornar 401 quando sem token', async () => {
      const app = await getTestApp()

      const response = await app.inject({
        method:  'POST',
        url:     '/organizations',
        payload: { name: 'Projeto Sem Auth' },
      })

      expect(response.statusCode).toBe(401)
    })
  })
})
