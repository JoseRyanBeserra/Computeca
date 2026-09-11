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
import { getVectorizeQueue } from '../../../../lib/queue'
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
    // Com as funcionalidades de IA desativadas nenhum job é criado: a aprovação
    // conclui e o material fica disponível com `vectorStatus` em PENDING. O
    // acervo acumulado pode ser reprocessado depois por `npm run ai:backfill`.
    const queue = getVectorizeQueue()

    if (queue) {
      await queue.add('vectorize', { materialId, storageKey: material.storageKey })
    } else {
      logger.info(
        { materialId },
        'materialPdfReviewService: IA desativada — vetorização não agendada',
      )
    }
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
