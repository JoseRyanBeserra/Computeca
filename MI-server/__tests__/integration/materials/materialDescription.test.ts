// __tests__/integration/materials/materialDescription.test.ts
// FR-004, FR-006, FR-008, FR-009 e FR-011 — a descrição e o título no cadastro,
// e a convivência com o acervo anterior à exigência.
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import FormData from 'form-data'
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

const PDF_BUFFER = Buffer.from('%PDF-1.7\n1 0 obj<<>>endobj\n%%EOF\n')
const texto = (n: number) => 'a'.repeat(n)
const DESCRICAO_VALIDA = texto(50)

interface CamposUpload {
  title?:       string | null
  description?: string | null
}

/** Envia pela rota direta. `null` omite o campo do formulário. */
async function upload(
  app: FastifyInstance,
  token: string,
  { title = 'Guia de Geometria', description = DESCRICAO_VALIDA }: CamposUpload = {},
) {
  const form = new FormData()
  form.append('file', PDF_BUFFER, { filename: 'material.pdf', contentType: 'application/pdf' })
  if (title !== null) form.append('title', title)
  if (description !== null) form.append('description', description)

  return app.inject({
    method:  'POST',
    url:     '/mis',
    headers: { ...form.getHeaders(), authorization: `Bearer ${token}` },
    payload: form.getBuffer(),
  })
}

async function autor() {
  return createUserAndLogin('autor@test.com', 'INSTITUTIONALIZED')
}

// ── US2: exigência no cadastro direto ─────────────────────────────────────────

describe('POST /mis — descrição obrigatória', () => {
  it('aceita descrição válida e a persiste', async () => {
    const app = await getTestApp()
    const user = await autor()

    const res = await upload(app, user.accessToken)

    expect(res.statusCode).toBe(201)
    expect(res.json().description).toBe(DESCRICAO_VALIDA)
  })

  it('recusa com 422 quando a descrição está ausente', async () => {
    const app = await getTestApp()
    const user = await autor()

    const res = await upload(app, user.accessToken, { description: null })

    expect(res.statusCode).toBe(422)
  })

  it('recusa com 422 com 49 caracteres', async () => {
    const app = await getTestApp()
    const user = await autor()

    const res = await upload(app, user.accessToken, { description: texto(49) })

    expect(res.statusCode).toBe(422)
  })

  it('aceita com exatamente 50 caracteres — limite inclusivo', async () => {
    const app = await getTestApp()
    const user = await autor()

    const res = await upload(app, user.accessToken, { description: texto(50) })

    expect(res.statusCode).toBe(201)
  })

  it('aceita com exatamente 2000 caracteres — limite inclusivo', async () => {
    const app = await getTestApp()
    const user = await autor()

    const res = await upload(app, user.accessToken, { description: texto(2000) })

    expect(res.statusCode).toBe(201)
  })

  it('recusa com 422 com 2001 caracteres', async () => {
    const app = await getTestApp()
    const user = await autor()

    const res = await upload(app, user.accessToken, { description: texto(2001) })

    expect(res.statusCode).toBe(422)
  })

  it('recusa com 422 descrição composta só de espaços', async () => {
    const app = await getTestApp()
    const user = await autor()

    const res = await upload(app, user.accessToken, { description: '          \n\n         ' })

    expect(res.statusCode).toBe(422)
  })

  it('persiste a descrição sem os espaços das extremidades', async () => {
    const app = await getTestApp()
    const user = await autor()

    const res = await upload(app, user.accessToken, { description: `   ${DESCRICAO_VALIDA}   ` })

    expect(res.statusCode).toBe(201)
    expect(res.json().description).toBe(DESCRICAO_VALIDA)
  })

  it('na recusa, NENHUM material é criado', async () => {
    const app = await getTestApp()
    const user = await autor()

    const antes = await prisma.materialInstrucional.count()
    await upload(app, user.accessToken, { description: null })
    const depois = await prisma.materialInstrucional.count()

    expect(depois).toBe(antes)
  })
})

// ── FR-011: título obrigatório ────────────────────────────────────────────────

describe('POST /mis — título obrigatório', () => {
  it('recusa com 422 quando o título está ausente — sem fallback para o nome do arquivo', async () => {
    const app = await getTestApp()
    const user = await autor()

    const res = await upload(app, user.accessToken, { title: null })

    expect(res.statusCode).toBe(422)
  })

  it('recusa com 422 título só de espaços', async () => {
    const app = await getTestApp()
    const user = await autor()

    const res = await upload(app, user.accessToken, { title: '     ' })

    expect(res.statusCode).toBe(422)
  })

  it('recusa com 422 título com 256 caracteres', async () => {
    const app = await getTestApp()
    const user = await autor()

    const res = await upload(app, user.accessToken, { title: texto(256) })

    expect(res.statusCode).toBe(422)
  })
})

// ── US1: consulta ─────────────────────────────────────────────────────────────

describe('GET /mis/:id — descrição na consulta', () => {
  it('devolve a descrição do material que a possui', async () => {
    const app = await getTestApp()
    const user = await autor()

    const criado = await upload(app, user.accessToken)
    const materialId = criado.json().id

    const res = await app.inject({
      method:  'GET',
      url:     `/mis/${materialId}`,
      headers: { authorization: `Bearer ${user.accessToken}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().description).toBe(DESCRICAO_VALIDA)
  })

  it('devolve null para material anterior à exigência, sem erro (FR-009)', async () => {
    const app = await getTestApp()
    const user = await autor()
    // `createMaterial` grava direto no banco, como os 14 materiais que já
    // existiam antes desta feature.
    const antigo = await createMaterial({ uploadedById: user.userId, status: 'APPROVED' })

    const res = await app.inject({
      method:  'GET',
      url:     `/mis/${antigo.id}`,
      headers: { authorization: `Bearer ${user.accessToken}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().description).toBeNull()
  })
})
