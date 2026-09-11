// src/services/resources/materials/pdf/materialPdfHabilidadesService.ts
import { findDistinctHabilidades } from '../../../../repositories/resources/materials/pdf/materialPdfHabilidadesRepository'
import { logger } from '../../../../lib/logger'

export async function materialPdfHabilidadesService(): Promise<string[]> {
  logger.info('IN - materialPdfHabilidadesService')
  const habilidades = await findDistinctHabilidades()
  logger.info('OUT - materialPdfHabilidadesService')
  return habilidades
}
