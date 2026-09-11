// src/services/organizations/removeMemberService.ts
import { findOrgById } from '../../../repositories/organizations/orgRepository'
import { findMembership, removeMember } from '../../../repositories/organizations/orgMembersRepository'
import { validateRequest } from '../../../utils/validateRequest'
import { z } from 'zod'
import { ERRORS, buildError } from '../../../lib/errors/errors'
import { GeneralErrorResponse } from '../../../errors/GeneralErrorResponse'
import { StatusCode } from '../../../utils/statusCode'
import { logger } from '../../../lib/logger'

const removeMemberSchema = z.object({
  orgId:            z.string().uuid(),
  targetUserId:     z.string().uuid(),
  requestingUserId: z.string().uuid(),
})

export async function removeMemberService(input: unknown): Promise<void> {
  logger.info('IN - removeMemberService')

  const { orgId, targetUserId, requestingUserId } = validateRequest(input, removeMemberSchema)

  const org = await findOrgById(orgId)
  if (!org) throw new GeneralErrorResponse(StatusCode.NOT_FOUND, buildError(ERRORS.ORG.ORG_NOT_FOUND))
  if (org.status === 'ARCHIVED') throw new GeneralErrorResponse(StatusCode.BAD_REQUEST, buildError(ERRORS.ORG.ORG_ARCHIVED))

  const requesterMembership = await findMembership(orgId, requestingUserId)
  if (requesterMembership?.role !== 'ADMIN') throw new GeneralErrorResponse(StatusCode.FORBIDDEN, buildError(ERRORS.ORG.ORG_NOT_STAFF))

  const targetMembership = await findMembership(orgId, targetUserId)
  if (!targetMembership) throw new GeneralErrorResponse(StatusCode.NOT_FOUND, buildError(ERRORS.ORG.ORG_NOT_MEMBER))

  // ADMIN cannot be removed (must archive the org instead)
  if (targetMembership.role === 'ADMIN') throw new GeneralErrorResponse(StatusCode.FORBIDDEN, buildError(ERRORS.ORG.ORG_NOT_STAFF))

  await removeMember(orgId, targetUserId)

  logger.info('OUT - removeMemberService')
}

