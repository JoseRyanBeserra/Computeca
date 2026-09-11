// src/services/resources/materials/pdf/materialPdfAllListService.ts
import { z } from 'zod'
import { findAllMaterials, type AllMaterialsResult } from '../../../../repositories/resources/materials/pdf/materialPdfAllListRepository'
import { validateRequest } from '../../../../utils/validateRequest'
import { logger } from '../../../../lib/logger'

const allMaterialsQuerySchema = z.object({
  status:  z.enum(['PENDING_REVIEW', 'APPROVED', 'REJECTED']).optional(),
  page:    z.coerce.number().min(1).default(1),
  perPage: z.coerce.number().min(1).max(100).default(25),
})

export async function materialPdfAllListService(input: unknown): Promise<AllMaterialsResult> {
  logger.info('IN - materialPdfAllListService')
  const query = validateRequest(input, allMaterialsQuerySchema)
  const result = await findAllMaterials(query)
  logger.info('OUT - materialPdfAllListService')
  return result
}
