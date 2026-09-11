// src/services/organizations/respondInviteService.ts
import { findInviteById, updateInviteStatus } from '../../../repositories/organizations/orgInvitesRepository'
import { findMembership, addMember } from '../../../repositories/organizations/orgMembersRepository'
import { findUserById } from '../../../repositories/users/usersRepository'
import { findOrgById } from '../../../repositories/organizations/orgRepository'
import { validateRequest } from '../../../utils/validateRequest'
import { respondInviteSchema } from '../../../schemas/organizations/respondInviteSchema'
import { ERRORS, buildError } from '../../../lib/errors/errors'
import { GeneralErrorResponse } from '../../../errors/GeneralErrorResponse'
import { StatusCode } from '../../../utils/statusCode'
import { logger } from '../../../lib/logger'

export async function respondInviteService(input: unknown): Promise<void> {
  logger.info('IN - respondInviteService')

  const { inviteId, userId, action } = validateRequest(input, respondInviteSchema)

  const invite = await findInviteById(inviteId)
  if (!invite) throw new GeneralErrorResponse(StatusCode.NOT_FOUND, buildError(ERRORS.ORG.INVITE_NOT_FOUND))
  if (invite.status !== 'PENDING') throw new GeneralErrorResponse(StatusCode.BAD_REQUEST, buildError(ERRORS.ORG.INVITE_NOT_PENDING))
  if (invite.invitedUserId !== userId) throw new GeneralErrorResponse(StatusCode.FORBIDDEN, buildError(ERRORS.AUTH.FORBIDDEN))

  if (action === 'REJECT') {
    await updateInviteStatus(inviteId, 'REJECTED')
    logger.info('OUT - respondInviteService (rejected)')
    return
  }

  // ACCEPT: validate org is still active, user not already a member, then add
  const org = await findOrgById(invite.organizationId)
  if (!org || org.status === 'ARCHIVED') {
    throw new GeneralErrorResponse(StatusCode.BAD_REQUEST, buildError(ERRORS.ORG.ORG_ARCHIVED))
  }

  const existing = await findMembership(invite.organizationId, userId)
  if (existing) throw new GeneralErrorResponse(StatusCode.CONFLICT, buildError(ERRORS.ORG.ORG_ALREADY_MEMBER))

  const user = await findUserById(userId)
  const orgRole = (user?.role === 'PROFESSOR' || user?.role === 'ADMIN') ? 'PROFESSOR' : 'MEMBER'

  await updateInviteStatus(inviteId, 'ACCEPTED')
  await addMember({ organizationId: invite.organizationId, userId, role: orgRole })

  logger.info('OUT - respondInviteService (accepted)')
}

