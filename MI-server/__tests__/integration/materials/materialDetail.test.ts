// __tests__/integration/materials/materialDetail.test.ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { getTestApp, closeTestApp } from '../../helpers/request'
import { createUserAndLogin, createMaterial, cleanMaterialsDb } from '../../helpers/materials'

beforeEach(cleanMaterialsDb)

afterAll(async () => {
  await cleanMaterialsDb()
  await closeTestApp()
})

describe('GET /mis/:id — Detalhe de um material', () => {
  describe('casos de sucesso', () => {
    it('deve retornar 200 e os metadados de um material APPROVED para qualquer autenticado', async () => {
      const app = await getTestApp()
      const owner = await createUserAndLogin('owner@test.com', 'INSTITUTIONALIZED')
      const material = await createMaterial({
        uploadedById:    owner.userId,
        title:           'Plano de Aula',
        status:          'APPROVED',
        habilidadesBncc: ['EF15LP01', 'EF15LP02'],
      })
      const viewer = await createUserAndLogin('viewer@test.com', 'COMMON')

      const res = await app.inject({
        method:  'GET',
        url:     `/mis/${material.id}`,
        headers: { authorization: `Bearer ${viewer.accessToken}` },
      })

      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body).toMatchObject({
        id:              material.id,
        title:           'Plano de Aula',
        status:          'APPROVED',
        habilidadesBncc: ['EF15LP01', 'EF15LP02'],
      })
      expect(body.uploadedBy).toMatchObject({ name: expect.any(String), email: 'owner@test.com' })
      expect(Array.isArray(body.organizations)).toBe(true)
    })

    it('deve permitir que o DONO veja seu próprio material PENDING_REVIEW', async () => {
      const app = await getTestApp()
      const owner = await createUserAndLogin('owner@test.com', 'INSTITUTIONALIZED')
      const material = await createMaterial({ uploadedById: owner.userId, status: 'PENDING_REVIEW' })

      const res = await app.inject({
        method:  'GET',
        url:     `/mis/${material.id}`,
        headers: { authorization: `Bearer ${owner.accessToken}` },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().status).toBe('PENDING_REVIEW')
    })

    it('deve permitir que um PROFESSOR veja material PENDING de outro usuário', async () => {
      const app = await getTestApp()
      const owner = await createUserAndLogin('owner@test.com', 'INSTITUTIONALIZED')
      const material = await createMaterial({ uploadedById: owner.userId, status: 'PENDING_REVIEW' })
      const prof = await createUserAndLogin('prof@test.com', 'PROFESSOR')

      const res = await app.inject({
        method:  'GET',
        url:     `/mis/${material.id}`,
        headers: { authorization: `Bearer ${prof.accessToken}` },
      })

      expect(res.statusCode).toBe(200)
    })

    it('deve permitir que um ADMIN veja material REJECTED de outro usuário', async () => {
      const app = await getTestApp()
      const owner = await createUserAndLogin('owner@test.com', 'INSTITUTIONALIZED')
      const material = await createMaterial({ uploadedById: owner.userId, status: 'REJECTED' })
      const admin = await createUserAndLogin('admin@test.com', 'ADMIN')

      const res = await app.inject({
        method:  'GET',
        url:     `/mis/${material.id}`,
        headers: { authorization: `Bearer ${admin.accessToken}` },
      })

      expect(res.statusCode).toBe(200)
    })
  })

  describe('acesso negado / não encontrado', () => {
    it('deve retornar 404 quando o material não existe', async () => {
      const app = await getTestApp()
      const user = await createUserAndLogin('user@test.com', 'COMMON')

      const res = await app.inject({
        method:  'GET',
        url:     `/mis/${randomUUID()}`,
        headers: { authorization: `Bearer ${user.accessToken}` },
      })

      expect(res.statusCode).toBe(404)
    })

    it('deve retornar 404 (sem vazar existência) para material PENDING de terceiros visto por COMMON', async () => {
      const app = await getTestApp()
      const owner = await createUserAndLogin('owner@test.com', 'INSTITUTIONALIZED')
      const material = await createMaterial({ uploadedById: owner.userId, status: 'PENDING_REVIEW' })
      const intruder = await createUserAndLogin('intruder@test.com', 'COMMON')

      const res = await app.inject({
        method:  'GET',
        url:     `/mis/${material.id}`,
        headers: { authorization: `Bearer ${intruder.accessToken}` },
      })

      expect(res.statusCode).toBe(404)
    })

    it('deve retornar 401 sem token', async () => {
      const app = await getTestApp()
      const owner = await createUserAndLogin('owner@test.com', 'INSTITUTIONALIZED')
      const material = await createMaterial({ uploadedById: owner.userId, status: 'APPROVED' })

      const res = await app.inject({ method: 'GET', url: `/mis/${material.id}` })

      expect(res.statusCode).toBe(401)
    })

    it('deve retornar erro de validação quando o id não é um UUID', async () => {
      const app = await getTestApp()
      const user = await createUserAndLogin('user@test.com', 'COMMON')

      const res = await app.inject({
        method:  'GET',
        url:     '/mis/nao-e-uuid',
        headers: { authorization: `Bearer ${user.accessToken}` },
      })

      expect(res.statusCode).toBeGreaterThanOrEqual(400)
    })
  })
})
