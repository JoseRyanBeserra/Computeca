// src/schemas/organizations/listAllOrganizationsSchema.ts
import { z } from 'zod'

export const ListAllOrganizationsQuerySchema = z.object({
  status:  z.enum(['ACTIVE', 'ARCHIVED']).optional(),
  page:    z.coerce.number().min(1).default(1),
  perPage: z.coerce.number().min(1).max(100).default(20),
})

export type ListAllOrganizationsRequest = z.infer<typeof ListAllOrganizationsQuerySchema>
