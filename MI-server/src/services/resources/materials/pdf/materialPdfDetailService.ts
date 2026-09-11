// src/services/resources/materials/pdf/materialPdfDetailService.ts
import type { IPendingMaterial } from '../../../../@types/resources/materials/pdf'
import { findMaterialDetailById } from '../../../../repositories/resources/materials/pdf/materialPdfViewRepository'
import { validateRequest } from '../../../../utils/validateRequest'
import { materialPdfPresignedUrlSchema } from '../../../../schemas/resources/materials/pdf/materialPdfPresignedUrlSchema'
import { ERRORS, buildError } from '../../../../lib/errors/errors'
import { GeneralErrorResponse } from '../../../../errors/GeneralErrorResponse'
import { StatusCode } from '../../../../utils/statusCode'
import { logger } from '../../../../lib/logger'

/**
 * Retorna os metadados de um material específico (inclui autor e habilidades BNCC).
 *
 * O service não impõe política de acesso por si só — o chamador passa `accessPolicy`
 * para aplicar a regra do fluxo (público, dono, professor/admin).
 */
export async function materialPdfDetailService(
  input: unknown,
  accessPolicy?: (material: IPendingMaterial) => void,
): Promise<IPendingMaterial> {
  logger.info('IN - materialPdfDetailService')

  const { materialId } = validateRequest(input, materialPdfPresignedUrlSchema)

  const material = await findMaterialDetailById(materialId)
  if (!material) {
    throw new GeneralErrorResponse(StatusCode.NOT_FOUND, buildError(ERRORS.ERRORS_RESOURCES.MI_NOT_FOUND))
  }

  accessPolicy?.(material)

  logger.info('OUT - materialPdfDetailService')
  return material
}
