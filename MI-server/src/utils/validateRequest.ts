// src/utils/validateRequest.ts
import type { ZodSchema } from 'zod'

/**
 * Valida `body` contra um schema Zod.
 *
 * Em caso de falha, lança um `ZodError` que o errorHandler global captura e
 * formata automaticamente em 422 com detalhes campo a campo:
 *   { status: 'error', message: 'Validation error', issues: { campo: ['motivo'] } }
 *
 * Em caso de sucesso, retorna os dados tipados e parseados pelo Zod.
 *
 * @param body   - Dados brutos a serem validados (vindo do controller).
 * @param schema - Schema Zod específico do fluxo (um schema por feature).
 *
 * @example
 *   const { materialId } = validateRequest(input, materialPdfPresignedUrlSchema)
 */
export function validateRequest<T>(body: unknown, schema: ZodSchema<T>): T {
  return schema.parse(body)
}
