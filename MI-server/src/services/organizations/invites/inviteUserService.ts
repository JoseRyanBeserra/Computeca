// src/services/organizations/inviteUserService.ts
import type { IOrganizationInvite } from '../../../@types/organizations'
import { findOrgById } from '../../../repositories/organizations/orgRepository'
import { findMembership } from '../../../repositories/organizations/orgMembersRepository'
import { findPendingInvite, createInvite } from '../../../repositories/organizations/orgInvitesRepository'
import { findUserByEmail } from '../../../repositories/users/usersRepository'
import { validateRequest } from '../../../utils/validateRequest'
import { inviteUserSchema } from '../../../schemas/organizations/inviteUserSchema'
import { ERRORS, buildError } from '../../../lib/errors/errors'
import { GeneralErrorResponse } from '../../../errors/GeneralErrorResponse'
import { StatusCode } from '../../../utils/statusCode'
import { logger } from '../../../lib/logger'

export async function inviteUserService(input: unknown): Promise<IOrganizationInvite> {
  logger.info('IN - inviteUserService')

  const { orgId, invitedEmail, invitedById } = validateRequest(input, inviteUserSchema)

  const org = await findOrgById(orgId)
  if (!org) throw new GeneralErrorResponse(StatusCode.NOT_FOUND, buildError(ERRORS.ORG.ORG_NOT_FOUND))
  if (org.status === 'ARCHIVED') throw new GeneralErrorResponse(StatusCode.BAD_REQUEST, buildError(ERRORS.ORG.ORG_ARCHIVED))

  const inviterMembership = await findMembership(orgId, invitedById)
  if (!inviterMembership || inviterMembership.role === 'MEMBER') {
    throw new GeneralErrorResponse(StatusCode.FORBIDDEN, buildError(ERRORS.ORG.ORG_NOT_STAFF))
  }

  const invitedUser = await findUserByEmail(invitedEmail)
  if (!invitedUser) throw new GeneralErrorResponse(StatusCode.NOT_FOUND, buildError(ERRORS.USER.USER_NOT_FOUND))

  // Only @dcx.ufpb.br users (INSTITUTIONALIZED or above) can be invited
  const allowedRoles = ['INSTITUTIONALIZED', 'PROFESSOR', 'ADMIN'] as const
  if (!(allowedRoles as readonly string[]).includes(invitedUser.role)) {
    throw new GeneralErrorResponse(StatusCode.BAD_REQUEST, buildError(ERRORS.ORG.INVITE_ONLY_INSTITUTIONAL))
  }

  const existingMembership = await findMembership(orgId, invitedUser.id)
  if (existingMembership) throw new GeneralErrorResponse(StatusCode.CONFLICT, buildError(ERRORS.ORG.ORG_ALREADY_MEMBER))

  const pending = await findPendingInvite(orgId, invitedUser.id)
  if (pending) throw new GeneralErrorResponse(StatusCode.CONFLICT, buildError(ERRORS.ORG.INVITE_ALREADY_PENDING))

  const invite = await createInvite({
    organizationId: orgId,
    invitedUserId:  invitedUser.id,
    invitedById,
  })

  logger.info('OUT - inviteUserService')
  return invite
}

