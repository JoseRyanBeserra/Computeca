// __tests__/integration/materials/materialReviewNoQueue.test.ts
// FR-005 — com a IA desativada, aprovar um material conclui sem agendar
// vetorização. O material fica disponível para consulta e download mesmo nunca
// tendo sido processado.
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'

// Espiona a fila para provar que nenhum job é criado.
const queueAdd = vi.fn()
const getVectorizeQueueMock = vi.fn()

vi.mock('../../../src/lib/queue', () => ({
  getVectorizeQueue:   () => getVectorizeQueueMock(),
  closeVectorizeQueue: vi.fn().mockResolvedValue(undefined),
  VECTORIZE_QUEUE_NAME: 'vectorize-pdf',
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
  // Espelha o comportamento real de getVectorizeQueue(): null com a IA off.
  getVectorizeQueueMock.mockReturnValue(enabled ? { add: queueAdd } : null)
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

describe('Aprovação de material com a IA desativada', () => {
  it('conclui com sucesso e não cria job de vetorização', async () => {
    const app = await getTestApp()
    const professor = await createUserAndLogin('prof@test.com', 'PROFESSOR')
    const autor = await createUserAndLogin('autor@test.com', 'INSTITUTIONALIZED')
    const material = await createMaterial({
      uploadedById: autor.userId,
      status:       'PENDING_REVIEW',
    })

    setAi(false)

    const res = await app.inject({
      method:  'PATCH',
      url:     `/mis/${material.id}/review`,
      headers: { authorization: `Bearer ${professor.accessToken}` },
      payload: { decision: 'APPROVED' },
    })

    expect(res.statusCode).toBe(200)
    expect(queueAdd).not.toHaveBeenCalled()
  })

  it('o material fica APPROVED e disponível, com vectorStatus preservado em PENDING', async () => {
    const app = await getTestApp()
    const professor = await createUserAndLogin('prof@test.com', 'PROFESSOR')
    const autor = await createUserAndLogin('autor@test.com', 'INSTITUTIONALIZED')
    const material = await createMaterial({
      uploadedById: autor.userId,
      status:       'PENDING_REVIEW',
    })

    setAi(false)

    await app.inject({
      method:  'PATCH',
      url:     `/mis/${material.id}/review`,
      headers: { authorization: `Bearer ${professor.accessToken}` },
      payload: { decision: 'APPROVED' },
    })

    const persistido = await prisma.materialInstrucional.findUnique({
      where:  { id: material.id },
      select: { status: true, vectorStatus: true },
    })

    expect(persistido?.status).toBe('APPROVED')
    expect(persistido?.vectorStatus).toBe('PENDING')
  })
})

describe('Aprovação de material com a IA ativada', () => {
  it('agenda a vetorização normalmente', async () => {
    const app = await getTestApp()
    const professor = await createUserAndLogin('prof@test.com', 'PROFESSOR')
    const autor = await createUserAndLogin('autor@test.com', 'INSTITUTIONALIZED')
    const material = await createMaterial({
      uploadedById: autor.userId,
      status:       'PENDING_REVIEW',
    })

    setAi(true)

    const res = await app.inject({
      method:  'PATCH',
      url:     `/mis/${material.id}/review`,
      headers: { authorization: `Bearer ${professor.accessToken}` },
      payload: { decision: 'APPROVED' },
    })

    expect(res.statusCode).toBe(200)
    expect(queueAdd).toHaveBeenCalledWith(
      'vectorize',
      expect.objectContaining({ materialId: material.id }),
    )
  })
})
