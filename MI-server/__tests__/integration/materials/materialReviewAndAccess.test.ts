// __tests__/integration/materials/materialReviewAndAccess.test.ts
// Cobertura dos endpoints de listagem administrativa, revisão e URLs pré-assinadas.
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { getTestApp, closeTestApp } from '../../helpers/request'
import { createUserAndLogin, createMaterial, cleanMaterialsDb } from '../../helpers/materials'

beforeEach(cleanMaterialsDb)

afterAll(async () => {
  await cleanMaterialsDb()
  await closeTestApp()
})

const auth = (token: string) => ({ authorization: `Bearer ${token}` })

// ── GET /mis/all ────────────────────────────────────────────────────────────────

describe('GET /mis/all', () => {
  it('deve listar todos os materiais para PROFESSOR, com filtro por status', async () => {
    const app = await getTestApp()
    const owner = await createUserAndLogin('owner@test.com', 'INSTITUTIONALIZED')
    await createMaterial({ uploadedById: owner.userId, status: 'APPROVED' })
    await createMaterial({ uploadedById: owner.userId, status: 'PENDING_REVIEW' })
    const prof = await createUserAndLogin('prof@test.com', 'PROFESSOR')

    const res = await app.inject({ method: 'GET', url: '/mis/all?status=PENDING_REVIEW', headers: auth(prof.accessToken) })

    expect(res.statusCode).toBe(200)
    expect(res.json().total).toBe(1)
  })

  it('deve retornar 403 para usuário COMMON', async () => {
    const app = await getTestApp()
    const common = await createUserAndLogin('common@test.com', 'COMMON')

    const res = await app.inject({ method: 'GET', url: '/mis/all', headers: auth(common.accessToken) })

    expect(res.statusCode).toBe(403)
  })
})

// ── GET /mis/pending ──────────────────────────────────────────────────────────

describe('GET /mis/pending', () => {
  it('deve listar apenas materiais PENDING_REVIEW para ADMIN', async () => {
    const app = await getTestApp()
    const owner = await createUserAndLogin('owner@test.com', 'INSTITUTIONALIZED')
    await createMaterial({ uploadedById: owner.userId, status: 'PENDING_REVIEW' })
    await createMaterial({ uploadedById: owner.userId, status: 'APPROVED' })
    const admin = await createUserAndLogin('admin@test.com', 'ADMIN')

    const res = await app.inject({ method: 'GET', url: '/mis/pending', headers: auth(admin.accessToken) })

    expect(res.statusCode).toBe(200)
    const materials = res.json()
    expect(Array.isArray(materials)).toBe(true)
    expect(materials).toHaveLength(1)
    expect(materials[0].status).toBe('PENDING_REVIEW')
  })

  it('deve retornar 403 para usuário COMMON', async () => {
    const app = await getTestApp()
    const common = await createUserAndLogin('common@test.com', 'COMMON')

    const res = await app.inject({ method: 'GET', url: '/mis/pending', headers: auth(common.accessToken) })

    expect(res.statusCode).toBe(403)
  })
})

// ── GET /mis/me ─────────────────────────────────────────────────────────────────

describe('GET /mis/me', () => {
  it('deve listar os materiais do próprio usuário INSTITUTIONALIZED', async () => {
    const app = await getTestApp()
    const owner = await createUserAndLogin('owner@test.com', 'INSTITUTIONALIZED')
    const other = await createUserAndLogin('other@test.com', 'INSTITUTIONALIZED')
    await createMaterial({ uploadedById: owner.userId, status: 'APPROVED' })
    await createMaterial({ uploadedById: owner.userId, status: 'PENDING_REVIEW' })
    await createMaterial({ uploadedById: other.userId, status: 'APPROVED' })

    const res = await app.inject({ method: 'GET', url: '/mis/me', headers: auth(owner.accessToken) })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveLength(2)
  })

  it('deve retornar 403 para usuário COMMON', async () => {
    const app = await getTestApp()
    const common = await createUserAndLogin('common@test.com', 'COMMON')

    const res = await app.inject({ method: 'GET', url: '/mis/me', headers: auth(common.accessToken) })

    expect(res.statusCode).toBe(403)
  })
})

// ── PATCH /mis/:id/review ───────────────────────────────────────────────────────

