// src/schemas/resources/materials/pdf/materialPdfUploadSchema.ts
//
// Validação de entrada do cadastro de material. Até esta feature o fluxo de
// upload era o único do projeto sem schema próprio: o service validava as
// habilidades com um schema inline e conferia o tipo do arquivo à mão, sem
// `validateRequest`. O Princípio I exige `nomeFluxoSchema` validado no service.
import { z } from 'zod'

/** Limites da descrição, inclusivos. Contagem após remover espaços das pontas. */
export const DESCRIPTION_MIN_LENGTH = 50
export const DESCRIPTION_MAX_LENGTH = 2000

/** Limite do título, alinhado ao `maxLength` que o formulário já aplica. */
export const TITLE_MAX_LENGTH = 255

/**
 * Habilidades BNCC são OPCIONAIS: a lista sempre existe, mas pode ser vazia.
 * Normaliza para strings sem espaços, sem vazios e sem duplicados.
 */
export const habilidadesBnccSchema = z
  .array(z.string())
  .optional()
  .default([])
  .transform((arr) => [...new Set(arr.map((s) => s.trim()).filter(Boolean))])

/**
 * O `.trim()` antes do `.min()` é o que atende ao FR-005: ninguém é reprovado
 * por espaços que nem vê, nem aprovado por uma descrição de 50 espaços.
 */
export const descriptionSchema = z
  .string({ message: 'A descrição é obrigatória.' })
  .trim()
  .min(DESCRIPTION_MIN_LENGTH, `A descrição deve ter pelo menos ${DESCRIPTION_MIN_LENGTH} caracteres.`)
  .max(DESCRIPTION_MAX_LENGTH, `A descrição deve ter no máximo ${DESCRIPTION_MAX_LENGTH} caracteres.`)

/**
 * O título passou a ser obrigatório nesta feature. O servidor deixou de
 * recorrer ao nome do arquivo quando ele vinha ausente — um título como
 * `documento_final_v3` não ajuda ninguém a encontrar o material.
 */
export const titleSchema = z
  .string({ message: 'O título é obrigatório.' })
  .trim()
  .min(1, 'O título é obrigatório.')
  .max(TITLE_MAX_LENGTH, `O título deve ter no máximo ${TITLE_MAX_LENGTH} caracteres.`)

// 1. Schema do body — o que chega do formulário
export const UploadMaterialBodySchema = z.object({
  title:           titleSchema,
  description:     descriptionSchema,
  habilidadesBncc: habilidadesBnccSchema,
})

export type UploadMaterialRequest = z.infer<typeof UploadMaterialBodySchema>

// 2. Schema do service — inclui o que vem do contexto de autenticação
export const materialPdfUploadSchema = z.object({
  title:            titleSchema,
  description:      descriptionSchema,
  habilidadesBncc:  habilidadesBnccSchema,
  uploadedById:     z.string().uuid(),
  originalFileName: z.string().min(1),
  mimeType:         z.string().min(1),
  organizationIds:  z.array(z.string()).optional().default([]),
})

export type UploadMaterialServiceInput = z.infer<typeof materialPdfUploadSchema>
