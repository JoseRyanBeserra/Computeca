// __tests__/integration/materials/materialAiFieldsOmitted.test.ts
// FR-017 — com a IA desativada, o estado de processamento por IA não trafega
// nas respostas da API.
//
// Esconder apenas na interface deixaria `vectorStatus` visível a quem
// inspecionasse a resposta. O dado permanece no banco (FR-010): nada o apaga.
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { getTestApp, closeTestApp } from '../../helpers/request'
import { createUserAndLogin, createMaterial, cleanMaterialsDb } from '../../helpers/materials'
import { prisma } from '../../../src/database/prisma'
import { env } from '../../../src/env'
import { AI_SETTING_KEY, invalidateAiAvailabilityCache } from '../../../src/constants/features'

const mutableEnv = env as { AI_FEATURES_ENABLED: boolean }
const originalMaster = env.AI_FEATURES_ENABLED

function setAi(enabled: boolean): void {
  mutableEnv.AI_FEATURES_ENABLED = enabled
  invalidateAiAvailabilityCache()
}

beforeEach(async () => {
  await cleanMaterialsDb()
  await prisma.appSetting.deleteMany({ where: { key: AI_SETTING_KEY } })
  setAi(false)
})

afterAll(async () => {
  await cleanMaterialsDb()
  await prisma.appSetting.deleteMany({ where: { key: AI_SETTING_KEY } })
  mutableEnv.AI_FEATURES_ENABLED = originalMaster
  invalidateAiAvailabilityCache()
  await closeTestApp()
})

describe('GET /mis/:id — omissão de vectorStatus', () => {
  it('não inclui vectorStatus com a IA desativada', async () => {
    const app = await getTestApp()
    const owner = await createUserAndLogin('owner@test.com', 'PROFESSOR')
    const material = await createMaterial({ uploadedById: owner.userId, status: 'APPROVED' })

    setAi(false)
    const res = await app.inject({
      method:  'GET',
      url:     `/mis/${material.id}`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).not.toHaveProperty('vectorStatus')
    // O restante da resposta permanece intacto — só o campo de IA sai.
    expect(res.json()).toHaveProperty('title')
    expect(res.json()).toHaveProperty('status', 'APPROVED')
  })

  it('inclui vectorStatus com a IA ativada', async () => {
    const app = await getTestApp()
    const owner = await createUserAndLogin('owner@test.com', 'PROFESSOR')
    const material = await createMaterial({ uploadedById: owner.userId, status: 'APPROVED' })

    setAi(true)
    const res = await app.inject({
      method:  'GET',
      url:     `/mis/${material.id}`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveProperty('vectorStatus')
  })

  it('preserva o dado no banco mesmo quando omitido da resposta (FR-010)', async () => {
    const owner = await createUserAndLogin('owner@test.com', 'PROFESSOR')
    const material = await createMaterial({ uploadedById: owner.userId, status: 'APPROVED' })

    const app = await getTestApp()
    setAi(false)
    await app.inject({
      method:  'GET',
      url:     `/mis/${material.id}`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
    })

    const persisted = await prisma.materialInstrucional.findUnique({
      where:  { id: material.id },
      select: { vectorStatus: true },
    })

    expect(persisted?.vectorStatus).toBeDefined()
  })
})

describe('GET /mis/all — omissão de vectorStatus', () => {
  it('nenhum item da listagem inclui vectorStatus com a IA desativada', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin@test.com', 'ADMIN')
    await createMaterial({ uploadedById: admin.userId, status: 'APPROVED' })
    await createMaterial({ uploadedById: admin.userId, status: 'PENDING_REVIEW' })

    setAi(false)
    const res = await app.inject({
      method:  'GET',
      url:     '/mis/all',
      headers: { authorization: `Bearer ${admin.accessToken}` },
    })

    expect(res.statusCode).toBe(200)
    const { materials } = res.json()
    expect(materials.length).toBeGreaterThan(0)
    for (const m of materials) {
      expect(m).not.toHaveProperty('vectorStatus')
    }
  })

  it('os itens voltam a incluir vectorStatus com a IA ativada', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin@test.com', 'ADMIN')
    await createMaterial({ uploadedById: admin.userId, status: 'APPROVED' })

    setAi(true)
    const res = await app.inject({
      method:  'GET',
      url:     '/mis/all',
      headers: { authorization: `Bearer ${admin.accessToken}` },
    })

    expect(res.statusCode).toBe(200)
    for (const m of res.json().materials) {
      expect(m).toHaveProperty('vectorStatus')
    }
  })
})
