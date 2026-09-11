// src/schemas/organizations/archiveOrganizationSchema.ts
import { z } from 'zod'

export const archiveOrganizationSchema = z.object({
  orgId:            z.string().uuid(),
  requestingUserId: z.string().uuid(),
})

export type ArchiveOrganizationRequest = z.infer<typeof archiveOrganizationSchema>
