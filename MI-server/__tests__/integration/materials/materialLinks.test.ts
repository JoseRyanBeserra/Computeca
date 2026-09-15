// __tests__/integration/materials/materialLinks.test.ts
// Feature 004 — links relacionados no cadastro direto (`POST /mis`) e na
// consulta (`GET /mis/:id`).
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
const DESCRICAO_VALIDA = 'a'.repeat(50)

const VIDEOAULA = { label: 'Videoaula', url: 'https://exemplo.org/aula' }
const PLANILHA  = { label: 'Planilha',  url: 'https://exemplo.org/planilha.xlsx' }

const links = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ label: `Link ${i + 1}`, url: `https://exemplo.org/${i + 1}` }))

/**
 * Envia pela rota direta. `relatedLinks` ausente omite o campo; string é
 * enviada crua, para simular JSON malformado.
 */
async function upload(app: FastifyInstance, token: string, relatedLinks?: unknown) {
  const form = new FormData()
  form.append('file', PDF_BUFFER, { filename: 'material.pdf', contentType: 'application/pdf' })
  form.append('title', 'Guia de Geometria')
  form.append('description', DESCRICAO_VALIDA)
  if (relatedLinks !== undefined) {
    form.append('relatedLinks', typeof relatedLinks === 'string' ? relatedLinks : JSON.stringify(relatedLinks))
  }

  return app.inject({
    method:  'POST',
    url:     '/mis',
    headers: { ...form.getHeaders(), authorization: `Bearer ${token}` },
    payload: form.getBuffer(),
  })
}

async function autor() {
  return createUserAndLogin('autor@links.com', 'INSTITUTIONALIZED')
}

// ── US1: consulta ─────────────────────────────────────────────────────────────

