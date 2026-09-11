// src/services/resources/materials/pdf/materialPdfListByUserService.ts
import type { IUploadedMI } from '../../../../@types/resources/materials/pdf'
import { findMaterialsByUserId } from '../../../../repositories/resources/materials/pdf/materialPdfListByUserRepository'
import { validateUserId } from '../../../../utils/validateUUID'
import { logger } from '../../../../lib/logger'

export interface ListByUserInput {
  userId: string | null | undefined
}

export async function materialPdfListByUserService(input: ListByUserInput): Promise<IUploadedMI[]> {
  logger.info('IN - materialPdfListByUserService')

  validateUserId(input.userId)

  const materials = await findMaterialsByUserId(input.userId)

  logger.info('OUT - materialPdfListByUserService')
  return materials
}
