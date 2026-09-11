// src/schemas/resources/materials/pdf/materialPdfPresignedUrlSchema.ts
import { z } from 'zod'

export const materialPdfPresignedUrlSchema = z.object({
  materialId: z
    .string({ error: 'O campo materialId é obrigatório.' })
    .uuid('O materialId deve ser um UUID v4 válido.'),
})

export type MaterialPdfPresignedUrlRequest = z.infer<typeof materialPdfPresignedUrlSchema>
