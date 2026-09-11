// src/services/organizations/pendingInviteCountService.ts
import { countPendingInvites } from '../../../repositories/organizations/orgInvitesRepository'
import { validateRequest } from '../../../utils/validateRequest'
import { z } from 'zod'
import { logger } from '../../../lib/logger'

const pendingInviteCountSchema = z.object({
  userId: z.string().uuid(),
})

export async function pendingInviteCountService(input: unknown): Promise<{ count: number }> {
  logger.info('IN - pendingInviteCountService')

  const { userId } = validateRequest(input, pendingInviteCountSchema)
  const count = await countPendingInvites(userId)

  logger.info('OUT - pendingInviteCountService')
  return { count }
}

