// __tests__/integration/materials/materialEditFile.test.ts
// US2 — substituição do documento de um material.
//
// Esta é a parte irreversível da feature. O que estes testes protegem não é o
// caminho feliz: é a ordem das operações. Chave nova em vez de sobrescrita, e
// remoção do antigo somente depois de o registro já apontar para o substituto.
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import FormData from 'form-data'
import type { FastifyInstance } from 'fastify'
import { getTestApp, closeTestApp } from '../../helpers/request'
import { createUserAndLogin, createMaterial, cleanMaterialsDb } from '../../helpers/materials'
import { prisma } from '../../../src/database/prisma'
import { minioClient, MINIO_BUCKET } from '../../../src/lib/minio'

const PDF_BUFFER = Buffer.from('%PDF-1.7\n1 0 obj<<>>endobj\n%%EOF\n')
const PDF_NOVO   = Buffer.from('%PDF-1.7\n2 0 obj<<>>endobj\n% versao nova\n%%EOF\n')
const DESCRICAO  = 'd'.repeat(60)

beforeAll(async () => {
  const exists = await minioClient.bucketExists(MINIO_BUCKET)
  if (!exists) await minioClient.makeBucket(MINIO_BUCKET)
})

beforeEach(async () => {
  await cleanMaterialsDb()
})

afterAll(async () => {
  await cleanMaterialsDb()
  await closeTestApp()
})

/** Cria o material COM o objeto correspondente no armazenamento. */
async function materialComArquivo(uploadedById: string, status: 'APPROVED' | 'PENDING_REVIEW' | 'REJECTED' = 'APPROVED') {
  const material = await createMaterial({ uploadedById, status })
  await minioClient.putObject(
    MINIO_BUCKET, material.storageKey, PDF_BUFFER, PDF_BUFFER.length,
    { 'Content-Type': 'application/pdf' },
  )
  return material
}

/** true quando o objeto existe no bucket. */
async function objetoExiste(storageKey: string): Promise<boolean> {
  try {
    await minioClient.statObject(MINIO_BUCKET, storageKey)
    return true
  } catch {
    return false
  }
}

async function edit(
  app: FastifyInstance,
  materialId: string,
  token: string,
  arquivo?: { buffer: Buffer; filename?: string; contentType?: string },
) {
  const form = new FormData()
  form.append('title', 'Título editado')
  form.append('description', DESCRICAO)
  if (arquivo) {
    form.append('file', arquivo.buffer, {
      filename:    arquivo.filename ?? 'novo.pdf',
      contentType: arquivo.contentType ?? 'application/pdf',
    })
  }

  return app.inject({
    method:  'PUT',
    url:     `/mis/${materialId}`,
    headers: { ...form.getHeaders(), authorization: `Bearer ${token}` },
    payload: form.getBuffer(),
  })
}

