// scripts/aiBackfill.ts
// Reprocessa o acervo aprovado que ficou sem vetorização.
//
// Executado SOB DEMANDA (`npm run ai:backfill`), nunca automaticamente: o custo
// de tokens é proporcional ao tamanho do acervo acumulado e a decisão de quando
// paga-lo é do administrador.
//
// Apenas ENFILEIRA — o processamento continua no worker, como todo trabalho
// pesado do projeto.
import 'dotenv/config'
import { prisma } from '../src/database/prisma'
import { env } from '../src/env'
import { getVectorizeQueue, closeVectorizeQueue } from '../src/lib/queue'
import { isAiEnabled } from '../src/constants/features'
import { logger } from '../src/lib/logger'

/**
 * `PENDING` e `FAILED` são reprocessáveis. `PROCESSING` fica de fora por
 * padrão: pode haver um job vivo, e reenfileirar duplicaria trabalho e custo.
 */
const STATUS_REPROCESSAVEIS = ['PENDING', 'FAILED'] as const

async function main(): Promise<void> {
  if (!env.AI_FEATURES_ENABLED) {
    console.error(
      '❌ Funcionalidades de IA desativadas (AI_FEATURES_ENABLED=false).\n' +
      '   Habilite a IA e suba os serviços de apoio antes de reprocessar:\n' +
      '     docker compose --profile ai up -d',
    )
    process.exitCode = 1
    return
  }

  if (!(await isAiEnabled())) {
    console.error(
      '❌ IA desligada pelo painel administrativo. Religue-a antes de reprocessar.',
    )
    process.exitCode = 1
    return
  }

  const pendentes = await prisma.materialInstrucional.findMany({
    where: {
      status:       'APPROVED',
      deletedAt:    null,
      vectorStatus: { in: [...STATUS_REPROCESSAVEIS] },
    },
    select: { id: true, title: true, storageKey: true, vectorStatus: true },
  })

  // Informa o total ANTES de iniciar — o administrador precisa saber o tamanho
  // do custo que está autorizando.
  console.log(`\n📋 Materiais aprovados aguardando vetorização: ${pendentes.length}`)

  if (pendentes.length === 0) {
    console.log('✅ Nada a reprocessar. O acervo está em dia.\n')
    return
  }

  const porStatus = pendentes.reduce<Record<string, number>>((acc, m) => {
    acc[m.vectorStatus] = (acc[m.vectorStatus] ?? 0) + 1
    return acc
  }, {})
  console.log(`   Por estado: ${JSON.stringify(porStatus)}`)

  const queue = getVectorizeQueue()
  if (!queue) {
    console.error('❌ Fila indisponível. Verifique se o serviço de fila está no ar.')
    process.exitCode = 1
    return
  }

  console.log('\n⏳ Enfileirando…')

  let enfileirados = 0
  for (const material of pendentes) {
    try {
      await queue.add('vectorize', {
        materialId: material.id,
        storageKey: material.storageKey,
      })
      enfileirados++
    } catch (err) {
      logger.error({ err, materialId: material.id }, 'aiBackfill: falha ao enfileirar')
    }
  }

  console.log(`\n✅ ${enfileirados} de ${pendentes.length} enfileirados.`)
  console.log('   O worker processará a fila. Acompanhe com: npm run worker\n')
}

main()
  .catch((err) => {
    console.error('❌ Falha no reprocessamento:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeVectorizeQueue().catch(() => { /* nada a fazer */ })
    await prisma.$disconnect()
  })
