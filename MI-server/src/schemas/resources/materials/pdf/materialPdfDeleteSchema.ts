// src/schemas/resources/materials/pdf/materialPdfDeleteSchema.ts
import { z } from 'zod'

export const materialPdfDeleteSchema = z.object({
  materialId: z
    .string({ error: 'O campo materialId é obrigatório.' })
    .uuid('O materialId deve ser um UUID v4 válido.'),
  deletedById: z
    .string({ error: 'O campo deletedById é obrigatório.' })
    .uuid('O deletedById deve ser um UUID v4 válido.'),
})

export type MaterialPdfDeleteServiceInput = z.infer<typeof materialPdfDeleteSchema>
