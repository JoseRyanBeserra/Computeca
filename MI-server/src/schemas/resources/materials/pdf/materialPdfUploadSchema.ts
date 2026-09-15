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

/** Limites dos links relacionados, inclusivos. Rótulo contado após aparar as pontas. */
export const RELATED_LINKS_MAX = 10
export const RELATED_LINK_LABEL_MAX_LENGTH = 60

/** Os únicos protocolos que um link relacionado pode ter. */
const ALLOWED_LINK_PROTOCOLS = new Set(['http:', 'https:'])

/**
 * ATENÇÃO: `z.string().url()` sozinho NÃO basta. Ele confere se a string é uma
 * URL bem formada, não se é segura para navegação — verificado que aceita
 * `javascript:alert(1)`, `data:`, `file:` e `ftp:`. Num acervo aberto a
 * submissões de terceiros, um botão "Videoaula" apontando para `javascript:`
 * seria exatamente o vetor que a US3 descreve.
 *
 * A segunda etapa compara o protocolo NORMALIZADO pelo construtor de URL, nunca
 * prefixo de string: caixa e variações como `hTTps:` são resolvidas antes.
 */
export const relatedLinkSchema = z.object({
  label: z
    .string({ message: 'O nome do link é obrigatório.' })
    .trim()
    .min(1, 'O nome do link é obrigatório.')
    .max(RELATED_LINK_LABEL_MAX_LENGTH, `O nome do link deve ter no máximo ${RELATED_LINK_LABEL_MAX_LENGTH} caracteres.`),
  url: z
    .string({ message: 'O endereço do link é obrigatório.' })
    .trim()
    .url('O endereço do link não é uma URL válida.')
    .refine((valor) => {
      try {
        return ALLOWED_LINK_PROTOCOLS.has(new URL(valor).protocol)
      } catch {
        return false
      }
    }, 'O endereço do link deve começar com http:// ou https://.'),
})

/**
 * Links relacionados são OPCIONAIS: a lista sempre existe, mas pode ser vazia.
 * Endereço repetido é aceito — dois rótulos podem apontar ao mesmo lugar.
 */
export const relatedLinksSchema = z
  .array(relatedLinkSchema)
  .max(RELATED_LINKS_MAX, `Informe no máximo ${RELATED_LINKS_MAX} links relacionados.`)
  .optional()
  .default([])

// 1. Schema do body — o que chega do formulário
export const UploadMaterialBodySchema = z.object({
  title:           titleSchema,
  description:     descriptionSchema,
  habilidadesBncc: habilidadesBnccSchema,
  relatedLinks:    relatedLinksSchema,
})

export type UploadMaterialRequest = z.infer<typeof UploadMaterialBodySchema>

// 2. Schema do service — inclui o que vem do contexto de autenticação
export const materialPdfUploadSchema = z.object({
  title:            titleSchema,
  description:      descriptionSchema,
  habilidadesBncc:  habilidadesBnccSchema,
  relatedLinks:     relatedLinksSchema,
  uploadedById:     z.string().uuid(),
  originalFileName: z.string().min(1),
  mimeType:         z.string().min(1),
  organizationIds:  z.array(z.string()).optional().default([]),
})

export type UploadMaterialServiceInput = z.infer<typeof materialPdfUploadSchema>
