// src/lib/aiReadiness.ts
// Verificação de alcance dos serviços de apoio da IA na inicialização (FR-018).
//
// Só executa quando a IA está habilitada no ambiente. Nunca impede a subida da
// aplicação: reporta e segue.
//
// O Redis precisa de verificação explícita porque a fila passou a ser criada sob
// demanda — sem isto, sua ausência só apareceria quando alguém aprovasse um
// material, que é exatamente o "falhar silenciosamente a cada requisição" que a
// especificação quer evitar.
import { env } from '../env'
import { logger } from './logger'
import { getVectorizeQueue, closeVectorizeQueue } from './queue'
import { ensureQdrantCollection } from './qdrant'

/** Tempo máximo de espera por serviço antes de considerar inalcançável. */
const READINESS_TIMEOUT_MS = 5000

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label}: sem resposta em ${ms}ms`)), ms),
    ),
  ])
}

export interface AiReadinessReport {
  /** A verificação chegou a rodar (só roda com a IA habilitada). */
  checked: boolean
  redis:  boolean
  qdrant: boolean
}

/**
 * Verifica se fila e busca vetorial estão alcançáveis.
 *
 * Com a IA desativada não verifica nada e não abre conexão alguma — é o que
 * permite a aplicação subir num ambiente onde esses serviços nem existem.
 */
export async function checkAiServicesReadiness(): Promise<AiReadinessReport> {
  if (!env.AI_FEATURES_ENABLED) {
    return { checked: false, redis: false, qdrant: false }
  }

  const [redis, qdrant] = await Promise.all([checkRedis(), checkQdrant()])
  return { checked: true, redis, qdrant }
}

async function checkRedis(): Promise<boolean> {
  const queue = getVectorizeQueue()

  if (!queue) {
    logger.warn('Verificação de IA: fila indisponível — vetorização não será agendada')
    return false
  }

  try {
    await withTimeout(queue.waitUntilReady(), READINESS_TIMEOUT_MS, 'Redis')
    logger.info(
      { host: env.REDIS_HOST, port: env.REDIS_PORT },
      'Verificação de IA: Redis alcançável ✅',
    )
    return true
  } catch (err) {
    logger.warn(
      { err: (err as Error).message, host: env.REDIS_HOST, port: env.REDIS_PORT },
      'Verificação de IA: Redis INALCANÇÁVEL — a IA está ligada, mas a vetorização de ' +
      'novos materiais não será agendada. Suba o serviço de fila ' +
      '(docker compose --profile ai up -d) ou desligue AI_FEATURES_ENABLED.',
    )
    // Descarta a instância para que a próxima tentativa reconecte do zero.
    await closeVectorizeQueue().catch(() => { /* nada a fazer */ })
    return false
  }
}

async function checkQdrant(): Promise<boolean> {
  try {
    await withTimeout(ensureQdrantCollection(), READINESS_TIMEOUT_MS, 'Qdrant')
    return true
  } catch (err) {
    logger.warn(
      { err: (err as Error).message, url: env.QDRANT_URL },
      'Verificação de IA: Qdrant INALCANÇÁVEL — chat e resumo ficarão indisponíveis. ' +
      'Suba o serviço de busca vetorial (docker compose --profile ai up -d) ' +
      'ou desligue AI_FEATURES_ENABLED.',
    )
    return false
  }
}
