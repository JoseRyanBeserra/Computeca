// __tests__/integration/organizations/orgMaterialDescription.test.ts
// FR-008 — a exigência vale igualmente para o cadastro por organização.
//
// Este arquivo repete deliberadamente os casos da rota direta. Uma regra
// aplicada só em um dos caminhos não seria regra, e antes desta feature cada
// controller lia o formulário por conta própria — divergir era questão de tempo.
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

beforeEach(async () => {
  await cleanMaterialsDb()
  await prisma.organizationMember.deleteMany()
  await prisma.organization.deleteMany()
})

afterAll(async () => {
  await cleanMaterialsDb()
  await prisma.organizationMember.deleteMany()
  await prisma.organization.deleteMany()
  await closeTestApp()
})

const PDF_BUFFER = Buffer.from('%PDF-1.7\n1 0 obj<<>>endobj\n%%EOF\n')
const texto = (n: number) => 'a'.repeat(n)
const DESCRICAO_VALIDA = texto(50)

async function membroComOrg() {
  const user = await createUserAndLogin('membro@test.com', 'INSTITUTIONALIZED')
  const org = await prisma.organization.create({
    data: { name: 'Org de Teste', createdById: user.userId },
  })
  await prisma.organizationMember.create({
    data: { organizationId: org.id, userId: user.userId, role: 'MEMBER' },
  })
  return { user, org }
}

async function uploadOrg(
  app: FastifyInstance,
  token: string,
  orgId: string,
  { title = 'Material da Org', description = DESCRICAO_VALIDA }: {
    title?: string | null
    description?: string | null
  } = {},
) {
  const form = new FormData()
  form.append('file', PDF_BUFFER, { filename: 'org.pdf', contentType: 'application/pdf' })
  if (title !== null) form.append('title', title)
  if (description !== null) form.append('description', description)

  return app.inject({
    method:  'POST',
    url:     `/organizations/${orgId}/mis`,
    headers: { ...form.getHeaders(), authorization: `Bearer ${token}` },
    payload: form.getBuffer(),
  })
}

describe('POST /organizations/:orgId/mis — mesma regra da rota direta', () => {
  it('aceita descrição válida e a persiste', async () => {
    const app = await getTestApp()
    const { user, org } = await membroComOrg()

    const res = await uploadOrg(app, user.accessToken, org.id)

    expect(res.statusCode).toBe(201)
    expect(res.json().description).toBe(DESCRICAO_VALIDA)
  })

  it('recusa com 422 quando a descrição está ausente', async () => {
    const app = await getTestApp()
    const { user, org } = await membroComOrg()

    const res = await uploadOrg(app, user.accessToken, org.id, { description: null })

    expect(res.statusCode).toBe(422)
  })

  it('recusa com 422 com 49 caracteres', async () => {
    const app = await getTestApp()
    const { user, org } = await membroComOrg()

    const res = await uploadOrg(app, user.accessToken, org.id, { description: texto(49) })

    expect(res.statusCode).toBe(422)
  })

  it('aceita com exatamente 50 e com exatamente 2000 — limites inclusivos', async () => {
    const app = await getTestApp()
    const { user, org } = await membroComOrg()

    const minimo = await uploadOrg(app, user.accessToken, org.id, { description: texto(50) })
    const maximo = await uploadOrg(app, user.accessToken, org.id, { description: texto(2000) })

    expect(minimo.statusCode).toBe(201)
    expect(maximo.statusCode).toBe(201)
  })

  it('recusa com 422 com 2001 caracteres', async () => {
    const app = await getTestApp()
    const { user, org } = await membroComOrg()

    const res = await uploadOrg(app, user.accessToken, org.id, { description: texto(2001) })

    expect(res.statusCode).toBe(422)
  })

  it('recusa com 422 descrição só de espaços', async () => {
    const app = await getTestApp()
    const { user, org } = await membroComOrg()

    const res = await uploadOrg(app, user.accessToken, org.id, { description: '        \n     ' })

    expect(res.statusCode).toBe(422)
  })

  it('recusa com 422 quando o título está ausente', async () => {
    const app = await getTestApp()
    const { user, org } = await membroComOrg()

    const res = await uploadOrg(app, user.accessToken, org.id, { title: null })

    expect(res.statusCode).toBe(422)
  })

  it('na recusa, NENHUM material é criado', async () => {
    const app = await getTestApp()
    const { user, org } = await membroComOrg()

    const antes = await prisma.materialInstrucional.count()
    await uploadOrg(app, user.accessToken, org.id, { description: null })
    const depois = await prisma.materialInstrucional.count()

    expect(depois).toBe(antes)
  })
})
