// __tests__/integration/materials/materialEditLinks.test.ts
// Feature 004 + 005 — links relacionados na edição (`PUT /mis/:id`).
//
// A edição usa o MESMO `relatedLinksSchema` do cadastro: esquema perigoso não
// pode entrar pela porta da edição. E, como os demais metadados, a lista enviada
// é o conjunto completo — ausente ou vazia remove todos os links.
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import FormData from 'form-data'
import type { FastifyInstance } from 'fastify'
import { getTestApp, closeTestApp } from '../../helpers/request'
import { createUserAndLogin, createMaterial, cleanMaterialsDb } from '../../helpers/materials'
import { prisma } from '../../../src/database/prisma'

beforeEach(cleanMaterialsDb)

afterAll(async () => {
  await cleanMaterialsDb()
  await closeTestApp()
})

const DESCRICAO_VALIDA = 'a'.repeat(60)
const VIDEOAULA = { label: 'Videoaula', url: 'https://exemplo.org/aula' }
const ARTIGO    = { label: 'Artigo',    url: 'https://exemplo.org/artigo' }

async function edit(app: FastifyInstance, materialId: string, token: string, relatedLinks?: unknown) {
  const form = new FormData()
  form.append('title', 'Material de Teste')
  form.append('description', DESCRICAO_VALIDA)
  if (relatedLinks !== undefined) form.append('relatedLinks', JSON.stringify(relatedLinks))

  return app.inject({
    method:  'PUT',
    url:     `/mis/${materialId}`,
    headers: { ...form.getHeaders(), authorization: `Bearer ${token}` },
    payload: form.getBuffer(),
  })
}

async function materialComLinks(uploadedById: string, relatedLinks: unknown[]) {
  const material = await createMaterial({ uploadedById, description: DESCRICAO_VALIDA })
  await prisma.materialInstrucional.update({ where: { id: material.id }, data: { relatedLinks } })
  return material
}

describe('PUT /mis/:id — links relacionados', () => {
  it('acrescenta links a material que não tinha nenhum', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin@links.com', 'ADMIN')
    const material = await createMaterial({ uploadedById: admin.userId, description: DESCRICAO_VALIDA })

    const res = await edit(app, material.id, admin.accessToken, [VIDEOAULA, ARTIGO])

    expect(res.statusCode).toBe(200)
    expect(res.json().relatedLinks).toEqual([VIDEOAULA, ARTIGO])
    const depois = await prisma.materialInstrucional.findUniqueOrThrow({ where: { id: material.id } })
    expect(depois.relatedLinks).toEqual([VIDEOAULA, ARTIGO])
  })

  it('lista vazia remove todos os links', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin@links.com', 'ADMIN')
    const material = await materialComLinks(admin.userId, [VIDEOAULA])

    const res = await edit(app, material.id, admin.accessToken, [])

    expect(res.statusCode).toBe(200)
    const depois = await prisma.materialInstrucional.findUniqueOrThrow({ where: { id: material.id } })
    expect(depois.relatedLinks).toEqual([])
  })

  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    'ftp://exemplo.org/arquivo',
  ])('recusa %s com 422 e mantém os links atuais', async (url) => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin@links.com', 'ADMIN')
    const material = await materialComLinks(admin.userId, [VIDEOAULA])

    const res = await edit(app, material.id, admin.accessToken, [{ label: 'Videoaula', url }])

    expect(res.statusCode).toBe(422)
    const depois = await prisma.materialInstrucional.findUniqueOrThrow({ where: { id: material.id } })
    expect(depois.relatedLinks).toEqual([VIDEOAULA])
  })

  it('11 links → 422', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin@links.com', 'ADMIN')
    const material = await createMaterial({ uploadedById: admin.userId, description: DESCRICAO_VALIDA })
    const onze = Array.from({ length: 11 }, (_, i) => ({ label: `L${i}`, url: `https://exemplo.org/${i}` }))

    const res = await edit(app, material.id, admin.accessToken, onze)

    expect(res.statusCode).toBe(422)
  })

  it('a alteração dos links fica no rastro de auditoria, com valor anterior e novo', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin@links.com', 'ADMIN')
    const material = await materialComLinks(admin.userId, [VIDEOAULA])

    const res = await edit(app, material.id, admin.accessToken, [VIDEOAULA, ARTIGO])
    expect(res.statusCode).toBe(200)

    const logs = await prisma.auditLog.findMany({ where: { targetId: material.id, action: 'MI_UPDATED' } })
    expect(logs).toHaveLength(1)
    const meta = logs[0].metadata as Record<string, unknown>
    expect(meta.changed).toEqual(['relatedLinks'])
    expect(meta.relatedLinks).toEqual({ from: [VIDEOAULA], to: [VIDEOAULA, ARTIGO] })
  })

  it('salvar com os mesmos links não gera registro de auditoria', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin@links.com', 'ADMIN')
    const material = await materialComLinks(admin.userId, [VIDEOAULA])

    const res = await edit(app, material.id, admin.accessToken, [VIDEOAULA])

    expect(res.statusCode).toBe(200)
    expect(await prisma.auditLog.count({ where: { targetId: material.id } })).toBe(0)
  })
})
