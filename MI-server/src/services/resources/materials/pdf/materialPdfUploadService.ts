// src/services/resources/materials/pdf/materialPdfUploadService.ts
import {
  ALLOWED_MIME_TYPE,
  assertAllowedMimeType,
  buildStorageKey,
  validatePDFBuffer,
} from '../../../../utils/materialFile'
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
import { materialPdfUploadSchema } from '../../../../schemas/resources/materials/pdf/materialPdfUploadSchema'
import { validateRequest } from '../../../../utils/validateRequest'

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
  // Validação na fronteira do service (Princípio I). O ZodError resultante é
  // convertido em 422 pelo errorHandler global. Validar aqui — e não só no
  // controller — é o que garante que uma chamada interna com entrada inválida
  // também seja recusada.
  const { title, description, habilidadesBncc, relatedLinks, uploadedById, organizationIds } =
    validateRequest(input, materialPdfUploadSchema)

  const { buffer, originalFileName, mimeType } = input

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
      assertAllowedMimeType(mimeType)

      const uploader = await findUserById(uploadedById)
      if (!uploader) {
        throw new GeneralErrorResponse(StatusCode.INTERNAL_SERVER_ERROR, buildError(ERRORS.GENERAL.INTERNAL_ERROR))
      }

      // Validação de conteúdo (magic bytes + tamanho) — puro CPU, sem I/O.
      withSpanSync('mi.upload.validar_pdf', { 'mi.tamanho_bytes': buffer.length }, () => {
        validatePDFBuffer(buffer)
      })

      const storageKey = buildStorageKey(uploader.name, uploadedById)
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
          description,
          originalFileName,
          storageKey,
          mimeType,
          sizeBytes: buffer.length,
          habilidadesBncc,
          relatedLinks,
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
