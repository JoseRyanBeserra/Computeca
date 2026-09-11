// src/services/resources/materials/pdf/materialPdfPublicListService.ts
import { z } from 'zod'
import { findAllMaterials, type AllMaterialsResult } from '../../../../repositories/resources/materials/pdf/materialPdfAllListRepository'
import { validateRequest } from '../../../../utils/validateRequest'
import { logger } from '../../../../lib/logger'

const publicListQuerySchema = z.object({
  page:    z.coerce.number().min(1).default(1),
  perPage: z.coerce.number().min(1).max(100).default(25),
  // Aceita o parâmetro repetido (habilidades=A&habilidades=B) ou único
  habilidades: z.preprocess(
    (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]),
    z.array(z.string()),
  ),
  // "true" → inclui também materiais sem habilidade
  semHabilidade: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === 'true'),
  // Busca por termo no título ou autor; string vazia é tratada como ausente
  search: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v ? v : undefined)),
})

export async function materialPdfPublicListService(input: unknown): Promise<AllMaterialsResult> {
  logger.info('IN - materialPdfPublicListService')
  const { page, perPage, habilidades, semHabilidade, search } = validateRequest(input, publicListQuerySchema)
  const result = await findAllMaterials({
    status:               'APPROVED',
    page,
    perPage,
    habilidades,
    includeSemHabilidade: semHabilidade,
    search,
  })
  logger.info('OUT - materialPdfPublicListService')
  return result
}
