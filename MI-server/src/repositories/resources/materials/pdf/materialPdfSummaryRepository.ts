// src/repositories/resources/materials/pdf/materialPdfSummaryRepository.ts
import { prisma } from '../../../../database/prisma'
import type { MIStatus, VectorStatus, SummaryStatus } from '@prisma/client'

export interface MaterialForSummary {
  id:                 string
  status:             MIStatus
  vectorStatus:       VectorStatus
  summary:            string | null
  summaryStatus:      SummaryStatus
  summaryGeneratedAt: Date | null
}

export async function findMaterialForSummary(id: string): Promise<MaterialForSummary | null> {
  return prisma.materialInstrucional.findFirst({
    where:  { id, deletedAt: null },
    select: {
      id:                 true,
      status:             true,
      vectorStatus:       true,
      summary:            true,
      summaryStatus:      true,
      summaryGeneratedAt: true,
    },
  })
}

/**
 * Reserva a geração do resumo de forma atômica.
 *
 * Só marca `PROCESSING` quando o material está em `PENDING` ou `FAILED` — assim,
 * em cliques simultâneos, apenas uma requisição "ganha" (count === 1) e gera o
 * resumo; as demais recebem count === 0 e sabem que outra já está gerando.
 */
export async function claimSummaryGeneration(id: string): Promise<boolean> {
  const { count } = await prisma.materialInstrucional.updateMany({
    where: { id, summaryStatus: { in: ['PENDING', 'FAILED'] } },
    data:  { summaryStatus: 'PROCESSING' },
  })
  return count === 1
}

export async function saveSummary(id: string, summary: string): Promise<Date> {
  const generatedAt = new Date()
  await prisma.materialInstrucional.update({
    where: { id },
    data:  { summary, summaryStatus: 'DONE', summaryGeneratedAt: generatedAt },
  })
  return generatedAt
}

export async function markSummaryFailed(id: string): Promise<void> {
  await prisma.materialInstrucional
    .update({ where: { id }, data: { summaryStatus: 'FAILED' } })
    .catch(() => {})
}
