// __tests__/integration/materials/materialUpload.test.ts
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import FormData from 'form-data'
import type { FastifyInstance } from 'fastify'
import { getTestApp, closeTestApp } from '../../helpers/request'
import { createUserAndLogin, cleanMaterialsDb } from '../../helpers/materials'
import { minioClient, MINIO_BUCKET } from '../../../src/lib/minio'

// Garante o bucket do MinIO (em produção isso é feito no boot via ensureBucket,
// que não roda no buildApp dos testes).
beforeAll(async () => {
  const exists = await minioClient.bucketExists(MINIO_BUCKET)
  if (!exists) await minioClient.makeBucket(MINIO_BUCKET)
})

beforeEach(cleanMaterialsDb)

afterAll(async () => {
  await cleanMaterialsDb()
  await closeTestApp()
})

/** Buffer de PDF válido — começa com os magic bytes "%PDF". */
const PDF_BUFFER = Buffer.from('%PDF-1.7\n1 0 obj<<>>endobj\n%%EOF\n')

/**
 * Faz upload via POST /mis montando um multipart/form-data real.
 * `appendFields` recebe o FormData para anexar os campos habilidadesBncc desejados.
 */
async function uploadMaterial(
  app: FastifyInstance,
  token: string,
  appendFields: (form: FormData) => void = () => {},
) {
  const form = new FormData()
  form.append('file', PDF_BUFFER, { filename: 'material.pdf', contentType: 'application/pdf' })
  form.append('title', 'Material com Habilidades')
  appendFields(form)

  return app.inject({
    method:  'POST',
    url:     '/mis',
    headers: { ...form.getHeaders(), authorization: `Bearer ${token}` },
    payload: form.getBuffer(),
  })
}

describe('POST /mis — Upload com habilidades BNCC', () => {
  it('deve criar o material com habilidades enviadas em campos repetidos (habilidadesBncc[])', async () => {
    const app = await getTestApp()
    const owner = await createUserAndLogin('owner@test.com', 'INSTITUTIONALIZED')

    const res = await uploadMaterial(app, owner.accessToken, (form) => {
      form.append('habilidadesBncc[]', 'EF15LP01')
      form.append('habilidadesBncc[]', 'EF67LP03')
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().habilidadesBncc.sort()).toEqual(['EF15LP01', 'EF67LP03'])
  })

  it('deve aceitar as habilidades como um array JSON em um único campo', async () => {
    const app = await getTestApp()
    const owner = await createUserAndLogin('owner@test.com', 'INSTITUTIONALIZED')

    const res = await uploadMaterial(app, owner.accessToken, (form) => {
      form.append('habilidadesBncc', JSON.stringify(['EF15LP01', 'EF67LP03']))
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().habilidadesBncc.sort()).toEqual(['EF15LP01', 'EF67LP03'])
  })

  it('deve remover duplicatas e espaços em branco das habilidades', async () => {
    const app = await getTestApp()
    const owner = await createUserAndLogin('owner@test.com', 'INSTITUTIONALIZED')

    const res = await uploadMaterial(app, owner.accessToken, (form) => {
      form.append('habilidadesBncc[]', 'EF15LP01')
      form.append('habilidadesBncc[]', '  EF15LP01  ')
      form.append('habilidadesBncc[]', '')
      form.append('habilidadesBncc[]', 'EF67LP03')
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().habilidadesBncc.sort()).toEqual(['EF15LP01', 'EF67LP03'])
  })

  it('deve criar o material com lista vazia quando nenhuma habilidade é enviada', async () => {
    const app = await getTestApp()
    const owner = await createUserAndLogin('owner@test.com', 'INSTITUTIONALIZED')

    const res = await uploadMaterial(app, owner.accessToken)

    expect(res.statusCode).toBe(201)
    expect(res.json().habilidadesBncc).toEqual([])
  })

  it('deve persistir as habilidades — recuperáveis em GET /mis/:id', async () => {
    const app = await getTestApp()
    const owner = await createUserAndLogin('owner@test.com', 'INSTITUTIONALIZED')

    const uploadRes = await uploadMaterial(app, owner.accessToken, (form) => {
      form.append('habilidadesBncc[]', 'EF15LP01')
    })
    const materialId = uploadRes.json().id

    const detailRes = await app.inject({
      method:  'GET',
      url:     `/mis/${materialId}`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
    })

    expect(detailRes.statusCode).toBe(200)
    expect(detailRes.json().habilidadesBncc).toEqual(['EF15LP01'])
  })

  it('deve bloquear upload de usuário sem permissão (COMMON) com 403', async () => {
    const app = await getTestApp()
    const common = await createUserAndLogin('common@test.com', 'COMMON')

    const res = await uploadMaterial(app, common.accessToken, (form) => {
      form.append('habilidadesBncc[]', 'EF15LP01')
    })

    expect(res.statusCode).toBe(403)
  })
})