describe('PUT /mis/:id — substituição do documento (US2)', () => {
  it('grava o arquivo novo sob CHAVE NOVA, nunca sobrescrevendo (FR-010)', async () => {
    const app = await getTestApp()
    const a = await createUserAndLogin('admin@file.com', 'ADMIN')
    const material = await materialComArquivo(a.userId)

    const res = await edit(app, material.id, a.accessToken, { buffer: PDF_NOVO })

    expect(res.statusCode).toBe(200)
    const depois = await prisma.materialInstrucional.findUniqueOrThrow({ where: { id: material.id } })

    // Chave igual significaria sobrescrita — o desenho que destrói o original
    // antes de saber se o novo chegou inteiro.
    expect(depois.storageKey).not.toBe(material.storageKey)
    expect(depois.originalFileName).toBe('novo.pdf')
    expect(depois.sizeBytes).toBe(PDF_NOVO.length)
    expect(await objetoExiste(depois.storageKey)).toBe(true)
  })

  it('remove o arquivo anterior do armazenamento (FR-009)', async () => {
    const app = await getTestApp()
    const a = await createUserAndLogin('admin2@file.com', 'ADMIN')
    const material = await materialComArquivo(a.userId)

    expect(await objetoExiste(material.storageKey)).toBe(true)

    await edit(app, material.id, a.accessToken, { buffer: PDF_NOVO })

    expect(await objetoExiste(material.storageKey)).toBe(false)
  })

  it('material APROVADO volta para revisão ao ter o documento trocado (FR-013)', async () => {
    const app = await getTestApp()
    const a = await createUserAndLogin('admin3@file.com', 'ADMIN')
    const material = await materialComArquivo(a.userId, 'APPROVED')

    await edit(app, material.id, a.accessToken, { buffer: PDF_NOVO })

    const depois = await prisma.materialInstrucional.findUniqueOrThrow({ where: { id: material.id } })
    // A aprovação foi concedida a outro documento.
    expect(depois.status).toBe('PENDING_REVIEW')
  })

  it('material que aguarda revisão permanece aguardando', async () => {
    const app = await getTestApp()
    const a = await createUserAndLogin('admin4@file.com', 'ADMIN')
    const material = await materialComArquivo(a.userId, 'PENDING_REVIEW')

    await edit(app, material.id, a.accessToken, { buffer: PDF_NOVO })

    const depois = await prisma.materialInstrucional.findUniqueOrThrow({ where: { id: material.id } })
    expect(depois.status).toBe('PENDING_REVIEW')
  })

  it('material rejeitado permanece rejeitado — não havia aprovação a invalidar', async () => {
    const app = await getTestApp()
    const a = await createUserAndLogin('admin5@file.com', 'ADMIN')
    const material = await materialComArquivo(a.userId, 'REJECTED')

    await edit(app, material.id, a.accessToken, { buffer: PDF_NOVO })

    const depois = await prisma.materialInstrucional.findUniqueOrThrow({ where: { id: material.id } })
    expect(depois.status).toBe('REJECTED')
  })

  it('invalida resumo e vetorização — eles descreviam o documento antigo (FR-014)', async () => {
    const app = await getTestApp()
    const a = await createUserAndLogin('admin6@file.com', 'ADMIN')
    const material = await materialComArquivo(a.userId)

    await prisma.materialInstrucional.update({
      where: { id: material.id },
      data: {
        summary:            'Resumo do documento ANTIGO',
        summaryStatus:      'DONE',
        summaryGeneratedAt: new Date(),
        vectorStatus:       'DONE',
      },
    })

    await edit(app, material.id, a.accessToken, { buffer: PDF_NOVO })

    const depois = await prisma.materialInstrucional.findUniqueOrThrow({ where: { id: material.id } })
    expect(depois.summary).toBeNull()
    expect(depois.summaryGeneratedAt).toBeNull()
    expect(depois.summaryStatus).toBe('PENDING')
    expect(depois.vectorStatus).toBe('PENDING')
  })

  it('edição só de metadados NÃO toca no documento', async () => {
    const app = await getTestApp()
    const a = await createUserAndLogin('admin7@file.com', 'ADMIN')
    const material = await materialComArquivo(a.userId)

    await edit(app, material.id, a.accessToken)

    const depois = await prisma.materialInstrucional.findUniqueOrThrow({ where: { id: material.id } })
    expect(depois.storageKey).toBe(material.storageKey)
    expect(await objetoExiste(material.storageKey)).toBe(true)
  })
})

describe('PUT /mis/:id — arquivo inválido não destrói o que existe (FR-008)', () => {
  it('recusa arquivo que não é PDF e preserva o documento atual', async () => {
    const app = await getTestApp()
    const a = await createUserAndLogin('admin8@file.com', 'ADMIN')
    const material = await materialComArquivo(a.userId)

    const res = await edit(app, material.id, a.accessToken, {
      buffer:   Buffer.from('isto nao e um pdf'),
      filename: 'falso.pdf',
    })

    expect(res.statusCode).toBe(415)

    const depois = await prisma.materialInstrucional.findUniqueOrThrow({ where: { id: material.id } })
    expect(depois.storageKey).toBe(material.storageKey)
    expect(await objetoExiste(material.storageKey)).toBe(true)
  })

  it('recusa tipo declarado diferente de application/pdf', async () => {
    const app = await getTestApp()
    const a = await createUserAndLogin('admin9@file.com', 'ADMIN')
    const material = await materialComArquivo(a.userId)

    const res = await edit(app, material.id, a.accessToken, {
      buffer:      PDF_NOVO,
      filename:    'novo.txt',
      contentType: 'text/plain',
    })

    expect(res.statusCode).toBe(415)
    expect(await objetoExiste(material.storageKey)).toBe(true)
  })

  it('recusa arquivo acima do limite de tamanho', async () => {
    const app = await getTestApp()
    const a = await createUserAndLogin('admin10@file.com', 'ADMIN')
    const material = await materialComArquivo(a.userId)

    // O limite é imposto pelo plugin multipart, que aborta antes de o service
    // ver o buffer: asserte o STATUS, não o código do catálogo de erros.
    const grande = Buffer.concat([
      Buffer.from('%PDF-1.7\n'),
      Buffer.alloc(60 * 1024 * 1024, 0x20),
    ])

    const res = await edit(app, material.id, a.accessToken, { buffer: grande })

    expect(res.statusCode).toBe(413)
    expect(await objetoExiste(material.storageKey)).toBe(true)
  })
})
