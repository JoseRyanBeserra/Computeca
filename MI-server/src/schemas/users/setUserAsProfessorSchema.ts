// src/schemas/users/setUserAsProfessorSchema.ts
import { z } from 'zod'

export const setUserAsProfessorSchema = z.object({
  targetUserId: z
    .string({ error: 'O campo targetUserId é obrigatório.' })
    .uuid('O targetUserId deve ser um UUID v4 válido.'),
  requestingAdminId: z
    .string({ error: 'O campo requestingAdminId é obrigatório.' })
    .uuid('O requestingAdminId deve ser um UUID v4 válido.'),
})

export type SetUserAsProfessorRequest = z.infer<typeof setUserAsProfessorSchema>
