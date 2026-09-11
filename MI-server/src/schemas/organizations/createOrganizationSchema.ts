// src/schemas/organizations/createOrganizationSchema.ts
import { z } from 'zod'

// Usado pelo Fastify para validar o body da rota
export const CreateOrganizationBodySchema = z.object({
  name:        z.string().min(2).max(100),
  description: z.string().max(500).optional(),
})

export type CreateOrganizationRequest = z.infer<typeof CreateOrganizationBodySchema>

// Usado internamente pelo service (inclui createdById vindo do auth context)
export const createOrganizationSchema = z.object({
  name:        z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  createdById: z.string().uuid(),
})

export type CreateOrganizationServiceInput = z.infer<typeof createOrganizationSchema>
