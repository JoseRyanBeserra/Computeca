// __tests__/unit/config/features.test.ts
// Resolução da disponibilidade das funcionalidades de IA — a tabela-verdade dos
// dois níveis, o registro malformado e a invalidação de cache.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────
// Isola o resolvedor do banco. O `env` é substituído por objeto mutável para
// simular os dois valores do interruptor mestre sem recarregar o módulo.

const envMock = { AI_FEATURES_ENABLED: false }

vi.mock('../../../src/env', () => ({
  get env() {
    return envMock
  },
}))

vi.mock('../../../src/repositories/config/appSettingRepository', () => ({
  findAppSettingByKey: vi.fn(),
}))

vi.mock('../../../src/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

import {
  isAiEnabled,
  isAiManageable,
  invalidateAiAvailabilityCache,
  AI_SETTING_KEY,
} from '../../../src/constants/features'
import { findAppSettingByKey } from '../../../src/repositories/config/appSettingRepository'
import { logger } from '../../../src/lib/logger'

const findMock = vi.mocked(findAppSettingByKey)

function settingWith(value: unknown) {
  return { key: AI_SETTING_KEY, value, updatedAt: new Date(), updatedById: null } as never
}

beforeEach(() => {
  vi.clearAllMocks()
  invalidateAiAvailabilityCache()
  envMock.AI_FEATURES_ENABLED = false
})

afterEach(() => {
  invalidateAiAvailabilityCache()
})

describe('features — tabela-verdade dos dois níveis', () => {
  it('mestre desligado + registro ausente → desativada', async () => {
    envMock.AI_FEATURES_ENABLED = false
    findMock.mockResolvedValue(null)

    await expect(isAiEnabled()).resolves.toBe(false)
  })

  it('mestre desligado + registro true → desativada (banco não sobrepõe o ambiente)', async () => {
    envMock.AI_FEATURES_ENABLED = false
    findMock.mockResolvedValue(settingWith({ enabled: true }))

    await expect(isAiEnabled()).resolves.toBe(false)
    // Nem chega a consultar o banco: o curto-circuito é o que permite operar
    // em instalações sem os serviços de apoio no ar.
    expect(findMock).not.toHaveBeenCalled()
  })

  it('mestre ligado + registro ausente → ativada', async () => {
    envMock.AI_FEATURES_ENABLED = true
    findMock.mockResolvedValue(null)

    await expect(isAiEnabled()).resolves.toBe(true)
  })

  it('mestre ligado + registro true → ativada', async () => {
    envMock.AI_FEATURES_ENABLED = true
    findMock.mockResolvedValue(settingWith({ enabled: true }))

    await expect(isAiEnabled()).resolves.toBe(true)
  })

  it('mestre ligado + registro false → desativada', async () => {
    envMock.AI_FEATURES_ENABLED = true
    findMock.mockResolvedValue(settingWith({ enabled: false }))

    await expect(isAiEnabled()).resolves.toBe(false)
  })
})

describe('features — isAiManageable', () => {
  it('espelha o interruptor mestre', () => {
    envMock.AI_FEATURES_ENABLED = false
    expect(isAiManageable()).toBe(false)

    envMock.AI_FEATURES_ENABLED = true
    expect(isAiManageable()).toBe(true)
  })
})

describe('features — registro malformado', () => {
  it('trata valor fora do formato como ausente e registra advertência', async () => {
    envMock.AI_FEATURES_ENABLED = true
    findMock.mockResolvedValue(settingWith({ ligado: 'sim' }))

    await expect(isAiEnabled()).resolves.toBe(true)
    expect(logger.warn).toHaveBeenCalled()
  })

  it('trata falha de leitura como habilitada, sem propagar o erro', async () => {
    envMock.AI_FEATURES_ENABLED = true
    findMock.mockRejectedValue(new Error('banco fora do ar'))

    await expect(isAiEnabled()).resolves.toBe(true)
    expect(logger.warn).toHaveBeenCalled()
  })
})

describe('features — cache', () => {
  it('não reconsulta o banco enquanto o cache é válido', async () => {
    envMock.AI_FEATURES_ENABLED = true
    findMock.mockResolvedValue(settingWith({ enabled: false }))

    await isAiEnabled()
    await isAiEnabled()
    await isAiEnabled()

    expect(findMock).toHaveBeenCalledTimes(1)
  })

  it('reconsulta após a invalidação, refletindo o novo valor sem reinício', async () => {
    envMock.AI_FEATURES_ENABLED = true
    findMock.mockResolvedValue(settingWith({ enabled: false }))
    await expect(isAiEnabled()).resolves.toBe(false)

    findMock.mockResolvedValue(settingWith({ enabled: true }))
    invalidateAiAvailabilityCache()

    await expect(isAiEnabled()).resolves.toBe(true)
    expect(findMock).toHaveBeenCalledTimes(2)
  })
})
