// src/services/resources/materials/pdf/materialPdfEditService.ts
//
// Edição de um Material Instrucional já cadastrado. Restrito a ADMIN — a
// autorização é aplicada no controller (Princípio II).
import type { Role } from '@prisma/client'
import type { EditMIInput, IUploadedMI } from '../../../../@types/resources/materials/pdf'
import { findMaterialById } from '../../../../repositories/resources/materials/pdf/materialPdfViewRepository'
import { updateMaterial } from '../../../../repositories/resources/materials/pdf/materialPdfEditRepository'
import { findUserById } from '../../../../repositories/users/usersRepository'
import { createAuditLog } from '../../../../repositories/audit/auditRepository'
import { buildMaterialEditDiff, type FileReplacement } from '../../../../utils/buildMaterialEditDiff'
import { validateRequest } from '../../../../utils/validateRequest'
import { materialPdfEditSchema } from '../../../../schemas/resources/materials/pdf/materialPdfEditSchema'
import {
  assertAllowedMimeType,
  buildStorageKey,
  validatePDFBuffer,
  ALLOWED_MIME_TYPE,
} from '../../../../utils/materialFile'
import { minioClient, MINIO_BUCKET, removeObject } from '../../../../lib/minio'
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
  const { materialId, title, description, habilidadesBncc, relatedLinks, editedById } =
    validateRequest(input, materialPdfEditSchema)
  const { actorRole, buffer, originalFileName, mimeType } = input

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

  const trocaDocumento = Boolean(buffer && originalFileName && mimeType)

  // ── Substituição do documento ───────────────────────────────────────────────
  //
  // A ORDEM DAS OPERAÇÕES AQUI NÃO É ESTILO. Ela é o que separa "uma falha não
  // custou nada" de "o documento original foi destruído sem recuperação":
  //
  //   1. valida o arquivo novo         — antes de tocar em qualquer coisa
  //   2. grava sob CHAVE NOVA          — o antigo segue íntegro e servível
  //   3. atualiza o registro           — só agora o material aponta para o novo
  //   4. remove o arquivo antigo       — por último, e só por último
  //
  // Sobrescrever a chave existente pareceria mais simples e destruiria o
  // original antes de se saber se o novo chegou inteiro.
  let chaveNova: string | undefined
  let arquivoParaDiff: FileReplacement | undefined
  let statusNovo: 'PENDING_REVIEW' | undefined

  if (trocaDocumento) {
    assertAllowedMimeType(mimeType!)
    validatePDFBuffer(buffer!)

    const autor = await findUserById(material.uploadedById)
    chaveNova = buildStorageKey(autor?.name ?? 'material', material.uploadedById)

    await minioClient.putObject(MINIO_BUCKET, chaveNova, buffer!, buffer!.length, {
      'Content-Type': ALLOWED_MIME_TYPE,
    })

    // A aprovação foi concedida a OUTRO documento: trocado o arquivo, ela perde
    // o objeto. Material que ainda aguarda revisão, ou que foi rejeitado,
    // permanece como está — não havia aprovação a invalidar (FR-013).
    if (material.status === 'APPROVED') statusNovo = 'PENDING_REVIEW'

    arquivoParaDiff = {
      storageKey:       chaveNova,
      originalFileName: originalFileName!,
      status:           statusNovo ?? material.status,
    }
  }

  const diff = buildMaterialEditDiff(
    {
      title:            material.title,
      description:      material.description,
      habilidadesBncc:  material.habilidadesBncc,
      relatedLinks:     material.relatedLinks ?? [],
      storageKey:       material.storageKey,
      originalFileName: material.originalFileName,
      status:           material.status,
    },
    { title, description, habilidadesBncc, relatedLinks },
    arquivoParaDiff,
  )

  // FR-017: edição que não altera nada não atualiza e não deixa rastro. Sem este
  // curto-circuito, abrir a tela e salvar sem tocar em nada encheria o histórico
  // de registros vazios, e o `updatedAt` mentiria sobre quando o material mudou.
  if (diff.changed.length === 0) {
    logger.info({ materialId }, 'OUT - materialPdfEditService (nada a alterar)')
    return material
  }

  let atualizado: IUploadedMI
  try {
    atualizado = await updateMaterial(materialId, {
      title,
      description,
      habilidadesBncc,
      relatedLinks,
      ...(trocaDocumento
        ? {
            storageKey:          chaveNova,
            originalFileName:    originalFileName,
            mimeType:            mimeType,
            sizeBytes:           buffer!.length,
            // Resumo e vetores descreviam o documento que saiu. Mantê-los faria
            // o sistema afirmar sobre o material novo o que apurou sobre outro.
            invalidateAiDerived: true,
            ...(statusNovo ? { status: statusNovo } : {}),
          }
        : {}),
    })
  } catch (erro) {
    // Compensação: o arquivo novo já está no armazenamento, mas o material não
    // aponta para ele. Removê-lo deixa tudo exatamente como estava.
    if (chaveNova) {
      await removeObject(chaveNova).catch((err) =>
        logger.error({ err, chaveNova }, 'materialPdfEditService: falha ao compensar arquivo novo'),
      )
    }
    throw erro
  }

  // Só agora — com o registro já apontando para o arquivo novo — o antigo pode ir.
  if (trocaDocumento) {
    await removeObject(material.storageKey).catch((err) =>
      // Assimetria deliberada: a edição NÃO é desfeita. Um arquivo órfão no
      // armazenamento é um incômodo que se resolve depois; um material apontando
      // para documento inexistente é uma tela quebrada para todo mundo (FR-011).
      logger.error(
        { err, storageKey: material.storageKey, materialId },
        'materialPdfEditService: arquivo anterior não pôde ser removido — edição mantida',
      ),
    )
  }

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
