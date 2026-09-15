// __tests__/integration/organizations/orgMaterialLinks.test.ts
// Feature 004, FR-013 — a regra dos links vale igualmente para o cadastro por
// organização.
//
// Repete deliberadamente os casos de recusa da rota direta: uma regra aplicada
// só num dos caminhos não seria regra. O parse e o schema são compartilhados —
// estes testes são o que impede alguém de separá-los sem perceber.
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import FormData from 'form-data'
import type { FastifyInstance } from 'fastify'
import { getTestApp, closeTestApp } from '../../helpers/request'
import { createUserAndLogin, cleanMaterialsDb } from '../../helpers/materials'
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

const PDF_BUFFER = Buffer.from('%PDF-1.7\n1 0 obj<<>>endobj\n%%EOF\n')
const VIDEOAULA = { label: 'Videoaula', url: 'https://exemplo.org/aula' }

const links = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ label: `Link ${i + 1}`, url: `https://exemplo.org/${i + 1}` }))

async function membroComOrg() {
  const user = await createUserAndLogin('membro@links.com', 'INSTITUTIONALIZED')
  const org = await prisma.organization.create({
    data: { name: 'Org de Teste', createdById: user.userId },
  })
  await prisma.organizationMember.create({
    data: { organizationId: org.id, userId: user.userId, role: 'MEMBER' },
  })
  return { user, org }
}

async function uploadOrg(app: FastifyInstance, token: string, orgId: string, relatedLinks?: unknown) {
  const form = new FormData()
  form.append('file', PDF_BUFFER, { filename: 'org.pdf', contentType: 'application/pdf' })
  form.append('title', 'Material da Org')
  form.append('description', 'a'.repeat(50))
  if (relatedLinks !== undefined) form.append('relatedLinks', JSON.stringify(relatedLinks))

  return app.inject({
    method:  'POST',
    url:     `/organizations/${orgId}/mis`,
    headers: { ...form.getHeaders(), authorization: `Bearer ${token}` },
    payload: form.getBuffer(),
  })
}

describe('POST /organizations/:orgId/mis — mesma regra da rota direta', () => {
  it('sem o campo → 201', async () => {
    const app = await getTestApp()
    const { user, org } = await membroComOrg()

    const res = await uploadOrg(app, user.accessToken, org.id)

    expect(res.statusCode).toBe(201)
  })

  it('lista válida → 201, com os links persistidos', async () => {
    const app = await getTestApp()
    const { user, org } = await membroComOrg()

    const res = await uploadOrg(app, user.accessToken, org.id, [VIDEOAULA])

    expect(res.statusCode).toBe(201)
    const gravado = await prisma.materialInstrucional.findUniqueOrThrow({ where: { id: res.json().id } })
    expect(gravado.relatedLinks).toEqual([VIDEOAULA])
  })

  it('exatamente 10 links → 201 e 11 → 422', async () => {
    const app = await getTestApp()
    const { user, org } = await membroComOrg()

    expect((await uploadOrg(app, user.accessToken, org.id, links(10))).statusCode).toBe(201)
    expect((await uploadOrg(app, user.accessToken, org.id, links(11))).statusCode).toBe(422)
  })

  it('rótulo vazio → 422; com 60 caracteres → 201; com 61 → 422', async () => {
    const app = await getTestApp()
    const { user, org } = await membroComOrg()

    expect((await uploadOrg(app, user.accessToken, org.id, [{ label: '', url: VIDEOAULA.url }])).statusCode).toBe(422)
    expect((await uploadOrg(app, user.accessToken, org.id, [{ label: 'r'.repeat(60), url: VIDEOAULA.url }])).statusCode).toBe(201)
    expect((await uploadOrg(app, user.accessToken, org.id, [{ label: 'r'.repeat(61), url: VIDEOAULA.url }])).statusCode).toBe(422)
  })

  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    'ftp://exemplo.org/arquivo',
    'exemplo.org',
  ])('recusa %s com 422, sem criar material', async (url) => {
    const app = await getTestApp()
    const { user, org } = await membroComOrg()

    const res = await uploadOrg(app, user.accessToken, org.id, [{ label: 'Videoaula', url }])

    expect(res.statusCode).toBe(422)
    expect(await prisma.materialInstrucional.count()).toBe(0)
  })
})
