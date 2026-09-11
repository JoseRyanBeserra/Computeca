// src/controllers/organizations/uploadOrgMaterialController.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import { materialPdfUploadService } from '../../../services/resources/materials/pdf/materialPdfUploadService'
import { requireMembership } from '../../../repositories/organizations/orgMembersRepository'
import { httpResponse, httpError } from '../../../utils/http'
import { StatusCode } from '../../../utils/statusCode'
import { ERRORS, buildError } from '../../../lib/errors/errors'
import { GeneralErrorResponse } from '../../../errors/GeneralErrorResponse'
import { logger } from '../../../lib/logger'

const ctx = 'uploadOrgMaterialController'

async function collectBuffer(stream: AsyncIterable<Buffer>): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

/**
 * POST /organizations/:orgId/mis
 *
 * Aceita `multipart/form-data` com:
 *   - file  : arquivo PDF (obrigatório, campo "file")
 *   - title : título do material (opcional — padrão: nome do arquivo sem extensão)
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

    let fileBuffer:       Buffer | null = null
    let originalFileName: string | null = null
    let mimeType:         string | null = null
    let title:            string | undefined

    for await (const part of request.parts()) {
      if (part.type === 'field') {
        if (part.fieldname === 'title') {
          title = String(part.value).trim()
        }
      } else {
        if (part.fieldname === 'file') {
          originalFileName = part.filename ?? null
          mimeType         = part.mimetype
          fileBuffer       = await collectBuffer(part.file)
        } else {
          part.file.resume()
        }
      }
    }

    if (!fileBuffer || !originalFileName || !mimeType) {
      throw new GeneralErrorResponse(
        StatusCode.UNSUPPORTED_MEDIA_TYPE,
        buildError(ERRORS.ERRORS_RESOURCES.INVALID_FILE_TYPE),
      )
    }

    const resolvedTitle = title?.length
      ? title
      : originalFileName.replace(/\.pdf$/i, '').trim() || originalFileName

    const mi = await materialPdfUploadService({
      title:           resolvedTitle,
      buffer:          fileBuffer,
      originalFileName,
      mimeType,
      uploadedById:    request.user.sub,
      organizationIds: [orgId],
    })

    httpResponse({ reply, statusCode: StatusCode.CREATED, data: mi, context: ctx })
  } catch (error) {
    httpError({ error, context: ctx })
  }
}

