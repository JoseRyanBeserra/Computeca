// src/schemas/organizations/updateOrganizationSchema.ts
import { z } from 'zod'

export const updateOrganizationSchema = z.object({
  orgId:            z.string().uuid(),
  requestingUserId: z.string().uuid(),
  name:             z.string().min(2).max(100).optional(),
  description:      z.string().max(500).optional().nullable(),
})

export type UpdateOrganizationRequest = z.infer<typeof updateOrganizationSchema>
