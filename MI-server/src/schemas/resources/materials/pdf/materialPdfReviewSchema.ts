// src/schemas/resources/materials/pdf/materialPdfReviewSchema.ts
import { z } from 'zod'

export const materialPdfReviewSchema = z.object({
  materialId: z
    .string({ error: 'O campo materialId é obrigatório.' })
    .uuid('O materialId deve ser um UUID v4 válido.'),
  decision: z.enum(['APPROVED', 'REJECTED'], {
    error: 'A decisão deve ser APPROVED ou REJECTED.',
  }),
  reviewerId: z
    .string({ error: 'O campo reviewerId é obrigatório.' })
    .uuid('O reviewerId deve ser um UUID v4 válido.'),
})

export type MaterialPdfReviewRequest = z.infer<typeof materialPdfReviewSchema>
