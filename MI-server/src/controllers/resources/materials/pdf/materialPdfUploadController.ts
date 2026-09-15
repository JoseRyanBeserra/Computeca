// src/controllers/resources/materials/pdf/materialPdfUploadController.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import { materialPdfUploadService } from '../../../../services/resources/materials/pdf/materialPdfUploadService'
import { httpResponse, httpError } from '../../../../utils/http'
import { StatusCode } from '../../../../utils/statusCode'
import { ERRORS, buildError } from '../../../../lib/errors/errors'
import { GeneralErrorResponse } from '../../../../errors/GeneralErrorResponse'
import { logger } from '../../../../lib/logger'
import { parseMaterialMultipart } from './shared/parseMaterialMultipart'
import type { IMaterialLink } from '../../../../@types/resources/materials/pdf'

const ctx = 'materialPdfUploadController'

// ── Helpers ───────────────────────────────────────────────────────────────────

// ── Controller ────────────────────────────────────────────────────────────────

/**
 * POST /mis
 *
 * Aceita `multipart/form-data` com:
 *   - file  : arquivo PDF (obrigatório, campo "file")
 *   - title       : título do material (OBRIGATÓRIO, até 255 caracteres)
 *   - description : descrição do material (OBRIGATÓRIA, 50 a 2000 caracteres)
 *   - relatedLinks: array JSON de { label, url } (opcional, até 10, só http/https)
 *
 * Middlewares aplicados na rota:
 *   preHandler: [authenticate, requireUploadPermission]
 */
export async function materialPdfUploadController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  logger.info(`IN - ${ctx}`)

  try {
    const { fileBuffer, originalFileName, mimeType, title, description, habilidadesBncc, relatedLinks, organizationIds } =
      await parseMaterialMultipart(request)

    if (!fileBuffer || !originalFileName || !mimeType) {
      throw new GeneralErrorResponse(StatusCode.UNSUPPORTED_MEDIA_TYPE, buildError(ERRORS.ERRORS_RESOURCES.INVALID_FILE_TYPE))
    }

    const mi = await materialPdfUploadService({
      // Título e descrição chegam como vieram do formulário. O servidor NÃO
      // adivinha mais o título a partir do nome do arquivo: ambos são exigidos
      // pelo schema do service, que recusa com 422 se faltarem.
      title:           title as string,
      description:     description as string,
      buffer:          fileBuffer,
      originalFileName,
      mimeType,
      habilidadesBncc,
      // Ainda não validados: o schema do service recusa com 422 o que não servir.
      relatedLinks:    relatedLinks as IMaterialLink[],
      uploadedById:    request.user.sub,
      organizationIds,
    })

    httpResponse({ reply, statusCode: StatusCode.CREATED, data: mi, context: ctx })
  } catch (error) {
    httpError({ error, context: ctx })
  }
}
