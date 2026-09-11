// __tests__/integration/materials/materialAiDisabled.test.ts
// FR-004 e FR-007 — recusa uniforme das operações de IA.
// Contrato: specs/001-disable-ai-features/contracts/ai-disabled-error.md
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'

// Espiona o cliente de IA para provar que nenhuma chamada é emitida.
const chatCreate       = vi.fn()
const embeddingsCreate = vi.fn()
const moderationCreate = vi.fn()

vi.mock('../../../src/lib/openai', () => ({
  getOpenAiClient: () => ({
    chat:        { completions: { create: chatCreate } },
    embeddings:  { create: embeddingsCreate },
    moderations: { create: moderationCreate },
  }),
}))

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
  vi.clearAllMocks()
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

async function materialAprovado() {
  const owner = await createUserAndLogin('owner@test.com', 'PROFESSOR')
  const material = await createMaterial({ uploadedById: owner.userId, status: 'APPROVED' })
  return { owner, material }
}

describe('Operações de IA com a funcionalidade desativada', () => {
  it('POST /mis/:id/chat responde 503 com code AI_DISABLED', async () => {
    const app = await getTestApp()
    const { owner, material } = await materialAprovado()
    setAi(false)

    const res = await app.inject({
      method:  'POST',
      url:     `/mis/${material.id}/chat`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
      payload: { question: 'do que trata este material?' },
    })

    expect(res.statusCode).toBe(503)
    expect(res.json().code).toBe('AI_DISABLED')
  })

  it('GET /mis/:id/summary responde 503 com code AI_DISABLED', async () => {
    const app = await getTestApp()
    const { owner, material } = await materialAprovado()
    setAi(false)

    const res = await app.inject({
      method:  'GET',
      url:     `/mis/${material.id}/summary`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
    })

    expect(res.statusCode).toBe(503)
    expect(res.json().code).toBe('AI_DISABLED')
  })

  it('nenhuma chamada ao provedor de IA é emitida (FR-007)', async () => {
    const app = await getTestApp()
    const { owner, material } = await materialAprovado()
    setAi(false)

    await app.inject({
      method:  'POST',
      url:     `/mis/${material.id}/chat`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
      payload: { question: 'pergunta' },
    })
    await app.inject({
      method:  'GET',
      url:     `/mis/${material.id}/summary`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
    })

    expect(chatCreate).not.toHaveBeenCalled()
    expect(embeddingsCreate).not.toHaveBeenCalled()
    expect(moderationCreate).not.toHaveBeenCalled()
  })
})

describe('Ordem dos preHandler — autenticação antes da disponibilidade', () => {
  it('POST /mis/:id/chat sem token responde 401, nunca 503', async () => {
    const app = await getTestApp()
    const { material } = await materialAprovado()
    setAi(false)

    const res = await app.inject({
      method:  'POST',
      url:     `/mis/${material.id}/chat`,
      payload: { question: 'pergunta' },
    })

    expect(res.statusCode).toBe(401)
  })

  it('GET /mis/:id/summary sem token responde 401, nunca 503', async () => {
    const app = await getTestApp()
    const { material } = await materialAprovado()
    setAi(false)

    const res = await app.inject({ method: 'GET', url: `/mis/${material.id}/summary` })

    expect(res.statusCode).toBe(401)
  })
})

describe('Operações de IA com a funcionalidade ativada', () => {
  it('as rotas deixam de recusar por indisponibilidade', async () => {
    const app = await getTestApp()
    const { owner, material } = await materialAprovado()
    setAi(true)

    const res = await app.inject({
      method:  'GET',
      url:     `/mis/${material.id}/summary`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
    })

    // O material não está vetorizado, então o fluxo recusa por OUTRO motivo —
    // o que importa é que não é mais 503 AI_DISABLED.
    expect(res.statusCode).not.toBe(503)
    expect(res.json().code).not.toBe('AI_DISABLED')
  })

  it('desligar pelo painel volta a recusar, na mesma execução da aplicação', async () => {
    const app = await getTestApp()
    const { owner, material } = await materialAprovado()

    setAi(true)
    await prisma.appSetting.upsert({
      where:  { key: AI_SETTING_KEY },
      create: { key: AI_SETTING_KEY, value: { enabled: false } },
      update: { value: { enabled: false } },
    })
    invalidateAiAvailabilityCache()

    const res = await app.inject({
      method:  'GET',
      url:     `/mis/${material.id}/summary`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
    })

    expect(res.statusCode).toBe(503)
    expect(res.json().code).toBe('AI_DISABLED')
  })
})
