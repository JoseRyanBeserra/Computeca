// __tests__/integration/organizations/inviteUser.test.ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { getTestApp, closeTestApp } from '../../helpers/request'
import { prisma }                   from '../../../src/database/prisma'

// ── Limpeza ────────────────────────────────────────────────────────────────────

beforeEach(async () => {
  await prisma.inspectionLog.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.organizationInvite.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.organizationMember.deleteMany()
  await prisma.organization.deleteMany()
  await prisma.user.deleteMany()
})

afterAll(async () => {
  await prisma.inspectionLog.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.organizationInvite.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.organizationMember.deleteMany()
  await prisma.organization.deleteMany()
  await prisma.user.deleteMany()
  await closeTestApp()
})

// ── Helpers ────────────────────────────────────────────────────────────────────

async function createUserAndLogin(email: string, role: 'ADMIN' | 'PROFESSOR' | 'COMMON' | 'INSTITUTIONALIZED' = 'PROFESSOR') {
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

async function createOrgAsAdmin(adminToken: string, name = 'Projeto de Extensão') {
  const app = await getTestApp()

  const res = await app.inject({
    method:  'POST',
    url:     '/organizations',
    headers: { authorization: `Bearer ${adminToken}` },
    payload: { name },
  })

  return res.json() as { id: string }
}

async function createInstitutionalizedUser(email: string) {
  const app = await getTestApp()

  await app.inject({
    method:  'POST',
    url:     '/users',
    payload: { name: 'Institutional User', email, password: 'senha12345' },
  })

  await prisma.user.update({ where: { email }, data: { role: 'INSTITUTIONALIZED' } })

  return prisma.user.findUnique({ where: { email } })
}

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('POST /organizations/:orgId/invites — Convite de Usuário', () => {
  describe('casos de sucesso', () => {
    it('deve retornar 201 ao convidar um usuário institucionalizado', async () => {
      const app = await getTestApp()
      const { accessToken } = await createUserAndLogin('admin@test.com', 'PROFESSOR')
      const { id: orgId }   = await createOrgAsAdmin(accessToken)

      await createInstitutionalizedUser('inst@dcx.ufpb.br')

      const response = await app.inject({
        method:  'POST',
        url:     `/organizations/${orgId}/invites`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { email: 'inst@dcx.ufpb.br' },
      })

      expect(response.statusCode).toBe(201)
    })

    it('deve retornar o convite com status PENDING', async () => {
      const app = await getTestApp()
      const { accessToken } = await createUserAndLogin('admin@test.com', 'PROFESSOR')
      const { id: orgId }   = await createOrgAsAdmin(accessToken)

      await createInstitutionalizedUser('inst@dcx.ufpb.br')

      const response = await app.inject({
        method:  'POST',
        url:     `/organizations/${orgId}/invites`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { email: 'inst@dcx.ufpb.br' },
      })

      expect(response.json().status).toBe('PENDING')
    })

    it('deve persistir o convite no banco de dados', async () => {
      const app = await getTestApp()
      const { accessToken } = await createUserAndLogin('admin@test.com', 'PROFESSOR')
      const { id: orgId }   = await createOrgAsAdmin(accessToken)

      await createInstitutionalizedUser('inst@dcx.ufpb.br')

      const response = await app.inject({
        method:  'POST',
        url:     `/organizations/${orgId}/invites`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { email: 'inst@dcx.ufpb.br' },
      })

      const { id: inviteId } = response.json()
      const invite = await prisma.organizationInvite.findUnique({ where: { id: inviteId } })

      expect(invite).not.toBeNull()
      expect(invite?.status).toBe('PENDING')
    })
  })

  describe('erros de negócio', () => {
    it('deve retornar 404 quando o usuário convidado não existe', async () => {
      const app = await getTestApp()
      const { accessToken } = await createUserAndLogin('admin@test.com', 'PROFESSOR')
      const { id: orgId }   = await createOrgAsAdmin(accessToken)

      const response = await app.inject({
        method:  'POST',
        url:     `/organizations/${orgId}/invites`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { email: 'naoexiste@test.com' },
      })

      expect(response.statusCode).toBe(404)
      expect(response.json().code).toBe('USER_NOT_FOUND')
    })

    it('deve retornar 400 quando usuário convidado tem role COMMON', async () => {
      const app = await getTestApp()
      const { accessToken } = await createUserAndLogin('admin@test.com', 'PROFESSOR')
      const { id: orgId }   = await createOrgAsAdmin(accessToken)

      await app.inject({
        method:  'POST',
        url:     '/users',
        payload: { name: 'Common User', email: 'common@test.com', password: 'senha12345' },
      })

      const response = await app.inject({
        method:  'POST',
        url:     `/organizations/${orgId}/invites`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { email: 'common@test.com' },
      })

      expect(response.statusCode).toBe(400)
      expect(response.json().code).toBe('INVITE_ONLY_INSTITUTIONAL')
    })

    it('deve retornar 409 quando já há convite pendente para o usuário', async () => {
      const app = await getTestApp()
      const { accessToken } = await createUserAndLogin('admin@test.com', 'PROFESSOR')
      const { id: orgId }   = await createOrgAsAdmin(accessToken)

      await createInstitutionalizedUser('inst@dcx.ufpb.br')

      await app.inject({
        method:  'POST',
        url:     `/organizations/${orgId}/invites`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { email: 'inst@dcx.ufpb.br' },
      })

      const response = await app.inject({
        method:  'POST',
        url:     `/organizations/${orgId}/invites`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { email: 'inst@dcx.ufpb.br' },
      })

      expect(response.statusCode).toBe(409)
      expect(response.json().code).toBe('INVITE_ALREADY_PENDING')
    })

    it('deve retornar 404 quando a organização não existe', async () => {
      const app = await getTestApp()
      const { accessToken } = await createUserAndLogin('admin@test.com', 'PROFESSOR')

      await createInstitutionalizedUser('inst@dcx.ufpb.br')

      const response = await app.inject({
        method:  'POST',
        url:     '/organizations/00000000-0000-0000-0000-000000000000/invites',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { email: 'inst@dcx.ufpb.br' },
      })

      expect(response.statusCode).toBe(404)
      expect(response.json().code).toBe('ORG_NOT_FOUND')
    })

    it('deve retornar 403 quando quem convida não é staff da org', async () => {
      const app = await getTestApp()

      const { accessToken: adminToken }  = await createUserAndLogin('admin@test.com', 'PROFESSOR')
      const { id: orgId }                = await createOrgAsAdmin(adminToken)

      await createInstitutionalizedUser('inst@dcx.ufpb.br')

      const { accessToken: memberToken } = await createUserAndLogin('member@test.com', 'INSTITUTIONALIZED')

      const response = await app.inject({
        method:  'POST',
        url:     `/organizations/${orgId}/invites`,
        headers: { authorization: `Bearer ${memberToken}` },
        payload: { email: 'inst@dcx.ufpb.br' },
      })

      expect(response.statusCode).toBe(403)
    })
  })

  describe('autorização', () => {
    it('deve retornar 401 quando sem token', async () => {
      const app = await getTestApp()

      const response = await app.inject({
        method:  'POST',
        url:     '/organizations/00000000-0000-0000-0000-000000000000/invites',
        payload: { email: 'any@test.com' },
      })

      expect(response.statusCode).toBe(401)
    })
  })
})
