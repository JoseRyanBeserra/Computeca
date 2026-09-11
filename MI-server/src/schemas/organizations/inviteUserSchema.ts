// src/schemas/organizations/inviteUserSchema.ts
import { z } from 'zod'

export const inviteUserSchema = z.object({
  orgId:        z.string().uuid(),
  invitedEmail: z.string().email(),
  invitedById:  z.string().uuid(),
})

export type InviteUserRequest = z.infer<typeof inviteUserSchema>
