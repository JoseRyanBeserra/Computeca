// __tests__/integration/materials/materialHabilidades.test.ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { getTestApp, closeTestApp } from '../../helpers/request'
import { createUserAndLogin, createMaterial, cleanMaterialsDb } from '../../helpers/materials'

beforeEach(cleanMaterialsDb)

afterAll(async () => {
  await cleanMaterialsDb()
  await closeTestApp()
})

describe('GET /mis/habilidades — Habilidades distintas do acervo', () => {
  it('deve retornar a lista distinta e ordenada das habilidades de materiais APPROVED', async () => {
    const app = await getTestApp()
    const owner = await createUserAndLogin('owner@test.com', 'INSTITUTIONALIZED')

    await createMaterial({ uploadedById: owner.userId, status: 'APPROVED', habilidadesBncc: ['EF15LP02', 'EF15LP01'] })
    await createMaterial({ uploadedById: owner.userId, status: 'APPROVED', habilidadesBncc: ['EF15LP01', 'EF67LP03'] })

    const viewer = await createUserAndLogin('viewer@test.com', 'COMMON')
    const res = await app.inject({
      method:  'GET',
      url:     '/mis/habilidades',
      headers: { authorization: `Bearer ${viewer.accessToken}` },
    })

    expect(res.statusCode).toBe(200)
    // distinto (EF15LP01 aparece em 2 materiais) e ordenado alfabeticamente
    expect(res.json()).toEqual(['EF15LP01', 'EF15LP02', 'EF67LP03'])
  })

  it('não deve incluir habilidades de materiais não-APPROVED', async () => {
    const app = await getTestApp()
    const owner = await createUserAndLogin('owner@test.com', 'INSTITUTIONALIZED')

    await createMaterial({ uploadedById: owner.userId, status: 'APPROVED', habilidadesBncc: ['EF15LP01'] })
    await createMaterial({ uploadedById: owner.userId, status: 'PENDING_REVIEW', habilidadesBncc: ['EF99XX99'] })
    await createMaterial({ uploadedById: owner.userId, status: 'REJECTED', habilidadesBncc: ['EF88YY88'] })

    const viewer = await createUserAndLogin('viewer@test.com', 'COMMON')
    const res = await app.inject({
      method:  'GET',
      url:     '/mis/habilidades',
      headers: { authorization: `Bearer ${viewer.accessToken}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual(['EF15LP01'])
  })

  it('deve retornar lista vazia quando não há habilidades cadastradas', async () => {
    const app = await getTestApp()
    const owner = await createUserAndLogin('owner@test.com', 'INSTITUTIONALIZED')
    await createMaterial({ uploadedById: owner.userId, status: 'APPROVED', habilidadesBncc: [] })

    const viewer = await createUserAndLogin('viewer@test.com', 'COMMON')
    const res = await app.inject({
      method:  'GET',
      url:     '/mis/habilidades',
      headers: { authorization: `Bearer ${viewer.accessToken}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([])
  })

  it('deve retornar 401 sem token', async () => {
    const app = await getTestApp()
    const res = await app.inject({ method: 'GET', url: '/mis/habilidades' })
    expect(res.statusCode).toBe(401)
  })
})
