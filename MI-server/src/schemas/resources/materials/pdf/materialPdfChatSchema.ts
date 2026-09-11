// src/schemas/resources/materials/pdf/materialPdfChatSchema.ts
import { z } from 'zod'

export const MaterialPdfChatBodySchema = z.object({
  question: z.string().min(1).max(2000).trim(),
})
export type MaterialPdfChatRequest = z.infer<typeof MaterialPdfChatBodySchema>

export const materialPdfChatSchema = z.object({
  materialId: z.string().uuid(),
  question:   z.string().min(1).max(2000).trim(),
  userId:     z.string().uuid(),
})
export type MaterialPdfChatServiceInput = z.infer<typeof materialPdfChatSchema>
