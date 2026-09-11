// __tests__/integration/materials/materialEditAudit.test.ts
// US3 — o rastro da alteração.
//
// Num acervo cujos metadados passaram a ser mutáveis, este registro é a única
// forma de responder "quem mudou isso, quando, e o que estava escrito antes?".
// Para os metadados ele é rede de proteção de verdade — o valor anterior está
// ali. Para o documento, não: o arquivo substituído foi apagado.
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import FormData from 'form-data'
import type { FastifyInstance } from 'fastify'
import { getTestApp, closeTestApp } from '../../helpers/request'
import { createUserAndLogin, createMaterial, cleanMaterialsDb } from '../../helpers/materials'
import { prisma } from '../../../src/database/prisma'
import { minioClient, MINIO_BUCKET } from '../../../src/lib/minio'

const PDF_BUFFER = Buffer.from('%PDF-1.7\n1 0 obj<<>>endobj\n%%EOF\n')
const PDF_NOVO   = Buffer.from('%PDF-1.7\n2 0 obj<<>>endobj\n%%EOF\n')
const texto = (n: number) => 'a'.repeat(n)
const DESCRICAO = texto(60)

beforeAll(async () => {
  const exists = await minioClient.bucketExists(MINIO_BUCKET)
  if (!exists) await minioClient.makeBucket(MINIO_BUCKET)
})

beforeEach(async () => {
  await cleanMaterialsDb()
  await prisma.auditLog.deleteMany()
})

afterAll(async () => {
  await cleanMaterialsDb()
  await prisma.auditLog.deleteMany()
  await closeTestApp()
})

async function edit(
  app: FastifyInstance,
  materialId: string,
  token: string,
  {
    title = 'Título editado',
    description = DESCRICAO,
    habilidades,
    arquivo,
  }: {
    title?: string
    description?: string
    habilidades?: string[]
    arquivo?: Buffer
  } = {},
) {
  const form = new FormData()
  form.append('title', title)
  form.append('description', description)
  for (const h of habilidades ?? []) form.append('habilidadesBncc', h)
  if (arquivo) {
    form.append('file', arquivo, { filename: 'novo.pdf', contentType: 'application/pdf' })
  }

  return app.inject({
    method:  'PUT',
    url:     `/mis/${materialId}`,
    headers: { ...form.getHeaders(), authorization: `Bearer ${token}` },
    payload: form.getBuffer(),
  })
}

async function registros() {
  return prisma.auditLog.findMany({ where: { action: 'MI_UPDATED' } })
}

