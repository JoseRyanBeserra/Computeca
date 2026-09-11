// src/lib/minio.ts
import { Client } from 'minio'
import { env } from '../env'
import { logger } from './logger'

export const minioClient = new Client({
  endPoint:  env.MINIO_ENDPOINT,
  port:      env.MINIO_PORT,
  useSSL:    env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
  region:    env.MINIO_REGION,
})

// Usado somente para gerar URLs pré-assinadas: aponta para o endpoint público
// para que os links sejam acessíveis pelo browser fora da rede interna Docker.
export const minioPublicClient: Client = env.MINIO_PUBLIC_ENDPOINT
  ? new Client({
      endPoint:  env.MINIO_PUBLIC_ENDPOINT,
      port:      env.MINIO_PUBLIC_PORT,
      useSSL:    env.MINIO_PUBLIC_USE_SSL,
      accessKey: env.MINIO_ACCESS_KEY,
      secretKey: env.MINIO_SECRET_KEY,
      region:    env.MINIO_REGION,
    })
  : minioClient

export const MINIO_BUCKET = env.MINIO_BUCKET

/**
 * Garante que o bucket configurado existe no MinIO.
 * Deve ser chamado na inicialização do servidor.
 * Cria o bucket automaticamente caso ele não exista ainda.
 */
export async function ensureBucket(): Promise<void> {
  try {
    const exists = await minioClient.bucketExists(MINIO_BUCKET)
    if (!exists) {
      await minioClient.makeBucket(MINIO_BUCKET)
      logger.info(`MinIO: bucket "${MINIO_BUCKET}" criado com sucesso.`)
    } else {
      logger.info(`MinIO: bucket "${MINIO_BUCKET}" já existe.`)
    }
  } catch (err) {
    logger.error({ err }, 'MinIO: falha ao verificar/criar bucket na inicialização.')
    throw err
  }
}
