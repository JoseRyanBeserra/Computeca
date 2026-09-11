// src/repositories/resources/materials/pdf/materialPdfHabilidadesRepository.ts
import { prisma } from '../../../../database/prisma'

/**
 * Retorna a lista distinta de habilidades BNCC presentes nos materiais APROVADOS,
 * em ordem alfabética. Usada para popular o filtro do acervo público.
 */
export async function findDistinctHabilidades(): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ habilidade: string }[]>`
    SELECT DISTINCT unnest("habilidadesBncc") AS habilidade
    FROM "MaterialInstrucional"
    WHERE status = 'APPROVED'::"MIStatus" AND "deletedAt" IS NULL
    ORDER BY habilidade ASC
  `
  return rows.map((r) => r.habilidade)
}
