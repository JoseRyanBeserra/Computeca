// src/schemas/config/updateAiAvailabilitySchema.ts
import { z } from 'zod'

// 1. Schema do body — usado para tipar o request no controller
export const UpdateAiAvailabilityBodySchema = z.object({
  // Booleano estrito: a string "false" é rejeitada com 422, não coagida.
  enabled: z.boolean(),
})

export type UpdateAiAvailabilityRequest = z.infer<typeof UpdateAiAvailabilityBodySchema>

// 2. Schema do service — inclui os campos vindos do contexto de auth
export const updateAiAvailabilitySchema = z.object({
  enabled:     z.boolean(),
  updatedById: z.string().uuid(),
  actorRole:   z.enum(['COMMON', 'INSTITUTIONALIZED', 'PROFESSOR', 'ADMIN']),
})

export type UpdateAiAvailabilityServiceInput = z.infer<typeof updateAiAvailabilitySchema>
