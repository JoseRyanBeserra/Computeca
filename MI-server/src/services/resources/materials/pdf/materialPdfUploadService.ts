// src/services/resources/materials/pdf/materialPdfUploadService.ts
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { minioClient, MINIO_BUCKET } from '../../../../lib/minio'
import { findUserById } from '../../../../repositories/users/usersRepository'
import { createMaterialPdf } from '../../../../repositories/resources/materials/pdf/materialPdfUploadRepository'
import { findMembership } from '../../../../repositories/organizations/orgMembersRepository'
import { linkMaterialToOrgs } from '../../../../repositories/organizations/orgRepository'
import { ERRORS, buildError } from '../../../../lib/errors/errors'
import { GeneralErrorResponse } from '../../../../errors/GeneralErrorResponse'
import { StatusCode } from '../../../../utils/statusCode'
import { env } from '../../../../env'
import { withSpan, withSpanSync } from '../../../../lib/tracing'
import { logger } from '../../../../lib/logger'
import type { UploadMIInput, IUploadedMI } from '../../../../@types/resources/materials/pdf'

// ── Constantes de validação ────────────────────────────────────────────────────

/** Magic bytes do PDF: %PDF (0x25 0x50 0x44 0x46) */
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46])

const ALLOWED_MIME_TYPE = 'application/pdf'

/**
 * Habilidades BNCC são OPCIONAIS: a lista sempre existe, mas pode ser vazia.
 * Normaliza para um array de strings (sem espaços, sem vazios, sem duplicados)
 * e assume `[]` quando ausente — o material não é obrigado a possuir habilidades.
 */
const habilidadesBnccSchema = z
  .array(z.string())
  .optional()
  .default([])
  .transform((arr) => [...new Set(arr.map((s) => s.trim()).filter(Boolean))])

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * Fluxo completo de upload de um Material Instrucional em PDF:
 *  1. Busca o nome do usuário no banco (para compor a chave MinIO)
 *  2. Valida o buffer (magic bytes + tamanho)
 *  3. Gera a chave do objeto: {nome-sanitizado}_{userId}_{uuid}.pdf
 *  4. Faz upload do buffer para o MinIO
 *  5. Persiste os metadados no banco
 *  6. Retorna o DTO do material criado
 */
export async function materialPdfUploadService(input: UploadMIInput): Promise<IUploadedMI> {
  const { title, buffer, originalFileName, mimeType, uploadedById, organizationIds = [] } = input
  const habilidadesBncc = habilidadesBnccSchema.parse(input.habilidadesBncc)

  return withSpan(
    'mi.upload',
    {
      'usuario.id':              uploadedById,
      'mi.tamanho_bytes':        buffer.length,
      'mi.mime_type':            mimeType,
      'mi.habilidades_bncc':     habilidadesBncc.length,
      'mi.organizacoes_vinculadas': organizationIds.length,
    },
    async (spanUpload) => {
      if (mimeType !== ALLOWED_MIME_TYPE) {
        throw new GeneralErrorResponse(StatusCode.UNSUPPORTED_MEDIA_TYPE, buildError(ERRORS.ERRORS_RESOURCES.INVALID_FILE_TYPE))
      }

      const uploader = await findUserById(uploadedById)
      if (!uploader) {
        throw new GeneralErrorResponse(StatusCode.INTERNAL_SERVER_ERROR, buildError(ERRORS.GENERAL.INTERNAL_ERROR))
      }

      // Validação de conteúdo (magic bytes + tamanho) — puro CPU, sem I/O.
      withSpanSync('mi.upload.validar_pdf', { 'mi.tamanho_bytes': buffer.length }, () => {
        validatePDFBuffer(buffer)
      })

      const sanitizedName = sanitizeForStorageKey(uploader.name)
      const storageKey = `${sanitizedName}_${uploadedById}_${randomUUID()}.pdf`
      spanUpload.setAttribute('mi.storage_key', storageKey)

      // Escrita no object storage — costuma ser a etapa mais cara do fluxo.
      await withSpan(
        'mi.upload.minio_put',
        { 'mi.storage_key': storageKey, 'mi.tamanho_bytes': buffer.length, 'storage.bucket': MINIO_BUCKET },
        async () => {
          try {
            await minioClient.putObject(
              MINIO_BUCKET,
              storageKey,
              buffer,
              buffer.length,
              { 'Content-Type': ALLOWED_MIME_TYPE },
            )
          } catch (cause) {
            throw new GeneralErrorResponse(StatusCode.INTERNAL_SERVER_ERROR, buildError(ERRORS.ERRORS_RESOURCES.UPLOAD_FAILED))
          }
        },
      )

      // Validate uploader is a member of each specified org before linking
      if (organizationIds.length > 0) {
        await withSpan(
          'mi.upload.validar_vinculo_orgs',
          { 'mi.organizacoes_vinculadas': organizationIds.length },
          async () => {
            for (const orgId of organizationIds) {
              const membership = await findMembership(orgId, uploadedById)
              if (!membership) {
                throw new GeneralErrorResponse(StatusCode.FORBIDDEN, buildError(ERRORS.ORG.ORG_NOT_MEMBER))
              }
            }
          },
        )
      }

      const mi = await withSpan('mi.upload.persistir_metadados', { 'mi.titulo': title }, async () =>
        createMaterialPdf({
          title,
          originalFileName,
          storageKey,
          mimeType,
          sizeBytes: buffer.length,
          habilidadesBncc,
          uploadedById,
        }),
      )

      spanUpload.setAttribute('mi.id', mi.id)

      if (organizationIds.length > 0) {
        await linkMaterialToOrgs(mi.id, organizationIds)
      }

      // Evento de negócio em formato estruturado: os campos viram atributos
      // pesquisáveis no Loki (LogQL) e o log sai correlacionado com o trace.
      logger.info(
        {
          evento:            'mi_enviado',
          mi_id:             mi.id,
          mi_tamanho_bytes:  buffer.length,
          mi_habilidades:    habilidadesBncc.length,
          usuario_id:        uploadedById,
        },
        'Material Instrucional enviado',
      )

      return mi
    },
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function maxFileSizeBytes(): number {
  return env.MI_MAX_FILE_SIZE_MB * 1024 * 1024
}

/**
 * Sanitiza o nome do usuário para ser usado como parte da chave MinIO.
 * Remove acentos, substitui espaços e caracteres especiais por hífen.
 */
function sanitizeForStorageKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Valida que o buffer é um PDF legítimo:
 *  1. Verifica os magic bytes (%PDF) — defesa contra MIME spoofing
 *  2. Verifica que o tamanho não excede o limite configurado
 */
function validatePDFBuffer(buffer: Buffer): void {
  if (buffer.length > maxFileSizeBytes()) {
    throw new GeneralErrorResponse(StatusCode.PAYLOAD_TOO_LARGE, buildError(ERRORS.ERRORS_RESOURCES.FILE_TOO_LARGE))
  }

  const magic = buffer.subarray(0, 4)
  if (!magic.equals(PDF_MAGIC)) {
    throw new GeneralErrorResponse(StatusCode.UNSUPPORTED_MEDIA_TYPE, buildError(ERRORS.ERRORS_RESOURCES.INVALID_FILE_TYPE))
  }
}
