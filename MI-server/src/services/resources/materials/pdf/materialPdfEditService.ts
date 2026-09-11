// src/services/resources/materials/pdf/materialPdfEditService.ts
//
// Edição de um Material Instrucional já cadastrado. Restrito a ADMIN — a
// autorização é aplicada no controller (Princípio II).
import type { Role } from '@prisma/client'
import type { EditMIInput, IUploadedMI } from '../../../../@types/resources/materials/pdf'
import { findMaterialById } from '../../../../repositories/resources/materials/pdf/materialPdfViewRepository'
import { updateMaterial } from '../../../../repositories/resources/materials/pdf/materialPdfEditRepository'
import { createAuditLog } from '../../../../repositories/audit/auditRepository'
import { buildMaterialEditDiff } from '../../../../utils/buildMaterialEditDiff'
import { validateRequest } from '../../../../utils/validateRequest'
import { materialPdfEditSchema } from '../../../../schemas/resources/materials/pdf/materialPdfEditSchema'
import { ERRORS, buildError } from '../../../../lib/errors/errors'
import { GeneralErrorResponse } from '../../../../errors/GeneralErrorResponse'
import { StatusCode } from '../../../../utils/statusCode'
import { logger } from '../../../../lib/logger'

export interface MaterialPdfEditServiceArgs extends EditMIInput {
  actorRole: Role
}

export async function materialPdfEditService(
  input: MaterialPdfEditServiceArgs,
): Promise<IUploadedMI> {
  logger.info('IN - materialPdfEditService')

  // Validação na fronteira do service (Princípio I). O ZodError resultante vira
  // 422 no errorHandler global. Validar aqui — e não só no controller — recusa
  // também a chamada interna inválida.
  const { materialId, title, description, habilidadesBncc, editedById } =
    validateRequest(input, materialPdfEditSchema)
  const { actorRole } = input

  // findMaterialById já filtra `deletedAt` — o 404 cobre "não existe" e
  // "removido do acervo" de uma vez (FR-015). Editar material retirado o
  // reintroduziria pela porta dos fundos.
  const material = await findMaterialById(materialId)
  if (!material) {
    throw new GeneralErrorResponse(
      StatusCode.NOT_FOUND,
      buildError(ERRORS.ERRORS_RESOURCES.MI_NOT_FOUND),
    )
  }

  const diff = buildMaterialEditDiff(
    {
      title:            material.title,
      description:      material.description,
      habilidadesBncc:  material.habilidadesBncc,
      storageKey:       material.storageKey,
      originalFileName: material.originalFileName,
      status:           material.status,
    },
    { title, description, habilidadesBncc },
  )

  const atualizado = await updateMaterial(materialId, {
    title,
    description,
    habilidadesBncc,
  })

  // Princípio III: toda ação que altera estado grava AuditLog. O registro guarda
  // apenas o que mudou, com valor anterior e novo — é o que permite reconstruir
  // o que existia antes, num acervo cujos metadados passaram a ser mutáveis.
  await createAuditLog({
    actorId:   editedById,
    actorRole,
    targetId:  materialId,
    action:    'MI_UPDATED',
    metadata:  diff as unknown as Record<string, unknown>,
  })

  logger.info({ materialId, changed: diff.changed }, 'OUT - materialPdfEditService')
  return atualizado
}
