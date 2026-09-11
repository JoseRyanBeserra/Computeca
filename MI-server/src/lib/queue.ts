import { Queue } from 'bullmq'
import { env } from '../env'
import { logger } from './logger'

export interface VectorizePdfJob {
  materialId: string
  storageKey: string
}

export const VECTORIZE_QUEUE_NAME = 'vectorize-pdf'

// A fila é criada SOB DEMANDA, nunca no import do módulo.
//
// Instanciar a Queue abre conexão com o Redis. Fazer isso no corpo do módulo
// significa que qualquer import na cadeia — mesmo em um fluxo que não enfileira
// nada — conecta ao Redis. Com as funcionalidades de IA desativadas o serviço
// sequer existe no ambiente, e a tentativa produziria erro recorrente.
let _queue: Queue<VectorizePdfJob> | null = null

/**
 * Devolve a fila de vetorização, criando-a na primeira chamada.
 *
 * Retorna `null` quando as funcionalidades de IA estão desativadas no ambiente —
 * nesse estado nenhum job deve ser criado e nenhuma conexão deve ser aberta.
 * Quem chama precisa tratar o `null`.
 */
export function getVectorizeQueue(): Queue<VectorizePdfJob> | null {
  if (!env.AI_FEATURES_ENABLED) return null

  if (_queue) return _queue

  _queue = new Queue<VectorizePdfJob>(VECTORIZE_QUEUE_NAME, {
    connection: {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type:  'exponential',
        delay: 5000,
      },
      removeOnComplete: 100,
      removeOnFail:     50,
    },
  })

  _queue.on('error', (err) => {
    logger.warn(
      { err: err.message },
      'BullMQ: falha na conexão com Redis — jobs pausados até Redis estar disponível',
    )
  })

  _queue.waitUntilReady()
    .then(() => logger.info(
      { host: env.REDIS_HOST, port: env.REDIS_PORT },
      'BullMQ: conexão com Redis estabelecida ✅',
    ))
    .catch(() => { /* erro já tratado pelo listener acima */ })

  return _queue
}

/** Encerra a fila, se aberta. Usado em testes e no desligamento do processo. */
export async function closeVectorizeQueue(): Promise<void> {
  if (!_queue) return
  await _queue.close()
  _queue = null
}
