// __tests__/integration/organizations/respondInvite.test.ts
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

  // Ajusta o papel e garante e-mail verificado — usuários institucionais
  // (@dcx.ufpb.br) nascem com emailVerified=false (RF02) e não conseguiriam logar.
  await prisma.user.update({
    where: { email },
    data:  role !== 'COMMON' ? { role, emailVerified: true } : { emailVerified: true },
  })

  const loginRes = await app.inject({
    method:  'POST',
    url:     '/auth/login',
    payload: { email, password },
  })

  return { accessToken: loginRes.json().accessToken as string }
}

async function setupInvite(inviteeEmail: string, inviteeRole: 'INSTITUTIONALIZED' | 'PROFESSOR' | 'COMMON' = 'INSTITUTIONALIZED') {
  const app = await getTestApp()

  const { accessToken: adminToken } = await createUserAndLogin('admin@test.com', 'PROFESSOR')

  const orgRes = await app.inject({
    method:  'POST',
    url:     '/organizations',
    headers: { authorization: `Bearer ${adminToken}` },
    payload: { name: 'Projeto Teste' },
  })
  const { id: orgId } = orgRes.json()

  await app.inject({
    method:  'POST',
    url:     '/users',
    payload: { name: 'Invitee', email: inviteeEmail, password: 'senha12345' },
  })
  if (inviteeRole !== 'COMMON') {
    await prisma.user.update({ where: { email: inviteeEmail }, data: { role: inviteeRole } })
  }

  const inviteRes = await app.inject({
    method:  'POST',
    url:     `/organizations/${orgId}/invites`,
    headers: { authorization: `Bearer ${adminToken}` },
    payload: { email: inviteeEmail },
  })
  const { id: inviteId } = inviteRes.json()

  const { accessToken: inviteeToken } = await createUserAndLogin(inviteeEmail, inviteeRole)

  return { orgId, inviteId, inviteeToken, adminToken }
}

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('PATCH /organizations/invites/:inviteId/respond — Responder Convite', () => {
  describe('aceitar convite (ACCEPT)', () => {
    it('deve retornar 204 ao aceitar o convite', async () => {
      const app = await getTestApp()
      const { inviteId, inviteeToken } = await setupInvite('inst@dcx.ufpb.br')

      const response = await app.inject({
        method:  'PATCH',
        url:     `/organizations/invites/${inviteId}/respond`,
        headers: { authorization: `Bearer ${inviteeToken}` },
        payload: { action: 'ACCEPT' },
      })

      expect(response.statusCode).toBe(204)
    })

    it('deve adicionar o usuário como membro da org ao aceitar', async () => {
      const app = await getTestApp()
      const { orgId, inviteId, inviteeToken } = await setupInvite('inst@dcx.ufpb.br')

      await app.inject({
        method:  'PATCH',
        url:     `/organizations/invites/${inviteId}/respond`,
        headers: { authorization: `Bearer ${inviteeToken}` },
        payload: { action: 'ACCEPT' },
      })

      const inviteeUser = await prisma.user.findUnique({ where: { email: 'inst@dcx.ufpb.br' } })
      const membership = await prisma.organizationMember.findFirst({
        where: { organizationId: orgId, userId: inviteeUser!.id },
      })

      expect(membership).not.toBeNull()
    })

    it('deve atribuir role MEMBER para usuário INSTITUTIONALIZED que aceita', async () => {
      const app = await getTestApp()
      const { orgId, inviteId, inviteeToken } = await setupInvite('inst@dcx.ufpb.br', 'INSTITUTIONALIZED')

      await app.inject({
        method:  'PATCH',
        url:     `/organizations/invites/${inviteId}/respond`,
        headers: { authorization: `Bearer ${inviteeToken}` },
        payload: { action: 'ACCEPT' },
      })

      const inviteeUser = await prisma.user.findUnique({ where: { email: 'inst@dcx.ufpb.br' } })
      const membership = await prisma.organizationMember.findFirst({
        where: { organizationId: orgId, userId: inviteeUser!.id },
      })

      expect(membership?.role).toBe('MEMBER')
    })

    it('deve atribuir role PROFESSOR para usuário PROFESSOR que aceita', async () => {
      const app = await getTestApp()
      const { orgId, inviteId, inviteeToken } = await setupInvite('prof@dcx.ufpb.br', 'PROFESSOR')

      await app.inject({
        method:  'PATCH',
        url:     `/organizations/invites/${inviteId}/respond`,
        headers: { authorization: `Bearer ${inviteeToken}` },
        payload: { action: 'ACCEPT' },
      })

      const inviteeUser = await prisma.user.findUnique({ where: { email: 'prof@dcx.ufpb.br' } })
      const membership = await prisma.organizationMember.findFirst({
        where: { organizationId: orgId, userId: inviteeUser!.id },
      })

      expect(membership?.role).toBe('PROFESSOR')
    })

    it('deve atualizar o status do convite para ACCEPTED no banco', async () => {
      const app = await getTestApp()
      const { inviteId, inviteeToken } = await setupInvite('inst@dcx.ufpb.br')

      await app.inject({
        method:  'PATCH',
        url:     `/organizations/invites/${inviteId}/respond`,
        headers: { authorization: `Bearer ${inviteeToken}` },
        payload: { action: 'ACCEPT' },
      })

      const invite = await prisma.organizationInvite.findUnique({ where: { id: inviteId } })
      expect(invite?.status).toBe('ACCEPTED')
    })
  })

  describe('rejeitar convite (REJECT)', () => {
    it('deve retornar 204 ao rejeitar o convite', async () => {
      const app = await getTestApp()
      const { inviteId, inviteeToken } = await setupInvite('inst@dcx.ufpb.br')

      const response = await app.inject({
        method:  'PATCH',
        url:     `/organizations/invites/${inviteId}/respond`,
        headers: { authorization: `Bearer ${inviteeToken}` },
        payload: { action: 'REJECT' },
      })

      expect(response.statusCode).toBe(204)
    })

    it('não deve adicionar o usuário como membro ao rejeitar', async () => {
      const app = await getTestApp()
      const { orgId, inviteId, inviteeToken } = await setupInvite('inst@dcx.ufpb.br')

      await app.inject({
        method:  'PATCH',
        url:     `/organizations/invites/${inviteId}/respond`,
        headers: { authorization: `Bearer ${inviteeToken}` },
        payload: { action: 'REJECT' },
      })

      const inviteeUser = await prisma.user.findUnique({ where: { email: 'inst@dcx.ufpb.br' } })
      const membership = await prisma.organizationMember.findFirst({
        where: { organizationId: orgId, userId: inviteeUser!.id },
      })

      expect(membership).toBeNull()
    })

    it('deve atualizar o status do convite para REJECTED no banco', async () => {
      const app = await getTestApp()
      const { inviteId, inviteeToken } = await setupInvite('inst@dcx.ufpb.br')

      await app.inject({
        method:  'PATCH',
        url:     `/organizations/invites/${inviteId}/respond`,
        headers: { authorization: `Bearer ${inviteeToken}` },
        payload: { action: 'REJECT' },
      })

      const invite = await prisma.organizationInvite.findUnique({ where: { id: inviteId } })
      expect(invite?.status).toBe('REJECTED')
    })
  })

  describe('erros de negócio', () => {
    it('deve retornar 404 quando o convite não existe', async () => {
      const app = await getTestApp()
      const { inviteeToken } = await setupInvite('inst@dcx.ufpb.br')

      const response = await app.inject({
        method:  'PATCH',
        url:     '/organizations/invites/00000000-0000-0000-0000-000000000000/respond',
        headers: { authorization: `Bearer ${inviteeToken}` },
        payload: { action: 'ACCEPT' },
      })

      expect(response.statusCode).toBe(404)
      expect(response.json().code).toBe('INVITE_NOT_FOUND')
    })

    it('deve retornar 403 quando outro usuário tenta responder o convite', async () => {
      const app = await getTestApp()
      const { inviteId }    = await setupInvite('inst@dcx.ufpb.br')
      const { accessToken } = await createUserAndLogin('other@test.com', 'INSTITUTIONALIZED')

      const response = await app.inject({
        method:  'PATCH',
        url:     `/organizations/invites/${inviteId}/respond`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { action: 'ACCEPT' },
      })

      expect(response.statusCode).toBe(403)
    })

    it('deve retornar 400 ao tentar responder convite já aceito', async () => {
      const app = await getTestApp()
      const { inviteId, inviteeToken } = await setupInvite('inst@dcx.ufpb.br')

      await app.inject({
        method:  'PATCH',
        url:     `/organizations/invites/${inviteId}/respond`,
        headers: { authorization: `Bearer ${inviteeToken}` },
        payload: { action: 'ACCEPT' },
      })

      const response = await app.inject({
        method:  'PATCH',
        url:     `/organizations/invites/${inviteId}/respond`,
        headers: { authorization: `Bearer ${inviteeToken}` },
        payload: { action: 'ACCEPT' },
      })

      expect(response.statusCode).toBe(400)
      expect(response.json().code).toBe('INVITE_NOT_PENDING')
    })
  })

  describe('autorização', () => {
    it('deve retornar 401 quando sem token', async () => {
      const app = await getTestApp()

      const response = await app.inject({
        method:  'PATCH',
        url:     '/organizations/invites/00000000-0000-0000-0000-000000000000/respond',
        payload: { action: 'ACCEPT' },
      })

      expect(response.statusCode).toBe(401)
    })
  })
})
