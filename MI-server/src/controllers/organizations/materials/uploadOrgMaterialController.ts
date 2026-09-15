// src/controllers/organizations/uploadOrgMaterialController.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import { materialPdfUploadService } from '../../../services/resources/materials/pdf/materialPdfUploadService'
import { requireMembership } from '../../../repositories/organizations/orgMembersRepository'
import { httpResponse, httpError } from '../../../utils/http'
import { StatusCode } from '../../../utils/statusCode'
import { ERRORS, buildError } from '../../../lib/errors/errors'
import { GeneralErrorResponse } from '../../../errors/GeneralErrorResponse'
import { logger } from '../../../lib/logger'

import { parseMaterialMultipart } from '../../resources/materials/pdf/shared/parseMaterialMultipart'
import type { IMaterialLink } from '../../../@types/resources/materials/pdf'

const ctx = 'uploadOrgMaterialController'

/**
 * POST /organizations/:orgId/mis
 *
 * Aceita `multipart/form-data` com:
 *   - file  : arquivo PDF (obrigatório, campo "file")
 *   - title       : título do material (OBRIGATÓRIO, até 255 caracteres)
 *   - description : descrição do material (OBRIGATÓRIA, 50 a 2000 caracteres)
 *
 * O orgId vem do parâmetro de rota e é vinculado automaticamente ao MI.
 */
export async function uploadOrgMaterialController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  logger.info(`IN - ${ctx}`)

  try {
    const { orgId } = request.params as { orgId: string }

    await requireMembership(orgId, request.user.sub)

    // Parse compartilhado com POST /mis: é o que garante que os dois caminhos
    // de cadastro nunca divirjam nos campos exigidos. Como efeito colateral,
    // esta rota passa a aceitar habilidades BNCC, que o laço próprio ignorava.
    const { fileBuffer, originalFileName, mimeType, title, description, habilidadesBncc, relatedLinks } =
      await parseMaterialMultipart(request)

    if (!fileBuffer || !originalFileName || !mimeType) {
      throw new GeneralErrorResponse(
        StatusCode.UNSUPPORTED_MEDIA_TYPE,
        buildError(ERRORS.ERRORS_RESOURCES.INVALID_FILE_TYPE),
      )
    }

    const mi = await materialPdfUploadService({
      // Título e descrição vêm de quem cadastra; o servidor não adivinha mais o
      // título a partir do nome do arquivo. O schema do service recusa com 422.
      title:           title as string,
      description:     description as string,
      buffer:          fileBuffer,
      originalFileName,
      mimeType,
      habilidadesBncc,
      relatedLinks:    relatedLinks as IMaterialLink[],
      uploadedById:    request.user.sub,
      organizationIds: [orgId],
    })

    httpResponse({ reply, statusCode: StatusCode.CREATED, data: mi, context: ctx })
  } catch (error) {
    httpError({ error, context: ctx })
  }
}

