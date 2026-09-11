// __tests__/unit/config/env.test.ts
// FR-008 — a aplicação precisa subir sem OPENAI_API_KEY quando a IA está
// desativada. Antes desta feature a chave era exigida incondicionalmente e a
// validação derrubava o processo na carga do módulo.
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'

// `env.ts` importa 'dotenv/config', que repovoa process.env a partir do .env do
// desenvolvedor a cada reimportação. Neutralizar o carregamento é o que permite
// controlar as variáveis a partir do teste.
vi.mock('dotenv/config', () => ({}))

const ORIGINAL_ENV = { ...process.env }

/** Variáveis mínimas para o schema passar, sem nada de IA. */
const BASE_ENV: Record<string, string> = {
  NODE_ENV:         'test',
  DATABASE_URL:     'postgresql://u:p@127.0.0.1:5432/db',
  JWT_SECRET:       'segredo_de_teste',
  ADMIN_EMAIL:      'admin@dcx.ufpb.br',
  ADMIN_PASSWORD:   'senha12345',
  MINIO_ACCESS_KEY: 'minioadmin',
  MINIO_SECRET_KEY: 'minioadmin',
}

async function loadEnv(overrides: Record<string, string | undefined>) {
  vi.resetModules()

  for (const key of Object.keys(process.env)) {
    if (key.startsWith('OPENAI') || key.startsWith('AI_')) delete process.env[key]
  }
  Object.assign(process.env, BASE_ENV)

  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }

  return import('../../../src/env')
}

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

afterAll(() => {
  process.env = { ...ORIGINAL_ENV }
  vi.resetModules()
})

describe('env — OPENAI_API_KEY condicionalmente obrigatória', () => {
  it('IA desligada e chave ausente: carrega normalmente', async () => {
    const { env } = await loadEnv({ AI_FEATURES_ENABLED: 'false', OPENAI_API_KEY: undefined })

    expect(env.AI_FEATURES_ENABLED).toBe(false)
    expect(env.OPENAI_API_KEY).toBeUndefined()
  })

  it('IA ligada e chave ausente: rejeita apontando OPENAI_API_KEY', async () => {
    await expect(
      loadEnv({ AI_FEATURES_ENABLED: 'true', OPENAI_API_KEY: undefined }),
    ).rejects.toThrow(/Invalid environment variables/i)
  })

  it('IA ligada e chave presente: carrega normalmente', async () => {
    const { env } = await loadEnv({ AI_FEATURES_ENABLED: 'true', OPENAI_API_KEY: 'sk-teste' })

    expect(env.AI_FEATURES_ENABLED).toBe(true)
    expect(env.OPENAI_API_KEY).toBe('sk-teste')
  })
})

describe('env — AI_FEATURES_ENABLED', () => {
  it('o padrão do projeto é desativado quando a variável não é declarada', async () => {
    const { env } = await loadEnv({ AI_FEATURES_ENABLED: undefined })

    expect(env.AI_FEATURES_ENABLED).toBe(false)
  })

  it('apenas a string "true" liga a IA — qualquer outro valor mantém desligada', async () => {
    for (const valor of ['false', 'TRUE', '1', 'sim', '']) {
      const { env } = await loadEnv({ AI_FEATURES_ENABLED: valor })
      expect(env.AI_FEATURES_ENABLED).toBe(false)
    }
  })
})
