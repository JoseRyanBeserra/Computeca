// src/controllers/resources/materials/pdf/materialPdfEditController.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import type { Role } from '@prisma/client'
import { materialPdfEditService } from '../../../../services/resources/materials/pdf/materialPdfEditService'
import { authorizeByRole } from '../../../../utils/authorizeByRole'
import { ADMIN } from '../../../../constants/roles'
import { createInspectionLog } from '../../../../repositories/inspectionLog/inspectionLogRepository'
import { httpResponse, httpError } from '../../../../utils/http'
import { StatusCode } from '../../../../utils/statusCode'
import { logger } from '../../../../lib/logger'
import { parseMaterialMultipart } from './shared/parseMaterialMultipart'

const ctx = 'materialPdfEditController'

/**
 * PUT /mis/:id
 *
 * Altera os metadados de um material e, opcionalmente, substitui o seu documento.
 *
 * Aceita `multipart/form-data` com:
 *   - title           : título do material (OBRIGATÓRIO, até 255 caracteres)
 *   - description     : descrição do material (OBRIGATÓRIA, 50 a 2000 caracteres)
 *   - habilidadesBncc : habilidades BNCC (opcional)
 *   - file            : documento PDF (OPCIONAL — ausente significa "manter o atual")
 *
 * `PUT` e não `PATCH`: o corpo carrega o conjunto COMPLETO dos metadados
 * editáveis. Campo opcional tornaria "omiti a descrição" indistinguível de
 * "mantenha a atual", e uma descrição inválida atravessaria a edição.
 *
 * Permissão: **ADMIN, e somente ele**. Nem PROFESSOR nem o autor do material
 * editam — autoria não dá direito de alterar.
 * Middlewares: [authenticate]
 */
export async function materialPdfEditController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  logger.info(`IN - ${ctx}`)

  const params = request.params as { id?: string }

  await createInspectionLog({
    correlationId: request.user.sub,
    context:       ctx,
    direction:     'CLIENT_TO_SERVER',
    payload: [
      {
        title: 'Request Payload',
        content: { method: request.method, url: request.url, materialId: params.id },
      },
    ],
  }).catch((err) =>
    logger.error({ err }, `${ctx}: inspectionLog CLIENT_TO_SERVER write failed`),
  )

  try {
    authorizeByRole(request.user.role, [ADMIN])

    // Mesmo parse do cadastro, sem alteração: ele já devolve `fileBuffer` nulável,
    // e aqui esse nulo significa "não trocar o documento".
    const { fileBuffer, originalFileName, mimeType, title, description, habilidadesBncc } =
      await parseMaterialMultipart(request)

    const material = await materialPdfEditService({
      materialId:  params.id!,
      title:       title as string,
      description: description as string,
      habilidadesBncc,
      ...(fileBuffer && originalFileName && mimeType
        ? { buffer: fileBuffer, originalFileName, mimeType }
        : {}),
      editedById: request.user.sub,
      actorRole:  request.user.role as Role,
    })

    await createInspectionLog({
      correlationId: request.user.sub,
      context:       ctx,
      direction:     'SERVER_TO_CLIENT',
      payload: [
        { title: 'DB - Material editado', content: { id: material.id, status: material.status } },
        { title: 'Resposta', content: { statusCode: StatusCode.OK } },
      ],
    }).catch((err) =>
      logger.error({ err }, `${ctx}: inspectionLog SERVER_TO_CLIENT write failed`),
    )

    httpResponse({ reply, statusCode: StatusCode.OK, data: material, context: ctx })
  } catch (error) {
    await createInspectionLog({
      correlationId: request.user.sub,
      context:       ctx,
      direction:     'SERVER_TO_CLIENT',
      tag:           'ERROR',
      payload: [{ title: 'Erro', content: { materialId: params.id, error: String(error) } }],
    }).catch((err) =>
      logger.error({ err }, `${ctx}: inspectionLog SERVER_TO_CLIENT (erro) write failed`),
    )

    httpError({ error, context: ctx })
  }
}
