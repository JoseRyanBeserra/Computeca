// src/services/organizations/cancelInviteService.ts
import { findInviteById, updateInviteStatus } from '../../../repositories/organizations/orgInvitesRepository'
import { findMembership } from '../../../repositories/organizations/orgMembersRepository'
import { validateRequest } from '../../../utils/validateRequest'
import { z } from 'zod'
import { ERRORS, buildError } from '../../../lib/errors/errors'
import { GeneralErrorResponse } from '../../../errors/GeneralErrorResponse'
import { StatusCode } from '../../../utils/statusCode'
import { logger } from '../../../lib/logger'

const cancelInviteSchema = z.object({
  inviteId:         z.string().uuid(),
  requestingUserId: z.string().uuid(),
})

export async function cancelInviteService(input: unknown): Promise<void> {
  logger.info('IN - cancelInviteService')

  const { inviteId, requestingUserId } = validateRequest(input, cancelInviteSchema)

  const invite = await findInviteById(inviteId)
  if (!invite) throw new GeneralErrorResponse(StatusCode.NOT_FOUND, buildError(ERRORS.ORG.INVITE_NOT_FOUND))
  if (invite.status !== 'PENDING') throw new GeneralErrorResponse(StatusCode.BAD_REQUEST, buildError(ERRORS.ORG.INVITE_NOT_PENDING))

  const membership = await findMembership(invite.organizationId, requestingUserId)
  if (!membership || membership.role === 'MEMBER') {
    throw new GeneralErrorResponse(StatusCode.FORBIDDEN, buildError(ERRORS.ORG.ORG_NOT_STAFF))
  }

  await updateInviteStatus(inviteId, 'CANCELLED')

  logger.info('OUT - cancelInviteService')
}

