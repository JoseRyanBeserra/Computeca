// src/controllers/resources/materials/pdf/materialPdfUploadController.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import { materialPdfUploadService } from '../../../../services/resources/materials/pdf/materialPdfUploadService'
import { httpResponse, httpError } from '../../../../utils/http'
import { StatusCode } from '../../../../utils/statusCode'
import { ERRORS, buildError } from '../../../../lib/errors/errors'
import { GeneralErrorResponse } from '../../../../errors/GeneralErrorResponse'
import { logger } from '../../../../lib/logger'

const ctx = 'materialPdfUploadController'

// ── Helpers ───────────────────────────────────────────────────────────────────

async function collectBuffer(stream: AsyncIterable<Buffer>): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

interface ParsedMultipart {
  fileBuffer:       Buffer | null
  originalFileName: string | null
  mimeType:         string | null
  title:            string | undefined
  habilidadesBncc:  string[]
  organizationIds:  string[]
}

async function parsePdfMultipart(request: FastifyRequest): Promise<ParsedMultipart> {
  let fileBuffer:       Buffer | null = null
  let originalFileName: string | null = null
  let mimeType:         string | null = null
  let title:            string | undefined
  const habilidadesBncc: string[] = []
  const organizationIds: string[] = []

  for await (const part of request.parts()) {
    if (part.type === 'field') {
      if (part.fieldname === 'title') {
        title = String(part.value).trim()
      } else if (part.fieldname === 'habilidadesBncc' || part.fieldname === 'habilidadesBncc[]') {
        // Aceita repetições do campo (uma habilidade por parte) ou um JSON array em uma única parte
        const raw = String(part.value).trim()
        if (raw.startsWith('[')) {
          try {
            const parsed: unknown = JSON.parse(raw)
            if (Array.isArray(parsed)) {
              for (const h of parsed) habilidadesBncc.push(String(h).trim())
            }
          } catch {
            if (raw) habilidadesBncc.push(raw)
          }
        } else if (raw) {
          habilidadesBncc.push(raw)
        }
      } else if (part.fieldname === 'organizationIds[]') {
        organizationIds.push(String(part.value).trim())
      }
    } else {
      if (part.fieldname === 'file') {
        originalFileName = part.filename
        mimeType         = part.mimetype
        fileBuffer       = await collectBuffer(part.file)
      } else {
        // Consome partes inesperadas para não bloquear o stream
        part.file.resume()
      }
    }
  }

  // Remove vazios e duplicados, preservando a ordem de envio
  const normalizedHabilidades = [...new Set(habilidadesBncc.filter(Boolean))]

  return { fileBuffer, originalFileName, mimeType, title, habilidadesBncc: normalizedHabilidades, organizationIds }
}

function resolveTitle(title: string | undefined, originalFileName: string): string {
  return title?.length
    ? title
    : originalFileName.replace(/\.pdf$/i, '').trim() || originalFileName
}

// ── Controller ────────────────────────────────────────────────────────────────

/**
 * POST /mis
 *
 * Aceita `multipart/form-data` com:
 *   - file  : arquivo PDF (obrigatório, campo "file")
 *   - title : título do material (opcional — padrão: nome do arquivo sem extensão)
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
    const { fileBuffer, originalFileName, mimeType, title, habilidadesBncc, organizationIds } = await parsePdfMultipart(request)

    if (!fileBuffer || !originalFileName || !mimeType) {
      throw new GeneralErrorResponse(StatusCode.UNSUPPORTED_MEDIA_TYPE, buildError(ERRORS.ERRORS_RESOURCES.INVALID_FILE_TYPE))
    }

    const mi = await materialPdfUploadService({
      title:           resolveTitle(title, originalFileName),
      buffer:          fileBuffer,
      originalFileName,
      mimeType,
      habilidadesBncc,
      uploadedById:    request.user.sub,
      organizationIds,
    })

    httpResponse({ reply, statusCode: StatusCode.CREATED, data: mi, context: ctx })
  } catch (error) {
    httpError({ error, context: ctx })
  }
}
