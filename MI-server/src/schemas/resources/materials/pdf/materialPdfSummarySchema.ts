// src/schemas/resources/materials/pdf/materialPdfSummarySchema.ts
import { z } from 'zod'

// A rota é um GET com apenas o path param `:id`; não há body.
// O schema do service carrega o materialId (do path) e o userId (do auth).
export const materialPdfSummarySchema = z.object({
  materialId: z
    .string({ error: 'O campo materialId é obrigatório.' })
    .uuid('O materialId deve ser um UUID v4 válido.'),
  userId: z
    .string({ error: 'O campo userId é obrigatório.' })
    .uuid('O userId deve ser um UUID v4 válido.'),
})

export type MaterialPdfSummaryServiceInput = z.infer<typeof materialPdfSummarySchema>