describe('PATCH /mis/:id/review', () => {
  it('deve APROVAR um material pendente (PROFESSOR)', async () => {
    const app = await getTestApp()
    const owner = await createUserAndLogin('owner@test.com', 'INSTITUTIONALIZED')
    const material = await createMaterial({ uploadedById: owner.userId, status: 'PENDING_REVIEW' })
    const prof = await createUserAndLogin('prof@test.com', 'PROFESSOR')

    const res = await app.inject({
      method: 'PATCH',
      url: `/mis/${material.id}/review`,
      headers: auth(prof.accessToken),
      payload: { decision: 'APPROVED' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('APPROVED')
  })

  it('deve REJEITAR um material pendente (PROFESSOR)', async () => {
    const app = await getTestApp()
    const owner = await createUserAndLogin('owner@test.com', 'INSTITUTIONALIZED')
    const material = await createMaterial({ uploadedById: owner.userId, status: 'PENDING_REVIEW' })
    const prof = await createUserAndLogin('prof@test.com', 'PROFESSOR')

    const res = await app.inject({
      method: 'PATCH',
      url: `/mis/${material.id}/review`,
      headers: auth(prof.accessToken),
      payload: { decision: 'REJECTED' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('REJECTED')
  })

  it('deve retornar 404 quando o material não existe', async () => {
    const app = await getTestApp()
    const prof = await createUserAndLogin('prof@test.com', 'PROFESSOR')

    const res = await app.inject({
      method: 'PATCH',
      url: `/mis/${randomUUID()}/review`,
      headers: auth(prof.accessToken),
      payload: { decision: 'APPROVED' },
    })

    expect(res.statusCode).toBe(404)
  })

  it('deve retornar 400 ao revisar material que não está PENDING_REVIEW', async () => {
    const app = await getTestApp()
    const owner = await createUserAndLogin('owner@test.com', 'INSTITUTIONALIZED')
    const material = await createMaterial({ uploadedById: owner.userId, status: 'APPROVED' })
    const prof = await createUserAndLogin('prof@test.com', 'PROFESSOR')

    const res = await app.inject({
      method: 'PATCH',
      url: `/mis/${material.id}/review`,
      headers: auth(prof.accessToken),
      payload: { decision: 'REJECTED' },
    })

    expect(res.statusCode).toBe(400)
  })

  it('deve retornar 403 para usuário COMMON', async () => {
    const app = await getTestApp()
    const owner = await createUserAndLogin('owner@test.com', 'INSTITUTIONALIZED')
    const material = await createMaterial({ uploadedById: owner.userId, status: 'PENDING_REVIEW' })
    const common = await createUserAndLogin('common@test.com', 'COMMON')

    const res = await app.inject({
      method: 'PATCH',
      url: `/mis/${material.id}/review`,
      headers: auth(common.accessToken),
      payload: { decision: 'APPROVED' },
    })

    expect(res.statusCode).toBe(403)
  })
})

// ── GET /mis/:id/presigned-url (dono) ───────────────────────────────────────────

describe('GET /mis/:id/presigned-url', () => {
  it('deve gerar URL pré-assinada para o DONO do material', async () => {
    const app = await getTestApp()
    const owner = await createUserAndLogin('owner@test.com', 'INSTITUTIONALIZED')
    const material = await createMaterial({ uploadedById: owner.userId, status: 'APPROVED' })

    const res = await app.inject({ method: 'GET', url: `/mis/${material.id}/presigned-url`, headers: auth(owner.accessToken) })

    expect(res.statusCode).toBe(200)
    expect(typeof res.json().url).toBe('string')
    expect(res.json().url).toContain('http')
  })

  it('deve retornar 403 quando solicitado por quem não é o dono', async () => {
    const app = await getTestApp()
    const owner = await createUserAndLogin('owner@test.com', 'INSTITUTIONALIZED')
    const material = await createMaterial({ uploadedById: owner.userId, status: 'APPROVED' })
    const other = await createUserAndLogin('other@test.com', 'PROFESSOR')

    const res = await app.inject({ method: 'GET', url: `/mis/${material.id}/presigned-url`, headers: auth(other.accessToken) })

    expect(res.statusCode).toBe(403)
  })

  it('deve retornar 404 quando o material não existe', async () => {
    const app = await getTestApp()
    const owner = await createUserAndLogin('owner@test.com', 'INSTITUTIONALIZED')

    const res = await app.inject({ method: 'GET', url: `/mis/${randomUUID()}/presigned-url`, headers: auth(owner.accessToken) })

    expect(res.statusCode).toBe(404)
  })
})

// ── GET /mis/:id/public-presigned-url ───────────────────────────────────────────

describe('GET /mis/:id/public-presigned-url', () => {
  it('deve gerar URL para material APPROVED para qualquer autenticado', async () => {
    const app = await getTestApp()
    const owner = await createUserAndLogin('owner@test.com', 'INSTITUTIONALIZED')
    const material = await createMaterial({ uploadedById: owner.userId, status: 'APPROVED' })
    const viewer = await createUserAndLogin('viewer@test.com', 'COMMON')

    const res = await app.inject({ method: 'GET', url: `/mis/${material.id}/public-presigned-url`, headers: auth(viewer.accessToken) })

    expect(res.statusCode).toBe(200)
    expect(typeof res.json().url).toBe('string')
  })

  it('deve retornar 404 para material não-APPROVED (sem vazar existência)', async () => {
    const app = await getTestApp()
    const owner = await createUserAndLogin('owner@test.com', 'INSTITUTIONALIZED')
    const material = await createMaterial({ uploadedById: owner.userId, status: 'PENDING_REVIEW' })
    const viewer = await createUserAndLogin('viewer@test.com', 'COMMON')

    const res = await app.inject({ method: 'GET', url: `/mis/${material.id}/public-presigned-url`, headers: auth(viewer.accessToken) })

    expect(res.statusCode).toBe(404)
  })
})

// ── GET /mis/:id/review-presigned-url (PROFESSOR/ADMIN) ──────────────────────────

describe('GET /mis/:id/review-presigned-url', () => {
  it('deve gerar URL para o PROFESSOR sem checar ownership', async () => {
    const app = await getTestApp()
    const owner = await createUserAndLogin('owner@test.com', 'INSTITUTIONALIZED')
    const material = await createMaterial({ uploadedById: owner.userId, status: 'PENDING_REVIEW' })
    const prof = await createUserAndLogin('prof@test.com', 'PROFESSOR')

    const res = await app.inject({ method: 'GET', url: `/mis/${material.id}/review-presigned-url`, headers: auth(prof.accessToken) })

    expect(res.statusCode).toBe(200)
    expect(typeof res.json().url).toBe('string')
  })

  it('deve retornar 403 para usuário COMMON', async () => {
    const app = await getTestApp()
    const owner = await createUserAndLogin('owner@test.com', 'INSTITUTIONALIZED')
    const material = await createMaterial({ uploadedById: owner.userId, status: 'PENDING_REVIEW' })
    const common = await createUserAndLogin('common@test.com', 'COMMON')

    const res = await app.inject({ method: 'GET', url: `/mis/${material.id}/review-presigned-url`, headers: auth(common.accessToken) })

    expect(res.statusCode).toBe(403)
  })
})
