// __tests__/integration/organizations/orgManagement.test.ts
// Cobertura de integração dos endpoints de gestão de organizações:
// listagem própria, edição, arquivamento, membros e convites.
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import type { OrgMemberRole, InviteStatus, OrgStatus } from '@prisma/client'
import { getTestApp, closeTestApp } from '../../helpers/request'
import { createUserAndLogin, cleanMaterialsDb } from '../../helpers/materials'
import { prisma } from '../../../src/database/prisma'

beforeEach(cleanMaterialsDb)

afterAll(async () => {
  await cleanMaterialsDb()
  await closeTestApp()
})

// ── Helpers de cenário (inserção direta no banco) ───────────────────────────────

async function makeOrg(creatorId: string, opts: { name?: string; status?: OrgStatus } = {}) {
  return prisma.organization.create({
    data: { name: opts.name ?? 'Projeto de Extensão', createdById: creatorId, status: opts.status ?? 'ACTIVE' },
  })
}

async function addMember(orgId: string, userId: string, role: OrgMemberRole) {
  return prisma.organizationMember.create({ data: { organizationId: orgId, userId, role } })
}

async function makeInvite(orgId: string, invitedUserId: string, invitedById: string, status: InviteStatus = 'PENDING') {
  return prisma.organizationInvite.create({ data: { organizationId: orgId, invitedUserId, invitedById, status } })
}

function auth(token: string) {
  return { authorization: `Bearer ${token}` }
}

// ── GET /organizations/mine ─────────────────────────────────────────────────────

describe('GET /organizations/mine', () => {
  it('deve listar apenas as organizações em que o usuário é membro, com myRole e memberCount', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin@test.com')
    const other = await createUserAndLogin('other@test.com')

    const org = await makeOrg(admin.userId, { name: 'Minha Org' })
    await addMember(org.id, admin.userId, 'ADMIN')
    await addMember(org.id, other.userId, 'MEMBER')
    // Org da qual o admin NÃO participa — não deve aparecer
    const foreign = await makeOrg(other.userId, { name: 'Org Alheia' })
    await addMember(foreign.id, other.userId, 'ADMIN')

    const res = await app.inject({ method: 'GET', url: '/organizations/mine', headers: auth(admin.accessToken) })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveLength(1)
    expect(body[0]).toMatchObject({ id: org.id, name: 'Minha Org', myRole: 'ADMIN', memberCount: 2 })
  })

  it('deve retornar lista vazia quando o usuário não participa de nenhuma org', async () => {
    const app = await getTestApp()
    const user = await createUserAndLogin('solo@test.com')

    const res = await app.inject({ method: 'GET', url: '/organizations/mine', headers: auth(user.accessToken) })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([])
  })

  it('deve retornar 401 sem token', async () => {
    const app = await getTestApp()
    const res = await app.inject({ method: 'GET', url: '/organizations/mine' })
    expect(res.statusCode).toBe(401)
  })
})

// ── PUT /organizations/:orgId ───────────────────────────────────────────────────

