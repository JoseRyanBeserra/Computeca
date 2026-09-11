// __tests__/integration/config/updateAiAvailability.test.ts
// PATCH /config/features/ai — controle operacional pelo painel administrativo.
// Contrato: specs/001-disable-ai-features/contracts/patch-admin-features-ai.md
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { getTestApp, closeTestApp } from '../../helpers/request'
import { createUserAndLogin, cleanMaterialsDb } from '../../helpers/materials'
import { prisma } from '../../../src/database/prisma'
import { env } from '../../../src/env'
import { AI_SETTING_KEY, invalidateAiAvailabilityCache } from '../../../src/constants/features'

const mutableEnv = env as { AI_FEATURES_ENABLED: boolean }
const originalMaster = env.AI_FEATURES_ENABLED

function setMaster(enabled: boolean): void {
  mutableEnv.AI_FEATURES_ENABLED = enabled
  invalidateAiAvailabilityCache()
}

async function limpar(): Promise<void> {
  await prisma.auditLog.deleteMany({ where: { action: 'AI_AVAILABILITY_CHANGED' } })
  await prisma.appSetting.deleteMany({ where: { key: AI_SETTING_KEY } })
  invalidateAiAvailabilityCache()
}

async function patch(token: string | null, payload: unknown) {
  const app = await getTestApp()
  return app.inject({
    method:  'PATCH',
    url:     '/config/features/ai',
    headers: token ? { authorization: `Bearer ${token}` } : {},
    payload: payload as never,
  })
}

beforeEach(async () => {
  await cleanMaterialsDb()
  await limpar()
  setMaster(true) // instalação com suporte a IA, salvo onde o teste diz o contrário
})

afterAll(async () => {
  await cleanMaterialsDb()
  await limpar()
  mutableEnv.AI_FEATURES_ENABLED = originalMaster
  invalidateAiAvailabilityCache()
  await closeTestApp()
})

describe('PATCH /config/features/ai — operação', () => {
  it('ADMIN desliga a IA e a resposta reflete o novo estado', async () => {
    const admin = await createUserAndLogin('admin@test.com', 'ADMIN')

    const res = await patch(admin.accessToken, { enabled: false })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ai: { enabled: false, manageable: true } })
  })

  it('ADMIN religa a IA e a resposta reflete o novo estado', async () => {
    const admin = await createUserAndLogin('admin@test.com', 'ADMIN')

    await patch(admin.accessToken, { enabled: false })
    const res = await patch(admin.accessToken, { enabled: true })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ai: { enabled: true, manageable: true } })
  })

  it('persiste o valor no formato { enabled: boolean }', async () => {
    const admin = await createUserAndLogin('admin@test.com', 'ADMIN')

    await patch(admin.accessToken, { enabled: false })

    const registro = await prisma.appSetting.findUnique({ where: { key: AI_SETTING_KEY } })
    expect(registro?.value).toEqual({ enabled: false })
    expect(registro?.updatedById).toBe(admin.userId)
  })
})

describe('PATCH /config/features/ai — autorização', () => {
  it('PROFESSOR recebe 403', async () => {
    const professor = await createUserAndLogin('prof@test.com', 'PROFESSOR')

    const res = await patch(professor.accessToken, { enabled: false })

    expect(res.statusCode).toBe(403)
  })

  it('sem token recebe 401', async () => {
    const res = await patch(null, { enabled: false })

    expect(res.statusCode).toBe(401)
  })
})

describe('PATCH /config/features/ai — validação', () => {
  it('rejeita a string "false" com 422 (booleano estrito)', async () => {
    const admin = await createUserAndLogin('admin@test.com', 'ADMIN')

    const res = await patch(admin.accessToken, { enabled: 'false' })

    expect(res.statusCode).toBe(422)
  })
})

describe('PATCH /config/features/ai — instalação sem suporte a IA', () => {
  it('responde 409 AI_NOT_MANAGEABLE e NÃO grava nada', async () => {
    const admin = await createUserAndLogin('admin@test.com', 'ADMIN')
    setMaster(false)

    const res = await patch(admin.accessToken, { enabled: true })

    expect(res.statusCode).toBe(409)
    expect(res.json().code).toBe('AI_NOT_MANAGEABLE')

    const registro = await prisma.appSetting.findUnique({ where: { key: AI_SETTING_KEY } })
    expect(registro).toBeNull()
  })
})

describe('PATCH /config/features/ai — auditoria', () => {
  it('grava AuditLog com de/para quando o valor muda', async () => {
    const admin = await createUserAndLogin('admin@test.com', 'ADMIN')

    await patch(admin.accessToken, { enabled: false })

    const logs = await prisma.auditLog.findMany({ where: { action: 'AI_AVAILABILITY_CHANGED' } })
    expect(logs).toHaveLength(1)
    expect(logs[0].actorId).toBe(admin.userId)
    expect(logs[0].actorRole).toBe('ADMIN')
    expect(logs[0].targetId).toBe(AI_SETTING_KEY)
    expect(logs[0].metadata).toEqual({ de: true, para: false })
  })

  it('NÃO grava quando o valor repetido não muda o estado', async () => {
    const admin = await createUserAndLogin('admin@test.com', 'ADMIN')

    await patch(admin.accessToken, { enabled: false })
    await patch(admin.accessToken, { enabled: false })
    await patch(admin.accessToken, { enabled: false })

    const logs = await prisma.auditLog.findMany({ where: { action: 'AI_AVAILABILITY_CHANGED' } })
    expect(logs).toHaveLength(1)
  })
})

describe('PATCH /config/features/ai — efeito sem reinício (SC-008)', () => {
  it('após desligar pelo painel, GET /config/features já reflete o novo estado', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin@test.com', 'ADMIN')

    const antes = await app.inject({ method: 'GET', url: '/config/features' })
    expect(antes.json().ai.enabled).toBe(true)

    await patch(admin.accessToken, { enabled: false })

    const depois = await app.inject({ method: 'GET', url: '/config/features' })
    expect(depois.json().ai.enabled).toBe(false)
  })
})
