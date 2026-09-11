// src/server.ts
import { buildApp } from './app'
import { ensureBucket } from './lib/minio'
import { ensureQdrantCollection } from './lib/qdrant'
import { env } from './env'

const app = buildApp()

async function main() {
  try {
    await ensureBucket()
    console.log('✅ MinIO bucket pronto')
  } catch (err) {
    console.warn('⚠️  MinIO não acessível na inicialização — subindo sem armazenamento:', (err as Error).message)
  }

  try {
    await ensureQdrantCollection()
  } catch (err) {
    console.warn('⚠️  Qdrant não acessível na inicialização — chat com IA indisponível:', (err as Error).message)
  }

  app.listen({ port: env.PORT, host: '0.0.0.0' }, (err) => {
    if (err) {
      app.log.error(err)
      process.exit(1)
    }
    console.log(`🚀 MI-server running on http://0.0.0.0:${env.PORT}`)
  })
}

main()