describe('PUT /organizations/:orgId', () => {
  it('deve permitir que o ADMIN da org edite nome e descrição', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin@test.com')
    const org = await makeOrg(admin.userId)
    await addMember(org.id, admin.userId, 'ADMIN')

    const res = await app.inject({
      method: 'PUT',
      url: `/organizations/${org.id}`,
      headers: auth(admin.accessToken),
      payload: { name: 'Novo Nome', description: 'Nova descrição' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ id: org.id, name: 'Novo Nome', description: 'Nova descrição' })
  })

  it('deve retornar 403 quando um MEMBER (não-admin) tenta editar', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin@test.com')
    const member = await createUserAndLogin('member@test.com')
    const org = await makeOrg(admin.userId)
    await addMember(org.id, admin.userId, 'ADMIN')
    await addMember(org.id, member.userId, 'MEMBER')

    const res = await app.inject({
      method: 'PUT',
      url: `/organizations/${org.id}`,
      headers: auth(member.accessToken),
      payload: { name: 'Tentativa' },
    })

    expect(res.statusCode).toBe(403)
  })

  it('deve retornar 404 quando a organização não existe', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin@test.com')

    const res = await app.inject({
      method: 'PUT',
      url: `/organizations/${randomUUID()}`,
      headers: auth(admin.accessToken),
      payload: { name: 'Nome Válido' },
    })

    expect(res.statusCode).toBe(404)
  })

  it('deve retornar 400 ao tentar editar organização arquivada', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin@test.com')
    const org = await makeOrg(admin.userId, { status: 'ARCHIVED' })
    await addMember(org.id, admin.userId, 'ADMIN')

    const res = await app.inject({
      method: 'PUT',
      url: `/organizations/${org.id}`,
      headers: auth(admin.accessToken),
      payload: { name: 'Nome Válido' },
    })

    expect(res.statusCode).toBe(400)
  })
})

// ── DELETE /organizations/:orgId (arquivar) ─────────────────────────────────────

describe('DELETE /organizations/:orgId — arquivar', () => {
  it('deve arquivar a organização quando solicitado pelo ADMIN', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin@test.com')
    const org = await makeOrg(admin.userId)
    await addMember(org.id, admin.userId, 'ADMIN')

    const res = await app.inject({ method: 'DELETE', url: `/organizations/${org.id}`, headers: auth(admin.accessToken) })

    expect(res.statusCode).toBe(200)
    const updated = await prisma.organization.findUnique({ where: { id: org.id } })
    expect(updated?.status).toBe('ARCHIVED')
  })

  it('deve retornar 403 quando um MEMBER tenta arquivar', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin@test.com')
    const member = await createUserAndLogin('member@test.com')
    const org = await makeOrg(admin.userId)
    await addMember(org.id, admin.userId, 'ADMIN')
    await addMember(org.id, member.userId, 'MEMBER')

    const res = await app.inject({ method: 'DELETE', url: `/organizations/${org.id}`, headers: auth(member.accessToken) })

    expect(res.statusCode).toBe(403)
  })

  it('deve retornar 400 ao arquivar organização já arquivada', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin@test.com')
    const org = await makeOrg(admin.userId, { status: 'ARCHIVED' })
    await addMember(org.id, admin.userId, 'ADMIN')

    const res = await app.inject({ method: 'DELETE', url: `/organizations/${org.id}`, headers: auth(admin.accessToken) })

    expect(res.statusCode).toBe(400)
  })
})

// ── GET /organizations/:orgId/members ───────────────────────────────────────────

describe('GET /organizations/:orgId/members', () => {
  it('deve listar os membros para um membro da org', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin@test.com')
    const member = await createUserAndLogin('member@test.com')
    const org = await makeOrg(admin.userId)
    await addMember(org.id, admin.userId, 'ADMIN')
    await addMember(org.id, member.userId, 'MEMBER')

    const res = await app.inject({ method: 'GET', url: `/organizations/${org.id}/members`, headers: auth(member.accessToken) })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveLength(2)
  })

  it('deve retornar 403 quando o solicitante não é membro', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin@test.com')
    const outsider = await createUserAndLogin('out@test.com')
    const org = await makeOrg(admin.userId)
    await addMember(org.id, admin.userId, 'ADMIN')

    const res = await app.inject({ method: 'GET', url: `/organizations/${org.id}/members`, headers: auth(outsider.accessToken) })

    expect(res.statusCode).toBe(403)
  })

  it('deve retornar 404 quando a org não existe', async () => {
    const app = await getTestApp()
    const user = await createUserAndLogin('u@test.com')

    const res = await app.inject({ method: 'GET', url: `/organizations/${randomUUID()}/members`, headers: auth(user.accessToken) })

    expect(res.statusCode).toBe(404)
  })
})

