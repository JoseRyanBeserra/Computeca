// __tests__/integration/materials/materialSoftDelete.test.ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { getTestApp, closeTestApp } from '../../helpers/request'
import { createUserAndLogin, createMaterial, cleanMaterialsDb } from '../../helpers/materials'
import { prisma } from '../../../src/database/prisma'

beforeEach(cleanMaterialsDb)

afterAll(async () => {
  await cleanMaterialsDb()
  await closeTestApp()
})

function auth(token: string) {
  return { authorization: `Bearer ${token}` }
}

describe('DELETE /mis/:id — Soft delete de material', () => {
  describe('casos de sucesso', () => {
    it('ADMIN deve fazer soft delete e ocultar o material das listagens', async () => {
      const app = await getTestApp()
      const { accessToken, userId } = await createUserAndLogin('admin@test.com', 'ADMIN')
      const material = await createMaterial({ uploadedById: userId, status: 'APPROVED' })

      const res = await app.inject({ method: 'DELETE', url: `/mis/${material.id}`, headers: auth(accessToken) })
      expect(res.statusCode).toBe(200)

      // Persistiu deletedAt no banco
      const row = await prisma.materialInstrucional.findUnique({ where: { id: material.id } })
      expect(row?.deletedAt).not.toBeNull()
      expect(row?.deletedById).toBe(userId)

      // Some do acervo e da listagem pública
      const all = await app.inject({ method: 'GET', url: '/mis/all', headers: auth(accessToken) })
      expect(all.json().materials.find((m: { id: string }) => m.id === material.id)).toBeUndefined()

      const pub = await app.inject({ method: 'GET', url: '/mis/public', headers: auth(accessToken) })
      expect(pub.json().materials.find((m: { id: string }) => m.id === material.id)).toBeUndefined()
    })

    it('PROFESSOR deve poder deletar qualquer material', async () => {
      const app = await getTestApp()
      const { accessToken } = await createUserAndLogin('prof@test.com', 'PROFESSOR')
      const { userId: owner } = await createUserAndLogin('owner@test.com', 'INSTITUTIONALIZED')
      const material = await createMaterial({ uploadedById: owner, status: 'APPROVED' })

      const res = await app.inject({ method: 'DELETE', url: `/mis/${material.id}`, headers: auth(accessToken) })
      expect(res.statusCode).toBe(200)
    })

    it('deve registrar AuditLog MI_DELETED', async () => {
      const app = await getTestApp()
      const { accessToken, userId } = await createUserAndLogin('admin@test.com', 'ADMIN')
      const material = await createMaterial({ uploadedById: userId, status: 'APPROVED' })

      await app.inject({ method: 'DELETE', url: `/mis/${material.id}`, headers: auth(accessToken) })

      const log = await prisma.auditLog.findFirst({ where: { action: 'MI_DELETED', targetId: material.id } })
      expect(log).not.toBeNull()
    })

    it('material deletado deve retornar 404 no detalhe', async () => {
      const app = await getTestApp()
      const { accessToken, userId } = await createUserAndLogin('admin@test.com', 'ADMIN')
      const material = await createMaterial({ uploadedById: userId, status: 'APPROVED' })

      await app.inject({ method: 'DELETE', url: `/mis/${material.id}`, headers: auth(accessToken) })

      const detail = await app.inject({ method: 'GET', url: `/mis/${material.id}`, headers: auth(accessToken) })
      expect(detail.statusCode).toBe(404)
    })
  })

  describe('idempotência e erros', () => {
    it('deletar duas vezes deve retornar 404 na segunda', async () => {
      const app = await getTestApp()
      const { accessToken, userId } = await createUserAndLogin('admin@test.com', 'ADMIN')
      const material = await createMaterial({ uploadedById: userId, status: 'APPROVED' })

      const first  = await app.inject({ method: 'DELETE', url: `/mis/${material.id}`, headers: auth(accessToken) })
      const second = await app.inject({ method: 'DELETE', url: `/mis/${material.id}`, headers: auth(accessToken) })

      expect(first.statusCode).toBe(200)
      expect(second.statusCode).toBe(404)
    })

    it('deve retornar 404 para material inexistente', async () => {
      const app = await getTestApp()
      const { accessToken } = await createUserAndLogin('admin@test.com', 'ADMIN')
      const res = await app.inject({
        method:  'DELETE',
        url:     '/mis/aaaaaaaa-0000-4000-8000-000000000009',
        headers: auth(accessToken),
      })
      expect(res.statusCode).toBe(404)
    })
  })

  describe('autorização', () => {
    it('deve retornar 403 para usuário sem permissão (INSTITUTIONALIZED)', async () => {
      const app = await getTestApp()
      const { accessToken, userId } = await createUserAndLogin('inst@test.com', 'INSTITUTIONALIZED')
      const material = await createMaterial({ uploadedById: userId, status: 'APPROVED' })

      const res = await app.inject({ method: 'DELETE', url: `/mis/${material.id}`, headers: auth(accessToken) })
      expect(res.statusCode).toBe(403)
    })

    it('deve retornar 401 sem token', async () => {
      const app = await getTestApp()
      const { userId } = await createUserAndLogin('admin2@test.com', 'ADMIN')
      const material = await createMaterial({ uploadedById: userId, status: 'APPROVED' })

      const res = await app.inject({ method: 'DELETE', url: `/mis/${material.id}` })
      expect(res.statusCode).toBe(401)
    })
  })
})
