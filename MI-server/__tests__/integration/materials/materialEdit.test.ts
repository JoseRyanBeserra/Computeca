// __tests__/integration/materials/materialEdit.test.ts
// US1 — edição dos metadados de um material já publicado.
//
// As regras aqui são LITERALMENTE as do cadastro: o schema importa os mesmos
// `titleSchema` e `descriptionSchema`. Se estes testes divergirem dos de
// `materialDescription.test.ts`, é sinal de que alguém duplicou a regra.
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import FormData from 'form-data'
import type { FastifyInstance } from 'fastify'
import { getTestApp, closeTestApp } from '../../helpers/request'
import { createUserAndLogin, createMaterial, cleanMaterialsDb } from '../../helpers/materials'
import { prisma } from '../../../src/database/prisma'

const texto = (n: number) => 'a'.repeat(n)
const DESCRICAO_VALIDA = texto(60)

beforeEach(async () => {
  await cleanMaterialsDb()
})

afterAll(async () => {
  await cleanMaterialsDb()
  await closeTestApp()
})

async function edit(
  app: FastifyInstance,
  materialId: string,
  token: string,
  {
    title = 'Título editado',
    description = DESCRICAO_VALIDA,
    habilidades,
  }: { title?: string | null; description?: string | null; habilidades?: string[] } = {},
) {
  const form = new FormData()
  if (title !== null) form.append('title', title)
  if (description !== null) form.append('description', description)
  for (const h of habilidades ?? []) form.append('habilidadesBncc', h)

  return app.inject({
    method:  'PUT',
    url:     `/mis/${materialId}`,
    headers: { ...form.getHeaders(), authorization: `Bearer ${token}` },
    payload: form.getBuffer(),
  })
}

async function admin(email = 'admin@edit.com') {
  return createUserAndLogin(email, 'ADMIN')
}

describe('PUT /mis/:id — metadados (US1)', () => {
  it('altera título, descrição e habilidades', async () => {
    const app = await getTestApp()
    const a = await admin()
    const material = await createMaterial({
      uploadedById:    a.userId,
      title:           'Título antigo',
      habilidadesBncc: ['EF06CO01'],
    })

    const res = await edit(app, material.id, a.accessToken, {
      title:       'Título novo',
      description: texto(120),
      habilidades: ['EF06CO01', 'EF06CO02'],
    })

    expect(res.statusCode).toBe(200)

    const depois = await prisma.materialInstrucional.findUniqueOrThrow({
      where: { id: material.id },
    })
    expect(depois.title).toBe('Título novo')
    expect(depois.description).toBe(texto(120))
    expect(depois.habilidadesBncc).toEqual(['EF06CO01', 'EF06CO02'])
  })

  it('material sem descrição recebe uma válida (FR-005, SC-006)', async () => {
    const app = await getTestApp()
    const a = await admin()
    // `null` reproduz o acervo anterior à exigência de descrição.
    const material = await createMaterial({ uploadedById: a.userId, description: null })

    const res = await edit(app, material.id, a.accessToken, { description: texto(80) })

    expect(res.statusCode).toBe(200)
    const depois = await prisma.materialInstrucional.findUniqueOrThrow({
      where: { id: material.id },
    })
    expect(depois.description).toBe(texto(80))
  })

  it('recusa título vazio, só espaços, ou acima de 255', async () => {
    const app = await getTestApp()
    const a = await admin()
    const material = await createMaterial({ uploadedById: a.userId })

    const vazio    = await edit(app, material.id, a.accessToken, { title: '' })
    const espacos  = await edit(app, material.id, a.accessToken, { title: '     ' })
    const ausente  = await edit(app, material.id, a.accessToken, { title: null })
    const longo    = await edit(app, material.id, a.accessToken, { title: texto(256) })

    expect(vazio.statusCode).toBe(422)
    expect(espacos.statusCode).toBe(422)
    expect(ausente.statusCode).toBe(422)
    expect(longo.statusCode).toBe(422)
  })

  it('aceita título com exatamente 255 — limite inclusivo', async () => {
    const app = await getTestApp()
    const a = await admin()
    const material = await createMaterial({ uploadedById: a.userId })

    const res = await edit(app, material.id, a.accessToken, { title: texto(255) })

    expect(res.statusCode).toBe(200)
  })

  it('recusa descrição ausente, com 49 caracteres, ou com 2001', async () => {
    const app = await getTestApp()
    const a = await admin()
    const material = await createMaterial({ uploadedById: a.userId })

    const ausente = await edit(app, material.id, a.accessToken, { description: null })
    const curta   = await edit(app, material.id, a.accessToken, { description: texto(49) })
    const longa   = await edit(app, material.id, a.accessToken, { description: texto(2001) })
    const espacos = await edit(app, material.id, a.accessToken, { description: '        \n     ' })

    expect(ausente.statusCode).toBe(422)
    expect(curta.statusCode).toBe(422)
    expect(longa.statusCode).toBe(422)
    expect(espacos.statusCode).toBe(422)
  })

  it('aceita descrição com exatamente 50 e com exatamente 2000 — limites inclusivos', async () => {
    const app = await getTestApp()
    const a = await admin()
    const material = await createMaterial({ uploadedById: a.userId })

    const minimo = await edit(app, material.id, a.accessToken, { description: texto(50) })
    const maximo = await edit(app, material.id, a.accessToken, { description: texto(2000) })

    expect(minimo.statusCode).toBe(200)
    expect(maximo.statusCode).toBe(200)
  })

  it('persiste os valores já aparados', async () => {
    const app = await getTestApp()
    const a = await admin()
    const material = await createMaterial({ uploadedById: a.userId })

    await edit(app, material.id, a.accessToken, {
      title:       '   Título com espaços   ',
      description: `   ${texto(60)}   `,
    })

    const depois = await prisma.materialInstrucional.findUniqueOrThrow({
      where: { id: material.id },
    })
    expect(depois.title).toBe('Título com espaços')
    expect(depois.description).toBe(texto(60))
  })

  it('edição só de metadados NÃO altera a situação nem o documento (FR-006)', async () => {
    const app = await getTestApp()
    const a = await admin()
    const material = await createMaterial({ uploadedById: a.userId, status: 'APPROVED' })

    const res = await edit(app, material.id, a.accessToken, { title: 'Outro título' })

    expect(res.statusCode).toBe(200)
    const depois = await prisma.materialInstrucional.findUniqueOrThrow({
      where: { id: material.id },
    })
    // A aprovação foi concedida a este documento, e o documento não mudou.
    expect(depois.status).toBe('APPROVED')
    expect(depois.storageKey).toBe(material.storageKey)
    expect(depois.originalFileName).toBe(material.originalFileName)
  })

  it('recusa por validação não altera nada', async () => {
    const app = await getTestApp()
    const a = await admin()
    const material = await createMaterial({ uploadedById: a.userId, title: 'Intacto' })

    await edit(app, material.id, a.accessToken, {
      title:       'Tentativa',
      description: texto(10),
    })

    const depois = await prisma.materialInstrucional.findUniqueOrThrow({
      where: { id: material.id },
    })
    expect(depois.title).toBe('Intacto')
  })
})