// ── DELETE /organizations/:orgId/members/:userId ────────────────────────────────

describe('DELETE /organizations/:orgId/members/:userId — remover membro', () => {
  it('deve remover um MEMBER quando solicitado pelo ADMIN', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin@test.com')
    const member = await createUserAndLogin('member@test.com')
    const org = await makeOrg(admin.userId)
    await addMember(org.id, admin.userId, 'ADMIN')
    await addMember(org.id, member.userId, 'MEMBER')

    const res = await app.inject({
      method: 'DELETE',
      url: `/organizations/${org.id}/members/${member.userId}`,
      headers: auth(admin.accessToken),
    })

    expect(res.statusCode).toBe(204)
    const membership = await prisma.organizationMember.findFirst({ where: { organizationId: org.id, userId: member.userId } })
    expect(membership).toBeNull()
  })

  it('deve retornar 403 quando um MEMBER tenta remover outro', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin@test.com')
    const m1 = await createUserAndLogin('m1@test.com')
    const m2 = await createUserAndLogin('m2@test.com')
    const org = await makeOrg(admin.userId)
    await addMember(org.id, admin.userId, 'ADMIN')
    await addMember(org.id, m1.userId, 'MEMBER')
    await addMember(org.id, m2.userId, 'MEMBER')

    const res = await app.inject({
      method: 'DELETE',
      url: `/organizations/${org.id}/members/${m2.userId}`,
      headers: auth(m1.accessToken),
    })

    expect(res.statusCode).toBe(403)
  })

  it('deve retornar 404 quando o alvo não é membro', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin@test.com')
    const org = await makeOrg(admin.userId)
    await addMember(org.id, admin.userId, 'ADMIN')

    const res = await app.inject({
      method: 'DELETE',
      url: `/organizations/${org.id}/members/${randomUUID()}`,
      headers: auth(admin.accessToken),
    })

    expect(res.statusCode).toBe(404)
  })

  it('deve impedir a remoção de um ADMIN (403)', async () => {
    const app = await getTestApp()
    const admin1 = await createUserAndLogin('admin1@test.com')
    const admin2 = await createUserAndLogin('admin2@test.com')
    const org = await makeOrg(admin1.userId)
    await addMember(org.id, admin1.userId, 'ADMIN')
    await addMember(org.id, admin2.userId, 'ADMIN')

    const res = await app.inject({
      method: 'DELETE',
      url: `/organizations/${org.id}/members/${admin2.userId}`,
      headers: auth(admin1.accessToken),
    })

    expect(res.statusCode).toBe(403)
  })
})

// ── DELETE /organizations/:orgId/leave ──────────────────────────────────────────

describe('DELETE /organizations/:orgId/leave — sair da org', () => {
  it('deve permitir que um MEMBER saia da organização', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin@test.com')
    const member = await createUserAndLogin('member@test.com')
    const org = await makeOrg(admin.userId)
    await addMember(org.id, admin.userId, 'ADMIN')
    await addMember(org.id, member.userId, 'MEMBER')

    const res = await app.inject({ method: 'DELETE', url: `/organizations/${org.id}/leave`, headers: auth(member.accessToken) })

    expect(res.statusCode).toBe(204)
    const membership = await prisma.organizationMember.findFirst({ where: { organizationId: org.id, userId: member.userId } })
    expect(membership).toBeNull()
  })

  it('deve impedir que o ADMIN saia (403)', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin@test.com')
    const org = await makeOrg(admin.userId)
    await addMember(org.id, admin.userId, 'ADMIN')

    const res = await app.inject({ method: 'DELETE', url: `/organizations/${org.id}/leave`, headers: auth(admin.accessToken) })

    expect(res.statusCode).toBe(403)
  })

  it('deve retornar 404 quando o usuário não é membro', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin@test.com')
    const outsider = await createUserAndLogin('out@test.com')
    const org = await makeOrg(admin.userId)
    await addMember(org.id, admin.userId, 'ADMIN')

    const res = await app.inject({ method: 'DELETE', url: `/organizations/${org.id}/leave`, headers: auth(outsider.accessToken) })

    expect(res.statusCode).toBe(404)
  })
})

