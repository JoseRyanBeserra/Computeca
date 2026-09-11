// src/services/resources/materials/pdf/materialPdfReviewService.ts
import type { IUploadedMI } from '../../../../@types/resources/materials/pdf'
import { findMaterialById } from '../../../../repositories/resources/materials/pdf/materialPdfViewRepository'
import { updateMaterialStatus } from '../../../../repositories/resources/materials/pdf/materialPdfReviewRepository'
import { createAuditLog } from '../../../../repositories/audit/auditRepository'
import { validateRequest } from '../../../../utils/validateRequest'
import { materialPdfReviewSchema } from '../../../../schemas/resources/materials/pdf/materialPdfReviewSchema'
import { ERRORS, buildError } from '../../../../lib/errors/errors'
import { GeneralErrorResponse } from '../../../../errors/GeneralErrorResponse'
import { StatusCode } from '../../../../utils/statusCode'
import { vectorizeQueue } from '../../../../lib/queue'
import { PROFESSOR, ADMIN } from '../../../../constants/roles'
import { logger } from '../../../../lib/logger'

export async function materialPdfReviewService(input: unknown): Promise<IUploadedMI> {
  logger.info('IN - materialPdfReviewService')

  const { materialId, decision, reviewerId } = validateRequest(input, materialPdfReviewSchema)

  const material = await findMaterialById(materialId)

  if (!material) {
    throw new GeneralErrorResponse(StatusCode.NOT_FOUND, buildError(ERRORS.ERRORS_RESOURCES.MI_NOT_FOUND))
  }

  if (material.status !== 'PENDING_REVIEW') {
    throw new GeneralErrorResponse(StatusCode.BAD_REQUEST, buildError(ERRORS.ERRORS_RESOURCES.MI_NOT_PENDING))
  }

  const updated = await updateMaterialStatus(materialId, decision)

  if (decision === 'APPROVED') {
    await vectorizeQueue.add('vectorize', { materialId, storageKey: material.storageKey })
  }

  await createAuditLog({
    actorId:   reviewerId,
    actorRole: PROFESSOR,
    targetId:  materialId,
    action:    `MI_${decision}`,
    metadata:  { title: material.title, decision },
  })

  logger.info('OUT - materialPdfReviewService')
  return updated
}
