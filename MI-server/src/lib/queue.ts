import { Queue } from 'bullmq'
import { env } from '../env'
import { logger } from './logger'

export interface VectorizePdfJob {
  materialId: string
  storageKey: string
}

export const vectorizeQueue = new Queue<VectorizePdfJob>('vectorize-pdf', {
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

vectorizeQueue.on('error', (err) => {
  logger.warn({ err: err.message }, 'BullMQ: falha na conexão com Redis — jobs pausados até Redis estar disponível')
})

vectorizeQueue.waitUntilReady()
  .then(() => logger.info({ host: env.REDIS_HOST, port: env.REDIS_PORT }, 'BullMQ: conexão com Redis estabelecida ✅'))
  .catch(() => { /* erro já tratado pelo listener acima */ })