// ── DELETE /organizations/invites/:inviteId — cancelar convite ──────────────────

describe('DELETE /organizations/invites/:inviteId — cancelar convite', () => {
  it('deve cancelar um convite PENDING quando solicitado pelo ADMIN', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin@test.com')
    const invitee = await createUserAndLogin('invitee@test.com')
    const org = await makeOrg(admin.userId)
    await addMember(org.id, admin.userId, 'ADMIN')
    const invite = await makeInvite(org.id, invitee.userId, admin.userId, 'PENDING')

    const res = await app.inject({ method: 'DELETE', url: `/organizations/invites/${invite.id}`, headers: auth(admin.accessToken) })

    expect(res.statusCode).toBe(204)
    const updated = await prisma.organizationInvite.findUnique({ where: { id: invite.id } })
    expect(updated?.status).toBe('CANCELLED')
  })

  it('deve retornar 404 quando o convite não existe', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin@test.com')

    const res = await app.inject({ method: 'DELETE', url: `/organizations/invites/${randomUUID()}`, headers: auth(admin.accessToken) })

    expect(res.statusCode).toBe(404)
  })

  it('deve retornar 400 ao cancelar convite que não está PENDING', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin@test.com')
    const invitee = await createUserAndLogin('invitee@test.com')
    const org = await makeOrg(admin.userId)
    await addMember(org.id, admin.userId, 'ADMIN')
    const invite = await makeInvite(org.id, invitee.userId, admin.userId, 'ACCEPTED')

    const res = await app.inject({ method: 'DELETE', url: `/organizations/invites/${invite.id}`, headers: auth(admin.accessToken) })

    expect(res.statusCode).toBe(400)
  })

  it('deve retornar 403 quando um MEMBER comum tenta cancelar', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin@test.com')
    const member = await createUserAndLogin('member@test.com')
    const invitee = await createUserAndLogin('invitee@test.com')
    const org = await makeOrg(admin.userId)
    await addMember(org.id, admin.userId, 'ADMIN')
    await addMember(org.id, member.userId, 'MEMBER')
    const invite = await makeInvite(org.id, invitee.userId, admin.userId, 'PENDING')

    const res = await app.inject({ method: 'DELETE', url: `/organizations/invites/${invite.id}`, headers: auth(member.accessToken) })

    expect(res.statusCode).toBe(403)
  })
})

// ── GET /organizations/invites/mine e pending-count ─────────────────────────────

describe('GET /organizations/invites/mine e /pending-count', () => {
  it('deve listar os convites recebidos pelo usuário', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin@test.com')
    const invitee = await createUserAndLogin('invitee@test.com')
    const org = await makeOrg(admin.userId)
    await addMember(org.id, admin.userId, 'ADMIN')
    await makeInvite(org.id, invitee.userId, admin.userId, 'PENDING')

    const res = await app.inject({ method: 'GET', url: '/organizations/invites/mine', headers: auth(invitee.accessToken) })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveLength(1)
    expect(res.json()[0]).toMatchObject({ organizationId: org.id, status: 'PENDING' })
  })

  it('deve contar apenas os convites PENDING do usuário', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin@test.com')
    const invitee = await createUserAndLogin('invitee@test.com')
    const org = await makeOrg(admin.userId)
    await addMember(org.id, admin.userId, 'ADMIN')
    await makeInvite(org.id, invitee.userId, admin.userId, 'PENDING')
    await makeInvite(org.id, invitee.userId, admin.userId, 'REJECTED')

    const res = await app.inject({ method: 'GET', url: '/organizations/invites/pending-count', headers: auth(invitee.accessToken) })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ count: 1 })
  })
})
