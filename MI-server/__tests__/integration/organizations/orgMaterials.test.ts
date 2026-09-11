// __tests__/integration/organizations/orgMaterials.test.ts
// Cobertura dos endpoints de materiais vinculados a uma organização.
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import FormData from 'form-data'
import { randomUUID } from 'node:crypto'
import type { OrgMemberRole } from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import { getTestApp, closeTestApp } from '../../helpers/request'
import { createUserAndLogin, createMaterial, cleanMaterialsDb } from '../../helpers/materials'
import { prisma } from '../../../src/database/prisma'
import { minioClient, MINIO_BUCKET } from '../../../src/lib/minio'

beforeAll(async () => {
  const exists = await minioClient.bucketExists(MINIO_BUCKET)
  if (!exists) await minioClient.makeBucket(MINIO_BUCKET)
})

beforeEach(cleanMaterialsDb)

afterAll(async () => {
  await cleanMaterialsDb()
  await closeTestApp()
})

const auth = (token: string) => ({ authorization: `Bearer ${token}` })
const PDF_BUFFER = Buffer.from('%PDF-1.7\n1 0 obj<<>>endobj\n%%EOF\n')

async function makeOrg(creatorId: string) {
  return prisma.organization.create({ data: { name: 'Org Materiais', createdById: creatorId, status: 'ACTIVE' } })
}
async function addMember(orgId: string, userId: string, role: OrgMemberRole) {
  return prisma.organizationMember.create({ data: { organizationId: orgId, userId, role } })
}
async function linkMaterial(materialId: string, orgId: string) {
  return prisma.materialInstrucionalOrganization.create({ data: { materialId, organizationId: orgId } })
}

// ── GET /organizations/:orgId/materials ─────────────────────────────────────────

describe('GET /organizations/:orgId/materials', () => {
  it('deve listar apenas materiais APPROVED vinculados à org, para um membro', async () => {
    const app = await getTestApp()
    const owner = await createUserAndLogin('owner@test.com', 'INSTITUTIONALIZED')
    const org = await makeOrg(owner.userId)
    await addMember(org.id, owner.userId, 'ADMIN')

    const approved = await createMaterial({ uploadedById: owner.userId, status: 'APPROVED' })
    const pending = await createMaterial({ uploadedById: owner.userId, status: 'PENDING_REVIEW' })
    await linkMaterial(approved.id, org.id)
    await linkMaterial(pending.id, org.id)

    const res = await app.inject({ method: 'GET', url: `/organizations/${org.id}/materials`, headers: auth(owner.accessToken) })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveLength(1)
    expect(res.json()[0].id).toBe(approved.id)
  })

  it('deve retornar 403 quando o solicitante não é membro', async () => {
    const app = await getTestApp()
    const owner = await createUserAndLogin('owner@test.com', 'INSTITUTIONALIZED')
    const outsider = await createUserAndLogin('out@test.com', 'INSTITUTIONALIZED')
    const org = await makeOrg(owner.userId)
    await addMember(org.id, owner.userId, 'ADMIN')

    const res = await app.inject({ method: 'GET', url: `/organizations/${org.id}/materials`, headers: auth(outsider.accessToken) })

    expect(res.statusCode).toBe(403)
  })

  it('deve retornar 404 quando a org não existe', async () => {
    const app = await getTestApp()
    const user = await createUserAndLogin('u@test.com', 'INSTITUTIONALIZED')

    const res = await app.inject({ method: 'GET', url: `/organizations/${randomUUID()}/materials`, headers: auth(user.accessToken) })

    expect(res.statusCode).toBe(404)
  })
})

// ── POST /organizations/:orgId/mis ──────────────────────────────────────────────

describe('POST /organizations/:orgId/mis — upload vinculado à org', () => {
  async function uploadOrgMaterial(app: FastifyInstance, token: string, orgId: string) {
    const form = new FormData()
    form.append('file', PDF_BUFFER, { filename: 'org.pdf', contentType: 'application/pdf' })
    form.append('title', 'Material da Org')
    return app.inject({
      method: 'POST',
      url: `/organizations/${orgId}/mis`,
      headers: { ...form.getHeaders(), ...auth(token) },
      payload: form.getBuffer(),
    })
  }

  it('deve permitir que um membro com permissão de upload envie e vincule o MI à org', async () => {
    const app = await getTestApp()
    const member = await createUserAndLogin('member@test.com', 'INSTITUTIONALIZED')
    const org = await makeOrg(member.userId)
    await addMember(org.id, member.userId, 'MEMBER')

    const res = await uploadOrgMaterial(app, member.accessToken, org.id)

    expect(res.statusCode).toBe(201)
    const materialId = res.json().id
    const link = await prisma.materialInstrucionalOrganization.findFirst({
      where: { materialId, organizationId: org.id },
    })
    expect(link).not.toBeNull()
  })

  it('deve retornar 403 quando o uploader não é membro da org', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin@test.com', 'INSTITUTIONALIZED')
    const stranger = await createUserAndLogin('stranger@test.com', 'INSTITUTIONALIZED')
    const org = await makeOrg(admin.userId)
    await addMember(org.id, admin.userId, 'ADMIN')

    const res = await uploadOrgMaterial(app, stranger.accessToken, org.id)

    expect(res.statusCode).toBe(403)
  })

  it('deve retornar 403 para usuário COMMON (sem permissão de upload)', async () => {
    const app = await getTestApp()
    const owner = await createUserAndLogin('owner@test.com', 'INSTITUTIONALIZED')
    const common = await createUserAndLogin('common@test.com', 'COMMON')
    const org = await makeOrg(owner.userId)
    await addMember(org.id, owner.userId, 'ADMIN')
    await addMember(org.id, common.userId, 'MEMBER')

    const res = await uploadOrgMaterial(app, common.accessToken, org.id)

    expect(res.statusCode).toBe(403)
  })
})