describe('PUT /mis/:id — registro de auditoria (US3)', () => {
  it('grava MI_UPDATED com autor, material e campos alterados (FR-016)', async () => {
    const app = await getTestApp()
    const a = await createUserAndLogin('admin@audit.com', 'ADMIN')
    // Mesma descrição que a edição enviará: assim o diff isola a alteração
    // do título, que é o que este caso verifica.
    const material = await createMaterial({
      uploadedById: a.userId,
      title:        'Título antigo',
      description:  DESCRICAO,
    })

    await edit(app, material.id, a.accessToken, { title: 'Título novo' })

    const logs = await registros()
    expect(logs).toHaveLength(1)
    expect(logs[0].actorId).toBe(a.userId)
    expect(logs[0].actorRole).toBe('ADMIN')
    expect(logs[0].targetId).toBe(material.id)

    const meta = logs[0].metadata as Record<string, unknown>
    expect(meta.changed).toEqual(['title'])
    expect(meta.title).toEqual({ from: 'Título antigo', to: 'Título novo' })
  })

  it('guarda a descrição anterior POR INTEIRO, não truncada', async () => {
    const app = await getTestApp()
    const a = await createUserAndLogin('admin2@audit.com', 'ADMIN')
    const anterior = texto(2000)
    const material = await createMaterial({ uploadedById: a.userId, description: anterior })

    await edit(app, material.id, a.accessToken, {
      title:       material.title,
      description: texto(80),
    })

    const [log] = await registros()
    const meta = log.metadata as Record<string, { from: string; to: string }>
    // É este valor que permite reconstruir o que existia antes da edição.
    expect(meta.description.from).toHaveLength(2000)
    expect(meta.description.from).toBe(anterior)
  })

  it('registra a troca de documento identificando o arquivo anterior e a transição', async () => {
    const app = await getTestApp()
    const a = await createUserAndLogin('admin3@audit.com', 'ADMIN')
    const material = await createMaterial({ uploadedById: a.userId, status: 'APPROVED' })
    await minioClient.putObject(
      MINIO_BUCKET, material.storageKey, PDF_BUFFER, PDF_BUFFER.length,
      { 'Content-Type': 'application/pdf' },
    )

    await edit(app, material.id, a.accessToken, {
      title:   material.title,
      arquivo: PDF_NOVO,
    })

    const [log] = await registros()
    const meta = log.metadata as Record<string, unknown>
    expect(meta.changed).toContain('file')
    expect(meta.changed).toContain('status')

    const file = meta.file as { from: { storageKey: string; originalFileName: string } }
    expect(file.from.storageKey).toBe(material.storageKey)
    expect(file.from.originalFileName).toBe(material.originalFileName)

    expect(meta.status).toEqual({ from: 'APPROVED', to: 'PENDING_REVIEW' })
  })

  it('edição que NÃO altera nada não grava registro algum (FR-017)', async () => {
    const app = await getTestApp()
    const a = await createUserAndLogin('admin4@audit.com', 'ADMIN')
    const material = await createMaterial({
      uploadedById:    a.userId,
      title:           'Mesmo título',
      description:     DESCRICAO,
      habilidadesBncc: [],
    })

    const res = await edit(app, material.id, a.accessToken, {
      title:       'Mesmo título',
      description: DESCRICAO,
    })

    expect(res.statusCode).toBe(200)
    expect(await registros()).toHaveLength(0)
  })

  it('recusa por perfil não autorizado não grava registro (FR-018)', async () => {
    const app = await getTestApp()
    const prof = await createUserAndLogin('prof@audit.com', 'PROFESSOR')
    const material = await createMaterial({ uploadedById: prof.userId })

    const res = await edit(app, material.id, prof.accessToken, { title: 'Tentativa' })

    expect(res.statusCode).toBe(403)
    expect(await registros()).toHaveLength(0)
  })

  it('recusa por validação não grava registro (FR-018)', async () => {
    const app = await getTestApp()
    const a = await createUserAndLogin('admin5@audit.com', 'ADMIN')
    const material = await createMaterial({ uploadedById: a.userId })

    const res = await edit(app, material.id, a.accessToken, { description: texto(10) })

    expect(res.statusCode).toBe(422)
    expect(await registros()).toHaveLength(0)
  })

  it('material inexistente não grava registro', async () => {
    const app = await getTestApp()
    const a = await createUserAndLogin('admin6@audit.com', 'ADMIN')

    const res = await edit(app, '11111111-1111-4111-8111-111111111111', a.accessToken)

    expect(res.statusCode).toBe(404)
    expect(await registros()).toHaveLength(0)
  })

  it('duas edições produzem dois registros, cada um com o seu diff', async () => {
    const app = await getTestApp()
    const a = await createUserAndLogin('admin7@audit.com', 'ADMIN')
    const material = await createMaterial({ uploadedById: a.userId, title: 'T0', description: DESCRICAO })

    await edit(app, material.id, a.accessToken, { title: 'T1' })
    await edit(app, material.id, a.accessToken, { title: 'T2' })

    const logs = await prisma.auditLog.findMany({
      where:   { action: 'MI_UPDATED' },
      orderBy: { createdAt: 'asc' },
    })
    expect(logs).toHaveLength(2)
    expect((logs[0].metadata as Record<string, unknown>).title).toEqual({ from: 'T0', to: 'T1' })
    expect((logs[1].metadata as Record<string, unknown>).title).toEqual({ from: 'T1', to: 'T2' })
  })
})
