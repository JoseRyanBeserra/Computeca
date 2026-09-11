// src/schemas/logs/listInspectionLogsSchema.ts
import { z } from 'zod'

export const listInspectionLogsSchema = z.object({
  direction:     z.enum(['CLIENT_TO_SERVER', 'SERVER_TO_CLIENT']).optional(),
  context:       z.string().optional(),
  correlationId: z.string().optional(),
  tag:           z.string().optional(),
  page:          z.coerce.number().min(1).default(1),
  perPage:       z.coerce.number().min(1).max(100).default(50),
})

export type ListInspectionLogsRequest = z.infer<typeof listInspectionLogsSchema>
