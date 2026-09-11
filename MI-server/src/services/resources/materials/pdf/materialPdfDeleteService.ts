// src/services/resources/materials/pdf/materialPdfDeleteService.ts
import type { Role } from '@prisma/client'
import type { IUploadedMI } from '../../../../@types/resources/materials/pdf'
import { findMaterialById } from '../../../../repositories/resources/materials/pdf/materialPdfViewRepository'
import { softDeleteMaterial } from '../../../../repositories/resources/materials/pdf/materialPdfDeleteRepository'
import { createAuditLog } from '../../../../repositories/audit/auditRepository'
import { validateRequest } from '../../../../utils/validateRequest'
import { materialPdfDeleteSchema } from '../../../../schemas/resources/materials/pdf/materialPdfDeleteSchema'
import { ERRORS, buildError } from '../../../../lib/errors/errors'
import { GeneralErrorResponse } from '../../../../errors/GeneralErrorResponse'
import { StatusCode } from '../../../../utils/statusCode'
import { logger } from '../../../../lib/logger'

interface MaterialPdfDeleteInput {
  materialId:  string
  deletedById: string
  actorRole:   Role
}

/**
 * Soft delete de um material instrucional: oculta o material de todas as
 * listagens/visualizações sem removê-lo do banco. Restrito a PROFESSOR/ADMIN
 * (autorização feita no controller). Registra AuditLog da ação.
 */
export async function materialPdfDeleteService(input: MaterialPdfDeleteInput): Promise<IUploadedMI> {
  logger.info('IN - materialPdfDeleteService')

  const { materialId, deletedById } = validateRequest(input, materialPdfDeleteSchema)

  // findMaterialById já exclui materiais deletados → 404 cobre "não existe" e "já deletado"
  const material = await findMaterialById(materialId)
  if (!material) {
    throw new GeneralErrorResponse(StatusCode.NOT_FOUND, buildError(ERRORS.ERRORS_RESOURCES.MI_NOT_FOUND))
  }

  const deleted = await softDeleteMaterial(materialId, deletedById)
  if (!deleted) {
    // Corrida: outro request deletou entre o find e o update
    throw new GeneralErrorResponse(StatusCode.NOT_FOUND, buildError(ERRORS.ERRORS_RESOURCES.MI_NOT_FOUND))
  }

  await createAuditLog({
    actorId:   deletedById,
    actorRole: input.actorRole,
    targetId:  materialId,
    action:    'MI_DELETED',
    metadata:  { title: material.title },
  })

  logger.info({ materialId }, 'OUT - materialPdfDeleteService')
  return material
}
