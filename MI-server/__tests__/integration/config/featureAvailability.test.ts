// __tests__/integration/config/featureAvailability.test.ts
// GET /config/features — disponibilidade dos módulos.
// Contrato: specs/001-disable-ai-features/contracts/get-config-features.md
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { getTestApp, closeTestApp } from '../../helpers/request'
import { prisma } from '../../../src/database/prisma'
import { env } from '../../../src/env'
import { AI_SETTING_KEY, invalidateAiAvailabilityCache } from '../../../src/constants/features'

// `env` é o objeto já validado pelo Zod — plano e mutável. Alternar o
// interruptor mestre em memória evita recarregar o módulo a cada caso.
const mutableEnv = env as { AI_FEATURES_ENABLED: boolean }
const originalMaster = env.AI_FEATURES_ENABLED

async function setAdminAvailability(enabled: boolean | null): Promise<void> {
  if (enabled === null) {
    await prisma.appSetting.deleteMany({ where: { key: AI_SETTING_KEY } })
  } else {
    await prisma.appSetting.upsert({
      where:  { key: AI_SETTING_KEY },
      create: { key: AI_SETTING_KEY, value: { enabled } },
      update: { value: { enabled } },
    })
  }
  invalidateAiAvailabilityCache()
}

beforeEach(async () => {
  mutableEnv.AI_FEATURES_ENABLED = originalMaster
  await setAdminAvailability(null)
})

afterAll(async () => {
  mutableEnv.AI_FEATURES_ENABLED = originalMaster
  await setAdminAvailability(null)
  await closeTestApp()
})

async function getFeatures() {
  const app = await getTestApp()
  return app.inject({ method: 'GET', url: '/config/features' })
}

describe('GET /config/features — combinações dos dois níveis', () => {
  it('mestre desligado → enabled:false e manageable:false, qualquer que seja o registro', async () => {
    mutableEnv.AI_FEATURES_ENABLED = false
    await setAdminAvailability(true)

    const res = await getFeatures()

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ai: { enabled: false, manageable: false } })
  })

  it('mestre ligado + registro ausente → enabled:true e manageable:true', async () => {
    mutableEnv.AI_FEATURES_ENABLED = true
    await setAdminAvailability(null)

    const res = await getFeatures()

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ai: { enabled: true, manageable: true } })
  })

  it('mestre ligado + registro false → enabled:false e manageable:true', async () => {
    mutableEnv.AI_FEATURES_ENABLED = true
    await setAdminAvailability(false)

    const res = await getFeatures()

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ai: { enabled: false, manageable: true } })
  })
})

describe('GET /config/features — acesso', () => {
  it('responde sem token de autenticação (rota pública)', async () => {
    const app = await getTestApp()

    const res = await app.inject({ method: 'GET', url: '/config/features' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveProperty('ai')
  })
})

describe('GET /config/features — registro malformado', () => {
  it('trata valor fora do formato como ausente, sem erro ao cliente', async () => {
    mutableEnv.AI_FEATURES_ENABLED = true
    await prisma.appSetting.upsert({
      where:  { key: AI_SETTING_KEY },
      create: { key: AI_SETTING_KEY, value: { ligado: 'sim' } },
      update: { value: { ligado: 'sim' } },
    })
    invalidateAiAvailabilityCache()

    const res = await getFeatures()

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ai: { enabled: true, manageable: true } })
  })
})
