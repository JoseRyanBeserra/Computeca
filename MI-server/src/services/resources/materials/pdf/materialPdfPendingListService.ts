// src/services/resources/materials/pdf/materialPdfPendingListService.ts
import type { IPendingMaterial } from '../../../../@types/resources/materials/pdf'
import { findPendingMaterials } from '../../../../repositories/resources/materials/pdf/materialPdfPendingListRepository'
import { omitAiFieldsFromList } from '../../../../utils/omitAiFields'
import { isAiEnabled } from '../../../../constants/features'
import { logger } from '../../../../lib/logger'

export async function materialPdfPendingListService(params: {
  reviewerId:   string
  reviewerRole: string
}): Promise<IPendingMaterial[]> {
  logger.info('IN - materialPdfPendingListService')
  const materials = await findPendingMaterials(params)
  logger.info('OUT - materialPdfPendingListService')
  return omitAiFieldsFromList(materials, await isAiEnabled())
}