describe('GET /mis/:id — relatedLinks na resposta', () => {
  it('devolve os links de um material que os possui', async () => {
    const app = await getTestApp()
    const user = await autor()
    const criado = await upload(app, user.accessToken, [VIDEOAULA, PLANILHA])
    expect(criado.statusCode).toBe(201)

    const res = await app.inject({
      method:  'GET',
      url:     `/mis/${criado.json().id}`,
      headers: { authorization: `Bearer ${user.accessToken}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().relatedLinks).toEqual([VIDEOAULA, PLANILHA])
  })

  it('devolve [] — nunca null — para material sem links, inclusive o anterior à feature', async () => {
    const app = await getTestApp()
    const user = await autor()
    // Inserido direto no banco, sem informar a coluna: vale o padrão da migração.
    const material = await createMaterial({ uploadedById: user.userId })

    const res = await app.inject({
      method:  'GET',
      url:     `/mis/${material.id}`,
      headers: { authorization: `Bearer ${user.accessToken}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().relatedLinks).toEqual([])
  })

  it('conteúdo fora do formato no banco degrada para [] em vez de derrubar a tela', async () => {
    const app = await getTestApp()
    const user = await autor()
    const material = await createMaterial({ uploadedById: user.userId })
    await prisma.materialInstrucional.update({
      where: { id: material.id },
      data:  { relatedLinks: [{ label: 'Perigo', url: 'javascript:alert(1)' }] },
    })

    const res = await app.inject({
      method:  'GET',
      url:     `/mis/${material.id}`,
      headers: { authorization: `Bearer ${user.accessToken}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().relatedLinks).toEqual([])
  })
})

// ── US2: cadastro ─────────────────────────────────────────────────────────────

describe('POST /mis — links são opcionais', () => {
  it('sem o campo → 201 com []', async () => {
    const app = await getTestApp()
    const user = await autor()

    const res = await upload(app, user.accessToken)

    expect(res.statusCode).toBe(201)
    expect(res.json().relatedLinks).toEqual([])
  })

  it('lista vazia → 201', async () => {
    const app = await getTestApp()
    const user = await autor()

    const res = await upload(app, user.accessToken, [])

    expect(res.statusCode).toBe(201)
    expect(res.json().relatedLinks).toEqual([])
  })

  it('lista válida → 201, persistida na ordem informada', async () => {
    const app = await getTestApp()
    const user = await autor()

    const res = await upload(app, user.accessToken, [PLANILHA, VIDEOAULA])

    expect(res.statusCode).toBe(201)
    const gravado = await prisma.materialInstrucional.findUniqueOrThrow({ where: { id: res.json().id } })
    expect(gravado.relatedLinks).toEqual([PLANILHA, VIDEOAULA])
  })

  it('rótulo e endereço cercados de espaços são gravados já aparados', async () => {
    const app = await getTestApp()
    const user = await autor()

    const res = await upload(app, user.accessToken, [
      { label: '  Videoaula  ', url: '  https://exemplo.org/aula  ' },
    ])

    expect(res.statusCode).toBe(201)
    expect(res.json().relatedLinks).toEqual([VIDEOAULA])
  })

  it('JSON malformado é tratado como lista vazia — a requisição não cai', async () => {
    const app = await getTestApp()
    const user = await autor()

    const res = await upload(app, user.accessToken, '[{"label": "Videoaula", ')

    expect(res.statusCode).toBe(201)
    expect(res.json().relatedLinks).toEqual([])
  })
})

describe('POST /mis — recusa por quantidade e rótulo', () => {
  it('exatamente 10 links → 201 — limite inclusivo', async () => {
    const app = await getTestApp()
    const user = await autor()

    const res = await upload(app, user.accessToken, links(10))

    expect(res.statusCode).toBe(201)
    expect(res.json().relatedLinks).toHaveLength(10)
  })

  it('11 links → 422', async () => {
    const app = await getTestApp()
    const user = await autor()

    const res = await upload(app, user.accessToken, links(11))

    expect(res.statusCode).toBe(422)
  })

  it('rótulo vazio → 422', async () => {
    const app = await getTestApp()
    const user = await autor()

    const res = await upload(app, user.accessToken, [{ label: '   ', url: VIDEOAULA.url }])

    expect(res.statusCode).toBe(422)
  })

  it('rótulo ausente → 422', async () => {
    const app = await getTestApp()
    const user = await autor()

    const res = await upload(app, user.accessToken, [{ url: VIDEOAULA.url }])

    expect(res.statusCode).toBe(422)
  })

  it('rótulo com exatamente 60 caracteres → 201 — limite inclusivo', async () => {
    const app = await getTestApp()
    const user = await autor()

    const res = await upload(app, user.accessToken, [{ label: 'r'.repeat(60), url: VIDEOAULA.url }])

    expect(res.statusCode).toBe(201)
  })

  it('rótulo com 61 caracteres → 422', async () => {
    const app = await getTestApp()
    const user = await autor()

    const res = await upload(app, user.accessToken, [{ label: 'r'.repeat(61), url: VIDEOAULA.url }])

    expect(res.statusCode).toBe(422)
  })

  it('endereço repetido no mesmo material é aceito — decisão registrada', async () => {
    const app = await getTestApp()
    const user = await autor()

    const res = await upload(app, user.accessToken, [
      { label: 'Aula (parte 1)', url: VIDEOAULA.url },
      { label: 'Aula (parte 2)', url: VIDEOAULA.url },
    ])

    expect(res.statusCode).toBe(201)
    expect(res.json().relatedLinks).toHaveLength(2)
  })
})

// ── US3: ninguém é levado a um destino perigoso ───────────────────────────────

describe('POST /mis — esquemas perigosos', () => {
  it('endereço malformado → 422', async () => {
    const app = await getTestApp()
    const user = await autor()

    const res = await upload(app, user.accessToken, [{ label: 'Site', url: 'exemplo.org' }])

    expect(res.statusCode).toBe(422)
  })

  // O grupo que `z.string().url()` sozinho aceitaria — é o teste que prova a US3.
  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    'ftp://exemplo.org/arquivo',
  ])('recusa %s com 422', async (url) => {
    const app = await getTestApp()
    const user = await autor()

    const res = await upload(app, user.accessToken, [{ label: 'Videoaula', url }])

    expect(res.statusCode).toBe(422)
  })

  it('na recusa por link inválido, NENHUM material é criado', async () => {
    const app = await getTestApp()
    const user = await autor()

    const antes = await prisma.materialInstrucional.count()
    await upload(app, user.accessToken, [VIDEOAULA, { label: 'Perigo', url: 'javascript:alert(1)' }])
    const depois = await prisma.materialInstrucional.count()

    expect(depois).toBe(antes)
  })
})
